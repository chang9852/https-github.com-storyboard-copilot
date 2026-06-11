/**
 * AI service facade — delegates to the Tauri-secured gateway.
 *
 * All actual network calls route through the Rust backend via
 * canvasAiGateway, never directly from the browser.
 */

import { canvasAiGateway } from '@/features/canvas/application/canvasServices';
import { listImageModels, listModelProviders } from '@/features/canvas/models/registry';
import { useSettingsStore } from '@/stores/settingsStore';
import i18n from '@/i18n';
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
  console.info('[AI Service] createGenerationTask starting', {
    provider: params.provider,
    model: params.model,
    promptLength: params.prompt.length,
    aspectRatio: params.aspectRatio,
  });

  // Wait for settings hydration to complete so API keys are loaded from localStorage
  const settingsState = useSettingsStore.getState();
  if (!settingsState.isHydrated) {
    console.warn('[AI Service] settings not yet hydrated, waiting up to 5s...');
    await new Promise<void>((resolve) => {
      let resolved = false;
      const done = () => {
        if (!resolved) {
          resolved = true;
          resolve();
        }
      };
      useSettingsStore.subscribe((state) => {
        if (state.isHydrated) {
          done();
        }
      });
      // Also check immediately in case hydration completed between the check and subscribe
      if (useSettingsStore.getState().isHydrated) {
        done();
      }
      // Safety timeout: if hydration doesn't complete within 5s, proceed anyway
      // (getApiKey will return empty string and the user will see a clear error)
      setTimeout(done, 5000);
    });
  }

  const apiKey = useSettingsStore.getState().getApiKey(params.provider);
  if (!apiKey) {
    console.error('[AI Service] no API key found for provider', params.provider);
    throw new Error(i18n.t('serviceError.noApiKey'));
  }

  console.info('[AI Service] setting API key for provider', params.provider, 'key length:', apiKey.length);

  // Set the API key via the gateway
  await canvasAiGateway.setApiKey(params.provider, apiKey);

  const size = params.resolution || `${params.width}x${params.height}`;

  // Build extraParams: merge caller-provided extraParams with negativePrompt
  const extraParams: Record<string, unknown> = {
    ...(params.negativePrompt ? { negative_prompt: params.negativePrompt } : {}),
  };

  const payload = {
    prompt: params.prompt,
    model: params.model,
    size,
    aspectRatio: params.aspectRatio || '1:1',
    referenceImages: params.referenceImages,
    extraParams,
  };

  console.info('[AI Service] submitting generation job', {
    model: payload.model,
    size: payload.size,
    aspectRatio: payload.aspectRatio,
  });

  // Submit through the gateway
  let jobId: string;
  try {
    jobId = await canvasAiGateway.submitGenerateImageJob(payload);
    console.info('[AI Service] job submitted, jobId:', jobId);
  } catch (submitError) {
    console.error('[AI Service] submitGenerateImageJob failed', submitError);
    throw submitError;
  }

  // Poll for completion
  const startTime = Date.now();

  while (true) {
    const elapsedMs = Date.now() - startTime;
    if (elapsedMs > MAX_POLL_DURATION_MS) {
      console.error('[AI Service] polling timed out after', MAX_POLL_DURATION_MS, 'ms');
      throw new Error(i18n.t('serviceError.timeout'));
    }

    let status;
    try {
      status = await canvasAiGateway.getGenerateImageJob(jobId);
    } catch (pollError) {
      console.error('[AI Service] getGenerateImageJob failed, retrying...', pollError);
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      continue;
    }

    if (status.status === 'succeeded') {
      console.info('[AI Service] job succeeded, result:', status.result?.slice(0, 100));
      return {
        task_id: jobId,
        provider: params.provider,
        status: 'completed',
        images: status.result ? [{ url: status.result }] : [],
      };
    }

    if (status.status === 'failed') {
      console.error('[AI Service] job failed:', status.error);
      throw new Error(status.error || i18n.t('serviceError.generationFailed'));
    }

    if (status.status === 'not_found') {
      console.error('[AI Service] job not found:', jobId);
      throw new Error(i18n.t('serviceError.taskNotFound'));
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
      throw new Error(i18n.t('serviceError.timeout'));
    }

    const status = await canvasAiGateway.getGenerateImageJob(taskId);
    const elapsedSec = Math.round(elapsedMs / 1000);

    onProgress?.(status.status, elapsedSec);

    if (status.status === 'succeeded') {
      if (status.result) {
        return { images: [{ url: status.result }] };
      }
      throw new Error(i18n.t('serviceError.noResult'));
    }

    if (status.status === 'failed') {
      throw new Error(status.error || i18n.t('serviceError.generationFailed'));
    }

    if (status.status === 'not_found') {
      throw new Error(i18n.t('serviceError.taskNotFound'));
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}