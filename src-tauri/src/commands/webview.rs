use serde::Deserialize;
use std::collections::HashMap;
use std::sync::Mutex;
use tauri::{AppHandle, LogicalPosition, LogicalSize, Manager, Runtime, WebviewBuilder, WebviewUrl, Window};

pub struct WebviewRegistry(pub Mutex<HashMap<String, String>>);

// Calcular bounds del webview según layout y posición del panel.
// El webview empieza en y=header_height para dejar espacio al PanelHeader de React.
fn calculate_bounds(
    layout: &str,
    position: usize,
    window_width: f64,
    window_height: f64,
    sidebar_width: f64,
    header_height: f64,
) -> (LogicalPosition<f64>, LogicalSize<f64>) {
    let available_width = window_width - sidebar_width;
    let available_height = window_height - header_height;

    match layout {
        "2col" => {
            let col_width = available_width / 2.0;
            let x = sidebar_width + (position as f64 * col_width);
            (
                LogicalPosition::new(x, header_height),
                LogicalSize::new(col_width, available_height),
            )
        }
        "3col" => {
            let col_width = available_width / 3.0;
            let x = sidebar_width + (position as f64 * col_width);
            (
                LogicalPosition::new(x, header_height),
                LogicalSize::new(col_width, available_height),
            )
        }
        "2x2" => {
            let col_width = available_width / 2.0;
            let row_height = available_height / 2.0;
            let col = position % 2;
            let row = position / 2;
            (
                LogicalPosition::new(
                    sidebar_width + col as f64 * col_width,
                    header_height + row as f64 * row_height,
                ),
                LogicalSize::new(col_width, row_height),
            )
        }
        _ => (
            LogicalPosition::new(sidebar_width, header_height),
            LogicalSize::new(available_width, available_height),
        ),
    }
}

#[tauri::command]
pub async fn create_panel_webview<R: Runtime>(
    app: AppHandle<R>,
    panel_id: String,
    url: String,
    layout: String,
    position: usize,
    sidebar_width: f64,
    header_height: f64,
) -> Result<String, String> {
    // Window<R> (no WebviewWindow<R>) tiene el método add_child via feature unstable
    let window: Window<R> = app
        .get_window("main")
        .ok_or("Ventana principal no encontrada")?;

    let inner_size = window.inner_size().map_err(|e| e.to_string())?;
    let scale = window.scale_factor().map_err(|e| e.to_string())?;
    let logical_width = inner_size.width as f64 / scale;
    let logical_height = inner_size.height as f64 / scale;

    let (pos, size) = calculate_bounds(
        &layout,
        position,
        logical_width,
        logical_height,
        sidebar_width,
        header_height,
    );

    let webview_label = format!("panel-{}", panel_id);

    // Todos los webviews comparten el mismo directorio de datos
    // → WebView2 comparte cookies y sesión automáticamente
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("webview2-profile");

    let parsed_url: url::Url = url.parse().map_err(|e: url::ParseError| e.to_string())?;

    let webview_builder = WebviewBuilder::new(&webview_label, WebviewUrl::External(parsed_url))
        .data_directory(data_dir)
        .auto_resize();

    window
        .add_child(webview_builder, pos, size)
        .map_err(|e| e.to_string())?;

    let registry = app.state::<WebviewRegistry>();
    registry
        .0
        .lock()
        .unwrap()
        .insert(panel_id, webview_label.clone());

    Ok(webview_label)
}

#[tauri::command]
pub async fn destroy_panel_webview<R: Runtime>(
    app: AppHandle<R>,
    panel_id: String,
) -> Result<(), String> {
    let registry = app.state::<WebviewRegistry>();
    let label = {
        let mut map = registry.0.lock().unwrap();
        map.remove(&panel_id)
    };

    if let Some(label) = label {
        if let Some(webview) = app.get_webview(&label) {
            webview.close().map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

#[derive(Deserialize)]
pub struct PanelLayoutInfo {
    pub panel_id: String,
    pub position: usize,
}

#[tauri::command]
pub async fn resize_panel_webviews<R: Runtime>(
    app: AppHandle<R>,
    panels: Vec<PanelLayoutInfo>,
    layout: String,
    sidebar_width: f64,
    header_height: f64,
) -> Result<(), String> {
    let window: Window<R> = app
        .get_window("main")
        .ok_or("Ventana principal no encontrada")?;

    let inner_size = window.inner_size().map_err(|e| e.to_string())?;
    let scale = window.scale_factor().map_err(|e| e.to_string())?;
    let logical_width = inner_size.width as f64 / scale;
    let logical_height = inner_size.height as f64 / scale;

    let registry = app.state::<WebviewRegistry>();
    let map = registry.0.lock().unwrap();

    for panel in panels {
        if let Some(label) = map.get(&panel.panel_id) {
            if let Some(webview) = app.get_webview(label) {
                let (pos, size) = calculate_bounds(
                    &layout,
                    panel.position,
                    logical_width,
                    logical_height,
                    sidebar_width,
                    header_height,
                );
                webview
                    .set_bounds(tauri::Rect {
                        position: pos.into(),
                        size: size.into(),
                    })
                    .map_err(|e| e.to_string())?;
            }
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn hide_all_panel_webviews<R: Runtime>(app: AppHandle<R>) -> Result<(), String> {
    let registry = app.state::<WebviewRegistry>();
    let labels: Vec<String> = registry.0.lock().unwrap().values().cloned().collect();
    for label in labels {
        if let Some(wv) = app.get_webview(&label) {
            let _ = wv.hide();
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn show_panel_webviews<R: Runtime>(
    app: AppHandle<R>,
    panel_ids: Vec<String>,
) -> Result<(), String> {
    let registry = app.state::<WebviewRegistry>();
    let map = registry.0.lock().unwrap();
    for id in panel_ids {
        if let Some(label) = map.get(&id) {
            if let Some(wv) = app.get_webview(label) {
                let _ = wv.show();
            }
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn navigate_panel_webview<R: Runtime>(
    app: AppHandle<R>,
    panel_id: String,
    url: String,
) -> Result<(), String> {
    let registry = app.state::<WebviewRegistry>();
    let label = registry.0.lock().unwrap().get(&panel_id).cloned();

    if let Some(label) = label {
        if let Some(webview) = app.get_webview(&label) {
            let js = format!(
                "window.location.replace({})",
                serde_json::to_string(&url).map_err(|e| e.to_string())?
            );
            webview.eval(&js).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_bounds_2col_left() {
        let (pos, size) = calculate_bounds("2col", 0, 1400.0, 900.0, 52.0, 36.0);
        assert_eq!(pos.x, 52.0);
        assert_eq!(pos.y, 36.0);
        assert!((size.width - 674.0).abs() < 0.01);
        assert_eq!(size.height, 864.0);
    }

    #[test]
    fn test_bounds_2col_right() {
        let (pos, _) = calculate_bounds("2col", 1, 1400.0, 900.0, 52.0, 36.0);
        assert!((pos.x - 726.0).abs() < 0.01);
        assert_eq!(pos.y, 36.0);
    }

    #[test]
    fn test_bounds_2x2_bottom_right() {
        let (pos, size) = calculate_bounds("2x2", 3, 1400.0, 900.0, 52.0, 36.0);
        assert!((pos.x - 726.0).abs() < 0.01);
        assert!((pos.y - 468.0).abs() < 0.01);
        assert!((size.width - 674.0).abs() < 0.01);
        assert!((size.height - 432.0).abs() < 0.01);
    }
}
