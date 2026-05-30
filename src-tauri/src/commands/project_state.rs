use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::Manager;

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

#[derive(Debug, Serialize, Deserialize)]
pub struct ProjectSummary {
    pub id: String,
    pub name: String,
    pub node_count: usize,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProjectRecord {
    pub id: String,
    pub name: String,
    pub nodes_json: String,
    pub edges_json: String,
    pub viewport_json: Option<String>,
    pub history_json: Option<String>,
    pub node_count: usize,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ViewportRecord {
    pub viewport_json: String,
}

fn now_iso() -> String {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    format!("{}", now)
}

fn get_projects_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app data dir: {}", e))?;
    let projects_dir = app_data_dir.join("projects");
    std::fs::create_dir_all(&projects_dir)
        .map_err(|e| format!("Failed to create projects dir: {}", e))?;
    Ok(projects_dir)
}

fn project_file_path(app: &tauri::AppHandle, project_id: &str) -> Result<PathBuf, String> {
    let dir = get_projects_dir(app)?;
    Ok(dir.join(format!("{}.json", project_id)))
}

#[tauri::command]
pub async fn list_project_summaries(app: tauri::AppHandle) -> Result<Vec<ProjectSummary>, String> {
    let projects_dir = get_projects_dir(&app)?;

    let entries = std::fs::read_dir(&projects_dir)
        .map_err(|e| format!("Failed to read projects dir: {}", e))?;

    let mut summaries = Vec::new();
    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let path = entry.path();
        if path.extension().and_then(|s| s.to_str()) == Some("json") {
            if let Ok(json) = std::fs::read_to_string(&path) {
                if let Ok(record) = serde_json::from_str::<ProjectRecord>(&json) {
                    summaries.push(ProjectSummary {
                        id: record.id,
                        name: record.name,
                        node_count: record.node_count,
                        created_at: record.created_at.clone(),
                        updated_at: record.updated_at.clone(),
                    });
                }
            }
        }
    }

    summaries.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));
    Ok(summaries)
}

#[tauri::command]
pub async fn get_project_record(
    app: tauri::AppHandle,
    project_id: String,
) -> Result<ProjectRecord, String> {
    let file_path = project_file_path(&app, &project_id)?;

    if !file_path.exists() {
        return Err("Project not found".to_string());
    }

    let json = std::fs::read_to_string(&file_path)
        .map_err(|e| format!("Failed to read project file: {}", e))?;

    let record: ProjectRecord = serde_json::from_str(&json)
        .map_err(|e| format!("Failed to deserialize project: {}", e))?;

    Ok(record)
}

#[tauri::command]
pub async fn upsert_project_record(
    app: tauri::AppHandle,
    record: ProjectRecord,
) -> Result<(), String> {
    let file_path = project_file_path(&app, &record.id)?;
    let json = serde_json::to_string_pretty(&record)
        .map_err(|e| format!("Failed to serialize project: {}", e))?;

    std::fs::write(&file_path, json)
        .map_err(|e| format!("Failed to write project file: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn update_project_viewport_record(
    app: tauri::AppHandle,
    project_id: String,
    viewport: ViewportRecord,
) -> Result<(), String> {
    let file_path = project_file_path(&app, &project_id)?;

    if !file_path.exists() {
        return Err("Project not found".to_string());
    }

    let json = std::fs::read_to_string(&file_path)
        .map_err(|e| format!("Failed to read project file: {}", e))?;

    let mut record: ProjectRecord = serde_json::from_str(&json)
        .map_err(|e| format!("Failed to deserialize project: {}", e))?;

    record.viewport_json = Some(viewport.viewport_json);
    record.updated_at = now_iso();

    let json = serde_json::to_string_pretty(&record)
        .map_err(|e| format!("Failed to serialize project: {}", e))?;

    std::fs::write(&file_path, json)
        .map_err(|e| format!("Failed to write project file: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn rename_project_record(
    app: tauri::AppHandle,
    project_id: String,
    new_name: String,
) -> Result<(), String> {
    let file_path = project_file_path(&app, &project_id)?;

    if !file_path.exists() {
        return Err("Project not found".to_string());
    }

    let json = std::fs::read_to_string(&file_path)
        .map_err(|e| format!("Failed to read project file: {}", e))?;

    let mut record: ProjectRecord = serde_json::from_str(&json)
        .map_err(|e| format!("Failed to deserialize project: {}", e))?;

    record.name = new_name;
    record.updated_at = now_iso();

    let json = serde_json::to_string_pretty(&record)
        .map_err(|e| format!("Failed to serialize project: {}", e))?;

    std::fs::write(&file_path, json)
        .map_err(|e| format!("Failed to write project file: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn delete_project_record(
    app: tauri::AppHandle,
    project_id: String,
) -> Result<(), String> {
    let file_path = project_file_path(&app, &project_id)?;

    if file_path.exists() {
        std::fs::remove_file(&file_path)
            .map_err(|e| format!("Failed to delete project file: {}", e))?;
    }

    Ok(())
}

// Legacy commands for backward compatibility
#[tauri::command]
pub async fn save_project_state(
    app: tauri::AppHandle,
    project: ProjectState,
) -> Result<String, String> {
    let projects_dir = get_projects_dir(&app)?;
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
    let projects_dir = get_projects_dir(&app)?;
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
    let projects_dir = get_projects_dir(&app)?;

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
    delete_project_record(app, project_id).await
}
