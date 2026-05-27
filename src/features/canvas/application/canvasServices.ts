import {
  getNodeDefinition,
  getMenuNodeDefinitions,
} from "../domain/nodeRegistry";
import type { CanvasNodeType, CanvasNode, CanvasNodeData } from "../domain/canvasNodes";
import type {
  NodeCatalog,
  AiGateway,
  ImageSplitGateway,
} from "./ports";
import { InMemoryCanvasEventBus } from "./eventBus";
import { DefaultGraphImageResolver } from "./graphImageResolver";
import { CanvasToolProcessor } from "./toolProcessor";
import { idGenerator } from "../infrastructure/idGenerator";
import { tauriAiGateway } from "../infrastructure/tauriAiGateway";
import { tauriImageSplitGateway } from "../infrastructure/tauriImageSplitGateway";
import type { XYPosition } from "@xyflow/react";

// Node catalog implementation
const nodeCatalogImpl: NodeCatalog = {
  getDefinition: (type: CanvasNodeType) => getNodeDefinition(type),
  getMenuDefinitions: getMenuNodeDefinitions,
};

// Event bus instance
export const canvasEventBus = new InMemoryCanvasEventBus();

// Graph image resolver
export const canvasGraphImageResolver = new DefaultGraphImageResolver();

// Tool processor
export const canvasToolProcessor = new CanvasToolProcessor(tauriImageSplitGateway, idGenerator);

// Export services
export const canvasNodeCatalog: NodeCatalog = nodeCatalogImpl;
export const canvasAiGateway: AiGateway = tauriAiGateway;
export const canvasImageSplitGateway: ImageSplitGateway = tauriImageSplitGateway;

// Helper to create a node
export function createCanvasNode(
  type: CanvasNodeType,
  position: XYPosition,
  data?: Partial<CanvasNodeData>
): CanvasNode {
  const definition = getNodeDefinition(type);
  const defaultData = definition?.createDefaultData() ?? {} as CanvasNodeData;

  return {
    id: idGenerator.next(),
    type,
    position,
    data: { ...defaultData, ...data } as CanvasNodeData,
  };
}
