import type { ProviderId } from "@/types/ai";

export interface AspectRatioOption {
  value: string;
  label: string;
  width: number;
  height: number;
}

export interface ExtraParamSchema {
  key: string;
  label: string;
  type: "number" | "select" | "boolean";
  defaultValue: unknown;
  options?: Array<{ value: string | number; label: string }>;
  min?: number;
  max?: number;
}

export interface ImageModelDefinition {
  id: string;
  name: string;
  provider: ProviderId;
  type: "text-to-image" | "image-to-image";
  aspectRatios: AspectRatioOption[];
  resolutions: Array<{ value: string; label: string; width: number; height: number }>;
  extraParams: ExtraParamSchema[];
  pricing: {
    basePrice: number;
    currency: "CNY" | "USD";
  };
}

export interface ModelProviderDefinition {
  id: ProviderId;
  name: string;
  baseUrl: string;
  authType: "bearer" | "key";
  models: ImageModelDefinition[];
}
