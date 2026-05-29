import { useCallback, useRef, useMemo, useState, useEffect } from "react";
import {
  ReactFlow,
  Background,
  MiniMap,
  Controls,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  addEdge,
  useReactFlow,
  type Connection,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { useProjectStore } from "@/stores/projectStore";
import { nodeTypes } from "./nodes";
import { GridExport } from "./GridExport";
import { getNodeDefinition } from "./domain/nodeRegistry";
import { createCanvasNode } from "./application/canvasServices";
import type { StoryboardCell, CellType } from "@/types/project";
import type { CanvasNodeType } from "./domain/canvasNodes";

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// 将项目数据转换为 ReactFlow 节点
function cellsToNodes(cells: StoryboardCell[]): Node[] {
  return cells.map((cell) => {
    let nodeType = "textNode";
    if (cell.cellType === "ai_image" || cell.cellType === "upload_image") {
      nodeType = "imageNode";
    } else if (cell.cellType === "storyboard_gen") {
      nodeType = "storyboardGenNode";
    } else if (cell.cellType === "storyboard") {
      nodeType = "storyboardNode";
    }

    return {
      id: cell.id,
      type: nodeType,
      position: cell.position,
      data: { ...cell } as Record<string, unknown>,
      style: {
        width: cell.size.width,
        height: cell.size.height,
      },
    };
  });
}

// 将连接转换为 ReactFlow 边
function connectionsToEdges(connections: { id: string; fromCellId: string; toCellId: string }[]): Edge[] {
  return connections.map((conn) => ({
    id: conn.id,
    source: conn.fromCellId,
    target: conn.toCellId,
    type: "smoothstep",
    animated: true,
    style: { stroke: "rgba(99, 102, 241, 0.5)", strokeWidth: 2 },
  }));
}

interface MenuPosition {
  x: number;
  y: number;
  canvasX: number;
  canvasY: number;
}

export function Canvas() {
  const { currentProject, addCell, addConnection, deleteCell } = useProjectStore();
  const { getNodes } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [createMenu, setCreateMenu] = useState<MenuPosition | null>(null);
  const [showGridExport, setShowGridExport] = useState(false);

  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const deleteSelectedNodes = useCallback(() => {
    const selectedNodes = getNodes().filter((n) => n.selected);
    if (selectedNodes.length === 0) return;
    selectedNodes.forEach((node) => {
      deleteCell(node.id);
    });
  }, [getNodes, deleteCell]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        const target = e.target as HTMLElement;
        if (target.tagName === "TEXTAREA" || target.tagName === "INPUT" || target.isContentEditable) {
          return;
        }
        e.preventDefault();
        deleteSelectedNodes();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [deleteSelectedNodes]);

  useMemo(() => {
    if (currentProject) {
      const newNodes = cellsToNodes(currentProject.cells);
      const newEdges = connectionsToEdges(currentProject.connections);
      setNodes(newNodes);
      setEdges(newEdges);
    }
  }, [currentProject?.cells, currentProject?.connections, setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Connection) => {
      if (!currentProject) return;
      setEdges((eds) => addEdge({ ...params, type: "smoothstep", animated: true, style: { stroke: "rgba(99, 102, 241, 0.5)", strokeWidth: 2 } } as Edge, eds));
      addConnection({
        id: generateId(),
        fromCellId: params.source!,
        toCellId: params.target!,
      });
    },
    [currentProject, setEdges, addConnection]
  );

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

  const handleCreateNode = useCallback(
    (nodeType: CanvasNodeType) => {
      if (!currentProject || !createMenu) return;
      const definition = getNodeDefinition(nodeType);
      if (!definition) return;
      const newNode = createCanvasNode(nodeType, {
        x: createMenu.canvasX - 190,
        y: createMenu.canvasY - 160,
      });
      const cellTypeMap: Record<CanvasNodeType, CellType> = {
        uploadNode: "upload_image",
        imageNode: "ai_image",
        exportImageNode: "upload_image",
        textAnnotationNode: "text_annotation",
        groupNode: "text_block",
        storyboardNode: "storyboard",
        storyboardGenNode: "storyboard_gen",
      };
      const newCell: StoryboardCell = {
        id: newNode.id,
        projectId: currentProject.id,
        position: newNode.position,
        size: { width: 380, height: 320 },
        prompt: "",
        status: "idle",
        cellType: cellTypeMap[nodeType] || "text_block",
        shotType: "image_block",
      };
      addCell(newCell);
      setCreateMenu(null);
    },
    [currentProject, createMenu, addCell]
  );

  if (!currentProject) return null;

  return (
    <div ref={reactFlowWrapper} style={{ width: "100%", height: "100%", position: "relative", background: "#0d0d12" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        snapToGrid
        snapGrid={[16, 16]}
        defaultEdgeOptions={{ type: "smoothstep", animated: true }}
        style={{ background: "#0d0d12" }}
        connectionLineStyle={{ stroke: "rgba(99, 102, 241, 0.5)", strokeWidth: 2 }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color="rgba(255, 255, 255, 0.03)"
        />
        <MiniMap
          nodeColor={(node) => {
            if (node.type === "imageNode") return "#f97316";
            if (node.type === "storyboardGenNode") return "#ec4899";
            if (node.type === "storyboardNode") return "#8b5cf6";
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
      </ReactFlow>

      {/* 创建节点菜单 */}
      {createMenu && (
        <div
          style={{
            position: "fixed",
            left: createMenu.x,
            top: createMenu.y,
            transform: "translate(-50%, -50%)",
            zIndex: 1000,
          }}
        >
          <div style={{
            background: "rgba(17, 17, 24, 0.95)",
            backdropFilter: "blur(24px)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "20px",
            padding: "12px",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "8px",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.03)",
          }}>
            {/* AI 图片 */}
            <button
              onClick={(e) => { e.stopPropagation(); handleCreateNode("imageNode"); }}
              style={{
                padding: "16px",
                borderRadius: "14px",
                border: "1px solid rgba(255, 255, 255, 0.06)",
                background: "rgba(99, 102, 241, 0.08)",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "10px",
                minWidth: "100px",
                transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(99, 102, 241, 0.15)";
                e.currentTarget.style.borderColor = "rgba(99, 102, 241, 0.4)";
                e.currentTarget.style.transform = "scale(1.02)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(99, 102, 241, 0.08)";
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.06)";
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              <div style={{
                width: "40px",
                height: "40px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #6366f1, #4f46e5)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 12px rgba(99, 102, 241, 0.3)",
              }}>
                <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
                  <path d="M8 2L14 12H2L8 2Z" fill="white" />
                  <circle cx="8" cy="9" r="2" fill="#6366f1" />
                </svg>
              </div>
              <span style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.8)", fontWeight: 500 }}>AI 生成</span>
            </button>

            {/* 上传图片 */}
            <button
              onClick={(e) => { e.stopPropagation(); handleCreateNode("uploadNode"); }}
              style={{
                padding: "16px",
                borderRadius: "14px",
                border: "1px solid rgba(255, 255, 255, 0.06)",
                background: "rgba(34, 197, 94, 0.08)",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "10px",
                minWidth: "100px",
                transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(34, 197, 94, 0.15)";
                e.currentTarget.style.borderColor = "rgba(34, 197, 94, 0.4)";
                e.currentTarget.style.transform = "scale(1.02)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(34, 197, 94, 0.08)";
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.06)";
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              <div style={{
                width: "40px",
                height: "40px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #22c55e, #16a34a)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 12px rgba(34, 197, 94, 0.3)",
              }}>
                <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="1.5">
                  <path d="M8 10V4M5 7l3 3 3-3" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M2 11v2a2 2 0 002 2h8a2 2 0 002-2v-2" strokeLinecap="round" />
                </svg>
              </div>
              <span style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.8)", fontWeight: 500 }}>上传</span>
            </button>

            {/* 文本 */}
            <button
              onClick={(e) => { e.stopPropagation(); handleCreateNode("textAnnotationNode"); }}
              style={{
                padding: "16px",
                borderRadius: "14px",
                border: "1px solid rgba(255, 255, 255, 0.06)",
                background: "rgba(168, 85, 247, 0.08)",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "10px",
                minWidth: "100px",
                transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(168, 85, 247, 0.15)";
                e.currentTarget.style.borderColor = "rgba(168, 85, 247, 0.4)";
                e.currentTarget.style.transform = "scale(1.02)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(168, 85, 247, 0.08)";
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.06)";
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              <div style={{
                width: "40px",
                height: "40px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #a855f7, #9333ea)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 12px rgba(168, 85, 247, 0.3)",
              }}>
                <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="1.5">
                  <path d="M3 3h10M3 7h10M3 11h6" strokeLinecap="round" />
                </svg>
              </div>
              <span style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.8)", fontWeight: 500 }}>文本</span>
            </button>

            {/* 分镜生成 */}
            <button
              onClick={(e) => { e.stopPropagation(); handleCreateNode("storyboardGenNode"); }}
              style={{
                padding: "16px",
                borderRadius: "14px",
                border: "1px solid rgba(255, 255, 255, 0.06)",
                background: "rgba(236, 72, 153, 0.08)",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "10px",
                minWidth: "100px",
                transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(236, 72, 153, 0.15)";
                e.currentTarget.style.borderColor = "rgba(236, 72, 153, 0.4)";
                e.currentTarget.style.transform = "scale(1.02)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(236, 72, 153, 0.08)";
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.06)";
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              <div style={{
                width: "40px",
                height: "40px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #ec4899, #db2777)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 12px rgba(236, 72, 153, 0.3)",
              }}>
                <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="1.5">
                  <rect x="2" y="2" width="5" height="5" rx="1" />
                  <rect x="9" y="2" width="5" height="5" rx="1" />
                  <rect x="2" y="9" width="5" height="5" rx="1" />
                  <rect x="9" y="9" width="5" height="5" rx="1" />
                </svg>
              </div>
              <span style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.8)", fontWeight: 500 }}>分镜</span>
            </button>
          </div>
        </div>
      )}

      {/* 空画布提示 */}
      {currentProject.cells.length === 0 && (
        <div style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          textAlign: "center",
          pointerEvents: "none",
        }}>
          <div style={{
            width: "80px",
            height: "80px",
            borderRadius: "20px",
            background: "rgba(99, 102, 241, 0.08)",
            border: "1px dashed rgba(99, 102, 241, 0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
          }}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d="M16 10v12M10 16h12" stroke="url(#emptyGradient)" strokeWidth="2" strokeLinecap="round" />
              <defs>
                <linearGradient id="emptyGradient" x1="10" y1="10" x2="22" y2="22">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <p style={{ fontSize: "14px", fontWeight: 500, color: "rgba(255, 255, 255, 0.6)", marginBottom: "6px" }}>双击添加节点</p>
          <p style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.3)" }}>拖拽移动画布 · 滚轮缩放</p>
        </div>
      )}

      {/* 网格导出按钮 */}
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
        <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2">
          <rect x="1" y="1" width="5" height="5" rx="1" />
          <rect x="8" y="1" width="5" height="5" rx="1" />
          <rect x="1" y="8" width="5" height="5" rx="1" />
          <rect x="8" y="8" width="5" height="5" rx="1" />
        </svg>
        导出
      </button>

      {/* 网格导出弹窗 */}
      {showGridExport && (
        <GridExport onClose={() => setShowGridExport(false)} />
      )}
    </div>
  );
}
