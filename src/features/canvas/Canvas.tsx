import { useCallback, useRef, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ReactFlow,
  Background,
  MiniMap,
  Controls,
  BackgroundVariant,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { useProjectStore } from "@/stores/projectStore";
import { useCanvasStore } from "@/stores/canvasStore";
import { nodeTypes } from "./nodes";
import { GridExport } from "./GridExport";
import { ImageViewerModal } from "./ui/ImageViewerModal";
import { SelectedNodeOverlay } from "./ui/SelectedNodeOverlay";
import type { StoryboardCell, CellType } from "@/types/project";
import type { CanvasNodeType, CanvasNode, CanvasNodeData } from "./domain/canvasNodes";
import { CANVAS_NODE_TYPES } from "./domain/canvasNodes";

const cellTypeToNodeType: Record<string, CanvasNodeType> = {
  ai_image: CANVAS_NODE_TYPES.imageEdit,
  upload_image: CANVAS_NODE_TYPES.upload,
  storyboard_gen: CANVAS_NODE_TYPES.storyboardGen,
  storyboard: CANVAS_NODE_TYPES.storyboardSplit,
  text_annotation: CANVAS_NODE_TYPES.textAnnotation,
  text_block: CANVAS_NODE_TYPES.group,
};

function cellsToNodes(cells: StoryboardCell[]): CanvasNode[] {
  return cells.map((cell) => {
    const nodeType = cellTypeToNodeType[cell.cellType ?? ''] ?? CANVAS_NODE_TYPES.textAnnotation;

    return {
      id: cell.id,
      type: nodeType,
      position: cell.position,
      data: { ...cell } as CanvasNodeData,
      style: {
        width: cell.size.width,
        height: cell.size.height,
      },
    } as CanvasNode;
  });
}

interface MenuPosition {
  x: number;
  y: number;
  canvasX: number;
  canvasY: number;
}

export function Canvas() {
  const { t } = useTranslation();
  const { currentProject, addCell } = useProjectStore();
  const reactFlowInstance = useReactFlow();

  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);
  const selectedNodeId = useCanvasStore((s) => s.selectedNodeId);
  const onNodesChange = useCanvasStore((s) => s.onNodesChange);
  const onEdgesChange = useCanvasStore((s) => s.onEdgesChange);
  const onConnect = useCanvasStore((s) => s.onConnect);
  const setCanvasData = useCanvasStore((s) => s.setCanvasData);
  const addNode = useCanvasStore((s) => s.addNode);
  const setSelectedNode = useCanvasStore((s) => s.setSelectedNode);
  const deleteNode = useCanvasStore((s) => s.deleteNode);

  const [createMenu, setCreateMenu] = useState<MenuPosition | null>(null);
  const [showGridExport, setShowGridExport] = useState(false);

  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  // Load project data into canvasStore when project changes
  useEffect(() => {
    if (currentProject) {
      const newNodes = cellsToNodes(currentProject.cells);
      setCanvasData(newNodes, []);
      // Fit view after nodes are loaded
      requestAnimationFrame(() => {
        if (newNodes.length > 0) {
          reactFlowInstance.fitView({ padding: 0.2, duration: 300 });
        }
      });
    } else {
      setCanvasData([], []);
    }
  }, [currentProject?.id, setCanvasData, reactFlowInstance]);

  // Sync canvas node changes back to projectStore for persistence
  const prevNodesRef = useRef(nodes);
  const currentProjectRef = useRef(currentProject);
  currentProjectRef.current = currentProject;

  useEffect(() => {
    const project = currentProjectRef.current;
    if (!project) return;
    const projectStore = useProjectStore.getState();
    const prevNodes = prevNodesRef.current;

    for (const node of nodes) {
      const existingCell = project.cells.find((c) => c.id === node.id);
      if (!existingCell) continue;

      const prevNode = prevNodes.find((n) => n.id === node.id);
      if (!prevNode) continue;

      // Sync position changes
      const posChanged =
        existingCell.position.x !== node.position.x ||
        existingCell.position.y !== node.position.y;

      // Sync data changes (e.g. imageUrl, prompt, etc.)
      const dataChanged = JSON.stringify(prevNode.data) !== JSON.stringify(node.data);

      if (posChanged || dataChanged) {
        const updates: Record<string, any> = {};
        if (posChanged) updates.position = node.position;
        if (dataChanged) Object.assign(updates, node.data);
        projectStore.updateCell(node.id, updates);
      }
    }

    prevNodesRef.current = nodes;
  }, [nodes]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        const target = e.target as HTMLElement;
        if (
          target.tagName === "TEXTAREA" ||
          target.tagName === "INPUT" ||
          target.isContentEditable
        ) {
          return;
        }
        e.preventDefault();
        if (selectedNodeId) {
          deleteNode(selectedNodeId);
        }
      }
    },
    [selectedNodeId, deleteNode]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const onPaneClick = useCallback(
    (event: React.MouseEvent) => {
      if (event.detail < 2) return;
      if (!currentProject || !reactFlowWrapper.current) return;
      const wrapper = reactFlowWrapper.current.getBoundingClientRect();
      const canvasX = event.clientX - wrapper.left;
      const canvasY = event.clientY - wrapper.top;
      setCreateMenu({
        x: event.clientX,
        y: event.clientY,
        canvasX,
        canvasY,
      });
    },
    [currentProject]
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: { id: string }) => {
      setSelectedNode(node.id);
    },
    [setSelectedNode]
  );

  const onPaneClickClearSelection = useCallback(() => {
    setSelectedNode(null);
  }, [setSelectedNode]);

  const handleCreateNode = useCallback(
    (nodeType: CanvasNodeType) => {
      if (!currentProject || !createMenu) return;

      const nodeTypeToCellType: Record<CanvasNodeType, CellType> = {
        [CANVAS_NODE_TYPES.upload]: "upload_image",
        [CANVAS_NODE_TYPES.imageEdit]: "ai_image",
        [CANVAS_NODE_TYPES.exportImage]: "upload_image",
        [CANVAS_NODE_TYPES.textAnnotation]: "text_annotation",
        [CANVAS_NODE_TYPES.group]: "text_block",
        [CANVAS_NODE_TYPES.storyboardSplit]: "storyboard",
        [CANVAS_NODE_TYPES.storyboardGen]: "storyboard_gen",
      };

      const position = {
        x: createMenu.canvasX - 190,
        y: createMenu.canvasY - 160,
      };

      const nodeId = addNode(nodeType, position);

      const newCell: StoryboardCell = {
        id: nodeId,
        projectId: currentProject.id,
        position,
        size: { width: 380, height: 320 },
        prompt: "",
        status: "idle",
        cellType: nodeTypeToCellType[nodeType] || "text_block",
        shotType: "image_block",
      };
      addCell(newCell);
      setCreateMenu(null);
    },
    [currentProject, createMenu, addNode, addCell]
  );

  const handlePaneDismiss = useCallback(() => {
    setCreateMenu(null);
  }, []);

  if (!currentProject) return null;

  return (
    <div
      ref={reactFlowWrapper}
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        background: "#0d0d12",
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onPaneClick={(e) => {
          onPaneClick(e);
          onPaneClickClearSelection();
        }}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        snapToGrid
        snapGrid={[16, 16]}
        defaultEdgeOptions={{
          type: "smoothstep",
          animated: true,
        }}
        style={{ background: "#0d0d12" }}
        connectionLineStyle={{
          stroke: "rgba(99, 102, 241, 0.5)",
          strokeWidth: 2,
        }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color="rgba(255, 255, 255, 0.03)"
        />
        <MiniMap
          nodeColor={(node) => {
            if (node.type === "imageEdit" || node.type === "imageNode")
              return "#f97316";
            if (node.type === "storyboardGen" || node.type === "storyboardGenNode")
              return "#ec4899";
            if (node.type === "storyboardSplit" || node.type === "storyboardNode")
              return "#8b5cf6";
            return "#6366f1";
          }}
          style={{
            background: "rgba(17, 17, 24, 0.9)",
            border: "1px solid rgba(255, 255, 255, 0.06)",
            borderRadius: "12px",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.4)",
          }}
          maskColor="rgba(99, 102, 241, 0.05)"
          pannable
          zoomable
        />
        <Controls
          style={{
            background: "rgba(17, 17, 24, 0.9)",
            border: "1px solid rgba(255, 255, 255, 0.06)",
            borderRadius: "12px",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.4)",
          }}
        />
        <SelectedNodeOverlay />
      </ReactFlow>

      {/* Image Viewer Modal */}
      <ImageViewerModal />

      {/* Node creation menu */}
      {createMenu && (
        <div
          style={{
            position: "fixed",
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
            zIndex: 999,
          }}
          onClick={handlePaneDismiss}
        >
          <div
            style={{
              position: "absolute",
              left: createMenu.x,
              top: createMenu.y,
              transform: "translate(-50%, -50%)",
              zIndex: 1000,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                background: "rgba(17, 17, 24, 0.95)",
                backdropFilter: "blur(24px)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "20px",
                padding: "12px",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "8px",
                boxShadow:
                  "0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.03)",
              }}
            >
              <CreateMenuButton
                label={t('canvasMenu.aiGenerate')}
                gradient="linear-gradient(135deg, #6366f1, #4f46e5)"
                bg="rgba(99, 102, 241, 0.08)"
                bgHover="rgba(99, 102, 241, 0.15)"
                borderHover="rgba(99, 102, 241, 0.4)"
                shadow="rgba(99, 102, 241, 0.3)"
                onClick={() => handleCreateNode(CANVAS_NODE_TYPES.imageEdit)}
                icon={
                  <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
                    <path d="M8 2L14 12H2L8 2Z" fill="white" />
                    <circle cx="8" cy="9" r="2" fill="#6366f1" />
                  </svg>
                }
              />
              <CreateMenuButton
                label={t('canvasMenu.upload')}
                gradient="linear-gradient(135deg, #22c55e, #16a34a)"
                bg="rgba(34, 197, 94, 0.08)"
                bgHover="rgba(34, 197, 94, 0.15)"
                borderHover="rgba(34, 197, 94, 0.4)"
                shadow="rgba(34, 197, 94, 0.3)"
                onClick={() => handleCreateNode(CANVAS_NODE_TYPES.upload)}
                icon={
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="white"
                    strokeWidth="1.5"
                  >
                    <path
                      d="M8 10V4M5 7l3 3 3-3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M2 11v2a2 2 0 002 2h8a2 2 0 002-2v-2"
                      strokeLinecap="round"
                    />
                  </svg>
                }
              />
              <CreateMenuButton
                label={t('canvasMenu.text')}
                gradient="linear-gradient(135deg, #a855f7, #9333ea)"
                bg="rgba(168, 85, 247, 0.08)"
                bgHover="rgba(168, 85, 247, 0.15)"
                borderHover="rgba(168, 85, 247, 0.4)"
                shadow="rgba(168, 85, 247, 0.3)"
                onClick={() => handleCreateNode(CANVAS_NODE_TYPES.textAnnotation)}
                icon={
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="white"
                    strokeWidth="1.5"
                  >
                    <path d="M3 3h10M3 7h10M3 11h6" strokeLinecap="round" />
                  </svg>
                }
              />
              <CreateMenuButton
                label={t('canvasMenu.storyboard')}
                gradient="linear-gradient(135deg, #ec4899, #db2777)"
                bg="rgba(236, 72, 153, 0.08)"
                bgHover="rgba(236, 72, 153, 0.15)"
                borderHover="rgba(236, 72, 153, 0.4)"
                shadow="rgba(236, 72, 153, 0.3)"
                onClick={() => handleCreateNode(CANVAS_NODE_TYPES.storyboardGen)}
                icon={
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="white"
                    strokeWidth="1.5"
                  >
                    <rect x="2" y="2" width="5" height="5" rx="1" />
                    <rect x="9" y="2" width="5" height="5" rx="1" />
                    <rect x="2" y="9" width="5" height="5" rx="1" />
                    <rect x="9" y="9" width="5" height="5" rx="1" />
                  </svg>
                }
              />
            </div>
          </div>
        </div>
      )}

      {/* Empty canvas hint */}
      {currentProject.cells.length === 0 && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            textAlign: "center",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              width: "80px",
              height: "80px",
              borderRadius: "20px",
              background: "rgba(99, 102, 241, 0.08)",
              border: "1px dashed rgba(99, 102, 241, 0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
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
                <linearGradient
                  id="emptyGradient"
                  x1="10"
                  y1="10"
                  x2="22"
                  y2="22"
                >
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <p
            style={{
              fontSize: "14px",
              fontWeight: 500,
              color: "rgba(255, 255, 255, 0.6)",
              marginBottom: "6px",
            }}
          >
            {t('canvasMenu.dblClickToAdd')}
          </p>
          <p style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.3)" }}>
            {t('canvasMenu.dragToMove')}
          </p>
        </div>
      )}

      {/* Grid export button */}
      <button
        onClick={() => setShowGridExport(true)}
        style={{
          position: "absolute",
          bottom: "20px",
          right: "20px",
          padding: "10px 16px",
          fontSize: "11px",
          fontWeight: 500,
          color: "rgba(255, 255, 255, 0.7)",
          background: "rgba(17, 17, 24, 0.8)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "10px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          boxShadow: "0 4px 16px rgba(0, 0, 0, 0.3)",
          transition: "all 0.2s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(99, 102, 241, 0.2)";
          e.currentTarget.style.borderColor = "rgba(99, 102, 241, 0.3)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "rgba(17, 17, 24, 0.8)";
          e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
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

      {/* Grid export modal */}
      {showGridExport && (
        <GridExport onClose={() => setShowGridExport(false)} />
      )}
    </div>
  );
}

function CreateMenuButton({
  label,
  gradient,
  bg,
  bgHover,
  borderHover,
  shadow,
  onClick,
  icon,
}: {
  label: string;
  gradient: string;
  bg: string;
  bgHover: string;
  borderHover: string;
  shadow: string;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "16px",
        borderRadius: "14px",
        border: "1px solid rgba(255, 255, 255, 0.06)",
        background: bg,
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "10px",
        minWidth: "100px",
        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = bgHover;
        e.currentTarget.style.borderColor = borderHover;
        e.currentTarget.style.transform = "scale(1.02)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = bg;
        e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.06)";
        e.currentTarget.style.transform = "scale(1)";
      }}
    >
      <div
        style={{
          width: "40px",
          height: "40px",
          borderRadius: "12px",
          background: gradient,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: `0 4px 12px ${shadow}`,
        }}
      >
        {icon}
      </div>
      <span
        style={{
          fontSize: "11px",
          color: "rgba(255, 255, 255, 0.8)",
          fontWeight: 500,
        }}
      >
        {label}
      </span>
    </button>
  );
}
