mod commands;

use commands::permissions::{self, PermissionCache};
use commands::webview::WebviewRegistry;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            // Crear directorio de datos si no existe (máquina limpia)
            let data_dir = app.path().app_data_dir()?;
            if let Err(e) = std::fs::create_dir_all(&data_dir) {
                eprintln!("[Stride] No se pudo crear app_data_dir: {e}");
            }
            let db_path = data_dir.join("stride.db");

            // Abrir BD de permisos — si falla, continuar con cache en memoria vacío
            let cache = match rusqlite::Connection::open(&db_path) {
                Ok(conn) => {
                    if let Err(e) = permissions::init_db(&conn) {
                        eprintln!("[Stride] No se pudo crear tabla permission_grants: {e}");
                    }
                    let map = permissions::load_all(&conn);
                    PermissionCache {
                        map:  Arc::new(Mutex::new(map)),
                        conn: Arc::new(Mutex::new(conn)),
                    }
                }
                Err(e) => {
                    eprintln!("[Stride] No se pudo abrir stride.db para permisos: {e}. Los permisos no se persistirán.");
                    // Fallback: BD en memoria para que la app arranque igualmente
                    let conn = rusqlite::Connection::open_in_memory()
                        .expect("SQLite en memoria no disponible — fallo crítico del sistema");
                    PermissionCache {
                        map:  Arc::new(Mutex::new(HashMap::new())),
                        conn: Arc::new(Mutex::new(conn)),
                    }
                }
            };
            app.manage(cache);
            Ok(())
        })
        .manage(WebviewRegistry(Mutex::new(HashMap::new())))
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_sql::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            commands::webview::create_panel_webview,
            commands::webview::destroy_panel_webview,
            commands::webview::resize_panel_webviews,
            commands::webview::hide_all_panel_webviews,
            commands::webview::show_panel_webviews,
            commands::webview::navigate_panel_webview,
            commands::permissions::reset_permissions,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Stride");
}
