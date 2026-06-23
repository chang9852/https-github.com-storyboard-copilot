import { useEffect, useRef } from 'react';
import { useReactFlow } from '@xyflow/react';

import { useProjectStore } from '@/stores/projectStore';
import { useCanvasStore } from '@/stores/canvasStore';
import type { CanvasNode } from '../domain/canvasNodes';
import { cellsToCanvasNodes } from '../application/projectCanvasMapper';

export function useCanvasProjectSync(): void {
  const currentProject = useProjectStore((state) => state.currentProject);
  const nodes = useCanvasStore((state) => state.nodes);
  const setCanvasData = useCanvasStore((state) => state.setCanvasData);
  const reactFlowInstance = useReactFlow();

  useEffect(() => {
    if (currentProject) {
      const nextNodes = cellsToCanvasNodes(currentProject.cells);
      setCanvasData(nextNodes, []);
      requestAnimationFrame(() => {
        if (nextNodes.length > 0) {
          reactFlowInstance.fitView({ padding: 0.2, duration: 300 });
        }
      });
      return;
    }

    setCanvasData([], []);
  }, [currentProject?.id, setCanvasData, reactFlowInstance]);

  const prevNodesRef = useRef<CanvasNode[]>(nodes);
  const currentProjectRef = useRef(currentProject);
  currentProjectRef.current = currentProject;

  useEffect(() => {
    const project = currentProjectRef.current;
    if (!project) return;

    const projectStore = useProjectStore.getState();
    const prevNodes = prevNodesRef.current;

    for (const node of nodes) {
      const existingCell = project.cells.find((cell) => cell.id === node.id);
      if (!existingCell) continue;

      const prevNode = prevNodes.find((item) => item.id === node.id);
      if (!prevNode) continue;

      const positionChanged =
        existingCell.position.x !== node.position.x ||
        existingCell.position.y !== node.position.y;
      const dataChanged = JSON.stringify(prevNode.data) !== JSON.stringify(node.data);

      if (positionChanged || dataChanged) {
        const updates: Record<string, unknown> = {};
        if (positionChanged) updates.position = node.position;
        if (dataChanged) Object.assign(updates, node.data);
        projectStore.updateCell(node.id, updates);
      }
    }

    prevNodesRef.current = nodes;
  }, [nodes]);
}
