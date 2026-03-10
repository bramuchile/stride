/// Flujo OAuth 2.0 de Google con servidor de callback local (tiny_http).
/// Usado para conectar la cuenta Google del usuario y obtener tokens de acceso.

use std::net::TcpListener;

const CLIENT_ID: &str = env!("GOOGLE_CLIENT_ID");
const CLIENT_SECRET: &str = env!("GOOGLE_CLIENT_SECRET");
const GOOGLE_AUTH_URL: &str = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL: &str = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL: &str = "https://www.googleapis.com/oauth2/v2/userinfo";
const SCOPES: &str =
    "openid email profile https://www.googleapis.com/auth/calendar.readonly";

/// Perfil completo obtenido tras el flujo OAuth (incluye tokens — no serializar al frontend).
pub struct GoogleProfile {
    pub name: String,
    pub email: String,
    pub picture_url: String,
    pub access_token: String,
    pub refresh_token: String,
}

/// Ejecuta el flujo OAuth completo:
/// 1. Puerto libre → URL OAuth → abrir navegador
/// 2. tiny_http recibe el callback con el código (timeout 120s)
/// 3. Intercambio de código por tokens
/// 4. Petición a userinfo → retornar GoogleProfile
pub async fn start_oauth_flow() -> Result<GoogleProfile, String> {
    // 1. Reservar puerto libre en rango efímero
    let port = {
        let listener = TcpListener::bind("127.0.0.1:0")
            .map_err(|e| format!("No se pudo reservar puerto local: {e}"))?;
        listener
            .local_addr()
            .map_err(|e| format!("Error obteniendo dirección local: {e}"))?
            .port()
        // listener se cierra aquí — tiny_http abrirá el mismo puerto a continuación
    };

    let redirect_uri = format!("http://localhost:{port}/callback");

    // 2. Construir URL de autorización con encoding correcto vía url::Url
    let auth_url = {
        let mut url = url::Url::parse(GOOGLE_AUTH_URL)
            .map_err(|e| format!("URL base OAuth inválida: {e}"))?;
        url.query_pairs_mut()
            .append_pair("response_type", "code")
            .append_pair("client_id", CLIENT_ID)
            .append_pair("redirect_uri", &redirect_uri)
            .append_pair("scope", SCOPES)
            .append_pair("access_type", "offline")
            .append_pair("prompt", "consent");
        url.to_string()
    };

    // 3. Abrir navegador del sistema
    open::that(&auth_url).map_err(|e| format!("No se pudo abrir el navegador: {e}"))?;

    // 4. Levantar servidor tiny_http (bloqueante) en spawn_blocking — timeout 120s
    let code = tauri::async_runtime::spawn_blocking(move || -> Result<String, String> {
        let server = tiny_http::Server::http(format!("127.0.0.1:{port}"))
            .map_err(|e| format!("No se pudo iniciar servidor de callback: {e}"))?;

        server
            .recv_timeout(std::time::Duration::from_secs(120))
            .map_err(|e| format!("Error esperando callback: {e}"))?
            .ok_or_else(|| "Timeout: no se recibió callback de Google en 120s".to_string())
            .and_then(|request| {
                // Extraer código del query string: /callback?code=XXX
                let url_str = request.url().to_string();
                let code = url_str
                    .split('?')
                    .nth(1)
                    .and_then(|qs| {
                        qs.split('&').find_map(|pair| {
                            let (k, v) = pair.split_once('=')?;
                            (k == "code").then(|| v.to_string())
                        })
                    })
                    .ok_or_else(|| {
                        "No se encontró el parámetro 'code' en el callback".to_string()
                    })?;

                // 5. Responder al navegador con página de confirmación
                let html = "<html><body style='font-family:sans-serif;text-align:center;padding:40px'>\
                    <h2>&#x2713; Autenticación completada</h2>\
                    <p>Puedes cerrar esta ventana y volver a Stride.</p>\
                    </body></html>";
                let response = tiny_http::Response::from_string(html)
                    .with_header(
                        tiny_http::Header::from_bytes(
                            &b"Content-Type"[..],
                            &b"text/html; charset=utf-8"[..],
                        )
                        .unwrap(),
                    );
                let _ = request.respond(response);

                Ok(code)
            })
    })
    .await
    .map_err(|e| format!("Error en spawn_blocking: {e}"))??;

    // 6. Intercambiar código por tokens
    let client = reqwest::Client::new();
    let token_resp = client
        .post(GOOGLE_TOKEN_URL)
        .form(&[
            ("code", code.as_str()),
            ("client_id", CLIENT_ID),
            ("client_secret", CLIENT_SECRET),
            ("redirect_uri", redirect_uri.as_str()),
            ("grant_type", "authorization_code"),
        ])
        .send()
        .await
        .map_err(|e| format!("Error en petición de token: {e}"))?
        .json::<serde_json::Value>()
        .await
        .map_err(|e| format!("Error parseando respuesta de token: {e}"))?;

    let access_token = token_resp["access_token"]
        .as_str()
        .ok_or("Respuesta de token sin access_token")?
        .to_string();
    let refresh_token = token_resp["refresh_token"]
        .as_str()
        .ok_or("Respuesta de token sin refresh_token (¿faltó prompt=consent?)")?
        .to_string();

    // 7. Obtener información del usuario
    let userinfo = client
        .get(GOOGLE_USERINFO_URL)
        .bearer_auth(&access_token)
        .send()
        .await
        .map_err(|e| format!("Error obteniendo userinfo: {e}"))?
        .json::<serde_json::Value>()
        .await
        .map_err(|e| format!("Error parseando userinfo: {e}"))?;

    let name = userinfo["name"]
        .as_str()
        .unwrap_or("Usuario Google")
        .to_string();
    let email = userinfo["email"]
        .as_str()
        .ok_or("userinfo sin campo email")?
        .to_string();
    let picture_url = userinfo["picture"].as_str().unwrap_or("").to_string();

    Ok(GoogleProfile {
        name,
        email,
        picture_url,
        access_token,
        refresh_token,
    })
}

/// Obtiene un nuevo access_token usando el refresh_token almacenado.
pub async fn refresh_access_token(refresh_token: &str) -> Result<String, String> {
    let client = reqwest::Client::new();
    let resp = client
        .post(GOOGLE_TOKEN_URL)
        .form(&[
            ("grant_type", "refresh_token"),
            ("refresh_token", refresh_token),
            ("client_id", CLIENT_ID),
            ("client_secret", CLIENT_SECRET),
        ])
        .send()
        .await
        .map_err(|e| format!("Error en refresh request: {e}"))?
        .json::<serde_json::Value>()
        .await
        .map_err(|e| format!("Error parseando refresh response: {e}"))?;

    resp["access_token"]
        .as_str()
        .ok_or_else(|| {
            format!(
                "Refresh falló: {}",
                resp["error"].as_str().unwrap_or("unknown")
            )
        })
        .map(|s| s.to_string())
}
