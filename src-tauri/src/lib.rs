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
            // Abrir la BD SQLite y preparar el cache de permisos
            let db_path = app.path().app_data_dir()?.join("stride.db");
            let conn = rusqlite::Connection::open(&db_path)
                .expect("No se pudo abrir stride.db para permisos");
            permissions::init_db(&conn).expect("No se pudo crear tabla permission_grants");
            let map = permissions::load_all(&conn);
            app.manage(PermissionCache {
                map:  Arc::new(Mutex::new(map)),
                conn: Arc::new(Mutex::new(conn)),
            });
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
