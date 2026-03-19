use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Manager, Runtime};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Note {
    pub id: String,
    pub title: String,
    pub content: String,
    pub created_at: i64,
    pub updated_at: i64,
}

fn now_ts() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0)
}

fn open_db<R: Runtime>(app: &AppHandle<R>) -> Result<Connection, String> {
    let data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&data_dir).map_err(|e| e.to_string())?;
    let db_path = data_dir.join("stride.db");
    Connection::open(db_path).map_err(|e| e.to_string())
}

fn ensure_tables(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        r#"
        CREATE TABLE IF NOT EXISTS notes (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL DEFAULT '',
          content TEXT NOT NULL DEFAULT '',
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS workspace_widget_state (
          workspace_id TEXT NOT NULL,
          widget_type TEXT NOT NULL,
          state_json TEXT NOT NULL DEFAULT '{}',
          PRIMARY KEY (workspace_id, widget_type)
        );
        "#,
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_notes<R: Runtime>(app: AppHandle<R>) -> Result<Vec<Note>, String> {
    let conn = open_db(&app)?;
    ensure_tables(&conn)?;

    let mut stmt = conn
        .prepare(
            "SELECT id, title, content, created_at, updated_at
             FROM notes
             ORDER BY updated_at DESC, created_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(Note {
                id: row.get(0)?,
                title: row.get(1)?,
                content: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_note<R: Runtime>(
    app: AppHandle<R>,
    title: String,
    content: String,
) -> Result<Note, String> {
    let conn = open_db(&app)?;
    ensure_tables(&conn)?;
    let now = now_ts();

    let note = Note {
        id: uuid::Uuid::new_v4().to_string(),
        title,
        content,
        created_at: now,
        updated_at: now,
    };

    conn.execute(
        "INSERT INTO notes (id, title, content, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![
            &note.id,
            &note.title,
            &note.content,
            note.created_at,
            note.updated_at
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(note)
}

#[tauri::command]
pub async fn update_note<R: Runtime>(
    app: AppHandle<R>,
    id: String,
    title: String,
    content: String,
) -> Result<Note, String> {
    let conn = open_db(&app)?;
    ensure_tables(&conn)?;
    let updated_at = now_ts();

    let affected = conn
        .execute(
            "UPDATE notes
             SET title = ?1, content = ?2, updated_at = ?3
             WHERE id = ?4",
            params![&title, &content, updated_at, &id],
        )
        .map_err(|e| e.to_string())?;

    if affected == 0 {
        return Err("Nota no encontrada".to_string());
    }

    conn.query_row(
        "SELECT id, title, content, created_at, updated_at FROM notes WHERE id = ?1",
        params![&id],
        |row| {
            Ok(Note {
                id: row.get(0)?,
                title: row.get(1)?,
                content: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
            })
        },
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_note<R: Runtime>(app: AppHandle<R>, id: String) -> Result<(), String> {
    let conn = open_db(&app)?;
    ensure_tables(&conn)?;
    conn.execute("DELETE FROM notes WHERE id = ?1", params![&id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn get_workspace_widget_state<R: Runtime>(
    app: AppHandle<R>,
    workspace_id: String,
    widget_type: String,
) -> Result<Option<String>, String> {
    let conn = open_db(&app)?;
    ensure_tables(&conn)?;

    conn.query_row(
        "SELECT state_json
         FROM workspace_widget_state
         WHERE workspace_id = ?1 AND widget_type = ?2",
        params![workspace_id, widget_type],
        |row| row.get::<_, String>(0),
    )
    .optional()
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn set_workspace_widget_state<R: Runtime>(
    app: AppHandle<R>,
    workspace_id: String,
    widget_type: String,
    state_json: String,
) -> Result<(), String> {
    let conn = open_db(&app)?;
    ensure_tables(&conn)?;

    conn.execute(
        "INSERT INTO workspace_widget_state (workspace_id, widget_type, state_json)
         VALUES (?1, ?2, ?3)
         ON CONFLICT(workspace_id, widget_type)
         DO UPDATE SET state_json = excluded.state_json",
        params![workspace_id, widget_type, state_json],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}
