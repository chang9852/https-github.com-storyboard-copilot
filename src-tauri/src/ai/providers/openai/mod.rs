use reqwest::Client;
use serde::Deserialize;
use serde_json::json;
use std::sync::Arc;
use tokio::sync::RwLock;
use tracing::info;

use crate::ai::error::AIError;
use crate::ai::{AIProvider, GenerateRequest};

const BASE_URL: &str = "https://api.ranmeng.icu";
const IMAGE_GENERATIONS_PATH: &str = "/v1/images/generations";
const MODEL_ID: &str = "gpt-image-2";

#[derive(Debug, Deserialize)]
struct ImageGenerationResponse {
    data: Vec<ImageGenerationData>,
}

#[derive(Debug, Deserialize)]
struct ImageGenerationData {
    url: Option<String>,
    b64_json: Option<String>,
}

pub struct OpenAIProvider {
    client: Client,
    api_key: Arc<RwLock<Option<String>>>,
}

impl OpenAIProvider {
    pub fn new() -> Self {
        Self {
            client: super::build_http_client(),
            api_key: Arc::new(RwLock::new(None)),
        }
    }

    fn sanitize_model(model: &str) -> String {
        model
            .split_once('/')
            .map(|(_, bare)| bare.to_string())
            .unwrap_or_else(|| model.to_string())
    }

    fn resolve_size(aspect_ratio: &str) -> &'static str {
        match aspect_ratio {
            "16:9" | "4:3" | "3:2" => "1536x1024",
            "9:16" | "3:4" | "2:3" => "1024x1536",
            _ => "1024x1024",
        }
    }

    fn extract_image_source(response: ImageGenerationResponse) -> Result<String, AIError> {
        let first =
            response.data.into_iter().next().ok_or_else(|| {
                AIError::Provider("OpenAI image response has no data".to_string())
            })?;

        if let Some(url) = first.url.filter(|value| !value.trim().is_empty()) {
            return Ok(url);
        }

        if let Some(b64_json) = first.b64_json.filter(|value| !value.trim().is_empty()) {
            return Ok(format!("data:image/png;base64,{}", b64_json));
        }

        Err(AIError::Provider(
            "OpenAI image response has no url or b64_json".to_string(),
        ))
    }
}

impl Default for OpenAIProvider {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait::async_trait]
impl AIProvider for OpenAIProvider {
    fn name(&self) -> &str {
        "openai"
    }

    fn supports_model(&self, model: &str) -> bool {
        Self::sanitize_model(model) == MODEL_ID
    }

    fn list_models(&self) -> Vec<String> {
        vec!["openai/gpt-image-2".to_string()]
    }

    async fn set_api_key(&self, api_key: String) -> Result<(), AIError> {
        let mut key = self.api_key.write().await;
        *key = Some(api_key);
        Ok(())
    }

    async fn generate(&self, request: GenerateRequest) -> Result<String, AIError> {
        let api_key = self
            .api_key
            .read()
            .await
            .clone()
            .ok_or_else(|| AIError::InvalidRequest("API key not set".to_string()))?;

        let model = Self::sanitize_model(&request.model);
        if model != MODEL_ID {
            return Err(AIError::ModelNotSupported(request.model));
        }

        if request
            .reference_images
            .as_ref()
            .map(|images| !images.is_empty())
            .unwrap_or(false)
        {
            return Err(AIError::InvalidRequest(
                "OpenAI gpt-image-2 provider only supports image generations, not image edits"
                    .to_string(),
            ));
        }

        let endpoint = format!("{}{}", BASE_URL, IMAGE_GENERATIONS_PATH);
        let size = Self::resolve_size(request.aspect_ratio.as_str());
        let body = json!({
            "model": MODEL_ID,
            "prompt": request.prompt,
            "size": size,
            "n": 1
        });

        info!(
            "[OpenAI Image Request] endpoint: {}, model: {}, size: {}, aspect_ratio: {}",
            endpoint, MODEL_ID, size, request.aspect_ratio
        );

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
                "OpenAI image generation failed {}: {}",
                status, raw_response
            )));
        }

        let result =
            serde_json::from_str::<ImageGenerationResponse>(&raw_response).map_err(|err| {
                AIError::Provider(format!(
                    "OpenAI image generation invalid JSON response: {}; raw={}",
                    err, raw_response
                ))
            })?;

        Self::extract_image_source(result)
    }
}
