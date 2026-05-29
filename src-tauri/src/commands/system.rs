use serde::{Deserialize, Serialize};
use tauri::Manager;

#[derive(Debug, Serialize, Deserialize)]
pub struct SystemInfo {
    pub app_version: String,
    pub os: String,
    pub arch: String,
    pub rust_version: String,
}

#[tauri::command]
pub async fn get_system_info(app: tauri::AppHandle) -> Result<SystemInfo, String> {
    let app_version = app.package_info().version.to_string();
    let os = std::env::consts::OS.to_string();
    let arch = std::env::consts::ARCH.to_string();
    let rust_version = env!("CARGO_PKG_RUST_VERSION").to_string();

    Ok(SystemInfo {
        app_version,
        os,
        arch,
        rust_version,
    })
}

#[tauri::command]
pub async fn get_app_data_dir(app: tauri::AppHandle) -> Result<String, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app data dir: {}", e))?;

    Ok(app_data_dir.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn open_external_url(url: String) -> Result<(), String> {
    open::that(&url).map_err(|e| format!("Failed to open URL: {}", e))
}
