use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, LogicalPosition, LogicalSize, Manager, Runtime, WebviewBuilder, WebviewUrl, Window};
use tauri::webview::{NewWindowResponse, PageLoadEvent};
use tauri_plugin_opener::OpenerExt;

pub struct WebviewRegistry(pub Mutex<HashMap<String, String>>);

#[derive(Clone, Serialize)]
struct PanelNavigatedPayload {
    panel_id: String,
    url: String,
}

// Calcular bounds del webview según layout, posición del panel y overlay widget opcional.
// El webview empieza en y=header_height para dejar espacio al PanelHeader de React.
// Si hay un overlay widget (top/bottom), se reduce el área del webview para que React
// pueda renderizar el widget en el espacio libre.
fn calculate_bounds(
    layout: &str,
    position: usize,
    window_width: f64,
    window_height: f64,
    sidebar_width: f64,
    header_height: f64,
    overlay_position: Option<&str>,
    overlay_height_pct: Option<f64>,
    overlay_height_px: Option<f64>,
) -> (LogicalPosition<f64>, LogicalSize<f64>) {
    let available_width = window_width - sidebar_width;
    let available_height = window_height - header_height;

    let (mut pos, mut size) = match layout {
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
    };

    // Ajuste por overlay widget: recortar el área del webview para dejar espacio a React.
    // overlay_height_px tiene prioridad sobre overlay_height_pct (se usa para la barra colapsada).
    if let Some(ov_pos) = overlay_position {
        let overlay_px = if let Some(px) = overlay_height_px {
            px
        } else if let Some(pct) = overlay_height_pct {
            let row_count = if layout == "2x2" { 2.0 } else { 1.0 };
            let panel_height = available_height / row_count;
            panel_height * pct / 100.0
        } else {
            0.0
        };
        if overlay_px > 0.0 {
            match ov_pos {
                "top" => {
                    pos.y += overlay_px;
                    size.height -= overlay_px;
                }
                "bottom" => {
                    size.height -= overlay_px;
                }
                _ => {}
            }
        }
    }

    (pos, size)
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
    overlay_position: Option<String>,
    overlay_height_pct: Option<f64>,
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
        overlay_position.as_deref(),
        overlay_height_pct,
        None,
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

    let panel_id_for_nav = panel_id.clone();
    let app_for_popup = app.clone();

    let webview_builder = WebviewBuilder::new(&webview_label, WebviewUrl::External(parsed_url))
        .data_directory(data_dir)
        // FIX 1: UA estándar de Chrome — evita bloqueos en WhatsApp Web, Google Meet, etc.
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")
        // FIX 2: Habilitar acceso al clipboard
        .enable_clipboard_access()
        // FIX 3: Deshabilitar zoom con Ctrl+Scroll en paneles web
        .zoom_hotkeys_enabled(false)
        // FIX 5: Abrir target=_blank y popups en el navegador del sistema en lugar de perderlos
        .on_new_window(move |url, _features| {
            let _ = app_for_popup.opener().open_url(url.as_str(), None::<&str>);
            NewWindowResponse::Deny
        })
        // FIX 6: Emitir evento al frontend cuando el usuario navega dentro del panel
        .on_page_load(move |webview, payload| {
            if payload.event() == PageLoadEvent::Finished {
                let url_str = payload.url().to_string();
                if !url_str.starts_with("about:")
                    && !url_str.starts_with("data:")
                    && !url_str.starts_with("chrome-extension://")
                    && !url_str.is_empty()
                {
                    let _ = webview.emit("panel-navigated", PanelNavigatedPayload {
                        panel_id: panel_id_for_nav.clone(),
                        url: url_str,
                    });
                }
            }
        })
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
    pub overlay_position: Option<String>,
    pub overlay_height_pct: Option<f64>,
    /// Altura fija en píxeles para el overlay (tiene prioridad sobre overlay_height_pct).
    /// Usada para la barra colapsada (28 px fijos).
    pub overlay_height_px: Option<f64>,
    /// Fracciones personalizadas de ancho para paneles redimensionados manualmente (0.0–1.0)
    pub custom_x_frac: Option<f64>,
    pub custom_width_frac: Option<f64>,
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
                let (mut pos, mut size) = calculate_bounds(
                    &layout,
                    panel.position,
                    logical_width,
                    logical_height,
                    sidebar_width,
                    header_height,
                    panel.overlay_position.as_deref(),
                    panel.overlay_height_pct,
                    panel.overlay_height_px,
                );
                // Si el usuario redimensionó el panel arrastrando el divisor,
                // las fracciones personalizadas sobreescriben el ancho calculado por layout.
                if let (Some(x_frac), Some(w_frac)) = (panel.custom_x_frac, panel.custom_width_frac) {
                    let available_width = logical_width - sidebar_width;
                    pos.x = sidebar_width + x_frac * available_width;
                    size.width = w_frac * available_width;
                }
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

    // sidebar_width=52, header_height=62 (titlebar 30 + panel_bar 32)

    #[test]
    fn test_bounds_2col_left() {
        let (pos, size) = calculate_bounds("2col", 0, 1400.0, 900.0, 52.0, 62.0, None, None, None);
        assert_eq!(pos.x, 52.0);
        assert_eq!(pos.y, 62.0);
        assert!((size.width - 674.0).abs() < 0.01); // (1400-52)/2
        assert_eq!(size.height, 838.0);              // 900-62
    }

    #[test]
    fn test_bounds_2col_right() {
        let (pos, _) = calculate_bounds("2col", 1, 1400.0, 900.0, 52.0, 62.0, None, None, None);
        assert!((pos.x - 726.0).abs() < 0.01); // 52 + 674
        assert_eq!(pos.y, 62.0);
    }

    #[test]
    fn test_bounds_2x2_bottom_right() {
        let (pos, size) = calculate_bounds("2x2", 3, 1400.0, 900.0, 52.0, 62.0, None, None, None);
        assert!((pos.x - 726.0).abs() < 0.01);  // 52 + 674
        assert!((pos.y - 481.0).abs() < 0.01);  // 62 + 419
        assert!((size.width - 674.0).abs() < 0.01);
        assert!((size.height - 419.0).abs() < 0.01); // 838/2
    }

    #[test]
    fn test_bounds_top_overlay() {
        // Panel 3col pos=0 con overlay top 19% → webview arranca más abajo
        let (pos, size) = calculate_bounds("3col", 0, 1400.0, 900.0, 52.0, 62.0, Some("top"), Some(19.0), None);
        let available_height = 900.0 - 62.0; // 838
        let overlay_px = available_height * 19.0 / 100.0;
        assert!((pos.y - (62.0 + overlay_px)).abs() < 0.1);
        assert!((size.height - (available_height - overlay_px)).abs() < 0.1);
    }

    #[test]
    fn test_bounds_bottom_overlay() {
        // Panel 3col pos=2 con overlay bottom 28% → webview es más corto
        let (pos, size) = calculate_bounds("3col", 2, 1400.0, 900.0, 52.0, 62.0, Some("bottom"), Some(28.0), None);
        let available_height = 900.0 - 62.0; // 838
        let overlay_px = available_height * 28.0 / 100.0;
        assert_eq!(pos.y, 62.0); // y no cambia con overlay bottom
        assert!((size.height - (available_height - overlay_px)).abs() < 0.1);
    }
}
