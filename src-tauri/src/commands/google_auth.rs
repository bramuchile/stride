/// Comandos Tauri para gestión de la cuenta Google conectada.
/// La autenticación OAuth se realiza en google_auth.rs (lógica de dominio).
/// La persistencia usa la misma conexión SQLite que PermissionCache (ya gestionada).
use tauri::{AppHandle, Manager, Runtime};

use crate::commands::permissions::{
    delete_google_account, get_google_account_db, save_google_account, PermissionCache,
};
use crate::google_auth::{refresh_access_token, start_oauth_flow};

/// Datos de cuenta que se exponen al frontend (sin tokens).
#[derive(serde::Serialize, serde::Deserialize)]
pub struct GoogleAccountInfo {
    pub name: String,
    pub email: String,
    pub picture_url: String,
}

/// Inicia el flujo OAuth, guarda tokens y retorna la info de la cuenta.
#[tauri::command]
pub async fn connect_google_account<R: Runtime>(
    app: AppHandle<R>,
) -> Result<GoogleAccountInfo, String> {
    let profile = start_oauth_flow().await?;

    let info = GoogleAccountInfo {
        name: profile.name.clone(),
        email: profile.email.clone(),
        picture_url: profile.picture_url.clone(),
    };

    // Guardar en SQLite via PermissionCache (comparte conexión rusqlite)
    {
        let cache = app.state::<PermissionCache>();
        let conn = cache.conn.lock().unwrap();
        save_google_account(&conn, &profile).map_err(|e| e.to_string())?;
    }

    Ok(info)
}

/// Obtiene la cuenta guardada; intenta refresh silencioso del access_token.
/// Retorna None si no hay cuenta o el refresh falla (y borra la cuenta).
#[tauri::command]
pub async fn get_google_account<R: Runtime>(
    app: AppHandle<R>,
) -> Result<Option<GoogleAccountInfo>, String> {
    let cache = app.state::<PermissionCache>();

    let stored = {
        let conn = cache.conn.lock().unwrap();
        get_google_account_db(&conn).map_err(|e| e.to_string())?
    };

    let Some(account) = stored else {
        return Ok(None);
    };

    // Refresh silencioso del access_token al arrancar
    match refresh_access_token(&account.refresh_token).await {
        Ok(new_token) => {
            // Actualizar access_token en DB
            let conn = cache.conn.lock().unwrap();
            conn.execute(
                "UPDATE google_account SET access_token = ?1, updated_at = datetime('now') WHERE id = 1",
                rusqlite::params![new_token],
            )
            .map_err(|e| e.to_string())?;
        }
        Err(e) => {
            // Refresh falló → sesión expirada, limpiar cuenta
            eprintln!("[Stride] Google token refresh falló: {e}. Eliminando cuenta guardada.");
            let conn = cache.conn.lock().unwrap();
            let _ = delete_google_account(&conn);
            return Ok(None);
        }
    }

    Ok(Some(GoogleAccountInfo {
        name: account.name,
        email: account.email,
        picture_url: account.picture_url,
    }))
}

/// Elimina la cuenta Google de SQLite.
#[tauri::command]
pub async fn disconnect_google_account<R: Runtime>(app: AppHandle<R>) -> Result<(), String> {
    let cache = app.state::<PermissionCache>();
    let conn = cache.conn.lock().unwrap();
    delete_google_account(&conn).map_err(|e| e.to_string())
}
