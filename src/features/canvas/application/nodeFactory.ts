import type { NodeTypeKey, CanvasNodeData } from "../domain/canvasNodes";
import { getNodeDefinition } from "../domain/nodeRegistry";
import type { IdGenerator } from "./ports";

export interface CreateNodeParams {
  type: NodeTypeKey;
  position: { x: number; y: number };
  data?: Partial<CanvasNodeData>;
}

export function createNode(
  idGenerator: IdGenerator,
  params: CreateNodeParams
): {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: CanvasNodeData;
} {
  const definition = getNodeDefinition(params.type);
  if (!definition) {
    throw new Error(`Unknown node type: ${params.type}`);
  }

  const id = idGenerator.generate();
  const defaultData = definition.createDefaultData();

  // Merge provided data with default data
  const data = {
    ...defaultData,
    ...params.data,
  } as CanvasNodeData;

  return {
    id,
    type: params.type,
    position: params.position,
    data,
  };
}
