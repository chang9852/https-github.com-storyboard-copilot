import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useProjectStore } from '@/stores/projectStore';
import { useCanvasStore } from '@/stores/canvasStore';
import { nodeTypes } from './nodes';
import { GridExport } from './GridExport';
import { createCellForCanvasNode } from './application/projectCanvasMapper';
import type { CanvasNodeType } from './domain/canvasNodes';
import { useCanvasHotkeys } from './hooks/useCanvasHotkeys';
import { useCanvasProjectSync } from './hooks/useCanvasProjectSync';
import { CanvasCreateMenu, type CanvasCreateMenuPosition } from './ui/CanvasCreateMenu';
import { ImageViewerModal } from './ui/ImageViewerModal';
import { SelectedNodeOverlay } from './ui/SelectedNodeOverlay';

export function Canvas() {
  const { t } = useTranslation();
  const { currentProject, addCell } = useProjectStore();

  const nodes = useCanvasStore((state) => state.nodes);
  const edges = useCanvasStore((state) => state.edges);
  const selectedNodeId = useCanvasStore((state) => state.selectedNodeId);
  const onNodesChange = useCanvasStore((state) => state.onNodesChange);
  const onEdgesChange = useCanvasStore((state) => state.onEdgesChange);
  const onConnect = useCanvasStore((state) => state.onConnect);
  const addNode = useCanvasStore((state) => state.addNode);
  const setSelectedNode = useCanvasStore((state) => state.setSelectedNode);
  const deleteNode = useCanvasStore((state) => state.deleteNode);

  const [createMenu, setCreateMenu] = useState<CanvasCreateMenuPosition | null>(null);
  const [showGridExport, setShowGridExport] = useState(false);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  useCanvasProjectSync();
  useCanvasHotkeys({ selectedNodeId, deleteNode });

  const handlePaneClick = useCallback(
    (event: React.MouseEvent) => {
      if (event.detail < 2) return;
      if (!currentProject || !reactFlowWrapper.current) return;

      const wrapper = reactFlowWrapper.current.getBoundingClientRect();
      setCreateMenu({
        x: event.clientX,
        y: event.clientY,
        canvasX: event.clientX - wrapper.left,
        canvasY: event.clientY - wrapper.top,
      });
    },
    [currentProject]
  );

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: { id: string }) => {
      setSelectedNode(node.id);
    },
    [setSelectedNode]
  );

  const handleCreateNode = useCallback(
    (nodeType: CanvasNodeType) => {
      if (!currentProject || !createMenu) return;

      const position = {
        x: createMenu.canvasX - 190,
        y: createMenu.canvasY - 160,
      };
      const nodeId = addNode(nodeType, position);
      const cell = createCellForCanvasNode({
        nodeId,
        project: currentProject,
        nodeType,
        position,
      });

      addCell(cell);
      setCreateMenu(null);
    },
    [currentProject, createMenu, addNode, addCell]
  );

  if (!currentProject) return null;

  return (
    <div
      ref={reactFlowWrapper}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        background: 'var(--bg)',
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onPaneClick={(event) => {
          handlePaneClick(event);
          setSelectedNode(null);
        }}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        snapToGrid
        snapGrid={[16, 16]}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: true,
        }}
        style={{ background: 'var(--bg)' }}
        connectionLineStyle={{
          stroke: 'rgba(99, 102, 241, 0.5)',
          strokeWidth: 2,
        }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color="rgba(0, 0, 0, 0.06)"
        />
        <MiniMap
          nodeColor={(node) => {
            if (node.type === 'imageEdit' || node.type === 'imageNode') return '#f97316';
            if (node.type === 'storyboardGen' || node.type === 'storyboardGenNode') return '#ec4899';
            if (node.type === 'storyboardSplit' || node.type === 'storyboardNode') return '#8b5cf6';
            return '#6366f1';
          }}
          style={{
            background: 'rgba(255, 255, 255, 0.45)',
            border: '1px solid rgba(148, 163, 184, 0.15)',
            borderRadius: '12px',
            boxShadow: '0 20px 40px -15px rgba(31, 38, 135, 0.08)',
            backdropFilter: 'blur(20px) saturate(120%)',
          }}
          maskColor="rgba(99, 102, 241, 0.08)"
          pannable
          zoomable
        />
        <Controls
          style={{
            background: 'rgba(255, 255, 255, 0.45)',
            border: '1px solid rgba(148, 163, 184, 0.15)',
            borderRadius: '12px',
            boxShadow: '0 20px 40px -15px rgba(31, 38, 135, 0.08)',
            backdropFilter: 'blur(20px) saturate(120%)',
          }}
        />
        <SelectedNodeOverlay />
      </ReactFlow>

      <ImageViewerModal />

      {createMenu && (
        <CanvasCreateMenu
          position={createMenu}
          onCreate={handleCreateNode}
          onDismiss={() => setCreateMenu(null)}
        />
      )}

      {currentProject.cells.length === 0 && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '20px',
              background: 'rgba(99, 102, 241, 0.08)',
              border: '1px dashed rgba(99, 102, 241, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path
                d="M16 10v12M10 16h12"
                stroke="url(#emptyGradient)"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <defs>
                <linearGradient id="emptyGradient" x1="10" y1="10" x2="22" y2="22">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <p
            style={{
              fontSize: '14px',
              fontWeight: 500,
              color: 'var(--text)',
              marginBottom: '6px',
            }}
          >
            {t('canvasMenu.dblClickToAdd')}
          </p>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {t('canvasMenu.dragToMove')}
          </p>
        </div>
      )}

      <button
        onClick={() => setShowGridExport(true)}
        className="ui-glass-panel"
        style={{
          position: 'absolute',
          bottom: '20px',
          right: '20px',
          padding: '10px 16px',
          fontSize: '11px',
          fontWeight: 500,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(event) => {
          event.currentTarget.style.background = 'var(--ui-glass-bg-hover)';
        }}
        onMouseLeave={(event) => {
          event.currentTarget.style.background = 'var(--ui-glass-bg)';
        }}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 14 14"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
        >
          <rect x="1" y="1" width="5" height="5" rx="1" />
          <rect x="8" y="1" width="5" height="5" rx="1" />
          <rect x="1" y="8" width="5" height="5" rx="1" />
          <rect x="8" y="8" width="5" height="5" rx="1" />
        </svg>
        {t('canvasMenu.export')}
      </button>

      {showGridExport && <GridExport onClose={() => setShowGridExport(false)} />}
    </div>
  );
}
