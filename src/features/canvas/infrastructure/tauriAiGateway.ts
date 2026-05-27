import { invoke } from "@tauri-apps/api/core";
import type { AiGateway } from "../application/ports";
import type { ProviderId, GenerateParams, GenerateResult } from "@/types/ai";

export class TauriAiGateway implements AiGateway {
  async setApiKey(provider: ProviderId, apiKey: string): Promise<void> {
    await invoke("set_api_key", { provider, apiKey });
  }

  async generateImage(params: GenerateParams): Promise<GenerateResult> {
    const result = await invoke<GenerateResult>("generate_image", {
      provider: params.provider,
      model: params.model,
      prompt: params.prompt,
      negativePrompt: params.negativePrompt,
      width: params.width,
      height: params.height,
      numImages: params.numImages || 1,
    });
    return result;
  }

  async submitGenerateImageJob(params: GenerateParams): Promise<{ taskId: string }> {
    const result = await invoke<{ task_id: string }>("submit_generate_image_job", {
      provider: params.provider,
      model: params.model,
      prompt: params.prompt,
      negativePrompt: params.negativePrompt,
      width: params.width,
      height: params.height,
      numImages: params.numImages || 1,
    });
    return { taskId: result.task_id };
  }

  async getGenerateImageJob(taskId: string): Promise<GenerateResult> {
    const result = await invoke<GenerateResult>("get_generate_image_job", { taskId });
    return result;
  }

  async listModels(): Promise<Array<{ id: string; name: string; provider: ProviderId }>> {
    const result = await invoke<Array<{ id: string; name: string; provider: ProviderId }>>("list_models");
    return result;
  }
}

export const tauriAiGateway = new TauriAiGateway();
