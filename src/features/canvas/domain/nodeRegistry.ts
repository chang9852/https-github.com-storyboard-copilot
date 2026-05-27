import type { ComponentType } from "react";
import type { NodeTypeKey, CanvasNodeData } from "./canvasNodes";
import { NodeTypes } from "./canvasNodes";
import { UploadNode } from "../nodes/UploadNode";
import { ImageEditNode } from "../nodes/ImageEditNode";
import { ImageNode } from "../nodes/ImageNode";
import { TextAnnotationNode } from "../nodes/TextAnnotationNode";
import { GroupNode } from "../nodes/GroupNode";
import { StoryboardSplitNode } from "../nodes/StoryboardSplitNode";
import { StoryboardGenNode } from "../nodes/StoryboardGenNode";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyComponent = ComponentType<any>;

export interface NodeDefinition {
  type: NodeTypeKey;
  menuLabelKey: string;
  menuIcon: string;
  visibleInMenu: boolean;
  component: AnyComponent;
  capabilities: {
    toolbar: boolean;
    promptInput: boolean;
  };
  connectivity: {
    sourceHandle: boolean;
    targetHandle: boolean;
    connectMenu: boolean;
  };
  createDefaultData: () => CanvasNodeData;
}

// Node registry - single source of truth
const nodeRegistry: Record<NodeTypeKey, NodeDefinition> = {
  [NodeTypes.upload]: {
    type: NodeTypes.upload,
    menuLabelKey: "nodes.upload",
    menuIcon: "upload",
    visibleInMenu: true,
    component: UploadNode,
    capabilities: {
      toolbar: true,
      promptInput: false,
    },
    connectivity: {
      sourceHandle: true,
      targetHandle: false,
      connectMenu: false,
    },
    createDefaultData: () => ({
      imageUrl: "",
      fileName: undefined,
    }),
  },
  [NodeTypes.imageEdit]: {
    type: NodeTypes.imageEdit,
    menuLabelKey: "nodes.aiImage",
    menuIcon: "sparkles",
    visibleInMenu: true,
    component: ImageEditNode,
    capabilities: {
      toolbar: true,
      promptInput: true,
    },
    connectivity: {
      sourceHandle: true,
      targetHandle: true,
      connectMenu: true,
    },
    createDefaultData: () => ({
      prompt: "",
      negativePrompt: undefined,
      model: "nano-banana-pro",
      provider: "kie" as const,
      size: { width: 1024, height: 1024 },
      aspectRatio: "1:1",
      extraParams: undefined,
      isGenerating: false,
      generatingStartTime: undefined,
      error: undefined,
      imageUrl: undefined,
    }),
  },
  [NodeTypes.exportImage]: {
    type: NodeTypes.exportImage,
    menuLabelKey: "nodes.export",
    menuIcon: "download",
    visibleInMenu: true,
    component: ImageNode,
    capabilities: {
      toolbar: true,
      promptInput: false,
    },
    connectivity: {
      sourceHandle: false,
      targetHandle: true,
      connectMenu: false,
    },
    createDefaultData: () => ({
      images: [],
      selectedImageIndex: undefined,
    }),
  },
  [NodeTypes.textAnnotation]: {
    type: NodeTypes.textAnnotation,
    menuLabelKey: "nodes.textAnnotation",
    menuIcon: "type",
    visibleInMenu: true,
    component: TextAnnotationNode,
    capabilities: {
      toolbar: false,
      promptInput: false,
    },
    connectivity: {
      sourceHandle: false,
      targetHandle: false,
      connectMenu: false,
    },
    createDefaultData: () => ({
      text: "双击编辑文本",
      fontSize: 14,
      color: "#ffffff",
      backgroundColor: undefined,
    }),
  },
  [NodeTypes.group]: {
    type: NodeTypes.group,
    menuLabelKey: "nodes.group",
    menuIcon: "group",
    visibleInMenu: false,
    component: GroupNode,
    capabilities: {
      toolbar: true,
      promptInput: false,
    },
    connectivity: {
      sourceHandle: false,
      targetHandle: false,
      connectMenu: false,
    },
    createDefaultData: () => ({
      label: "分组",
      childNodeIds: [],
    }),
  },
  [NodeTypes.storyboardSplit]: {
    type: NodeTypes.storyboardSplit,
    menuLabelKey: "nodes.storyboardSplit",
    menuIcon: "grid",
    visibleInMenu: true,
    component: StoryboardSplitNode,
    capabilities: {
      toolbar: true,
      promptInput: false,
    },
    connectivity: {
      sourceHandle: false,
      targetHandle: true,
      connectMenu: false,
    },
    createDefaultData: () => ({
      gridRows: 2,
      gridCols: 3,
      frames: [],
      exportOptions: {
        showFrameIndex: true,
        showFrameNote: true,
        notePlacement: "bottom" as const,
        imageFit: "cover" as const,
        frameIndexPrefix: "",
        cellGap: 8,
        fontSize: 12,
        backgroundColor: "#000000",
        textColor: "#ffffff",
      },
    }),
  },
  [NodeTypes.storyboardGen]: {
    type: NodeTypes.storyboardGen,
    menuLabelKey: "nodes.storyboardGen",
    menuIcon: "film",
    visibleInMenu: true,
    component: StoryboardGenNode,
    capabilities: {
      toolbar: true,
      promptInput: true,
    },
    connectivity: {
      sourceHandle: true,
      targetHandle: true,
      connectMenu: true,
    },
    createDefaultData: () => ({
      gridRows: 2,
      gridCols: 3,
      frames: [],
      model: "nano-banana-pro",
      provider: "kie" as const,
      size: { width: 1024, height: 1024 },
      aspectRatio: "16:9",
      isGenerating: false,
    }),
  },
};

// Public API
export function getNodeDefinition(type: NodeTypeKey): NodeDefinition | undefined {
  return nodeRegistry[type];
}

export function getMenuNodeDefinitions(): NodeDefinition[] {
  return Object.values(nodeRegistry).filter((def) => def.visibleInMenu);
}

export function nodeHasSourceHandle(type: NodeTypeKey): boolean {
  return nodeRegistry[type]?.connectivity.sourceHandle ?? false;
}

export function nodeHasTargetHandle(type: NodeTypeKey): boolean {
  return nodeRegistry[type]?.connectivity.targetHandle ?? false;
}

export function getConnectMenuNodeTypes(): NodeTypeKey[] {
  return Object.values(nodeRegistry)
    .filter((def) => def.connectivity.connectMenu)
    .map((def) => def.type);
}

// For ReactFlow nodeTypes mapping
export function getNodeComponentMap(): Record<NodeTypeKey, AnyComponent> {
  const map: Record<string, AnyComponent> = {};
  for (const [key, def] of Object.entries(nodeRegistry)) {
    map[key] = def.component;
  }
  return map as Record<NodeTypeKey, AnyComponent>;
}
