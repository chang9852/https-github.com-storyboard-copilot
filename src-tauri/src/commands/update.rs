use serde::{Deserialize, Serialize};
use tracing::info;

const GITHUB_LATEST_RELEASE_API: &str =
    "https://api.github.com/repos/chang9852/https-github.com-storyboard-copilot/releases/latest";

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateInfo {
    pub available: bool,
    pub version: Option<String>,
    pub download_url: Option<String>,
    pub release_notes: Option<String>,
}

#[derive(Debug, Deserialize)]
struct GithubReleaseResponse {
    tag_name: Option<String>,
}

#[tauri::command]
pub async fn check_latest_release_tag() -> Result<Option<String>, String> {
    info!("Checking latest release tag from GitHub");
    let client = reqwest::Client::new();
    let response = client
        .get(GITHUB_LATEST_RELEASE_API)
        .header("Accept", "application/vnd.github+json")
        .header("User-Agent", "Storyboard-Copilot")
        .send()
        .await
        .map_err(|e| format!("Failed to check release: {}", e))?;

    if !response.status().is_success() {
        return Ok(None);
    }

    let release: GithubReleaseResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse release response: {}", e))?;

    Ok(release.tag_name)
}

#[tauri::command]
pub async fn check_for_updates() -> Result<UpdateInfo, String> {
    let tag = check_latest_release_tag().await?;
    Ok(UpdateInfo {
        available: tag.is_some(),
        version: tag,
        download_url: None,
        release_notes: None,
    })
}

#[tauri::command]
pub async fn download_update(download_url: String) -> Result<String, String> {
    Ok(format!("Download started: {}", download_url))
}

#[tauri::command]
pub async fn install_update() -> Result<(), String> {
    Ok(())
}
