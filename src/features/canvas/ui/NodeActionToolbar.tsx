import { memo, useCallback, useMemo, useState } from 'react';
import { NodeToolbar as ReactFlowNodeToolbar } from '@xyflow/react';
import { Copy, Download, Trash2, Crop, Scissors, Pencil } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCanvasStore } from '@/stores/canvasStore';
import { NodeToolDialog } from './NodeToolDialog';
import type { NodeToolType } from '../domain/canvasNodes';
import type { ToolExecuteParams } from '../tools/types';
import { canvasToolProcessor } from '../application/canvasServices';
import { CANVAS_NODE_TYPES, type CanvasNodeType } from '../domain/canvasNodes';
import {
  NODE_TOOLBAR_POSITION,
  NODE_TOOLBAR_ALIGN,
  NODE_TOOLBAR_OFFSET,
  NODE_TOOLBAR_CLASS,
} from './nodeToolbarConfig';

interface NodeActionToolbarProps {
  node: {
    id: string;
    type?: CanvasNodeType;
    position?: { x: number; y: number };
    data: Record<string, any>;
  };
}

export const NodeActionToolbar = memo(({ node }: NodeActionToolbarProps) => {
  const { t } = useTranslation();
  const deleteNode = useCanvasStore((state) => state.deleteNode);
  const addNode = useCanvasStore((state) => state.addNode);
  const addCanvasEdge = useCanvasStore((state) => state.addCanvasEdge);
  const [toolDialogType, setToolDialogType] = useState<NodeToolType | null>(null);

  const imageSource = useMemo(() => {
    const data = node.data;
    return (data.imageUrl as string) || (data.previewImageUrl as string) || null;
  }, [node]);

  const handleCopyImage = useCallback(async () => {
    if (!imageSource) return;
    try {
      await navigator.clipboard.writeText(imageSource);
    } catch (error) {
      console.error('Failed to copy image', error);
    }
  }, [imageSource]);

  const handleDownload = useCallback(() => {
    if (!imageSource) return;
    const a = document.createElement('a');
    a.href = imageSource;
    a.download = `node-${node.id}.png`;
    a.click();
  }, [imageSource, node.id]);

  const handleDelete = useCallback(() => {
    deleteNode(node.id);
  }, [deleteNode, node.id]);

  const handleToolExecute = useCallback(async (params: ToolExecuteParams) => {
    if (!toolDialogType) return;

    const result = await canvasToolProcessor.process(
      toolDialogType!,
      params.imageUrl,
      params.fields
    );

    const sourcePosition = node.position ?? { x: 0, y: 0 };
    const outputPosition = {
      x: sourcePosition.x + 430,
      y: sourcePosition.y,
    };

    if (toolDialogType === 'split-storyboard' && result.storyboardFrames?.length) {
      const splitNodeId = addNode(CANVAS_NODE_TYPES.storyboardSplit, outputPosition, {
        gridRows: result.rows ?? Number(params.fields.rows ?? 3),
        gridCols: result.cols ?? Number(params.fields.cols ?? 3),
        frames: result.storyboardFrames,
        aspectRatio: result.frameAspectRatio ?? '1:1',
        frameAspectRatio: result.frameAspectRatio ?? '1:1',
      });
      addCanvasEdge(node.id, splitNodeId);
    } else if (result.outputImageUrl) {
      const outputNodeId = addNode(CANVAS_NODE_TYPES.exportImage, outputPosition, {
        imageUrl: result.outputImageUrl,
        previewImageUrl: result.outputImageUrl,
        aspectRatio: String(node.data.aspectRatio ?? '1:1'),
      });
      addCanvasEdge(node.id, outputNodeId);
    }

    setToolDialogType(null);
  }, [addCanvasEdge, addNode, node.data.aspectRatio, node.id, node.position, toolDialogType]);

  return (
    <>
      <ReactFlowNodeToolbar
        nodeId={node.id}
        isVisible
        position={NODE_TOOLBAR_POSITION}
        align={NODE_TOOLBAR_ALIGN}
        offset={NODE_TOOLBAR_OFFSET}
        className={NODE_TOOLBAR_CLASS}
      >
        <div className="ui-glass-panel flex items-center gap-0.5">
          {imageSource && (
            <>
              <button
                className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--ui-glass-bg-hover)] transition-colors"
                onClick={() => setToolDialogType('crop')}
                title={t('tool.crop', 'Crop')}
              >
                <Crop className="h-3.5 w-3.5" />
              </button>
              <button
                className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--ui-glass-bg-hover)] transition-colors"
                onClick={() => setToolDialogType('split-storyboard')}
                title={t('tool.split', 'Split')}
              >
                <Scissors className="h-3.5 w-3.5" />
              </button>
              <button
                className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--ui-glass-bg-hover)] transition-colors"
                onClick={() => setToolDialogType('annotate')}
                title={t('tool.annotate', 'Annotate')}
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <div className="w-px h-4 mx-1 bg-[var(--ui-glass-border)]" />
              <button
                className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--ui-glass-bg-hover)] transition-colors"
                onClick={handleCopyImage}
                title={t('nodeToolbar.copy', 'Copy')}
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
              <button
                className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--ui-glass-bg-hover)] transition-colors"
                onClick={handleDownload}
                title={t('nodeToolbar.download', 'Download')}
              >
                <Download className="h-3.5 w-3.5" />
              </button>
            </>
          )}
          <button
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/15 transition-colors"
            onClick={handleDelete}
            title={t('common.delete', 'Delete')}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </ReactFlowNodeToolbar>

      {toolDialogType && imageSource && (
        <NodeToolDialog
          toolType={toolDialogType}
          imageUrl={imageSource}
          nodeId={node.id}
          onExecute={handleToolExecute}
          onClose={() => setToolDialogType(null)}
        />
      )}
    </>
  );
});

NodeActionToolbar.displayName = 'NodeActionToolbar';
