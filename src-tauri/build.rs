fn main() {
    // Carga .env local para desarrollo (en CI las vars se inyectan directamente)
    if let Ok(content) = std::fs::read_to_string(".env") {
        for line in content.lines() {
            let line = line.trim();
            if line.is_empty() || line.starts_with('#') {
                continue;
            }
            if let Some((key, val)) = line.split_once('=') {
                println!("cargo:rustc-env={}={}", key.trim(), val.trim());
            }
        }
    }
    println!("cargo:rerun-if-changed=.env");

    tauri_build::build()
}
