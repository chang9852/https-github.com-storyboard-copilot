use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize)]
pub struct ProjectState {
    pub id: String,
    pub name: String,
    pub cells: Vec<CellState>,
    pub connections: Vec<ConnectionState>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CellState {
    pub id: String,
    pub cell_type: String,
    pub position: Position,
    pub size: Size,
    pub data: serde_json::Value,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Position {
    pub x: f64,
    pub y: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Size {
    pub width: f64,
    pub height: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ConnectionState {
    pub id: String,
    pub from_cell_id: String,
    pub to_cell_id: String,
}

fn get_project_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app data dir: {}", e))?;
    let projects_dir = app_data_dir.join("projects");
    std::fs::create_dir_all(&projects_dir)
        .map_err(|e| format!("Failed to create projects dir: {}", e))?;
    Ok(projects_dir)
}

#[tauri::command]
pub async fn save_project_state(
    app: tauri::AppHandle,
    project: ProjectState,
) -> Result<String, String> {
    let projects_dir = get_project_dir(&app)?;
    let file_path = projects_dir.join(format!("{}.json", project.id));

    let json = serde_json::to_string_pretty(&project)
        .map_err(|e| format!("Failed to serialize project: {}", e))?;

    std::fs::write(&file_path, json)
        .map_err(|e| format!("Failed to write project file: {}", e))?;

    Ok(file_path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn load_project_state(
    app: tauri::AppHandle,
    project_id: String,
) -> Result<ProjectState, String> {
    let projects_dir = get_project_dir(&app)?;
    let file_path = projects_dir.join(format!("{}.json", project_id));

    if !file_path.exists() {
        return Err("Project not found".to_string());
    }

    let json = std::fs::read_to_string(&file_path)
        .map_err(|e| format!("Failed to read project file: {}", e))?;

    let project: ProjectState = serde_json::from_str(&json)
        .map_err(|e| format!("Failed to deserialize project: {}", e))?;

    Ok(project)
}

#[tauri::command]
pub async fn list_project_states(app: tauri::AppHandle) -> Result<Vec<String>, String> {
    let projects_dir = get_project_dir(&app)?;

    let entries = std::fs::read_dir(&projects_dir)
        .map_err(|e| format!("Failed to read projects dir: {}", e))?;

    let mut project_ids = Vec::new();
    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let path = entry.path();
        if path.extension().and_then(|s| s.to_str()) == Some("json") {
            if let Some(stem) = path.file_stem().and_then(|s| s.to_str()) {
                project_ids.push(stem.to_string());
            }
        }
    }

    Ok(project_ids)
}

#[tauri::command]
pub async fn delete_project_state(
    app: tauri::AppHandle,
    project_id: String,
) -> Result<(), String> {
    let projects_dir = get_project_dir(&app)?;
    let file_path = projects_dir.join(format!("{}.json", project_id));

    if file_path.exists() {
        std::fs::remove_file(&file_path)
            .map_err(|e| format!("Failed to delete project file: {}", e))?;
    }

    Ok(())
}
