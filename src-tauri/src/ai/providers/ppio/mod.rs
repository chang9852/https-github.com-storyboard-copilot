use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::sync::Arc;
use tokio::sync::RwLock;
use tracing::info;

use crate::ai::error::AIError;
use crate::ai::{AIProvider, GenerateRequest};

const DEFAULT_BASE_URL: &str = "https://api.ppinfra.com";
const DEFAULT_MODEL: &str = "gemini-3.1-flash";

#[derive(Debug, Deserialize)]
struct PpioImageResponse {
    data: Option<Vec<PpioImageData>>,
}

#[derive(Debug, Deserialize)]
struct PpioImageData {
    url: Option<String>,
}

#[derive(Debug, Serialize)]
struct PpioImageRequest {
    model: String,
    prompt: String,
    n: u32,
    size: String,
}

pub struct PPIOProvider {
    client: Client,
    api_key: Arc<RwLock<Option<String>>>,
    base_url: String,
}

impl PPIOProvider {
    pub fn new() -> Self {
        Self {
            client: Client::new(),
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
}

impl Default for PPIOProvider {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait::async_trait]
impl AIProvider for PPIOProvider {
    fn name(&self) -> &str {
        "ppio"
    }

    fn supports_model(&self, model: &str) -> bool {
        let sanitized = Self::sanitize_model(model);
        sanitized == DEFAULT_MODEL || sanitized.starts_with("gemini")
    }

    fn list_models(&self) -> Vec<String> {
        vec!["ppio/gemini-3.1-flash".to_string()]
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
        info!("[PPIO Request] model: {}, size: {}", model, request.size);

        let endpoint = format!("{}/v1/images/generations", self.base_url);
        let body = PpioImageRequest {
            model,
            prompt: request.prompt,
            n: 1,
            size: request.size,
        };

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
                "PPIO request failed {}: {}",
                status, raw_response
            )));
        }

        let result: PpioImageResponse = serde_json::from_str(&raw_response).map_err(|err| {
            AIError::Provider(format!(
                "PPIO invalid JSON response: {}; raw={}",
                err, raw_response
            ))
        })?;

        result
            .data
            .and_then(|data| data.into_iter().next())
            .and_then(|item| item.url)
            .ok_or_else(|| AIError::Provider("PPIO response missing image URL".to_string()))
    }
}
