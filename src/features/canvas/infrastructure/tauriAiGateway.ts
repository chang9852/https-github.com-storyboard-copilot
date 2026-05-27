import { invoke } from "@tauri-apps/api/core";
import type { AiGateway, GenerateImagePayload } from "../application/ports";

export class TauriAiGateway implements AiGateway {
  async setApiKey(provider: string, apiKey: string): Promise<void> {
    await invoke("set_api_key", { provider, apiKey });
  }

  async generateImage(payload: GenerateImagePayload): Promise<string> {
    const result = await invoke<string>("generate_image", {
      request: {
        prompt: payload.prompt,
        model: payload.model,
        size: payload.size,
        aspect_ratio: payload.aspectRatio,
        reference_images: payload.referenceImages,
        extra_params: payload.extraParams,
      },
    });
    return result;
  }

  async submitGenerateImageJob(payload: GenerateImagePayload): Promise<string> {
    const result = await invoke<string>("submit_generate_image_job", {
      request: {
        prompt: payload.prompt,
        model: payload.model,
        size: payload.size,
        aspect_ratio: payload.aspectRatio,
        reference_images: payload.referenceImages,
        extra_params: payload.extraParams,
      },
    });
    return result;
  }

  async getGenerateImageJob(jobId: string): Promise<{
    job_id: string;
    status: 'queued' | 'running' | 'succeeded' | 'failed' | 'not_found';
    result?: string | null;
    error?: string | null;
  }> {
    const result = await invoke<{
      job_id: string;
      status: string;
      result?: string | null;
      error?: string | null;
    }>("get_generate_image_job", { jobId });
    return {
      ...result,
      status: result.status as 'queued' | 'running' | 'succeeded' | 'failed' | 'not_found',
    };
  }
}

export const tauriAiGateway = new TauriAiGateway();
