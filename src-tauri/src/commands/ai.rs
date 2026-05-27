use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct GenerateRequest {
    pub provider: String,
    pub model: String,
    pub prompt: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub negative_prompt: Option<String>,
    pub width: u32,
    pub height: u32,
    #[serde(default = "default_num_images")]
    pub num_images: u32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub callback_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub fallback_model: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub api_key: Option<String>,
}

fn default_num_images() -> u32 {
    1
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GenerateResponse {
    pub task_id: String,
    pub provider: String,
    pub status: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TaskStatusResponse {
    pub task_id: String,
    pub status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub images: Option<Vec<ImageResult>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ImageResult {
    pub url: String,
    pub width: u32,
    pub height: u32,
}

#[tauri::command]
pub async fn create_generation_task(request: GenerateRequest) -> Result<GenerateResponse, String> {
    let api_key = request.api_key.as_deref().ok_or("API key not provided")?;
    let client = reqwest::Client::new();

    match request.provider.as_str() {
        "kie" => {
            let body = serde_json::json!({
                "model": request.model,
                "prompt": request.prompt,
                "image_input": [],
                "callBackUrl": request.callback_url,
                "fallbackModel": request.fallback_model,
            });

            let resp = client
                .post("https://api.kie.ai/api/v1/jobs/createTask")
                .header("Authorization", format!("Bearer {}", api_key))
                .header("Content-Type", "application/json")
                .json(&body)
                .send()
                .await
                .map_err(|e| e.to_string())?;

            let data: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;

            Ok(GenerateResponse {
                task_id: data["taskId"].as_str().unwrap_or("").to_string(),
                provider: "kie".to_string(),
                status: "pending".to_string(),
            })
        }
        "fal" => {
            let body = serde_json::json!({
                "prompt": request.prompt,
                "image_size": {
                    "width": request.width,
                    "height": request.height,
                },
                "num_images": request.num_images,
            });

            let model_path = request.model.trim_start_matches("fal-ai/");
            let resp = client
                .post(format!("https://fal.run/fal-ai/{}", model_path))
                .header("Authorization", format!("Key {}", api_key))
                .header("Content-Type", "application/json")
                .json(&body)
                .send()
                .await
                .map_err(|e| e.to_string())?;

            let data: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;

            Ok(GenerateResponse {
                task_id: data["request_id"]
                    .as_str()
                    .unwrap_or("sync")
                    .to_string(),
                provider: "fal".to_string(),
                status: "completed".to_string(),
            })
        }
        _ => Err(format!("Unsupported provider: {}", request.provider)),
    }
}

#[tauri::command]
pub async fn get_task_status(
    provider: String,
    task_id: String,
    api_key: Option<String>,
) -> Result<TaskStatusResponse, String> {
    let client = reqwest::Client::new();

    match provider.as_str() {
        "kie" => {
            let key = api_key.as_deref().ok_or("API key not provided")?;

            let resp = client
                .get(format!(
                    "https://api.kie.ai/api/v1/jobs/recordInfo?taskId={}",
                    task_id
                ))
                .header("Authorization", format!("Bearer {}", key))
                .send()
                .await
                .map_err(|e| e.to_string())?;

            let data: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;

            let status = match data["status"].as_str().unwrap_or("") {
                "SUCCESS" => "completed",
                "FAILED" => "failed",
                _ => "processing",
            };

            let images = if status == "completed" {
                data["output"]["imageUrls"]
                    .as_array()
                    .map(|urls| {
                        urls.iter()
                            .filter_map(|url| {
                                url.as_str().map(|u| ImageResult {
                                    url: u.to_string(),
                                    width: 1024,
                                    height: 1024,
                                })
                            })
                            .collect()
                    })
            } else {
                None
            };

            let error = if status == "failed" {
                data["errorMessage"]
                    .as_str()
                    .map(|s| s.to_string())
            } else {
                None
            };

            Ok(TaskStatusResponse {
                task_id,
                status: status.to_string(),
                images,
                error,
            })
        }
        _ => Err(format!("Unsupported provider: {}", provider)),
    }
}
