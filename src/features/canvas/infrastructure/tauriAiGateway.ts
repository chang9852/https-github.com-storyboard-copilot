import { invoke } from "@tauri-apps/api/core";
import type { AiGateway, GenerateImagePayload } from "../application/ports";
import { imageUrlToDataUrl, persistImageLocally } from "../application/imageData";

async function normalizeReferenceImages(payload: GenerateImagePayload): Promise<string[] | undefined> {
  const isKieModel = payload.model.startsWith('kie/');
  const isFalModel = payload.model.startsWith('fal/');
  return payload.referenceImages
    ? await Promise.all(
      payload.referenceImages.map(async (imageUrl) =>
        isKieModel || isFalModel
          ? await imageUrlToDataUrl(imageUrl)
          : await persistImageLocally(imageUrl)
      )
    )
    : undefined;
}

export const tauriAiGateway: AiGateway = {
  setApiKey: async (provider: string, apiKey: string) => {
    await invoke("set_api_key", { provider, apiKey });
  },

  generateImage: async (payload: GenerateImagePayload) => {
    const normalizedReferenceImages = await normalizeReferenceImages(payload);

    const result = await invoke<string>("generate_image", {
      request: {
        prompt: payload.prompt,
        model: payload.model,
        size: payload.size,
        aspect_ratio: payload.aspectRatio,
        reference_images: normalizedReferenceImages,
        extra_params: payload.extraParams,
      },
    });
    return result;
  },

  submitGenerateImageJob: async (payload: GenerateImagePayload) => {
    const normalizedReferenceImages = await normalizeReferenceImages(payload);

    const result = await invoke<string>("submit_generate_image_job", {
      request: {
        prompt: payload.prompt,
        model: payload.model,
        size: payload.size,
        aspect_ratio: payload.aspectRatio,
        reference_images: normalizedReferenceImages,
        extra_params: payload.extraParams,
      },
    });
    return result;
  },

  getGenerateImageJob: async (jobId: string) => {
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
  },
};