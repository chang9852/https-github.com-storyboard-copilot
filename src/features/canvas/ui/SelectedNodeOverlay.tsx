import { memo } from 'react';
import { NodeActionToolbar } from './NodeActionToolbar';
import { useCanvasStore } from '@/stores/canvasStore';

export const SelectedNodeOverlay = memo(() => {
  const selectedNodeId = useCanvasStore((s) => s.selectedNodeId);
  const nodes = useCanvasStore((s) => s.nodes);

  const selectedNode = selectedNodeId
    ? nodes.find((n) => n.id === selectedNodeId) ?? null
    : null;

  if (!selectedNode) return null;

  return (
    <NodeActionToolbar
      node={{
        id: selectedNode.id,
        type: selectedNode.type,
        position: selectedNode.position,
        data: selectedNode.data as Record<string, any>,
      }}
    />
  );
});

SelectedNodeOverlay.displayName = 'SelectedNodeOverlay';
