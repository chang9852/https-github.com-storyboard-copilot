use base64::Engine;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::Manager;

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

// Helper to resolve image source to bytes
async fn resolve_image_source_to_bytes(source: &str) -> Result<(Vec<u8>, String), String> {
    let trimmed = source.trim();
    if trimmed.is_empty() {
        return Err("Image source is empty".to_string());
    }

    if trimmed.starts_with("data:") {
        let parts: Vec<&str> = trimmed.splitn(2, ',').collect();
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
        let decoded = base64::engine::general_purpose::STANDARD
            .decode(data)
            .map_err(|e| format!("Failed to decode base64: {}", e))?;
        Ok((decoded, ext.to_string()))
    } else if trimmed.starts_with("http://") || trimmed.starts_with("https://") {
        let client = reqwest::Client::new();
        let resp = client
            .get(trimmed)
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
        Ok((bytes.to_vec(), ext))
    } else {
        // Local file path
        let path = PathBuf::from(trimmed);
        let ext = path
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("png")
            .to_string();
        let bytes = std::fs::read(&path)
            .map_err(|e| format!("Failed to read file: {}", e))?;
        Ok((bytes, ext))
    }
}

#[tauri::command]
pub async fn split_image(
    image_url: String,
    columns: u32,
    rows: u32,
) -> Result<GridSplitResult, String> {
    split_grid_image(image_url, columns, rows).await
}

#[tauri::command]
pub async fn split_image_source(
    source: String,
    columns: u32,
    rows: u32,
) -> Result<GridSplitResult, String> {
    let (bytes, _) = resolve_image_source_to_bytes(&source).await?;
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
pub async fn prepare_node_image_source(
    source: String,
) -> Result<String, String> {
    let (bytes, ext) = resolve_image_source_to_bytes(&source).await?;
    let encoded = base64::engine::general_purpose::STANDARD.encode(&bytes);
    Ok(format!("data:image/{};base64,{}", ext, encoded))
}

#[tauri::command]
pub async fn crop_image_source(
    source: String,
    x: u32,
    y: u32,
    width: u32,
    height: u32,
) -> Result<String, String> {
    let (bytes, ext) = resolve_image_source_to_bytes(&source).await?;
    let img = image::load_from_memory(&bytes).map_err(|e| e.to_string())?;
    let cropped = img.crop_imm(x, y, width, height);
    let mut buffer: Vec<u8> = Vec::new();
    cropped
        .write_to(&mut std::io::Cursor::new(&mut buffer), image::ImageFormat::Png)
        .map_err(|e| e.to_string())?;
    let encoded = base64::engine::general_purpose::STANDARD.encode(&buffer);
    Ok(format!("data:image/png;base64,{}", encoded))
}

#[tauri::command]
pub async fn merge_storyboard_images(
    images: Vec<String>,
    columns: u32,
    _rows: u32,
    gap: Option<u32>,
) -> Result<String, String> {
    let gap = gap.unwrap_or(0);
    let mut decoded_images = Vec::new();

    for source in &images {
        let (bytes, _) = resolve_image_source_to_bytes(source).await?;
        let img = image::load_from_memory(&bytes).map_err(|e| e.to_string())?;
        decoded_images.push(img);
    }

    if decoded_images.is_empty() {
        return Err("No images to merge".to_string());
    }

    let cell_width = decoded_images[0].width();
    let cell_height = decoded_images[0].height();
    let rows = (decoded_images.len() as u32 + columns - 1) / columns;
    let total_width = columns * cell_width + (columns - 1) * gap;
    let total_height = rows * cell_height + (rows - 1) * gap;

    let mut merged = image::RgbaImage::new(total_width, total_height);
    for (i, img) in decoded_images.iter().enumerate() {
        let col = (i as u32) % columns;
        let row = (i as u32) / columns;
        let x = col * (cell_width + gap);
        let y = row * (cell_height + gap);
        image::imageops::overlay(&mut merged, img, x as i64, y as i64);
    }

    let mut buffer: Vec<u8> = Vec::new();
    merged
        .write_to(&mut std::io::Cursor::new(&mut buffer), image::ImageFormat::Png)
        .map_err(|e| e.to_string())?;
    let encoded = base64::engine::general_purpose::STANDARD.encode(&buffer);
    Ok(format!("data:image/png;base64,{}", encoded))
}

#[tauri::command]
pub async fn persist_image_source(
    app: tauri::AppHandle,
    source: String,
    node_id: String,
) -> Result<String, String> {
    let (bytes, ext) = resolve_image_source_to_bytes(&source).await?;
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app data dir: {}", e))?;
    let images_dir = app_data_dir.join("images");
    std::fs::create_dir_all(&images_dir)
        .map_err(|e| format!("Failed to create images dir: {}", e))?;

    let file_name = format!("{}.{}", sanitize_file_stem(&node_id), ext);
    let file_path = images_dir.join(file_name);
    std::fs::write(&file_path, &bytes)
        .map_err(|e| format!("Failed to write image: {}", e))?;

    Ok(file_path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn save_image_source_to_downloads(
    source: String,
    file_name: Option<String>,
) -> Result<String, String> {
    let (bytes, ext) = resolve_image_source_to_bytes(&source).await?;
    let downloads_dir = directories::UserDirs::new()
        .and_then(|dirs| dirs.download_dir().map(|d| d.to_path_buf()))
        .unwrap_or_else(|| PathBuf::from("."));

    let stem = sanitize_file_stem(file_name.as_deref().unwrap_or("image"));
    let file_path = ensure_unique_path(downloads_dir.join(format!("{}.{}", stem, ext)));
    std::fs::write(&file_path, &bytes)
        .map_err(|e| format!("Failed to save to downloads: {}", e))?;

    Ok(file_path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn save_image_source_to_path(
    source: String,
    path: String,
) -> Result<(), String> {
    let (bytes, _) = resolve_image_source_to_bytes(&source).await?;
    std::fs::write(&path, &bytes)
        .map_err(|e| format!("Failed to save image: {}", e))?;
    Ok(())
}

#[tauri::command]
pub async fn save_image_source_to_directory(
    source: String,
    directory: String,
    file_name: String,
) -> Result<String, String> {
    let (bytes, ext) = resolve_image_source_to_bytes(&source).await?;
    let dir = PathBuf::from(&directory);
    std::fs::create_dir_all(&dir)
        .map_err(|e| format!("Failed to create directory: {}", e))?;

    let stem = sanitize_file_stem(&file_name);
    let file_path = ensure_unique_path(dir.join(format!("{}.{}", stem, ext)));
    std::fs::write(&file_path, &bytes)
        .map_err(|e| format!("Failed to save image: {}", e))?;

    Ok(file_path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn copy_image_source_to_clipboard(
    source: String,
) -> Result<(), String> {
    let (bytes, _) = resolve_image_source_to_bytes(&source).await?;

    let mut clipboard = arboard::Clipboard::new()
        .map_err(|e| format!("Failed to access clipboard: {}", e))?;

    let img_data = arboard::ImageData {
        width: 1,
        height: 1,
        bytes: std::borrow::Cow::Borrowed(&bytes),
    };

    clipboard
        .set_image(img_data)
        .map_err(|e| format!("Failed to copy to clipboard: {}", e))?;

    Ok(())
}
