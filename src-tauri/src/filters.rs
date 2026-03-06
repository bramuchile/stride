use std::sync::atomic::AtomicBool;
use std::sync::{OnceLock, RwLock};
use tauri::{AppHandle, Manager, Runtime};

/// Estado global de Modo Focus — leído por create_panel_webview y set_focus_mode.
pub static FOCUS_MODE_ENABLED: AtomicBool = AtomicBool::new(true);

/// Reglas de filtrado cargadas desde EasyList.
/// Se inicializan en setup() y se actualizan en background cada 7 días.
pub static FILTER_RULES: OnceLock<RwLock<FilterRules>> = OnceLock::new();

/// Dominios bloqueados extraídos de EasyList (||domain^ rules solamente).
/// Bundleado en el binario como fallback — se reemplaza por versión descargada si existe.
static BUNDLED_DOMAINS: &str = include_str!("../filters/easylist_domains.txt");

/// Template JS de Modo Focus. Rust reemplaza /*STRIDE_DOMAINS*/ con el JSON de dominios.
static FOCUS_FILTER_TEMPLATE: &str = include_str!("focus_filter.js");

pub struct FilterRules {
    pub domains: Vec<String>,
}

/// Parsear lista de dominios desde texto (formato: un dominio por línea, '#' = comentario).
fn parse_domains(text: &str) -> Vec<String> {
    text.lines()
        .map(|l| l.trim())
        .filter(|l| !l.is_empty() && !l.starts_with('#'))
        .map(|l| l.to_lowercase())
        .collect()
}

/// Parsear EasyList completa — extraer solo reglas ||domain^ sin subdirectorios ni wildcards.
/// Se usa para la versión descargada en runtime.
pub fn parse_easylist_domains(content: &str) -> Vec<String> {
    let mut domains = Vec::new();
    for line in content.lines() {
        let line = line.trim();
        // Ignorar comentarios, reglas CSS (##), excepciones (@@), líneas vacías
        if line.is_empty() || line.starts_with('!') || line.contains("##")
            || line.contains("#@#") || line.starts_with("@@")
        {
            continue;
        }
        // Extraer dominio de reglas ||domain^ (sin subdirectorios ni wildcards)
        if let Some(inner) = line.strip_prefix("||") {
            if let Some(domain) = inner.strip_suffix('^') {
                // Solo aceptar dominios limpios: sin /, sin *, sin @
                if !domain.contains('/') && !domain.contains('*') && !domain.contains('@') {
                    domains.push(domain.to_lowercase());
                }
            }
        }
    }
    domains
}

/// Inicializar FilterRules en startup.
/// Prioridad: archivo descargado en AppData > bundled.
pub fn init<R: Runtime>(app: &AppHandle<R>) {
    let rules = FILTER_RULES.get_or_init(|| RwLock::new(FilterRules { domains: Vec::new() }));

    // Intentar cargar versión descargada desde AppData
    let runtime_path = app
        .path()
        .app_data_dir()
        .ok()
        .map(|d| d.join("easylist_domains.txt"));

    let domains = if let Some(path) = runtime_path.as_ref() {
        if path.exists() {
            match std::fs::read_to_string(path) {
                Ok(content) => {
                    eprintln!("[Stride] EasyList cargado desde AppData ({} líneas)", content.lines().count());
                    parse_domains(&content)
                }
                Err(e) => {
                    eprintln!("[Stride] Error leyendo EasyList de AppData: {e} — usando bundled");
                    parse_domains(BUNDLED_DOMAINS)
                }
            }
        } else {
            eprintln!("[Stride] EasyList no encontrado en AppData — usando bundled");
            parse_domains(BUNDLED_DOMAINS)
        }
    } else {
        parse_domains(BUNDLED_DOMAINS)
    };

    eprintln!("[Stride] FilterRules inicializado: {} dominios", domains.len());
    if let Ok(mut r) = rules.write() {
        r.domains = domains;
    }
}

/// Construir el script JS de Modo Focus con los dominios actuales embebidos.
/// Reemplaza el placeholder `/*STRIDE_DOMAINS*/` con el JSON array de dominios.
pub fn build_focus_script() -> String {
    let rules = match FILTER_RULES.get() {
        Some(r) => r,
        None => return FOCUS_FILTER_TEMPLATE.replace("/*STRIDE_DOMAINS*/", "[]"),
    };

    let domains_json = match rules.read() {
        Ok(r) => serde_json::to_string(&r.domains).unwrap_or_else(|_| "[]".to_string()),
        Err(_) => "[]".to_string(),
    };

    FOCUS_FILTER_TEMPLATE.replace("/*STRIDE_DOMAINS*/", &domains_json)
}

/// Descargar EasyList actualizada y actualizar FilterRules en background.
/// Se llama una vez al arrancar (sin delay) y luego cada 7 días.
pub async fn download_and_update<R: Runtime>(app: AppHandle<R>) {
    let url = "https://easylist.to/easylist/easylist.txt";
    eprintln!("[Stride] Descargando EasyList desde {url}...");

    let client = match reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
    {
        Ok(c) => c,
        Err(e) => {
            eprintln!("[Stride] Error creando cliente HTTP: {e}");
            return;
        }
    };

    let text = match client.get(url).send().await {
        Ok(resp) => match resp.text().await {
            Ok(t) => t,
            Err(e) => { eprintln!("[Stride] Error leyendo respuesta EasyList: {e}"); return; }
        },
        Err(e) => { eprintln!("[Stride] Error descargando EasyList: {e}"); return; }
    };

    // Validar que es EasyList real
    if !text.starts_with("! Title:") && !text.contains("EasyList") {
        eprintln!("[Stride] Respuesta no parece ser EasyList válida");
        return;
    }

    let domains = parse_easylist_domains(&text);
    eprintln!("[Stride] EasyList descargada: {} dominios extraídos", domains.len());

    if domains.is_empty() {
        eprintln!("[Stride] EasyList descargada sin dominios — ignorando");
        return;
    }

    // Guardar en AppData para próximos arranques
    if let Ok(data_dir) = app.path().app_data_dir() {
        let out_path = data_dir.join("easylist_domains.txt");
        let content = domains.join("\n");
        if let Err(e) = std::fs::write(&out_path, &content) {
            eprintln!("[Stride] Error guardando EasyList en AppData: {e}");
        } else {
            eprintln!("[Stride] EasyList guardada en {:?}", out_path);
        }
    }

    // Actualizar FilterRules global — nuevos WebViews usarán las reglas actualizadas
    if let Some(rules) = FILTER_RULES.get() {
        if let Ok(mut r) = rules.write() {
            r.domains = domains;
        }
    }
}
