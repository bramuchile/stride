mod commands;
mod filters;
mod google_auth;

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

            // Abrir BD de permisos — si falla, continuar con cache en memoria vacío.
            // Aprovechar la misma conexión para leer el estado de Modo Focus antes de que
            // TypeScript inicialice plugin-sql (evita race con create_panel_webview).
            let mut focus_enabled_from_db: Option<bool> = None;
            let cache = match rusqlite::Connection::open(&db_path) {
                Ok(conn) => {
                    if let Err(e) = permissions::init_db(&conn) {
                        eprintln!("[Stride] No se pudo crear tabla permission_grants: {e}");
                    }
                    let map = permissions::load_all(&conn);
                    // Leer estado de Modo Focus — settings puede no existir en primer arranque
                    focus_enabled_from_db = conn.query_row(
                        "SELECT value FROM settings WHERE key = 'focus_mode_enabled'",
                        [],
                        |row| row.get::<_, String>(0),
                    ).ok().map(|v| v == "1");
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

            // Aplicar estado de Modo Focus (default: true si no hay registro en DB)
            let focus_enabled = focus_enabled_from_db.unwrap_or(true);
            filters::FOCUS_MODE_ENABLED.store(focus_enabled, std::sync::atomic::Ordering::Relaxed);

            // Inicializar FilterEngine (EasyList bundled o AppData si existe)
            filters::init(app.handle());

            // Actualizar EasyList en background al arrancar (sin bloquear UI)
            // y luego repetir cada 7 días
            let app_bg = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                // Primer intento inmediato (no bloquea el arranque)
                filters::download_and_update(app_bg.clone()).await;
                loop {
                    tokio::time::sleep(std::time::Duration::from_secs(7 * 24 * 3600)).await;
                    filters::download_and_update(app_bg.clone()).await;
                }
            });

            // Ventana overlay para tooltips del sidebar.
            // always_on_top la sitúa sobre las ventanas hijas WebView2 (que de otro modo
            // tapan cualquier contenido web del padre, ignorando el z-index CSS).
            let _ = tauri::WebviewWindowBuilder::new(
                app,
                "tooltip-overlay",
                tauri::WebviewUrl::App("tooltip.html".into()),
            )
            .title("")
            .inner_size(280.0, 30.0)
            .decorations(false)
            .transparent(true)
            .always_on_top(true)
            .skip_taskbar(true)
            .resizable(false)
            .visible(false)
            .build();

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
            commands::webview::go_back_panel_webview,
            commands::webview::go_forward_panel_webview,
            commands::permissions::reset_permissions,
            commands::focus::set_focus_mode,
            commands::focus::get_focus_mode,
            commands::tooltip::show_tooltip,
            commands::tooltip::hide_tooltip,
            commands::google_auth::connect_google_account,
            commands::google_auth::get_google_account,
            commands::google_auth::disconnect_google_account,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Stride");
}
