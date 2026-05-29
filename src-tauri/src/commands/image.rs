use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Serialize, Deserialize)]
pub struct GridCell {
    pub index: u32,
    pub x: u32,
    pub y: u32,
    pub width: u32,
    pub height: u32,
    pub image_data: Vec<u8>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GridSplitResult {
    pub cells: Vec<GridCell>,
}

fn sanitize_file_stem(name: &str) -> String {
    name.chars()
        .map(|c| if c.is_alphanumeric() || c == '-' || c == '_' { c } else { '_' })
        .collect()
}

fn normalize_extension(ext: &str) -> String {
    match ext.to_lowercase().as_str() {
        "jpg" | "jpeg" => "jpg",
        "webp" => "webp",
        "gif" => "gif",
        _ => "png",
    }
    .to_string()
}

fn ensure_unique_path(path: PathBuf) -> PathBuf {
    if !path.exists() {
        return path;
    }
    let stem = path.file_stem().unwrap_or_default().to_string_lossy().to_string();
    let ext = path.extension().unwrap_or_default().to_string_lossy().to_string();
    let parent = path.parent().unwrap_or_else(|| std::path::Path::new("."));
    let mut counter = 1u32;
    loop {
        let new_name = format!("{}-{}.{}", stem, counter, ext);
        let new_path = parent.join(new_name);
        if !new_path.exists() {
            return new_path;
        }
        counter += 1;
    }
}

#[tauri::command]
pub async fn split_grid_image(
    image_url: String,
    columns: u32,
    rows: u32,
) -> Result<GridSplitResult, String> {
    let client = reqwest::Client::new();

    // Download image
    let resp = client
        .get(&image_url)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let bytes = resp.bytes().await.map_err(|e| e.to_string())?;

    // Decode image
    let img = image::load_from_memory(&bytes).map_err(|e| e.to_string())?;

    let img_width = img.width();
    let img_height = img.height();

    let cell_width = img_width / columns;
    let cell_height = img_height / rows;

    let mut cells = Vec::new();

    for row in 0..rows {
        for col in 0..columns {
            let x = col * cell_width;
            let y = row * cell_height;

            let cell_img = img.crop_imm(x, y, cell_width, cell_height).to_rgb8();

            let mut buffer: Vec<u8> = Vec::new();
            cell_img
                .write_to(&mut std::io::Cursor::new(&mut buffer), image::ImageFormat::Png)
                .map_err(|e| e.to_string())?;

            cells.push(GridCell {
                index: row * columns + col,
                x,
                y,
                width: cell_width,
                height: cell_height,
                image_data: buffer,
            });
        }
    }

    Ok(GridSplitResult { cells })
}

#[tauri::command]
pub async fn save_image_source_to_app_debug_dir(
    app: tauri::AppHandle,
    source: String,
    category: Option<String>,
    suggested_file_name: Option<String>,
) -> Result<String, String> {
    let trimmed_source = source.trim();
    if trimmed_source.is_empty() {
        return Err("Image source is empty".to_string());
    }

    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app data dir: {}", e))?;
    let normalized_category = sanitize_file_stem(category.as_deref().unwrap_or("grid"));
    let target_dir = app_data_dir.join("debug").join(normalized_category);
    std::fs::create_dir_all(&target_dir)
        .map_err(|e| format!("Failed to create app debug dir: {}", e))?;

    // Handle base64 data URLs
    let (bytes, extension) = if trimmed_source.starts_with("data:") {
        let parts: Vec<&str> = trimmed_source.splitn(2, ',').collect();
        if parts.len() != 2 {
            return Err("Invalid data URL".to_string());
        }
        let meta = parts[0];
        let data = parts[1];
        let ext = if meta.contains("image/png") {
            "png"
        } else if meta.contains("image/jpeg") || meta.contains("image/jpg") {
            "jpg"
        } else if meta.contains("image/webp") {
            "webp"
        } else {
            "png"
        };
        use base64::Engine;
        let decoded = base64::engine::general_purpose::STANDARD
            .decode(data)
            .map_err(|e| format!("Failed to decode base64: {}", e))?;
        (decoded, ext.to_string())
    } else {
        // Download from URL
        let client = reqwest::Client::new();
        let resp = client
            .get(trimmed_source)
            .send()
            .await
            .map_err(|e| format!("Failed to download image: {}", e))?;
        let ext = resp
            .headers()
            .get("content-type")
            .and_then(|v| v.to_str().ok())
            .map(|ct| match ct {
                "image/png" => "png",
                "image/jpeg" | "image/jpg" => "jpg",
                "image/webp" => "webp",
                _ => "png",
            })
            .unwrap_or("png")
            .to_string();
        let bytes = resp.bytes().await.map_err(|e| e.to_string())?;
        (bytes.to_vec(), ext)
    };

    let now_millis = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| format!("Failed to resolve current time: {}", e))?
        .as_millis();
    let stem = sanitize_file_stem(suggested_file_name.as_deref().unwrap_or(""));
    let default_stem = if stem.is_empty() {
        format!("debug-{}", now_millis)
    } else {
        stem
    };
    let output_path = ensure_unique_path(target_dir.join(format!(
        "{}.{}",
        default_stem,
        normalize_extension(&extension)
    )));

    std::fs::write(&output_path, bytes)
        .map_err(|e| format!("Failed to save image to app debug dir: {}", e))?;

    Ok(output_path.to_string_lossy().to_string())
}
