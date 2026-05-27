import type { ModelProviderDefinition } from "../types";
import { registerProvider } from "../registry";

export const kieProvider: ModelProviderDefinition = {
  id: "kie",
  name: "KIE",
  baseUrl: "https://api.kie.ai",
  authType: "bearer",
  models: [
    {
      id: "nano-banana-pro",
      name: "Nano Banana Pro",
      provider: "kie",
      type: "text-to-image",
      aspectRatios: [
        { value: "1:1", label: "1:1", width: 1024, height: 1024 },
        { value: "16:9", label: "16:9", width: 1024, height: 576 },
        { value: "9:16", label: "9:16", width: 576, height: 1024 },
        { value: "4:3", label: "4:3", width: 1024, height: 768 },
        { value: "3:4", label: "3:4", width: 768, height: 1024 },
      ],
      resolutions: [
        { value: "1K", label: "1K", width: 1024, height: 1024 },
        { value: "2K", label: "2K", width: 2048, height: 2048 },
      ],
      extraParams: [],
      pricing: {
        basePrice: 0.43,
        currency: "CNY",
      },
    },
    {
      id: "nano-banana-2",
      name: "Nano Banana 2",
      provider: "kie",
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
        basePrice: 0.35,
        currency: "CNY",
      },
    },
    {
      id: "seedream-4.0",
      name: "Seedream 4.0",
      provider: "kie",
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
        basePrice: 0.50,
        currency: "CNY",
      },
    },
  ],
};

export function registerKieProvider(): void {
  registerProvider(kieProvider);
}
