export type ProviderId = "kie" | "fal" | "派欧云" | "GRSAI";

export interface AIProvider {
  id: ProviderId;
  name: string;
  baseUrl: string;
  authType: "bearer" | "key";
  models: AIModel[];
  enabled: boolean;
}

export interface AIModel {
  id: string;
  name: string;
  provider: ProviderId;
  type: "text-to-image" | "image-to-image";
  maxWidth: number;
  maxHeight: number;
  supportsNegativePrompt: boolean;
}

export interface GenerateParams {
  provider: ProviderId;
  model: string;
  prompt: string;
  negativePrompt?: string;
  width: number;
  height: number;
  numImages?: number;
  gridSize?: GridSize;
  callBackUrl?: string;
  fallbackModel?: string;
}

export interface GridSize {
  columns: number;
  rows: number;
}

export interface GenerateResult {
  taskId: string;
  provider: ProviderId;
  status: "pending" | "processing" | "completed" | "failed";
  images: GeneratedImage[];
  error?: string;
}

export interface GeneratedImage {
  url: string;
  width: number;
  height: number;
  gridCells?: GridCellResult[];
}

export interface GridCellResult {
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
  imageUrl: string;
}

export interface ProviderConfig {
  apiKey: string;
  enabled: boolean;
}
