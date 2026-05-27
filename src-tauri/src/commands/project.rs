use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize)]
pub struct ProjectData {
    pub id: String,
    pub name: String,
    pub description: String,
    pub created_at: String,
    pub updated_at: String,
    pub cells: serde_json::Value,
    pub connections: serde_json::Value,
}

fn get_projects_dir() -> Result<PathBuf, String> {
    let home = dirs::home_dir().ok_or("Cannot find home directory")?;
    let projects_dir = home.join(".storyboard-copilot").join("projects");
    fs::create_dir_all(&projects_dir).map_err(|e| e.to_string())?;
    Ok(projects_dir)
}

#[tauri::command]
pub async fn save_project(project: ProjectData) -> Result<(), String> {
    let dir = get_projects_dir()?;
    let file_path = dir.join(format!("{}.json", project.id));

    let json = serde_json::to_string_pretty(&project).map_err(|e| e.to_string())?;
    fs::write(file_path, json).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn load_project(project_id: String) -> Result<ProjectData, String> {
    let dir = get_projects_dir()?;
    let file_path = dir.join(format!("{}.json", project_id));

    let json = fs::read_to_string(file_path).map_err(|e| e.to_string())?;
    let project: ProjectData = serde_json::from_str(&json).map_err(|e| e.to_string())?;

    Ok(project)
}
