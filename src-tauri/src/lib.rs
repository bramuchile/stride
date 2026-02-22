mod commands;

use commands::webview::WebviewRegistry;
use std::collections::HashMap;
use std::sync::Mutex;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running Stride");
}
