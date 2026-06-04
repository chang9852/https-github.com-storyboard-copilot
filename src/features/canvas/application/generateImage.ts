import { canvasAiGateway } from './canvasServices';

export interface GenerationResult {
  imageUrl: string;
}

/**
 * Submit an image generation job and poll until completion.
 * Uses the Tauri-secured AI gateway (no direct browser fetch).
 */
export async function generateImageWithPolling(params: {
  prompt: string;
  model: string;
  size?: string;
  aspectRatio?: string;
  referenceImages?: string[];
  extraParams?: Record<string, unknown>;
  onProgress?: (status: string, elapsed?: number) => void;
}): Promise<GenerationResult> {
  const { prompt, model, size = '1024x1024', aspectRatio = '1:1', referenceImages, extraParams, onProgress } = params;

  const payload = {
    prompt,
    model,
    size,
    aspectRatio,
    referenceImages,
    extraParams,
  };

  // Submit the job
  const jobId = await canvasAiGateway.submitGenerateImageJob(payload);

  // Poll for completion
  const POLL_INTERVAL_MS = 2000;
  const MAX_POLL_DURATION_MS = 360000; // 6 minutes
  const startTime = Date.now();

  while (true) {
    const elapsedMs = Date.now() - startTime;
    if (elapsedMs > MAX_POLL_DURATION_MS) {
      throw new Error('Generation timed out (exceeded 6 minutes)');
    }

    const status = await canvasAiGateway.getGenerateImageJob(jobId);

    onProgress?.(status.status, Math.round(elapsedMs / 1000));

    if (status.status === 'succeeded') {
      if (!status.result) {
        throw new Error('Generation succeeded but returned no result');
      }
      return { imageUrl: status.result };
    }

    if (status.status === 'failed') {
      throw new Error(status.error || 'Generation failed');
    }

    if (status.status === 'not_found') {
      throw new Error('Generation job not found');
    }

    // Wait before polling again
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

/**
 * Convenience: set API key for a provider via the Tauri-secured gateway.
 */
export async function setApiKey(provider: string, apiKey: string): Promise<void> {
  await canvasAiGateway.setApiKey(provider, apiKey);
}