/**
 * AI service facade — delegates to the Tauri-secured gateway.
 *
 * All actual network calls route through the Rust backend via
 * canvasAiGateway, never directly from the browser.
 */

import { canvasAiGateway } from '@/features/canvas/application/canvasServices';
import { listImageModels, listModelProviders } from '@/features/canvas/models/registry';
import { useSettingsStore } from '@/stores/settingsStore';
import type { ProviderId } from '@/types/ai';

// --- Provider / Model introspection ---

export type { ProviderId } from '@/types/ai';

export interface AIModel {
  id: string;
  name: string;
  provider: ProviderId;
  type: string;
  maxWidth: number;
  maxHeight: number;
  supportsNegativePrompt: boolean;
}

export interface AIProvider {
  id: ProviderId;
  name: string;
  baseUrl: string;
  authType: 'bearer' | 'key';
  enabled: boolean;
  models: AIModel[];
}

export const PROVIDERS: AIProvider[] = listModelProviders().map((p) => ({
  id: p.id as ProviderId,
  name: p.name || p.label,
  baseUrl: '',
  authType: 'bearer' as const,
  enabled: true,
  models: listImageModels()
    .filter((m) => m.providerId === p.id)
    .map((m) => ({
      id: m.id,
      name: m.displayName,
      provider: m.providerId as ProviderId,
      type: m.mediaType,
      maxWidth: 2048,
      maxHeight: 2048,
      supportsNegativePrompt: false,
    })),
}));

export function getModelsByProvider(providerId: string): AIModel[] {
  return listImageModels()
    .filter((m) => m.providerId === providerId)
    .map((m) => ({
      id: m.id,
      name: m.displayName,
      provider: m.providerId as ProviderId,
      type: m.mediaType,
      maxWidth: 2048,
      maxHeight: 2048,
      supportsNegativePrompt: false,
    }));
}

export function getProviderById(id: string): AIProvider | undefined {
  return PROVIDERS.find((p) => p.id === id);
}

// --- Generation (gateway-backed) ---

export interface GenerateTaskResult {
  task_id: string;
  provider: string;
  status: string;
  images?: { url: string; width?: number; height?: number }[];
}

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_DURATION_MS = 360000; // 6 minutes

/**
 * Submit an image generation job via the Tauri-secured gateway.
 * Handles both async (KIE, fal, grsai) and sync (PPIO) providers.
 */
export async function createGenerationTask(params: {
  provider: ProviderId;
  model: string;
  prompt: string;
  negativePrompt?: string;
  width: number;
  height: number;
  numImages?: number;
  aspectRatio?: string;
  resolution?: string;
  referenceImages?: string[];
}): Promise<GenerateTaskResult> {
  const apiKey = useSettingsStore.getState().getApiKey(params.provider);
  if (!apiKey) {
    throw new Error('请先在设置中配置 API Key');
  }

  // Set the API key via the gateway
  await canvasAiGateway.setApiKey(params.provider, apiKey);

  const size = `${params.width}x${params.height}`;

  // Submit through the gateway
  const jobId = await canvasAiGateway.submitGenerateImageJob({
    prompt: params.prompt,
    model: params.model,
    size,
    aspectRatio: params.aspectRatio || '1:1',
    referenceImages: params.referenceImages,
  });

  // Poll for completion
  const startTime = Date.now();

  while (true) {
    const elapsedMs = Date.now() - startTime;
    if (elapsedMs > MAX_POLL_DURATION_MS) {
      throw new Error('生成超时（超过6分钟）');
    }

    const status = await canvasAiGateway.getGenerateImageJob(jobId);

    if (status.status === 'succeeded') {
      return {
        task_id: jobId,
        provider: params.provider,
        status: 'completed',
        images: status.result ? [{ url: status.result }] : [],
      };
    }

    if (status.status === 'failed') {
      throw new Error(status.error || '生成失败');
    }

    if (status.status === 'not_found') {
      throw new Error('任务未找到');
    }

    // Wait before polling again
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

/**
 * Poll a previously submitted task for completion.
 */
export async function pollTaskResult(
  _provider: ProviderId,
  taskId: string,
  onProgress?: (status: string, elapsed?: number) => void,
): Promise<{ images: { url: string }[] }> {
  const startTime = Date.now();

  while (true) {
    const elapsedMs = Date.now() - startTime;
    if (elapsedMs > MAX_POLL_DURATION_MS) {
      throw new Error('生成超时（超过6分钟）');
    }

    const status = await canvasAiGateway.getGenerateImageJob(taskId);
    const elapsedSec = Math.round(elapsedMs / 1000);

    onProgress?.(status.status, elapsedSec);

    if (status.status === 'succeeded') {
      if (status.result) {
        return { images: [{ url: status.result }] };
      }
      throw new Error('生成完成但未返回图片');
    }

    if (status.status === 'failed') {
      throw new Error(status.error || '生成失败');
    }

    if (status.status === 'not_found') {
      throw new Error('任务未找到');
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}