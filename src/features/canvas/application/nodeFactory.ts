import type { CanvasNodeType, CanvasNodeData, CanvasNode } from "../domain/canvasNodes";
import { getNodeDefinition } from "../domain/nodeRegistry";
import type { IdGenerator } from "./ports";
import type { XYPosition } from "@xyflow/react";

export interface CreateNodeParams {
  type: CanvasNodeType;
  position: XYPosition;
  data?: Partial<CanvasNodeData>;
}

export function createNode(
  idGenerator: IdGenerator,
  params: CreateNodeParams
): CanvasNode {
  const definition = getNodeDefinition(params.type);
  if (!definition) {
    throw new Error(`Unknown node type: ${params.type}`);
  }

  const id = idGenerator.next();
  const defaultData = definition.createDefaultData();

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
