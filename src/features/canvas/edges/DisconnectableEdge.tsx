import { memo, useMemo } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  Position,
  type EdgeProps,
} from '@xyflow/react';
import { useCanvasStore } from '@/stores/canvasStore';
import { buildOrthogonalRoute } from './edgeRouting';

const DisconnectableEdge = memo(function DisconnectableEdge(props: EdgeProps) {
  const {
    id,
    source,
    target,
    selected,
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    markerEnd,
    style,
  } = props;

  const nodes = useCanvasStore((s) => s.nodes);

  const isProcessingEdge = useMemo(() => {
    const sourceNode = nodes.find((n) => n.id === source);
    const targetNode = nodes.find((n) => n.id === target);
    if (!sourceNode || !targetNode) return false;
    // 场景1: exportImage 节点正在生成（source 是 imageEdit 或 storyboardGen）
    const isExportGenerating =
      targetNode.type === 'exportImageNode' &&
      (sourceNode.type === 'imageNode' || sourceNode.type === 'storyboardGenNode') &&
      (targetNode.data as Record<string, unknown>)?.isGenerating === true;
    // 场景2: storyboardNode 节点正在生成（source 是 storyboardGen）
    const isStoryboardGenerating =
      targetNode.type === 'storyboardNode' &&
      sourceNode.type === 'storyboardGenNode' &&
      (targetNode.data as Record<string, unknown>)?.isGenerating === true;
    return isExportGenerating || isStoryboardGenerating;
  }, [nodes, source, target]);

  const { edgePath, labelX, labelY } = useMemo(() => {
    const route = buildOrthogonalRoute({
      sourceId: source,
      targetId: target,
      sourceX,
      sourceY,
      sourcePosition: sourcePosition ?? Position.Right,
      targetX,
      targetY,
      targetPosition: targetPosition ?? Position.Left,
      nodes: [],
      smartAvoidance: false,
    });
    return {
      edgePath: route.path,
      labelX: route.labelX,
      labelY: route.labelY,
    };
  }, [
    source,
    sourcePosition,
    sourceX,
    sourceY,
    target,
    targetPosition,
    targetX,
    targetY,
  ]);

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          strokeWidth: isProcessingEdge ? (selected ? 2.7 : 2.2) : (selected ? 2.4 : 1.9),
          stroke: isProcessingEdge ? `rgb(var(--accent-rgb) / 0.94)` : undefined,
          ...style,
        }}
      />
      {isProcessingEdge && (
        <path
          d={edgePath}
          fill="none"
          stroke="rgb(var(--accent-rgb))"
          strokeWidth={selected ? 2.5 : 2.1}
          strokeLinecap="round"
          strokeDasharray="8 10"
          className="canvas-processing-edge__flow"
          style={{ pointerEvents: 'none' }}
        />
      )}
      {selected && (
        <EdgeLabelRenderer>
          <button
            type="button"
            className="nodrag nopan absolute flex h-6 w-6 items-center justify-center text-text-muted transition-colors hover:text-text-dark"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'all',
            }}
            onClick={(event) => {
              event.stopPropagation();
            }}
            aria-label="Disconnect"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                fillRule="evenodd"
                d="M2 12C2 6.477 6.477 2 12 2s10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12m7.707-3.707a1 1 0 0 0-1.414 1.414L10.586 12l-2.293 2.293a1 1 0 1 0 1.414 1.414L12 13.414l2.293 2.293a1 1 0 0 0 1.414-1.414L13.414 12l2.293-2.293a1 1 0 0 0-1.414-1.414L12 10.586z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </EdgeLabelRenderer>
      )}
    </>
  );
});

export { DisconnectableEdge };
