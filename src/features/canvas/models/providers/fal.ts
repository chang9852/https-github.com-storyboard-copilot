import type { ModelProviderDefinition } from "../types";
import { registerProvider } from "../registry";

export const falProvider: ModelProviderDefinition = {
  id: "fal",
  name: "fal",
  baseUrl: "https://fal.run",
  authType: "key",
  models: [
    {
      id: "nano-banana-pro",
      name: "Nano Banana Pro Gemini",
      provider: "fal",
      type: "text-to-image",
      aspectRatios: [
        { value: "1:1", label: "1:1", width: 1024, height: 1024 },
        { value: "16:9", label: "16:9", width: 1024, height: 576 },
        { value: "9:16", label: "9:16", width: 576, height: 1024 },
      ],
      resolutions: [
        { value: "1K", label: "1K", width: 1024, height: 1024 },
      ],
      extraParams: [
        {
          key: "enable_web_search",
          label: "启用网络搜索",
          type: "boolean",
          defaultValue: false,
        },
        {
          key: "thinking_level",
          label: "思考等级",
          type: "select",
          defaultValue: "none",
          options: [
            { value: "none", label: "无" },
            { value: "low", label: "低" },
            { value: "medium", label: "中" },
            { value: "high", label: "高" },
          ],
        },
      ],
      pricing: {
        basePrice: 0.05,
        currency: "USD",
      },
    },
    {
      id: "flux-2-pro",
      name: "Flux 2 Pro",
      provider: "fal",
      type: "text-to-image",
      aspectRatios: [
        { value: "1:1", label: "1:1", width: 1024, height: 1024 },
        { value: "16:9", label: "16:9", width: 1024, height: 576 },
        { value: "9:16", label: "9:16", width: 576, height: 1024 },
      ],
      resolutions: [
        { value: "1K", label: "1K", width: 1024, height: 1024 },
        { value: "2K", label: "2K", width: 2048, height: 2048 },
      ],
      extraParams: [],
      pricing: {
        basePrice: 0.08,
        currency: "USD",
      },
    },
    {
      id: "recraft-v3",
      name: "Recraft V3",
      provider: "fal",
      type: "text-to-image",
      aspectRatios: [
        { value: "1:1", label: "1:1", width: 1024, height: 1024 },
        { value: "16:9", label: "16:9", width: 1024, height: 576 },
        { value: "9:16", label: "9:16", width: 576, height: 1024 },
      ],
      resolutions: [
        { value: "1K", label: "1K", width: 1024, height: 1024 },
      ],
      extraParams: [],
      pricing: {
        basePrice: 0.04,
        currency: "USD",
      },
    },
  ],
};

export function registerFalProvider(): void {
  registerProvider(falProvider);
}
