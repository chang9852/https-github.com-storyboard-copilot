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
