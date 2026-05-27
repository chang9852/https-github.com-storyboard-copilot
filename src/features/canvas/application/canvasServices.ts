import type {
  NodeCatalog,
  AiGateway,
  ImageSplitGateway,
  GraphImageResolver,
  ToolProcessor,
  CanvasEventBus,
} from "./ports";
import { getNodeDefinition, getMenuNodeDefinitions, nodeHasSourceHandle, nodeHasTargetHandle } from "../domain/nodeRegistry";
import { createNode } from "./nodeFactory";

// In-memory event bus implementation
class InMemoryCanvasEventBus implements CanvasEventBus {
  private listeners = new Map<string, Set<(data?: unknown) => void>>();

  emit(event: string, data?: unknown): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach((handler) => handler(data));
    }
  }

  on(event: string, handler: (data?: unknown) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
    return () => this.off(event, handler);
  }

  off(event: string, handler: (data?: unknown) => void): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }
}

// Node catalog using domain registry
const nodeCatalogImpl: NodeCatalog = {
  getNodeDefinition,
  getMenuNodeDefinitions,
  nodeHasSourceHandle,
  nodeHasTargetHandle,
};

// Import infrastructure implementations
import { tauriAiGateway } from "../infrastructure/tauriAiGateway";
import { tauriImageSplitGateway } from "../infrastructure/tauriImageSplitGateway";

// Graph image resolver - collects images from connected nodes
const defaultGraphImageResolver: GraphImageResolver = {
  resolveInputImages(nodeId, nodes, edges) {
    const incomingEdges = edges.filter((e) => e.target === nodeId);
    const images: string[] = [];

    for (const edge of incomingEdges) {
      const sourceNode = nodes.find((n) => n.id === edge.source);
      if (sourceNode?.data?.imageUrl) {
        images.push(sourceNode.data.imageUrl);
      }
    }

    return images;
  },
};

// Tool processor - handles crop, annotate, split operations
const defaultToolProcessor: ToolProcessor = {
  async crop(imageUrl, cropArea) {
    // Basic canvas-based crop fallback
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = cropArea.width;
        canvas.height = cropArea.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Failed to get canvas context"));
          return;
        }
        ctx.drawImage(
          img,
          cropArea.x,
          cropArea.y,
          cropArea.width,
          cropArea.height,
          0,
          0,
          cropArea.width,
          cropArea.height
        );
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = imageUrl;
    });
  },

  async annotate(imageUrl, _annotations) {
    // Placeholder - will be implemented with canvas drawing
    return imageUrl;
  },

  async splitStoryboard(_imageUrl, _rows, _cols) {
    // Placeholder - will use Tauri backend
    throw new Error("splitStoryboard not implemented");
  },
};

// Event bus instance
export const canvasEventBus = new InMemoryCanvasEventBus();

// Import ID generator from infrastructure
import { idGenerator } from "../infrastructure/idGenerator";

// Export services
export const canvasNodeCatalog: NodeCatalog = nodeCatalogImpl;
export const canvasAiGateway: AiGateway = tauriAiGateway;
export const canvasImageSplitGateway: ImageSplitGateway = tauriImageSplitGateway;
export const canvasGraphImageResolver: GraphImageResolver = defaultGraphImageResolver;
export const canvasToolProcessor: ToolProcessor = defaultToolProcessor;

// Helper to create a node with the default ID generator
export function createCanvasNode(
  params: CreateNodeParams
): ReturnType<typeof createNode> {
  return createNode(idGenerator, params);
}

type CreateNodeParams = import("./nodeFactory").CreateNodeParams;
