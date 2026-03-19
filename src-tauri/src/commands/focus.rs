use std::sync::atomic::Ordering;
use tauri::{AppHandle, Manager, Runtime};

use crate::commands::webview::WebviewRegistry;
use crate::filters::FOCUS_MODE_ENABLED;

/// Activar o desactivar Modo Focus globalmente.
/// 1. Actualiza el AtomicBool (afecta a nuevos WebViews que se creen después).
/// 2. Dispara un CustomEvent en TODOS los WebViews activos para toggle inmediato sin reload.
/// La persistencia en SQLite la maneja TypeScript (FocusModeButton).
#[tauri::command]
pub async fn set_focus_mode<R: Runtime>(app: AppHandle<R>, enabled: bool) -> Result<(), String> {
    FOCUS_MODE_ENABLED.store(enabled, Ordering::Relaxed);

    // Construir JS que dispara el evento de toggle en la página
    let js = format!(
        "window.dispatchEvent(new CustomEvent('stride:focus-toggle',{{detail:{{enabled:{}}}}}))",
        if enabled { "true" } else { "false" }
    );

    // Iterar todos los WebViews registrados y enviar el evento.
    // El guard del Mutex debe dropearse antes del loop de eval() para no tener el lock
    // mientras hacemos operaciones async en cada webview.
    let labels: Vec<String> = {
        let registry = app.state::<WebviewRegistry>();
        let guard = registry.0.lock().unwrap();
        guard.values().cloned().collect()
    };

    for label in labels {
        if let Some(wv) = app.get_webview(&label) {
            let _ = wv.eval(&js);
        }
    }

    Ok(())
}

/// Obtener el estado actual de Modo Focus (AtomicBool en memoria).
/// Usado por FocusModeButton en el arranque inicial para sincronizar la UI.
#[tauri::command]
pub async fn get_focus_mode() -> Result<bool, String> {
    Ok(FOCUS_MODE_ENABLED.load(Ordering::Relaxed))
}
