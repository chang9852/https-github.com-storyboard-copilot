use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct GridSplitRequest {
    pub image_url: String,
    pub columns: u32,
    pub rows: u32,
}

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
