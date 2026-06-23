import type { XYPosition } from '@xyflow/react';

import type { Project, StoryboardCell } from '@/types/project';
import type { CanvasNode, CanvasNodeData, CanvasNodeType } from '../domain/canvasNodes';
import { getNodeDefinition, getNodeTypeForCellType } from '../domain/nodeRegistry';

export function cellsToCanvasNodes(cells: StoryboardCell[]): CanvasNode[] {
  return cells.map((cell) => {
    const nodeType = getNodeTypeForCellType(cell.cellType);
    const definition = getNodeDefinition(nodeType);

    return {
      id: cell.id,
      type: nodeType,
      position: cell.position,
      data: {
        ...definition.createDefaultData(),
        ...cell,
      } as CanvasNodeData,
      style: {
        width: cell.size?.width ?? definition.persistence.defaultSize.width,
        height: cell.size?.height ?? definition.persistence.defaultSize.height,
      },
    } as CanvasNode;
  });
}

export function createCellForCanvasNode(params: {
  nodeId: string;
  project: Project;
  nodeType: CanvasNodeType;
  position: XYPosition;
  data?: Partial<CanvasNodeData>;
}): StoryboardCell {
  const { nodeId, project, nodeType, position, data } = params;
  const definition = getNodeDefinition(nodeType);
  const mergedData = {
    ...definition.createDefaultData(),
    ...data,
  } as Record<string, unknown>;

  return {
    ...mergedData,
    id: nodeId,
    projectId: project.id,
    position,
    size: { ...definition.persistence.defaultSize },
    prompt: typeof mergedData.prompt === 'string' ? mergedData.prompt : '',
    status: 'idle',
    cellType: definition.persistence.cellType,
    shotType: definition.persistence.shotType,
  } as StoryboardCell;
}
