use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};
use tauri::async_runtime::JoinHandle;
use tauri::{AppHandle, Emitter, Manager, Runtime, State};
use tokio::time::sleep;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct UptimeHost {
    pub id: String,
    pub name: String,
    pub url: String,
    pub interval_secs: u64,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct CheckResult {
    pub host_id: String,
    pub status: String,
    pub latency_ms: Option<u64>,
    pub checked_at: u64,
    pub error: Option<String>,
}

pub struct UptimeState {
    pub hosts: Mutex<Vec<UptimeHost>>,
    pub history: Mutex<HashMap<String, Vec<CheckResult>>>,
    pub tasks: Mutex<HashMap<String, JoinHandle<()>>>,
}

impl UptimeState {
    pub fn new() -> Self {
        Self {
            hosts: Mutex::new(vec![]),
            history: Mutex::new(HashMap::new()),
            tasks: Mutex::new(HashMap::new()),
        }
    }
}

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

fn open_db<R: Runtime>(app: &AppHandle<R>) -> Result<Connection, String> {
    let data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&data_dir).map_err(|e| e.to_string())?;
    let db_path = data_dir.join("stride.db");
    Connection::open(db_path).map_err(|e| e.to_string())
}

fn ensure_uptime_table(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        r#"
        CREATE TABLE IF NOT EXISTS uptime_hosts (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          url TEXT NOT NULL,
          interval_secs INTEGER NOT NULL DEFAULT 60,
          created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
        );
        "#,
    )
    .map_err(|e| e.to_string())
}

pub fn load_hosts_from_db<R: Runtime>(app: &AppHandle<R>) -> Result<Vec<UptimeHost>, String> {
    let conn = open_db(app)?;
    ensure_uptime_table(&conn)?;

    let mut stmt = conn
        .prepare(
            "SELECT id, name, url, interval_secs
             FROM uptime_hosts
             ORDER BY created_at ASC, name ASC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(UptimeHost {
                id: row.get(0)?,
                name: row.get(1)?,
                url: row.get(2)?,
                interval_secs: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())
}

async fn check_host(host: &UptimeHost) -> CheckResult {
    let start = Instant::now();
    let checked_at = now_ms();

    let client = match reqwest::Client::builder()
        .timeout(Duration::from_secs(5))
        .build()
    {
        Ok(client) => client,
        Err(error) => {
            return CheckResult {
                host_id: host.id.clone(),
                status: "down".to_string(),
                latency_ms: None,
                checked_at,
                error: Some(error.to_string()),
            }
        }
    };

    match client.get(&host.url).send().await {
        Ok(response) => {
            let latency = start.elapsed().as_millis() as u64;
            let status = if !response.status().is_success() {
                "down"
            } else if latency > 500 {
                "degraded"
            } else {
                "up"
            };

            CheckResult {
                host_id: host.id.clone(),
                status: status.to_string(),
                latency_ms: Some(latency),
                checked_at,
                error: None,
            }
        }
        Err(error) => CheckResult {
            host_id: host.id.clone(),
            status: "down".to_string(),
            latency_ms: None,
            checked_at,
            error: Some(error.to_string()),
        },
    }
}

fn is_host_registered(state: &Arc<UptimeState>, host_id: &str) -> bool {
    state
        .hosts
        .lock()
        .unwrap()
        .iter()
        .any(|host| host.id == host_id)
}

fn record_result(state: &Arc<UptimeState>, result: CheckResult) {
    let mut history = state.history.lock().unwrap();
    let entry = history.entry(result.host_id.clone()).or_default();
    entry.push(result);
    if entry.len() > 20 {
        let overflow = entry.len() - 20;
        entry.drain(0..overflow);
    }
}

fn spawn_host_loop(app: AppHandle, state: Arc<UptimeState>, host: UptimeHost) {
    {
        let tasks = state.tasks.lock().unwrap();
        if tasks.contains_key(&host.id) {
            return;
        }
    }

    let host_id = host.id.clone();
    let host_for_task = host.clone();
    let state_for_task = state.clone();
    let handle = tauri::async_runtime::spawn(async move {
        loop {
            if !is_host_registered(&state_for_task, &host_for_task.id) {
                break;
            }

            let result = check_host(&host_for_task).await;
            record_result(&state_for_task, result.clone());
            let _ = app.emit("uptime_check_result", &result);
            eprintln!(
                "[Stride][uptime_check_result] host={} status={} latency_ms={:?}",
                host_for_task.name, result.status, result.latency_ms
            );

            sleep(Duration::from_secs(host_for_task.interval_secs)).await;
        }

        state_for_task.tasks.lock().unwrap().remove(&host_id);
    });

    state.tasks.lock().unwrap().insert(host.id.clone(), handle);
}

pub fn spawn_uptime_loops(app: AppHandle, state: Arc<UptimeState>) {
    let hosts = state.hosts.lock().unwrap().clone();
    for host in hosts {
        spawn_host_loop(app.clone(), state.clone(), host);
    }
}

#[tauri::command]
pub fn get_uptime_hosts(state: State<'_, Arc<UptimeState>>) -> Vec<UptimeHost> {
    state.hosts.lock().unwrap().clone()
}

#[tauri::command]
pub fn get_uptime_history(
    state: State<'_, Arc<UptimeState>>,
) -> HashMap<String, Vec<CheckResult>> {
    state.history.lock().unwrap().clone()
}

#[tauri::command]
pub async fn add_uptime_host(
    host: UptimeHost,
    state: State<'_, Arc<UptimeState>>,
    app: AppHandle,
) -> Result<(), String> {
    {
        let mut hosts = state.hosts.lock().unwrap();
        if hosts.iter().any(|existing| existing.id == host.id) {
            return Err("Host already exists".to_string());
        }
        hosts.push(host.clone());
    }

    save_hosts_to_db(&app, &state).await?;
    spawn_host_loop(app, state.inner().clone(), host);
    Ok(())
}

#[tauri::command]
pub async fn remove_uptime_host(
    host_id: String,
    state: State<'_, Arc<UptimeState>>,
    app: AppHandle,
) -> Result<(), String> {
    {
        let mut hosts = state.hosts.lock().unwrap();
        hosts.retain(|host| host.id != host_id);
    }

    if let Some(handle) = state.tasks.lock().unwrap().remove(&host_id) {
        handle.abort();
    }

    state.history.lock().unwrap().remove(&host_id);
    save_hosts_to_db(&app, &state).await
}

async fn save_hosts_to_db(
    app: &AppHandle,
    state: &State<'_, Arc<UptimeState>>,
) -> Result<(), String> {
    let conn = open_db(app)?;
    ensure_uptime_table(&conn)?;
    let hosts = state.hosts.lock().unwrap().clone();
    let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;

    tx.execute("DELETE FROM uptime_hosts", [])
        .map_err(|e| e.to_string())?;

    for host in hosts {
        tx.execute(
            "INSERT INTO uptime_hosts (id, name, url, interval_secs)
             VALUES (?1, ?2, ?3, ?4)",
            params![host.id, host.name, host.url, host.interval_secs],
        )
        .map_err(|e| e.to_string())?;
    }

    tx.commit().map_err(|e| e.to_string())
}
