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
import type { NodeTypeKey } from "./domain/canvasNodes";

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// 将项目数据转换为 ReactFlow 节点
function cellsToNodes(cells: StoryboardCell[]): Node[] {
  return cells.map((cell) => {
    // 根据 cellType 映射到正确的节点类型
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
    style: { stroke: "#3b82f6", strokeWidth: 2 },
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

  // 删除选中节点
  const deleteSelectedNodes = useCallback(() => {
    const selectedNodes = getNodes().filter((n) => n.selected);
    if (selectedNodes.length === 0) return;

    selectedNodes.forEach((node) => {
      deleteCell(node.id);
    });
  }, [getNodes, deleteCell]);

  // 键盘事件监听
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

  // 同步项目数据到 ReactFlow
  useMemo(() => {
    if (currentProject) {
      const newNodes = cellsToNodes(currentProject.cells);
      const newEdges = connectionsToEdges(currentProject.connections);
      setNodes(newNodes);
      setEdges(newEdges);
    }
  }, [currentProject?.cells, currentProject?.connections, setNodes, setEdges]);

  // 连接节点
  const onConnect = useCallback(
    (params: Connection) => {
      if (!currentProject) return;
      setEdges((eds) => addEdge({ ...params, type: "smoothstep", animated: true, style: { stroke: "#3b82f6", strokeWidth: 2 } } as Edge, eds));
      addConnection({
        id: generateId(),
        fromCellId: params.source!,
        toCellId: params.target!,
      });
    },
    [currentProject, setEdges, addConnection]
  );

  // 双击显示创建菜单
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

  // 创建节点 (using new domain architecture)
  const handleCreateNode = useCallback(
    (nodeType: NodeTypeKey) => {
      if (!currentProject || !createMenu) return;

      const definition = getNodeDefinition(nodeType);
      if (!definition) return;

      // Create node using the new factory
      const newNode = createCanvasNode({
        type: nodeType,
        position: {
          x: createMenu.canvasX - 190,
          y: createMenu.canvasY - 160,
        },
      });

      // Convert to StoryboardCell format for backward compatibility
      const cellTypeMap: Record<NodeTypeKey, CellType> = {
        upload: "upload_image",
        imageEdit: "ai_image",
        exportImage: "upload_image",
        textAnnotation: "text_annotation",
        group: "text_block",
        storyboardSplit: "storyboard",
        storyboardGen: "storyboard_gen",
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
    <div ref={reactFlowWrapper} style={{ width: "100%", height: "100%", position: "relative" }}>
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
        style={{ background: "var(--bg)" }}
        connectionLineStyle={{ stroke: "var(--accent)", strokeWidth: 2 }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color="rgba(0, 0, 0, 0.08)"
        />
        <MiniMap
          nodeColor={(node) => {
            if (node.type === "imageNode") return "#f97316";
            if (node.type === "storyboardGenNode") return "#ec4899";
            if (node.type === "storyboardNode") return "#8b5cf6";
            return "#3b82f6";
          }}
          style={{
            background: "var(--ui-surface-panel)",
            border: "1px solid var(--ui-border-soft)",
            borderRadius: "var(--ui-radius-lg)",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
          }}
          maskColor="rgba(var(--accent-rgb), 0.08)"
          pannable
          zoomable
        />
        <Controls
          style={{
            background: "var(--ui-surface-panel)",
            border: "1px solid var(--ui-border-soft)",
            borderRadius: "var(--ui-radius-lg)",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
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
            background: "#ffffff",
            border: "1px solid rgba(0,0,0,0.08)",
            borderRadius: "16px",
            padding: "10px",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "8px",
            boxShadow: "0 12px 40px rgba(0,0,0,0.15), 0 4px 12px rgba(0,0,0,0.08)",
          }}>
            {/* AI 图片 */}
            <button
              onClick={(e) => { e.stopPropagation(); handleCreateNode("imageEdit"); }}
              className="group/btn"
              style={{
                padding: "14px 16px",
                borderRadius: "12px",
                border: "1px solid #f0f0f0",
                background: "linear-gradient(135deg, #f8f9fa, #ffffff)",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "8px",
                minWidth: "90px",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "linear-gradient(135deg, #eff6ff, #f0f9ff)";
                e.currentTarget.style.borderColor = "#3b82f6";
                e.currentTarget.style.transform = "scale(1.02)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "linear-gradient(135deg, #f8f9fa, #ffffff)";
                e.currentTarget.style.borderColor = "#f0f0f0";
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              <div style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #3b82f6, #2563eb)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
              }}>
                <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                  <path d="M8 2L14 12H2L8 2Z" fill="white" />
                  <circle cx="8" cy="9" r="2" fill="#3b82f6" />
                </svg>
              </div>
              <span style={{ fontSize: "11px", color: "#333", fontWeight: 500 }}>AI 图片</span>
            </button>

            {/* 上传图片 */}
            <button
              onClick={(e) => { e.stopPropagation(); handleCreateNode("upload"); }}
              style={{
                padding: "14px 16px",
                borderRadius: "12px",
                border: "1px solid #f0f0f0",
                background: "linear-gradient(135deg, #f8f9fa, #ffffff)",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "8px",
                minWidth: "90px",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "linear-gradient(135deg, #ecfdf5, #f0fdf4)";
                e.currentTarget.style.borderColor = "#10b981";
                e.currentTarget.style.transform = "scale(1.02)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "linear-gradient(135deg, #f8f9fa, #ffffff)";
                e.currentTarget.style.borderColor = "#f0f0f0";
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              <div style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #10b981, #059669)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
              }}>
                <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="1.5">
                  <path d="M8 10V4M5 7l3 3 3-3" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M2 11v2a2 2 0 002 2h8a2 2 0 002-2v-2" strokeLinecap="round" />
                </svg>
              </div>
              <span style={{ fontSize: "11px", color: "#333", fontWeight: 500 }}>上传图片</span>
            </button>

            {/* 文本 */}
            <button
              onClick={(e) => { e.stopPropagation(); handleCreateNode("textAnnotation"); }}
              style={{
                padding: "14px 16px",
                borderRadius: "12px",
                border: "1px solid #f0f0f0",
                background: "linear-gradient(135deg, #f8f9fa, #ffffff)",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "8px",
                minWidth: "90px",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "linear-gradient(135deg, #faf5ff, #f5f3ff)";
                e.currentTarget.style.borderColor = "#8b5cf6";
                e.currentTarget.style.transform = "scale(1.02)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "linear-gradient(135deg, #f8f9fa, #ffffff)";
                e.currentTarget.style.borderColor = "#f0f0f0";
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              <div style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #8b5cf6, #6366f1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 12px rgba(139, 92, 246, 0.3)",
              }}>
                <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="1.5">
                  <path d="M3 3h10M3 7h10M3 11h6" strokeLinecap="round" />
                </svg>
              </div>
              <span style={{ fontSize: "11px", color: "#333", fontWeight: 500 }}>文本</span>
            </button>

            {/* 分镜生成 */}
            <button
              onClick={(e) => { e.stopPropagation(); handleCreateNode("storyboardGen"); }}
              style={{
                padding: "14px 16px",
                borderRadius: "12px",
                border: "1px solid #f0f0f0",
                background: "linear-gradient(135deg, #f8f9fa, #ffffff)",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "8px",
                minWidth: "90px",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "linear-gradient(135deg, #fdf2f8, #fce7f3)";
                e.currentTarget.style.borderColor = "#ec4899";
                e.currentTarget.style.transform = "scale(1.02)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "linear-gradient(135deg, #f8f9fa, #ffffff)";
                e.currentTarget.style.borderColor = "#f0f0f0";
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              <div style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #ec4899, #be185d)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 12px rgba(236, 72, 153, 0.3)",
              }}>
                <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="1.5">
                  <rect x="2" y="2" width="5" height="5" rx="1" />
                  <rect x="9" y="2" width="5" height="5" rx="1" />
                  <rect x="2" y="9" width="5" height="5" rx="1" />
                  <rect x="9" y="9" width="5" height="5" rx="1" />
                </svg>
              </div>
              <span style={{ fontSize: "11px", color: "#333", fontWeight: 500 }}>分镜生成</span>
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
            background: "linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.1))",
            border: "2px dashed rgba(59, 130, 246, 0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
          }}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d="M16 10v12M10 16h12" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <p style={{ fontSize: "14px", fontWeight: 500, color: "#666", marginBottom: "4px" }}>双击鼠标添加节点</p>
          <p style={{ fontSize: "12px", color: "#999" }}>拖拽空白区域移动画布，滚轮缩放</p>
        </div>
      )}

      {/* 网格导出按钮 */}
      <button
        onClick={() => setShowGridExport(true)}
        style={{
          position: "absolute",
          top: "16px",
          right: "16px",
          padding: "8px 16px",
          fontSize: "12px",
          fontWeight: 500,
          color: "#666",
          background: "#ffffff",
          border: "1px solid #e0e0e0",
          borderRadius: "8px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          zIndex: 10,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2">
          <rect x="1" y="1" width="5" height="5" rx="1" />
          <rect x="8" y="1" width="5" height="5" rx="1" />
          <rect x="1" y="8" width="5" height="5" rx="1" />
          <rect x="8" y="8" width="5" height="5" rx="1" />
        </svg>
        导出网格
      </button>

      {/* 网格导出弹窗 */}
      {showGridExport && (
        <GridExport onClose={() => setShowGridExport(false)} />
      )}
    </div>
  );
}
