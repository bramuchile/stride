use std::collections::HashMap;
use std::sync::{Arc, Mutex};

use tauri::{AppHandle, Manager, Runtime, Webview};

use crate::google_auth::GoogleProfile;

// ── Estado gestionado por Tauri ───────────────────────────────────────────────

/// Cache en memoria de decisiones de permisos.
/// Clave: "origin|perm_type" (ej. "https://maps.google.com|Geolocation")
/// Valor: true = concedido, false = denegado
#[derive(Clone)]
pub struct PermissionCache {
    pub map: Arc<Mutex<HashMap<String, bool>>>,
    pub conn: Arc<Mutex<rusqlite::Connection>>,
}

// ── Inicialización de la tabla SQLite ─────────────────────────────────────────

pub fn init_db(conn: &rusqlite::Connection) -> rusqlite::Result<()> {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS permission_grants (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            origin     TEXT NOT NULL,
            permission TEXT NOT NULL,
            granted    INTEGER NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            UNIQUE(origin, permission)
        );
        CREATE TABLE IF NOT EXISTS google_account (
            id           INTEGER PRIMARY KEY DEFAULT 1,
            name         TEXT NOT NULL,
            email        TEXT NOT NULL,
            picture_url  TEXT NOT NULL,
            access_token TEXT NOT NULL,
            refresh_token TEXT NOT NULL,
            updated_at   TEXT NOT NULL
        );",
    )
}

// ── Google Account: persistencia ─────────────────────────────────────────────

pub struct StoredGoogleAccount {
    pub name: String,
    pub email: String,
    pub picture_url: String,
    pub refresh_token: String,
}

pub fn save_google_account(
    conn: &rusqlite::Connection,
    profile: &GoogleProfile,
) -> rusqlite::Result<()> {
    conn.execute(
        "INSERT OR REPLACE INTO google_account
            (id, name, email, picture_url, access_token, refresh_token, updated_at)
         VALUES (1, ?1, ?2, ?3, ?4, ?5, datetime('now'))",
        rusqlite::params![
            profile.name,
            profile.email,
            profile.picture_url,
            profile.access_token,
            profile.refresh_token,
        ],
    )?;
    Ok(())
}

pub fn get_google_account_db(
    conn: &rusqlite::Connection,
) -> rusqlite::Result<Option<StoredGoogleAccount>> {
    let result = conn.query_row(
        "SELECT name, email, picture_url, refresh_token FROM google_account WHERE id = 1",
        [],
        |row| {
            Ok(StoredGoogleAccount {
                name: row.get(0)?,
                email: row.get(1)?,
                picture_url: row.get(2)?,
                refresh_token: row.get(3)?,
            })
        },
    );
    match result {
        Ok(account) => Ok(Some(account)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e),
    }
}

pub fn delete_google_account(conn: &rusqlite::Connection) -> rusqlite::Result<()> {
    conn.execute("DELETE FROM google_account WHERE id = 1", [])?;
    Ok(())
}

/// Carga todas las decisiones previas de SQLite al cache en memoria.
/// Se llama durante el setup() para pre-poblar el HashMap.
pub fn load_all(conn: &rusqlite::Connection) -> HashMap<String, bool> {
    let mut map = HashMap::new();
    if let Ok(mut stmt) = conn.prepare("SELECT origin, permission, granted FROM permission_grants")
    {
        if let Ok(rows) = stmt.query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, i32>(2)? != 0,
            ))
        }) {
            for row in rows.flatten() {
                map.insert(format!("{}|{}", row.0, row.1), row.2);
            }
        }
    }
    map
}

// ── Operaciones de persistencia ───────────────────────────────────────────────

fn db_lookup(
    conn: &Arc<Mutex<rusqlite::Connection>>,
    origin: &str,
    permission: &str,
) -> Option<bool> {
    let conn = conn.lock().ok()?;
    conn.query_row(
        "SELECT granted FROM permission_grants WHERE origin = ?1 AND permission = ?2",
        rusqlite::params![origin, permission],
        |row| row.get::<_, i32>(0),
    )
    .ok()
    .map(|v| v != 0)
}

fn db_save(conn: &Arc<Mutex<rusqlite::Connection>>, origin: &str, permission: &str, granted: bool) {
    if let Ok(conn) = conn.lock() {
        let _ = conn.execute(
            "INSERT INTO permission_grants (origin, permission, granted)
             VALUES (?1, ?2, ?3)
             ON CONFLICT(origin, permission) DO UPDATE SET granted = excluded.granted",
            rusqlite::params![origin, permission, granted as i32],
        );
    }
}

// ── Diálogo Win32 nativo ──────────────────────────────────────────────────────

#[cfg(windows)]
fn show_dialog(domain: &str, permission: &str) -> bool {
    use windows::{
        core::PCWSTR,
        Win32::UI::WindowsAndMessaging::{MessageBoxW, IDYES, MB_ICONQUESTION, MB_YESNO},
    };

    let perm_es = match permission {
        "Geolocation" => "tu Ubicación",
        "Camera" => "tu Cámara",
        "Microphone" => "tu Micrófono",
        "Notifications" => "enviar Notificaciones",
        _ => permission,
    };

    let message = format!("{domain} quiere acceder a {perm_es}. ¿Permitir?");
    let title = "Solicitud de permiso";

    let msg_wide: Vec<u16> = message.encode_utf16().chain(std::iter::once(0)).collect();
    let title_wide: Vec<u16> = title.encode_utf16().chain(std::iter::once(0)).collect();

    let result = unsafe {
        MessageBoxW(
            None,
            PCWSTR(msg_wide.as_ptr()),
            PCWSTR(title_wide.as_ptr()),
            MB_YESNO | MB_ICONQUESTION,
        )
    };
    result == IDYES
}

// ── Conversión PWSTR → String (con liberación de CoTaskMem) ──────────────────

/// Convierte un PWSTR asignado con CoTaskMemAlloc a String y libera la memoria.
/// Equivalente a `webview2_com::pwstr::take_pwstr` (módulo privado en 0.38).
#[cfg(windows)]
unsafe fn take_pwstr(pwstr: windows::core::PWSTR) -> String {
    use windows::Win32::System::Com::CoTaskMemFree;

    if pwstr.is_null() {
        return String::new();
    }

    // Calcular longitud hasta el terminador nulo
    let ptr = pwstr.as_ptr();
    let len = (0usize..)
        .take_while(|&i| unsafe { *ptr.add(i) } != 0)
        .count();

    let s = String::from_utf16_lossy(std::slice::from_raw_parts(ptr, len));

    // Liberar la asignación CoTaskMem
    CoTaskMemFree(Some(ptr as *const _));

    s
}

// ── Registro del handler en WebView2 ─────────────────────────────────────────

/// Instala el handler de permisos en el WebView2 subyacente.
/// Se llama una vez por panel justo después de `window.add_child()`.
pub fn attach_handler<R: Runtime>(webview: &Webview<R>, cache: PermissionCache) {
    let _ = webview.with_webview(move |pv| {
        #[cfg(windows)]
        {
            if let Err(e) = unsafe { register_permission_handler(pv, cache) } {
                eprintln!("[Stride] Error registrando handler de permisos: {e:?}");
            }
        }
    });
}

/// Función auxiliar con retorno Result para poder usar `?` dentro.
#[cfg(windows)]
unsafe fn register_permission_handler(
    pv: tauri::webview::PlatformWebview,
    cache: PermissionCache,
) -> windows::core::Result<()> {
    use webview2_com::{
        Microsoft::Web::WebView2::Win32::{
            COREWEBVIEW2_PERMISSION_KIND, COREWEBVIEW2_PERMISSION_KIND_CAMERA,
            COREWEBVIEW2_PERMISSION_KIND_GEOLOCATION, COREWEBVIEW2_PERMISSION_KIND_MICROPHONE,
            COREWEBVIEW2_PERMISSION_KIND_NOTIFICATIONS, COREWEBVIEW2_PERMISSION_STATE_ALLOW,
            COREWEBVIEW2_PERMISSION_STATE_DENY,
        },
        PermissionRequestedEventHandler,
    };

    let core_webview = pv.controller().CoreWebView2()?;
    let mut token: i64 = 0;

    let map = cache.map.clone();
    let conn = cache.conn.clone();

    core_webview.add_PermissionRequested(
        &PermissionRequestedEventHandler::create(Box::new(move |_, args| {
            let Some(args) = args else { return Ok(()) };

            // Tipo de permiso solicitado
            let mut kind = COREWEBVIEW2_PERMISSION_KIND::default();
            args.PermissionKind(&mut kind)?;

            let perm = match kind {
                COREWEBVIEW2_PERMISSION_KIND_GEOLOCATION => "Geolocation",
                COREWEBVIEW2_PERMISSION_KIND_CAMERA => "Camera",
                COREWEBVIEW2_PERMISSION_KIND_MICROPHONE => "Microphone",
                COREWEBVIEW2_PERMISSION_KIND_NOTIFICATIONS => "Notifications",
                // CLIPBOARD_READ lo gestiona wry automáticamente; ignorar el resto
                _ => return Ok(()),
            };

            // Origen (URL completa del sitio que solicita el permiso)
            let mut uri_pwstr = windows::core::PWSTR::null();
            args.Uri(&mut uri_pwstr)?;
            let origin = take_pwstr(uri_pwstr);

            let cache_key = format!("{origin}|{perm}");

            // 1. Cache en memoria (mismo proceso, ruta rápida)
            if let Some(&granted) = map.lock().unwrap().get(&cache_key) {
                args.SetState(if granted {
                    COREWEBVIEW2_PERMISSION_STATE_ALLOW
                } else {
                    COREWEBVIEW2_PERMISSION_STATE_DENY
                })?;
                return Ok(());
            }

            // 2. Persistencia SQLite (sobrevive reinicios de la app)
            if let Some(granted) = db_lookup(&conn, &origin, perm) {
                map.lock().unwrap().insert(cache_key, granted);
                args.SetState(if granted {
                    COREWEBVIEW2_PERMISSION_STATE_ALLOW
                } else {
                    COREWEBVIEW2_PERMISSION_STATE_DENY
                })?;
                return Ok(());
            }

            // 3. Preguntar al usuario con diálogo nativo Win32
            let domain = url::Url::parse(&origin)
                .ok()
                .and_then(|u| u.host_str().map(|h| h.to_string()))
                .unwrap_or_else(|| origin.clone());

            let granted = show_dialog(&domain, perm);

            map.lock().unwrap().insert(cache_key, granted);
            db_save(&conn, &origin, perm, granted);

            args.SetState(if granted {
                COREWEBVIEW2_PERMISSION_STATE_ALLOW
            } else {
                COREWEBVIEW2_PERMISSION_STATE_DENY
            })?;

            Ok(())
        })),
        &mut token,
    )?;

    Ok(())
}

// ── Comando Tauri: resetear permisos ─────────────────────────────────────────

/// Borra permisos guardados.
/// origin=None limpia todos; origin=Some("https://...") limpia solo ese origen.
/// Sin UI por ahora — se llamará desde Settings en Fase 2.
#[tauri::command]
pub async fn reset_permissions<R: Runtime>(
    app: AppHandle<R>,
    origin: Option<String>,
) -> Result<(), String> {
    let cache = app.state::<PermissionCache>();

    // Limpiar cache en memoria
    {
        let mut map = cache.map.lock().unwrap();
        match &origin {
            None => map.clear(),
            Some(o) => map.retain(|k, _| !k.starts_with(o.as_str())),
        }
    }

    // Limpiar SQLite
    {
        let conn = cache.conn.lock().unwrap();
        match &origin {
            None => conn
                .execute("DELETE FROM permission_grants", [])
                .map_err(|e| e.to_string())?,
            Some(o) => conn
                .execute(
                    "DELETE FROM permission_grants WHERE origin = ?1",
                    rusqlite::params![o],
                )
                .map_err(|e| e.to_string())?,
        };
    }

    Ok(())
}
