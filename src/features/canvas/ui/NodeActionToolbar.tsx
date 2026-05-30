import { memo, useCallback, useMemo } from 'react';
import { NodeToolbar as ReactFlowNodeToolbar } from '@xyflow/react';
import { Copy, Download, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCanvasStore } from '@/stores/canvasStore';
import {
  NODE_TOOLBAR_POSITION,
  NODE_TOOLBAR_ALIGN,
  NODE_TOOLBAR_OFFSET,
  NODE_TOOLBAR_CLASS,
} from './nodeToolbarConfig';

interface NodeActionToolbarProps {
  node: { id: string; data: Record<string, any> };
}

export const NodeActionToolbar = memo(({ node }: NodeActionToolbarProps) => {
  const { t } = useTranslation();
  const deleteNode = useCanvasStore((state) => state.deleteNode);

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

  return (
    <ReactFlowNodeToolbar
      nodeId={node.id}
      isVisible
      position={NODE_TOOLBAR_POSITION}
      align={NODE_TOOLBAR_ALIGN}
      offset={NODE_TOOLBAR_OFFSET}
      className={NODE_TOOLBAR_CLASS}
    >
      <div className="flex items-center gap-1 rounded-full bg-[rgba(17,17,24,0.9)] p-1 backdrop-blur-sm border border-[rgba(255,255,255,0.1)]">
        {imageSource && (
          <>
            <button
              className="flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              onClick={handleCopyImage}
              title={t('nodeToolbar.copy', 'Copy')}
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
            <button
              className="flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              onClick={handleDownload}
              title={t('nodeToolbar.download', 'Download')}
            >
              <Download className="h-3.5 w-3.5" />
            </button>
          </>
        )}
        <button
          className="flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/15 transition-colors"
          onClick={handleDelete}
          title={t('common.delete', 'Delete')}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </ReactFlowNodeToolbar>
  );
});

NodeActionToolbar.displayName = 'NodeActionToolbar';
