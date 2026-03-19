use std::collections::HashSet;
use std::sync::atomic::AtomicBool;
use std::sync::{OnceLock, RwLock};
use tauri::{AppHandle, Manager, Runtime};

/// Estado global de Modo Focus — leído por create_panel_webview y set_focus_mode.
pub static FOCUS_MODE_ENABLED: AtomicBool = AtomicBool::new(true);

/// Reglas de filtrado cargadas desde EasyList.
/// Se inicializan en setup() y se actualizan en background cada 7 días.
pub static FILTER_RULES: OnceLock<RwLock<FilterRules>> = OnceLock::new();

/// Domains that must never be blocked — blocking these breaks core functionality.
/// googlevideo.com: YouTube video stream host (same domain used for ads AND video)
/// youtube.com, ytimg.com: YouTube core infrastructure
static NEVER_BLOCK: &[&str] = &[
    "googlevideo.com",
    "youtube.com",
    "ytimg.com",
    "yt3.ggpht.com",
    "i.ytimg.com",
    "googleapis.com",
];

/// Dominios bloqueados extraídos de EasyList (||domain^ rules solamente).
/// Bundleado en el binario como fallback — se reemplaza por versión descargada si existe.
static BUNDLED_DOMAINS: &str = include_str!("../filters/easylist_domains.txt");
static EASYLIST_RUNTIME_FILE: &str = "easylist_domains.txt";
static EASYPRIVACY_RUNTIME_FILE: &str = "easyprivacy_domains.txt";

/// Template JS de Modo Focus. Rust reemplaza /*STRIDE_DOMAINS*/ con el JSON de dominios.
static FOCUS_FILTER_TEMPLATE: &str = include_str!("focus_filter.js");

pub struct FilterRules {
    pub domains: HashSet<String>,
}

fn merge_domains<I>(lists: I) -> HashSet<String>
where
    I: IntoIterator<Item = Vec<String>>,
{
    let mut merged = HashSet::new();
    for list in lists {
        merged.extend(list);
    }
    merged
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
        if line.is_empty()
            || line.starts_with('!')
            || line.contains("##")
            || line.contains("#@#")
            || line.starts_with("@@")
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

pub fn should_block(url: &str) -> bool {
    let hostname = match url::Url::parse(url)
        .ok()
        .and_then(|u| u.host_str().map(|h| h.to_lowercase()))
    {
        Some(h) if !h.is_empty() => h,
        _ => return false,
    };

    // Never block YouTube core infrastructure
    for never in NEVER_BLOCK {
        if hostname == *never || hostname.ends_with(&format!(".{}", never)) {
            return false;
        }
    }

    let rules = match FILTER_RULES.get() {
        Some(r) => r,
        None => return false,
    };

    let domains = match rules.read() {
        Ok(r) => r,
        Err(_) => return false,
    };

    // O(1) direct lookup
    if domains.domains.contains(&hostname) {
        return true;
    }

    // O(k) where k = number of domain parts (max ~5) — not O(n)
    let parts: Vec<&str> = hostname.split('.').collect();
    for i in 1..parts.len().saturating_sub(1) {
        let suffix = parts[i..].join(".");
        if domains.domains.contains(&suffix) {
            return true;
        }
    }

    false
}

/// Inicializar FilterRules en startup.
/// Prioridad: archivo descargado en AppData > bundled.
pub fn init<R: Runtime>(app: &AppHandle<R>) {
    let rules = FILTER_RULES.get_or_init(|| {
        RwLock::new(FilterRules {
            domains: HashSet::new(),
        })
    });

    // Intentar cargar versión descargada desde AppData
    let app_data_dir = app.path().app_data_dir().ok();

    let mut runtime_lists = Vec::new();

    if let Some(data_dir) = app_data_dir.as_ref() {
        let easylist_path = data_dir.join(EASYLIST_RUNTIME_FILE);
        if easylist_path.exists() {
            match std::fs::read_to_string(&easylist_path) {
                Ok(content) => {
                    eprintln!(
                        "[Stride] EasyList cargado desde AppData ({} líneas)",
                        content.lines().count()
                    );
                    runtime_lists.push(parse_domains(&content));
                }
                Err(e) => {
                    eprintln!("[Stride] Error leyendo EasyList de AppData: {e}");
                }
            }
        }

        let easyprivacy_path = data_dir.join(EASYPRIVACY_RUNTIME_FILE);
        if easyprivacy_path.exists() {
            match std::fs::read_to_string(&easyprivacy_path) {
                Ok(content) => {
                    eprintln!(
                        "[Stride] EasyPrivacy cargado desde AppData ({} líneas)",
                        content.lines().count()
                    );
                    runtime_lists.push(parse_domains(&content));
                }
                Err(e) => {
                    eprintln!("[Stride] Error leyendo EasyPrivacy de AppData: {e}");
                }
            }
        }
    }

    let domains = if runtime_lists.is_empty() {
        eprintln!("[Stride] EasyList/EasyPrivacy no encontrados en AppData — usando bundled");
        parse_domains(BUNDLED_DOMAINS)
            .into_iter()
            .collect::<HashSet<String>>()
    } else {
        merge_domains(runtime_lists)
    };

    eprintln!(
        "[Stride] FilterRules inicializado: {} dominios",
        domains.len()
    );
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
    let lists = [
        (
            "EasyList",
            "https://easylist.to/easylist/easylist.txt",
            EASYLIST_RUNTIME_FILE,
        ),
        (
            "EasyPrivacy",
            "https://easylist.to/easylist/easyprivacy.txt",
            EASYPRIVACY_RUNTIME_FILE,
        ),
    ];

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

    let mut merged_lists = Vec::new();

    for (name, url, out_file) in lists {
        eprintln!("[Stride] Descargando {name} desde {url}...");
        let text = match client.get(url).send().await {
            Ok(resp) => match resp.text().await {
                Ok(t) => t,
                Err(e) => {
                    eprintln!("[Stride] Error leyendo respuesta {name}: {e}");
                    continue;
                }
            },
            Err(e) => {
                eprintln!("[Stride] Error descargando {name}: {e}");
                continue;
            }
        };

        if !text.starts_with("! Title:") && !text.contains(name) {
            eprintln!("[Stride] Respuesta no parece ser {name} válida");
            continue;
        }

        let domains = parse_easylist_domains(&text);
        eprintln!(
            "[Stride] {name} descargada: {} dominios extraídos",
            domains.len()
        );

        if domains.is_empty() {
            eprintln!("[Stride] {name} descargada sin dominios — ignorando");
            continue;
        }

        if let Ok(data_dir) = app.path().app_data_dir() {
            let out_path = data_dir.join(out_file);
            let content = domains.join("\n");
            if let Err(e) = std::fs::write(&out_path, &content) {
                eprintln!("[Stride] Error guardando {name} en AppData: {e}");
            } else {
                eprintln!("[Stride] {name} guardada en {:?}", out_path);
            }
        }

        merged_lists.push(domains);
    }

    if merged_lists.is_empty() {
        eprintln!(
            "[Stride] No se pudo actualizar EasyList/EasyPrivacy — se mantienen reglas actuales"
        );
        return;
    }

    if let Some(rules) = FILTER_RULES.get() {
        if let Ok(mut r) = rules.write() {
            r.domains = merge_domains(merged_lists);
        }
    }
}
