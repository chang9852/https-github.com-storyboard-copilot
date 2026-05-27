import type { NodeTypeKey, CanvasNodeData } from "../domain/canvasNodes";
import type { ProviderId, GenerateParams, GenerateResult } from "@/types/ai";

// ID Generator port
export interface IdGenerator {
  generate(): string;
}

// Node Catalog port - provides node definitions
export interface NodeCatalog {
  getNodeDefinition(type: NodeTypeKey): import("../domain/nodeRegistry").NodeDefinition | undefined;
  getMenuNodeDefinitions(): import("../domain/nodeRegistry").NodeDefinition[];
  nodeHasSourceHandle(type: NodeTypeKey): boolean;
  nodeHasTargetHandle(type: NodeTypeKey): boolean;
}

// Node Factory port - creates nodes
export interface NodeFactory {
  createNode(
    type: NodeTypeKey,
    position: { x: number; y: number },
    data?: Partial<CanvasNodeData>
  ): {
    id: string;
    type: string;
    position: { x: number; y: number };
    data: CanvasNodeData;
  };
}

// AI Gateway port - interface for AI operations
export interface AiGateway {
  setApiKey(provider: ProviderId, apiKey: string): Promise<void>;
  generateImage(params: GenerateParams): Promise<GenerateResult>;
  submitGenerateImageJob(params: GenerateParams): Promise<{ taskId: string }>;
  getGenerateImageJob(taskId: string): Promise<GenerateResult>;
  listModels(): Promise<Array<{ id: string; name: string; provider: ProviderId }>>;
}

// Image Split Gateway port
export interface ImageSplitGateway {
  splitImage(
    imageUrl: string,
    rows: number,
    cols: number
  ): Promise<Array<{ index: number; imageUrl: string; width: number; height: number }>>;
}

// Graph Image Resolver - collects images from connected nodes
export interface GraphImageResolver {
  resolveInputImages(nodeId: string, nodes: any[], edges: any[]): string[];
}

// Tool Processor port
export interface ToolProcessor {
  crop(
    imageUrl: string,
    cropArea: { x: number; y: number; width: number; height: number }
  ): Promise<string>;

  annotate(
    imageUrl: string,
    annotations: Array<{
      type: "text" | "arrow" | "rect";
      x: number;
      y: number;
      width?: number;
      height?: number;
      text?: string;
      color?: string;
    }>
  ): Promise<string>;

  splitStoryboard(
    imageUrl: string,
    rows: number,
    cols: number
  ): Promise<string[]>;
}

// Canvas Event Bus port
export interface CanvasEventBus {
  emit(event: string, data?: unknown): void;
  on(event: string, handler: (data?: unknown) => void): () => void;
  off(event: string, handler: (data?: unknown) => void): void;
}
