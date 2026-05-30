import { useSettingsStore } from "@/stores/settingsStore";
import type { AIProvider, AIModel, ProviderId } from "@/types/ai";

export const PROVIDERS: AIProvider[] = [
  {
    id: "kie",
    name: "KIE",
    baseUrl: "https://api.kie.ai",
    authType: "bearer",
    enabled: true,
    models: [
      { id: "kie/nano-banana-pro", name: "Nano Banana Pro", provider: "kie", type: "text-to-image", maxWidth: 2048, maxHeight: 2048, supportsNegativePrompt: false },
      { id: "kie/nano-banana-2", name: "Nano Banana 2", provider: "kie", type: "text-to-image", maxWidth: 2048, maxHeight: 2048, supportsNegativePrompt: false },
    ],
  },
  {
    id: "fal",
    name: "fal",
    baseUrl: "https://fal.run",
    authType: "key",
    enabled: true,
    models: [
      { id: "fal/nano-banana-2", name: "Nano Banana 2 (fal)", provider: "fal", type: "text-to-image", maxWidth: 2048, maxHeight: 2048, supportsNegativePrompt: false },
      { id: "fal/nano-banana-pro", name: "Nano Banana Pro (fal)", provider: "fal", type: "text-to-image", maxWidth: 2048, maxHeight: 2048, supportsNegativePrompt: false },
    ],
  },
  {
    id: "ppio",
    name: "PPIO",
    baseUrl: "https://api.ppinfra.com",
    authType: "bearer",
    enabled: false,
    models: [
      { id: "ppio/gemini-3.1-flash", name: "Gemini 3.1 Flash", provider: "ppio", type: "text-to-image", maxWidth: 4096, maxHeight: 4096, supportsNegativePrompt: false },
    ],
  },
  {
    id: "grsai",
    name: "Grsai",
    baseUrl: "https://api.grsai.com",
    authType: "key",
    enabled: false,
    models: [
      { id: "grsai/nano-banana-2", name: "Nano Banana 2", provider: "grsai", type: "text-to-image", maxWidth: 2048, maxHeight: 2048, supportsNegativePrompt: false },
      { id: "grsai/nano-banana-pro", name: "Nano Banana Pro", provider: "grsai", type: "text-to-image", maxWidth: 2048, maxHeight: 2048, supportsNegativePrompt: false },
    ],
  },
];

export function getModelsByProvider(providerId: ProviderId): AIModel[] {
  const provider = PROVIDERS.find((p) => p.id === providerId);
  return provider?.models || [];
}

export function getProviderById(id: ProviderId): AIProvider | undefined {
  return PROVIDERS.find((p) => p.id === id);
}

// --- KIE API ---

interface KieCreateTaskResponse {
  code: number;
  msg: string;
  data: {
    taskId: string;
  };
}

interface KieTaskStatusResponse {
  code: number;
  msg: string;
  data: {
    taskId: string;
    status: string;
    result?: {
      imageUrl?: string;
      images?: { url: string; width: number; height: number }[];
    };
    error?: string;
  };
}

// --- fal API ---

interface FalGenerateResponse {
  images?: { url: string; width: number; height: number }[];
}

// --- Public API ---

interface GenerateTaskResult {
  task_id: string;
  provider: string;
  status: string;
  images?: { url: string; width: number; height: number }[];
}

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
    throw new Error("请先在设置中配置 API Key");
  }

  const provider = getProviderById(params.provider);
  if (!provider) {
    throw new Error("未知的供应商");
  }

  // KIE API
  if (params.provider === "kie") {
    const aspectRatio = params.aspectRatio || "1:1";
    const resolution = params.resolution || "2K";
    const kieModelName = params.model.replace(/^kie\//, '');

    const response = await fetch(`${provider.baseUrl}/api/v1/jobs/createTask`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: kieModelName,
        input: {
          prompt: params.prompt,
          aspect_ratio: aspectRatio,
          resolution: resolution,
          output_format: "png",
          ...(params.referenceImages && params.referenceImages.length > 0 && {
            reference_images: params.referenceImages,
          }),
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API 错误: ${error}`);
    }

    const result: KieCreateTaskResponse = await response.json();

    if (result.code !== 200) {
      throw new Error(result.msg || "创建任务失败");
    }

    return {
      task_id: result.data.taskId,
      provider: params.provider,
      status: "queued",
    };
  }

  // fal API
  if (params.provider === "fal") {
    const response = await fetch(`https://fal.run/${params.model}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Key ${apiKey}`,
      },
      body: JSON.stringify({
        prompt: params.prompt,
        image_size: { width: params.width, height: params.height },
        num_images: params.numImages || 1,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API 错误: ${error}`);
    }

    const result: FalGenerateResponse = await response.json();

    return {
      task_id: "fal-direct",
      provider: params.provider,
      status: "completed",
      images: result.images || [],
    };
  }

  // PPIO API
  if (params.provider === "ppio") {
    const response = await fetch(`${provider.baseUrl}/v1/images/generations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: params.model.replace(/^ppio\//, ''),
        prompt: params.prompt,
        n: params.numImages || 1,
        size: `${params.width}x${params.height}`,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API 错误: ${error}`);
    }

    const result = await response.json();
    return {
      task_id: "ppio-direct",
      provider: params.provider,
      status: "completed",
      images: result.data?.map((img: any) => ({ url: img.url, width: params.width, height: params.height })) || [],
    };
  }

  // Grsai API
  if (params.provider === "grsai") {
    const response = await fetch(`${provider.baseUrl}/v1/images/generations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: params.model.replace(/^grsai\//, ''),
        prompt: params.prompt,
        n: params.numImages || 1,
        size: `${params.width}x${params.height}`,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API 错误: ${error}`);
    }

    const result = await response.json();
    return {
      task_id: "grsai-direct",
      provider: params.provider,
      status: "completed",
      images: result.data?.map((img: any) => ({ url: img.url, width: params.width, height: params.height })) || [],
    };
  }

  throw new Error("不支持的供应商");
}

export async function pollTaskResult(
  provider: ProviderId,
  taskId: string,
  onProgress?: (status: string, elapsed?: number) => void,
): Promise<{ images: { url: string }[] }> {
  // fal, ppio, grsai 直接返回结果
  if (taskId === "fal-direct" || taskId === "ppio-direct" || taskId === "grsai-direct") {
    return { images: [] };
  }

  const apiKey = useSettingsStore.getState().getApiKey(provider);
  const maxAttempts = 180;
  const interval = 2000;
  const startTime = Date.now();
  const timeoutMs = 360000;

  for (let i = 0; i < maxAttempts; i++) {
    if (Date.now() - startTime > timeoutMs) {
      throw new Error("生成超时（超过6分钟），任务可能仍在处理中，请稍后在KIE网站查看结果");
    }

    try {
      const response = await fetch(`https://api.kie.ai/api/v1/jobs/getTaskDetail?taskId=${taskId}`, {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        console.warn(`[pollTaskResult] HTTP ${response.status}, retrying...`);
        await new Promise((resolve) => setTimeout(resolve, interval));
        continue;
      }

      const result: KieTaskStatusResponse = await response.json();
      const elapsed = Math.round((Date.now() - startTime) / 1000);

      if (result.code === 200 && result.data) {
        const status = result.data.status;
        onProgress?.(status, elapsed);

        if (status === "completed" || status === "succeeded") {
          const imageUrl = result.data.result?.imageUrl || result.data.result?.images?.[0]?.url;
          if (imageUrl) {
            return { images: [{ url: imageUrl }] };
          }
          const altImageUrl = (result.data.result as any)?.output?.[0]?.url;
          if (altImageUrl) {
            return { images: [{ url: altImageUrl }] };
          }
          throw new Error(`生成完成但未返回图片，请在KIE网站查看: taskId=${taskId}`);
        }

        if (status === "failed") {
          throw new Error(result.data.error || "生成失败");
        }
      }
    } catch (error: any) {
      if (error.message?.includes("生成失败") || error.message?.includes("生成完成")) {
        throw error;
      }
      console.warn(`[pollTaskResult] Error: ${error.message}, retrying...`);
    }

    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error(`生成超时，任务ID: ${taskId}，请在KIE网站查看结果`);
}
