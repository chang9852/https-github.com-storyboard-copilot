use std::sync::Arc;
use std::time::Duration;

use reqwest::Client;

use super::AIProvider;

pub mod fal;
pub mod grsai;
pub mod kie;
pub mod ppio;

pub use fal::FalProvider;
pub use grsai::GrsaiProvider;
pub use kie::KieProvider;
pub use ppio::PPIOProvider;

/// Normalize a resolution string to a pixel width that AI provider APIs accept.
///
/// Shorthand labels ("1K", "2K", "4K") are mapped to their target widths.
/// Dimension strings ("1024x1024") have their width extracted.
/// Everything else is passed through as-is.
pub fn normalize_resolution(size: &str) -> String {
    // Shorthand labels
    match size {
        "0.5K" => return "512".to_string(),
        "1K" => return "1024".to_string(),
        "2K" => return "2048".to_string(),
        "4K" => return "4096".to_string(),
        _ => {}
    }
    // "WxH" format → extract width
    if let Some((w, _)) = size.split_once('x') {
        return w.to_string();
    }
    size.to_string()
}

/// Build a reqwest Client with proper TLS and timeout defaults for AI provider HTTP calls.
///
/// - Connect timeout: 15s (avoid hanging on unreachable hosts)
/// - Response timeout: 300s (5 min — video generation can take several minutes)
/// - TLS: rustls (via Cargo feature `rustls-tls`, must be enabled on reqwest)
fn build_http_client() -> Client {
    Client::builder()
        .connect_timeout(Duration::from_secs(15))
        .timeout(Duration::from_secs(300))
        .build()
        .expect("failed to build reqwest Client")
}

pub fn build_default_providers() -> Vec<Arc<dyn AIProvider>> {
    vec![
        Arc::new(KieProvider::new()),
        Arc::new(FalProvider::new()),
        Arc::new(PPIOProvider::new()),
        Arc::new(GrsaiProvider::new()),
    ]
}
