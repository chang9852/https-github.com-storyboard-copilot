use base64::{engine::general_purpose::STANDARD, Engine};
use reqwest::Client;
use serde::Deserialize;
use serde_json::{json, Value};
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::RwLock;
use tokio::time::{sleep, Duration};
use tracing::info;

use crate::ai::error::AIError;
use crate::ai::{
    AIProvider, GenerateRequest, ProviderTaskHandle, ProviderTaskPollResult, ProviderTaskSubmission,
};

const DRAW_ENDPOINT_PATH: &str = "/v1/draw/nano-banana";
const RESULT_ENDPOINT_PATH: &str = "/v1/draw/result";
const DEFAULT_BASE_URL: &str = "https://grsai.dakka.com.cn";
const POLL_INTERVAL_MS: u64 = 2000;

#[derive(Debug, Deserialize)]
struct GrsaiDrawResponse {
    code: Option<i64>,
    msg: Option<String>,
    data: Option<GrsaiDrawData>,
}

#[derive(Debug, Deserialize)]
struct GrsaiDrawData {
    task_id: Option<String>,
}

#[derive(Debug, Deserialize)]
struct GrsaiResultResponse {
    code: Option<i64>,
    msg: Option<String>,
    data: Option<GrsaiResultData>,
}

#[derive(Debug, Deserialize)]
struct GrsaiResultData {
    status: Option<String>,
    images: Option<Vec<String>>,
    image_url: Option<String>,
    error: Option<String>,
}

pub struct GrsaiProvider {
    client: Client,
    api_key: Arc<RwLock<Option<String>>>,
    base_url: String,
}

impl GrsaiProvider {
    pub fn new() -> Self {
        Self {
            client: super::build_http_client(),
            api_key: Arc::new(RwLock::new(None)),
            base_url: DEFAULT_BASE_URL.to_string(),
        }
    }

    fn sanitize_model(model: &str) -> String {
        model
            .split_once('/')
            .map(|(_, bare)| bare.to_string())
            .unwrap_or_else(|| model.to_string())
    }

    fn source_to_bytes(source: &str) -> Result<Vec<u8>, String> {
        let trimmed = source.trim();
        if trimmed.is_empty() {
            return Err("source is empty".to_string());
        }

        if let Some((meta, payload)) = trimmed.split_once(',') {
            if meta.starts_with("data:") && meta.ends_with(";base64") && !payload.is_empty() {
                return STANDARD
                    .decode(payload)
                    .map_err(|err| format!("invalid data-url base64 payload: {}", err));
            }
        }

        let likely_base64 = trimmed.len() > 256
            && trimmed
                .chars()
                .all(|ch| ch.is_ascii_alphanumeric() || ch == '+' || ch == '/' || ch == '=');
        if likely_base64 {
            return STANDARD
                .decode(trimmed)
                .map_err(|err| format!("invalid base64 payload: {}", err));
        }

        if trimmed.starts_with("file://") {
            let raw = trimmed.trim_start_matches("file://");
            let decoded = urlencoding::decode(raw)
                .map(|result| result.into_owned())
                .unwrap_or_else(|_| raw.to_string());
            let normalized = if decoded.starts_with('/')
                && decoded.len() > 2
                && decoded.as_bytes().get(2) == Some(&b':')
            {
                &decoded[1..]
            } else {
                &decoded
            };
            return std::fs::read(normalized).map_err(|err| format!("failed to read path: {}", err));
        }

        std::fs::read(trimmed).map_err(|err| format!("failed to read path: {}", err))
    }

    fn encode_reference(source: &str) -> Option<String> {
        if source.starts_with("http://") || source.starts_with("https://") {
            return Some(source.to_string());
        }

        let bytes = Self::source_to_bytes(source).ok()?;
        let encoded = STANDARD.encode(&bytes);
        Some(format!("data:image/png;base64,{}", encoded))
    }
}

impl Default for GrsaiProvider {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait::async_trait]
impl AIProvider for GrsaiProvider {
    fn name(&self) -> &str {
        "grsai"
    }

    fn supports_model(&self, model: &str) -> bool {
        let sanitized = Self::sanitize_model(model);
        sanitized == "nano-banana-2"
            || sanitized == "nano-banana-pro"
    }

    fn list_models(&self) -> Vec<String> {
        vec![
            "grsai/nano-banana-2".to_string(),
            "grsai/nano-banana-pro".to_string(),
        ]
    }

    async fn set_api_key(&self, api_key: String) -> Result<(), AIError> {
        let mut key = self.api_key.write().await;
        *key = Some(api_key);
        Ok(())
    }

    fn supports_task_resume(&self) -> bool {
        true
    }

    async fn submit_task(&self, request: GenerateRequest) -> Result<ProviderTaskSubmission, AIError> {
        let api_key = self
            .api_key
            .read()
            .await
            .clone()
            .ok_or_else(|| AIError::InvalidRequest("API key not set".to_string()))?;

        let model = Self::sanitize_model(&request.model);
        info!("[Grsai Request] model: {}, size: {}", model, request.size);

        let reference_images: Vec<String> = request
            .reference_images
            .as_ref()
            .map(|images| {
                images
                    .iter()
                    .filter_map(|src| Self::encode_reference(src))
                    .collect()
            })
            .unwrap_or_default();

        let endpoint = format!("{}{}", self.base_url, DRAW_ENDPOINT_PATH);
        let body = json!({
            "model": model,
            "prompt": request.prompt,
            "aspect_ratio": request.aspect_ratio,
            "reference_images": reference_images,
        });

        let response = self
            .client
            .post(&endpoint)
            .header("Authorization", format!("Bearer {}", api_key))
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
            .await?;

        let status = response.status();
        let raw_response = response.text().await.unwrap_or_default();
        if !status.is_success() {
            return Err(AIError::Provider(format!(
                "Grsai draw failed {}: {}",
                status, raw_response
            )));
        }

        let result: GrsaiDrawResponse = serde_json::from_str(&raw_response).map_err(|err| {
            AIError::Provider(format!(
                "Grsai invalid JSON response: {}; raw={}",
                err, raw_response
            ))
        })?;

        if result.code.unwrap_or(0) != 0 && result.code != Some(200) {
            return Err(AIError::Provider(format!(
                "Grsai draw rejected: {}",
                result.msg.unwrap_or_else(|| "unknown error".to_string())
            )));
        }

        let task_id = result
            .data
            .and_then(|d| d.task_id)
            .ok_or_else(|| AIError::Provider("Grsai draw missing task_id".to_string()))?;

        Ok(ProviderTaskSubmission::Queued(ProviderTaskHandle {
            task_id,
            metadata: None,
        }))
    }

    async fn poll_task(&self, handle: ProviderTaskHandle) -> Result<ProviderTaskPollResult, AIError> {
        let api_key = self
            .api_key
            .read()
            .await
            .clone()
            .ok_or_else(|| AIError::InvalidRequest("API key not set".to_string()))?;

        let endpoint = format!("{}{}", self.base_url, RESULT_ENDPOINT_PATH);
        let response = self
            .client
            .get(&endpoint)
            .header("Authorization", format!("Bearer {}", api_key))
            .query(&[("task_id", handle.task_id.as_str())])
            .send()
            .await?;

        let status = response.status();
        let raw_response = response.text().await.unwrap_or_default();
        if !status.is_success() {
            return Err(AIError::Provider(format!(
                "Grsai result failed {}: {}",
                status, raw_response
            )));
        }

        let result: GrsaiResultResponse = serde_json::from_str(&raw_response).map_err(|err| {
            AIError::Provider(format!(
                "Grsai invalid JSON response: {}; raw={}",
                err, raw_response
            ))
        })?;

        if result.code.unwrap_or(0) != 0 && result.code != Some(200) {
            return Err(AIError::Provider(format!(
                "Grsai result rejected: {}",
                result.msg.unwrap_or_else(|| "unknown error".to_string())
            )));
        }

        let data = result
            .data
            .ok_or_else(|| AIError::Provider("Grsai result missing data".to_string()))?;

        match data.status.as_deref() {
            Some("success") | Some("completed") => {
                let url = data
                    .images
                    .and_then(|images| images.into_iter().next())
                    .or(data.image_url)
                    .ok_or_else(|| AIError::Provider("Grsai success but no image URL".to_string()))?;
                Ok(ProviderTaskPollResult::Succeeded(url))
            }
            Some("failed") | Some("error") => Ok(ProviderTaskPollResult::Failed(
                data.error.unwrap_or_else(|| "Grsai task failed".to_string()),
            )),
            _ => Ok(ProviderTaskPollResult::Running),
        }
    }

    async fn generate(&self, request: GenerateRequest) -> Result<String, AIError> {
        let submitted = self.submit_task(request).await?;
        let handle = match submitted {
            ProviderTaskSubmission::Succeeded(result) => return Ok(result),
            ProviderTaskSubmission::Queued(handle) => handle,
        };
        loop {
            match self.poll_task(handle.clone()).await? {
                ProviderTaskPollResult::Running => {
                    sleep(Duration::from_millis(POLL_INTERVAL_MS)).await;
                }
                ProviderTaskPollResult::Succeeded(url) => return Ok(url),
                ProviderTaskPollResult::Failed(message) => return Err(AIError::TaskFailed(message)),
            }
        }
    }
}
