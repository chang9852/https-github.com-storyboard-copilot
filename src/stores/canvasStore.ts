import { create } from "zustand";
import {
  type Connection,
  type EdgeChange,
  type NodeChange,
  type Viewport,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
} from "@xyflow/react";
import type { CanvasNode, CanvasEdge, CanvasNodeType, CanvasNodeData } from "@/features/canvas/domain/canvasNodes";
import { getNodeDefinition } from "@/features/canvas/domain/nodeRegistry";

// --- Types ---

interface ImageViewerState {
  isOpen: boolean;
  activeImageUrl: string;
  imageList: string[];
  currentIndex: number;
}

interface CanvasHistorySnapshot {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}

interface CanvasHistoryState {
  past: CanvasHistorySnapshot[];
  future: CanvasHistorySnapshot[];
}

const MAX_HISTORY_STEPS = 50;
const MIN_SCALE = 0.1;
const MAX_SCALE = 3;
const PADDING = 80;

// --- Helpers ---

function createSnapshot(nodes: CanvasNode[], edges: CanvasEdge[]): CanvasHistorySnapshot {
  return { nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) };
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// --- Store ---

interface CanvasStore {
  // Viewport
  transform: { x: number; y: number; scale: number };
  currentViewport: Viewport;
  canvasViewportSize: { width: number; height: number };

  // Nodes & Edges
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  selectedNodeId: string | null;

  // History
  history: CanvasHistoryState;
  dragHistorySnapshot: CanvasHistorySnapshot | null;

  // Image Viewer
  imageViewer: ImageViewerState;

  // Viewport actions
  setTransform: (t: { x: number; y: number; scale: number }) => void;
  fitToScreen: (containerWidth: number, containerHeight: number) => void;
  zoomTo: (scale: number, centerX?: number, centerY?: number) => void;
  setViewportState: (viewport: Viewport) => void;
  setCanvasViewportSize: (size: { width: number; height: number }) => void;

  // Node/Edge change handlers (for ReactFlow)
  onNodesChange: (changes: NodeChange<CanvasNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<CanvasEdge>[]) => void;
  onConnect: (connection: Connection) => void;

  // Data management
  setCanvasData: (nodes: CanvasNode[], edges: CanvasEdge[], history?: CanvasHistoryState) => void;

  // Node actions
  addNode: (type: CanvasNodeType, position: { x: number; y: number }, data?: Partial<CanvasNodeData>) => string;
  addNodesWithEdges: (
    nodesToAdd: Array<{ type: CanvasNodeType; position: { x: number; y: number }; data?: Partial<CanvasNodeData> }>,
    edgesToAdd?: Array<{ source: string; targetIndex: number }>
  ) => string[];
  updateNodeData: (nodeId: string, data: Partial<CanvasNodeData>) => void;
  updateNodePosition: (nodeId: string, position: { x: number; y: number }) => void;
  deleteNode: (nodeId: string) => void;
  deleteNodes: (nodeIds: string[]) => void;
  setSelectedNode: (nodeId: string | null) => void;

  // Edge actions
  addCanvasEdge: (source: string, target: string) => string | null;
  deleteEdge: (edgeId: string) => void;

  // Group actions
  groupNodes: (nodeIds: string[]) => string | null;
  ungroupNode: (groupNodeId: string) => boolean;

  // Image Viewer actions
  openImageViewer: (imageUrl: string, imageList?: string[]) => void;
  closeImageViewer: () => void;
  navigateImageViewer: (direction: 'prev' | 'next') => void;

  // History actions
  undo: () => boolean;
  redo: () => boolean;
  pushHistory: () => void;

  // Drag history
  startDragHistory: () => void;
  endDragHistory: () => void;

  // Clear
  clearCanvas: () => void;
}

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  // Viewport
  transform: { x: 0, y: 0, scale: 1 },
  currentViewport: { x: 0, y: 0, zoom: 1 },
  canvasViewportSize: { width: 0, height: 0 },

  // Nodes & Edges
  nodes: [],
  edges: [],
  selectedNodeId: null,

  // History
  history: { past: [], future: [] },
  dragHistorySnapshot: null,

  // Image Viewer
  imageViewer: {
    isOpen: false,
    activeImageUrl: '',
    imageList: [],
    currentIndex: 0,
  },

  // --- Viewport actions ---

  setTransform: (t) => set({ transform: t }),

  fitToScreen: (containerWidth, containerHeight) => {
    const { nodes } = get();
    if (nodes.length === 0) {
      set({ transform: { x: 0, y: 0, scale: 1 } });
      return;
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const node of nodes) {
      const w = (node.measured?.width ?? node.width ?? 220) as number;
      const h = (node.measured?.height ?? node.height ?? 200) as number;
      minX = Math.min(minX, node.position.x);
      minY = Math.min(minY, node.position.y);
      maxX = Math.max(maxX, node.position.x + w);
      maxY = Math.max(maxY, node.position.y + h);
    }

    const contentW = maxX - minX + PADDING * 2;
    const contentH = maxY - minY + PADDING * 2;
    const scaleX = containerWidth / contentW;
    const scaleY = containerHeight / contentH;
    const scale = Math.min(scaleX, scaleY, 1);
    const scaleClamped = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale));

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    set({
      transform: {
        x: containerWidth / 2 - centerX * scaleClamped,
        y: containerHeight / 2 - centerY * scaleClamped,
        scale: scaleClamped,
      },
    });
  },

  zoomTo: (scale, centerX, centerY) => {
    const { transform } = get();
    const s = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale));
    set({
      transform: {
        x: centerX ?? transform.x,
        y: centerY ?? transform.y,
        scale: s,
      },
    });
  },

  setViewportState: (viewport) => set({ currentViewport: viewport }),
  setCanvasViewportSize: (size) => set({ canvasViewportSize: size }),

  // --- Node/Edge change handlers ---

  onNodesChange: (changes) => {
    set((state) => ({
      nodes: applyNodeChanges(changes, state.nodes) as CanvasNode[],
    }));
  },

  onEdgesChange: (changes) => {
    set((state) => ({
      edges: applyEdgeChanges(changes, state.edges) as CanvasEdge[],
    }));
  },

  onConnect: (connection) => {
    const { nodes } = get();
    const sourceNode = nodes.find((n) => n.id === connection.source);
    const targetNode = nodes.find((n) => n.id === connection.target);
    if (!sourceNode || !targetNode) return;

    set((state) => ({
      edges: addEdge(
        {
          ...connection,
          type: "disconnectableEdge",
          animated: true,
          style: { stroke: "rgba(99, 102, 241, 0.5)", strokeWidth: 2 },
        } as CanvasEdge,
        state.edges
      ),
    }));
    get().pushHistory();
  },

  // --- Data management ---

  setCanvasData: (nodes, edges, history) => {
    set({
      nodes,
      edges,
      history: history ?? { past: [], future: [] },
    });
  },

  // --- Node actions ---

  addNode: (type, position, data) => {
    const id = generateId();
    const defaultData = getNodeDefinition(type).createDefaultData();
    const newNode: CanvasNode = {
      id,
      type,
      position,
      data: { ...defaultData, ...data } as CanvasNodeData,
    };

    get().pushHistory();
    set((state) => ({
      nodes: [...state.nodes, newNode],
    }));
    return id;
  },

  addNodesWithEdges: (nodesToAdd, edgesToAdd = []) => {
    if (nodesToAdd.length === 0) return [];

    const newNodes = nodesToAdd.map(({ type, position, data }) => {
      const id = generateId();
      const defaultData = getNodeDefinition(type).createDefaultData();
      return {
        id,
        type,
        position,
        data: { ...defaultData, ...data } as CanvasNodeData,
      } as CanvasNode;
    });

    get().pushHistory();
    set((state) => {
      const nextNodes = [...state.nodes, ...newNodes];
      const nextEdges = [...state.edges];

      for (const edge of edgesToAdd) {
        const targetNode = newNodes[edge.targetIndex];
        const sourceExists = nextNodes.some((node) => node.id === edge.source);
        if (!targetNode || !sourceExists) continue;

        const exists = nextEdges.some((item) => item.source === edge.source && item.target === targetNode.id);
        if (exists) continue;

        nextEdges.push({
          id: generateId(),
          source: edge.source,
          target: targetNode.id,
          type: "disconnectableEdge",
          animated: true,
          style: { stroke: "rgba(99, 102, 241, 0.5)", strokeWidth: 2 },
        } as CanvasEdge);
      }

      return { nodes: nextNodes, edges: nextEdges };
    });

    return newNodes.map((node) => node.id);
  },

  updateNodeData: (nodeId, data) => {
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, ...data } as CanvasNodeData }
          : node
      ),
    }));
  },

  updateNodePosition: (nodeId, position) => {
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === nodeId ? { ...node, position } : node
      ),
    }));
  },

  deleteNode: (nodeId) => {
    get().pushHistory();
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== nodeId),
      edges: state.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
      selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId,
    }));
  },

  deleteNodes: (nodeIds) => {
    const idSet = new Set(nodeIds);
    get().pushHistory();
    set((state) => ({
      nodes: state.nodes.filter((n) => !idSet.has(n.id)),
      edges: state.edges.filter((e) => !idSet.has(e.source) && !idSet.has(e.target)),
      selectedNodeId: state.selectedNodeId && idSet.has(state.selectedNodeId) ? null : state.selectedNodeId,
    }));
  },

  setSelectedNode: (nodeId) => set({ selectedNodeId: nodeId }),

  // --- Edge actions ---

  addCanvasEdge: (source, target) => {
    const { nodes, edges } = get();
    const sourceNode = nodes.find((n) => n.id === source);
    const targetNode = nodes.find((n) => n.id === target);
    if (!sourceNode || !targetNode) return null;

    const exists = edges.some((e) => e.source === source && e.target === target);
    if (exists) return null;

    const id = generateId();
    const newEdge: CanvasEdge = {
      id,
      source,
      target,
      type: "disconnectableEdge",
      animated: true,
      style: { stroke: "rgba(99, 102, 241, 0.5)", strokeWidth: 2 },
    };

    get().pushHistory();
    set((state) => ({
      edges: [...state.edges, newEdge],
    }));
    return id;
  },

  deleteEdge: (edgeId) => {
    get().pushHistory();
    set((state) => ({
      edges: state.edges.filter((e) => e.id !== edgeId),
    }));
  },

  // --- Group actions ---

  groupNodes: (nodeIds) => {
    const { nodes } = get();
    const targetNodes = nodes.filter((n) => nodeIds.includes(n.id));
    if (targetNodes.length < 2) return null;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const node of targetNodes) {
      const w = (node.measured?.width ?? node.width ?? 220) as number;
      const h = (node.measured?.height ?? node.height ?? 200) as number;
      minX = Math.min(minX, node.position.x);
      minY = Math.min(minY, node.position.y);
      maxX = Math.max(maxX, node.position.x + w);
      maxY = Math.max(maxY, node.position.y + h);
    }

    const groupId = generateId();
    const groupNode: CanvasNode = {
      id: groupId,
      type: "groupNode",
      position: { x: minX - 20, y: minY - 40 },
      data: {
        label: "Group",
        childNodeIds: nodeIds,
      } as CanvasNodeData,
      style: {
        width: maxX - minX + 40,
        height: maxY - minY + 60,
      },
    };

    get().pushHistory();
    set((state) => ({
      nodes: [...state.nodes, groupNode],
    }));
    return groupId;
  },

  ungroupNode: (groupNodeId) => {
    const { nodes } = get();
    const groupNode = nodes.find((n) => n.id === groupNodeId && n.type === "groupNode");
    if (!groupNode) return false;

    get().pushHistory();
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== groupNodeId),
    }));
    return true;
  },

  // --- Image Viewer ---

  openImageViewer: (imageUrl, imageList) => {
    const list = imageList?.length ? imageList : [imageUrl];
    const currentIndex = list.findIndex((url) => url === imageUrl);
    set({
      imageViewer: {
        isOpen: true,
        activeImageUrl: imageUrl,
        imageList: list,
        currentIndex: currentIndex >= 0 ? currentIndex : 0,
      },
    });
  },

  closeImageViewer: () => {
    set((state) => ({
      imageViewer: { ...state.imageViewer, isOpen: false },
    }));
  },

  navigateImageViewer: (direction) => {
    set((state) => {
      const { imageList, currentIndex } = state.imageViewer;
      if (imageList.length <= 1) return state;

      let newIndex: number;
      if (direction === 'prev') {
        newIndex = currentIndex <= 0 ? imageList.length - 1 : currentIndex - 1;
      } else {
        newIndex = currentIndex >= imageList.length - 1 ? 0 : currentIndex + 1;
      }

      return {
        imageViewer: {
          ...state.imageViewer,
          currentIndex: newIndex,
          activeImageUrl: imageList[newIndex],
        },
      };
    });
  },

  // --- History ---

  pushHistory: () => {
    set((state) => {
      const snapshot = createSnapshot(state.nodes, state.edges);
      const past = [...state.history.past, snapshot].slice(-MAX_HISTORY_STEPS);
      return {
        history: { past, future: [] },
      };
    });
  },

  undo: () => {
    const { history, nodes, edges } = get();
    if (history.past.length === 0) return false;

    const previous = history.past[history.past.length - 1];
    const currentSnapshot = createSnapshot(nodes, edges);

    set({
      nodes: previous.nodes,
      edges: previous.edges,
      history: {
        past: history.past.slice(0, -1),
        future: [currentSnapshot, ...history.future].slice(0, MAX_HISTORY_STEPS),
      },
    });
    return true;
  },

  redo: () => {
    const { history, nodes, edges } = get();
    if (history.future.length === 0) return false;

    const next = history.future[0];
    const currentSnapshot = createSnapshot(nodes, edges);

    set({
      nodes: next.nodes,
      edges: next.edges,
      history: {
        past: [...history.past, currentSnapshot].slice(-MAX_HISTORY_STEPS),
        future: history.future.slice(1),
      },
    });
    return true;
  },

  startDragHistory: () => {
    const { nodes, edges } = get();
    set({ dragHistorySnapshot: createSnapshot(nodes, edges) });
  },

  endDragHistory: () => {
    const { dragHistorySnapshot, nodes, edges } = get();
    if (!dragHistorySnapshot) return;

    const changed =
      JSON.stringify(dragHistorySnapshot.nodes) !== JSON.stringify(nodes) ||
      JSON.stringify(dragHistorySnapshot.edges) !== JSON.stringify(edges);

    if (changed) {
      set((state) => {
        const past = [...state.history.past, dragHistorySnapshot].slice(-MAX_HISTORY_STEPS);
        return {
          history: { past, future: [] },
          dragHistorySnapshot: null,
        };
      });
    } else {
      set({ dragHistorySnapshot: null });
    }
  },

  clearCanvas: () => {
    set({
      nodes: [],
      edges: [],
      selectedNodeId: null,
      history: { past: [], future: [] },
    });
  },
}));
