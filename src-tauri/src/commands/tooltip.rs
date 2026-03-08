use tauri::{AppHandle, Manager, PhysicalPosition, WebviewWindow};

/// Mueve la ventana tooltip-overlay a la posición indicada (coordenadas físicas de pantalla)
/// e inyecta el contenido directamente vía eval(). No necesita listener JS en tooltip.html
/// porque el archivo no pasa por Vite y no puede usar bare module imports de @tauri-apps/api.
#[tauri::command]
pub async fn show_tooltip(
    app: AppHandle,
    label: String,
    hint: Option<String>,
    x: i32,
    y: i32,
) -> Result<(), String> {
    let win: WebviewWindow = app
        .get_webview_window("tooltip-overlay")
        .ok_or("tooltip-overlay window not found")?;

    win.set_position(PhysicalPosition::new(x, y))
        .map_err(|e| e.to_string())?;

    win.show().map_err(|e| e.to_string())?;

    // Escapar contenido y actualizar DOM directamente
    let label_js = serde_json::to_string(&label).map_err(|e| e.to_string())?;
    let hint_js = serde_json::to_string(&hint.unwrap_or_default()).map_err(|e| e.to_string())?;

    win.eval(&format!(
        r#"(function(){{
            var l = document.getElementById('label');
            var h = document.getElementById('hint');
            var t = document.getElementById('tip');
            if(l) l.textContent = {label_js};
            if(h) {{ h.textContent = {hint_js}; h.style.display = {hint_js} ? 'inline' : 'none'; }}
            if(t) t.className = 'visible';
        }})()"#,
        label_js = label_js,
        hint_js = hint_js,
    ))
    .map_err(|e| e.to_string())?;

    Ok(())
}

/// Oculta la ventana tooltip-overlay.
#[tauri::command]
pub async fn hide_tooltip(app: AppHandle) -> Result<(), String> {
    if let Some(win) = app.get_webview_window("tooltip-overlay") {
        let _ = win.eval("var t=document.getElementById('tip');if(t)t.className='';");
        win.hide().map_err(|e| e.to_string())?;
    }
    Ok(())
}
