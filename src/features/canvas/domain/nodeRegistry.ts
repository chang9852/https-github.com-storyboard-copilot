import type { ComponentType } from "react";
import type { CellType, ShotType } from "@/types/project";
import type {
  CanvasNodeType,
  CanvasNodeData,
  UploadImageNodeData,
  ImageEditNodeData,
  ExportImageNodeData,
  GroupNodeData,
  TextAnnotationNodeData,
  StoryboardSplitNodeData,
  StoryboardGenNodeData,
} from "./canvasNodes";
import { CANVAS_NODE_TYPES, DEFAULT_ASPECT_RATIO, AUTO_REQUEST_ASPECT_RATIO, type ImageSize } from "./canvasNodes";
import type { ProviderId } from "@/types/ai";
import { DEFAULT_NODE_DISPLAY_NAME } from "./nodeDisplay";
import { UploadNode } from "../nodes/UploadNode";
import { ImageEditNode } from "../nodes/ImageEditNode";
import { ImageNode } from "../nodes/ImageNode";
import { TextAnnotationNode } from "../nodes/TextAnnotationNode";
import { GroupNode } from "../nodes/GroupNode";
import { StoryboardSplitNode } from "../nodes/StoryboardSplitNode";
import { StoryboardGenNode } from "../nodes/StoryboardGenNode";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyComponent = ComponentType<any>;

export type MenuIconKey = 'upload' | 'sparkles' | 'layout' | 'text';

export interface CanvasNodeCapabilities {
  toolbar: boolean;
  promptInput: boolean;
}

export interface CanvasNodeConnectivity {
  sourceHandle: boolean;
  targetHandle: boolean;
  connectMenu: {
    fromSource: boolean;
    fromTarget: boolean;
  };
}

export interface CanvasNodeDefinition<TData extends CanvasNodeData = CanvasNodeData> {
  type: CanvasNodeType;
  menuLabelKey: string;
  menuIcon: MenuIconKey;
  visibleInMenu: boolean;
  component: AnyComponent;
  persistence: {
    cellType: CellType;
    shotType: ShotType | 'image_block' | 'text_block';
    defaultSize: { width: number; height: number };
  };
  capabilities: CanvasNodeCapabilities;
  connectivity: CanvasNodeConnectivity;
  createDefaultData: () => TData;
}

const DEFAULT_IMAGE_MODEL_ID = 'kie/nano-banana-pro';
const DEFAULT_PERSISTED_NODE_SIZE = { width: 380, height: 320 } as const;

const uploadNodeDefinition: CanvasNodeDefinition<UploadImageNodeData> = {
  type: CANVAS_NODE_TYPES.upload,
  menuLabelKey: 'node.menu.uploadImage',
  menuIcon: 'upload',
  visibleInMenu: true,
  component: UploadNode,
  persistence: {
    cellType: 'upload_image',
    shotType: 'image_block',
    defaultSize: DEFAULT_PERSISTED_NODE_SIZE,
  },
  capabilities: {
    toolbar: true,
    promptInput: false,
  },
  connectivity: {
    sourceHandle: true,
    targetHandle: false,
    connectMenu: {
      fromSource: false,
      fromTarget: true,
    },
  },
  createDefaultData: () => ({
    displayName: DEFAULT_NODE_DISPLAY_NAME[CANVAS_NODE_TYPES.upload],
    imageUrl: null,
    previewImageUrl: null,
    aspectRatio: '1:1',
    isSizeManuallyAdjusted: false,
    sourceFileName: null,
  }),
};

const imageEditNodeDefinition: CanvasNodeDefinition<ImageEditNodeData> = {
  type: CANVAS_NODE_TYPES.imageEdit,
  menuLabelKey: 'node.menu.aiImageGeneration',
  menuIcon: 'sparkles',
  visibleInMenu: true,
  component: ImageEditNode,
  persistence: {
    cellType: 'ai_image',
    shotType: 'image_block',
    defaultSize: DEFAULT_PERSISTED_NODE_SIZE,
  },
  capabilities: {
    toolbar: true,
    promptInput: false,
  },
  connectivity: {
    sourceHandle: true,
    targetHandle: true,
    connectMenu: {
      fromSource: true,
      fromTarget: false,
    },
  },
  createDefaultData: () => ({
    displayName: DEFAULT_NODE_DISPLAY_NAME[CANVAS_NODE_TYPES.imageEdit],
    imageUrl: null,
    previewImageUrl: null,
    aspectRatio: DEFAULT_ASPECT_RATIO,
    isSizeManuallyAdjusted: false,
    requestAspectRatio: AUTO_REQUEST_ASPECT_RATIO,
    prompt: '',
    model: DEFAULT_IMAGE_MODEL_ID,
    provider: 'kie' as ProviderId,
    size: '2K' as ImageSize,
    extraParams: {},
    isGenerating: false,
    generationStartedAt: null,
    generationDurationMs: 60000,
  }),
};

const exportImageNodeDefinition: CanvasNodeDefinition<ExportImageNodeData> = {
  type: CANVAS_NODE_TYPES.exportImage,
  menuLabelKey: 'node.menu.uploadImage',
  menuIcon: 'upload',
  visibleInMenu: false,
  component: ImageNode,
  persistence: {
    cellType: 'upload_image',
    shotType: 'image_block',
    defaultSize: DEFAULT_PERSISTED_NODE_SIZE,
  },
  capabilities: {
    toolbar: true,
    promptInput: false,
  },
  connectivity: {
    sourceHandle: true,
    targetHandle: true,
    connectMenu: {
      fromSource: false,
      fromTarget: false,
    },
  },
  createDefaultData: () => ({
    displayName: DEFAULT_NODE_DISPLAY_NAME[CANVAS_NODE_TYPES.exportImage],
    imageUrl: null,
    previewImageUrl: null,
    aspectRatio: DEFAULT_ASPECT_RATIO,
    isSizeManuallyAdjusted: false,
    resultKind: 'generic',
  }),
};

const groupNodeDefinition: CanvasNodeDefinition<GroupNodeData> = {
  type: CANVAS_NODE_TYPES.group,
  menuLabelKey: 'node.menu.storyboard',
  menuIcon: 'layout',
  visibleInMenu: false,
  component: GroupNode,
  persistence: {
    cellType: 'text_block',
    shotType: 'text_block',
    defaultSize: DEFAULT_PERSISTED_NODE_SIZE,
  },
  capabilities: {
    toolbar: false,
    promptInput: false,
  },
  connectivity: {
    sourceHandle: false,
    targetHandle: false,
    connectMenu: {
      fromSource: false,
      fromTarget: false,
    },
  },
  createDefaultData: () => ({
    displayName: DEFAULT_NODE_DISPLAY_NAME[CANVAS_NODE_TYPES.group],
    label: 'Group',
    childNodeIds: [],
  }),
};

const textAnnotationNodeDefinition: CanvasNodeDefinition<TextAnnotationNodeData> = {
  type: CANVAS_NODE_TYPES.textAnnotation,
  menuLabelKey: 'node.menu.textAnnotation',
  menuIcon: 'text',
  visibleInMenu: true,
  component: TextAnnotationNode,
  persistence: {
    cellType: 'text_annotation',
    shotType: 'text_block',
    defaultSize: DEFAULT_PERSISTED_NODE_SIZE,
  },
  capabilities: {
    toolbar: true,
    promptInput: false,
  },
  connectivity: {
    sourceHandle: false,
    targetHandle: false,
    connectMenu: {
      fromSource: false,
      fromTarget: false,
    },
  },
  createDefaultData: () => ({
    displayName: DEFAULT_NODE_DISPLAY_NAME[CANVAS_NODE_TYPES.textAnnotation],
    text: 'textNode.dblClickEdit',
    fontSize: 14,
    color: '#ffffff',
    backgroundColor: undefined,
  }),
};

const storyboardSplitDefinition: CanvasNodeDefinition<StoryboardSplitNodeData> = {
  type: CANVAS_NODE_TYPES.storyboardSplit,
  menuLabelKey: 'node.menu.storyboard',
  menuIcon: 'layout',
  visibleInMenu: false,
  component: StoryboardSplitNode,
  persistence: {
    cellType: 'storyboard',
    shotType: 'image_block',
    defaultSize: DEFAULT_PERSISTED_NODE_SIZE,
  },
  capabilities: {
    toolbar: false,
    promptInput: false,
  },
  connectivity: {
    sourceHandle: true,
    targetHandle: true,
    connectMenu: {
      fromSource: false,
      fromTarget: false,
    },
  },
  createDefaultData: () => ({
    displayName: DEFAULT_NODE_DISPLAY_NAME[CANVAS_NODE_TYPES.storyboardSplit],
    aspectRatio: DEFAULT_ASPECT_RATIO,
    frameAspectRatio: DEFAULT_ASPECT_RATIO,
    gridRows: 2,
    gridCols: 2,
    frames: [],
    exportOptions: {
      showFrameIndex: false,
      showFrameNote: false,
      notePlacement: 'overlay',
      imageFit: 'cover',
      frameIndexPrefix: 'S',
      cellGap: 8,
      outerPadding: 0,
      fontSize: 4,
      backgroundColor: '#0f1115',
      textColor: '#f8fafc',
    },
  }),
};

const storyboardGenNodeDefinition: CanvasNodeDefinition<StoryboardGenNodeData> = {
  type: CANVAS_NODE_TYPES.storyboardGen,
  menuLabelKey: 'node.menu.storyboardGen',
  menuIcon: 'sparkles',
  visibleInMenu: true,
  component: StoryboardGenNode,
  persistence: {
    cellType: 'storyboard_gen',
    shotType: 'image_block',
    defaultSize: DEFAULT_PERSISTED_NODE_SIZE,
  },
  capabilities: {
    toolbar: true,
    promptInput: false,
  },
  connectivity: {
    sourceHandle: true,
    targetHandle: true,
    connectMenu: {
      fromSource: true,
      fromTarget: false,
    },
  },
  createDefaultData: () => ({
    displayName: DEFAULT_NODE_DISPLAY_NAME[CANVAS_NODE_TYPES.storyboardGen],
    gridRows: 2,
    gridCols: 2,
    frames: [],
    ratioControlMode: 'cell',
    model: DEFAULT_IMAGE_MODEL_ID,
    size: '2K' as ImageSize,
    requestAspectRatio: AUTO_REQUEST_ASPECT_RATIO,
    extraParams: {},
    imageUrl: null,
    previewImageUrl: null,
    aspectRatio: DEFAULT_ASPECT_RATIO,
    isGenerating: false,
    generationStartedAt: null,
    generationDurationMs: 60000,
  }),
};

export const canvasNodeDefinitions: Record<CanvasNodeType, CanvasNodeDefinition> = {
  [CANVAS_NODE_TYPES.upload]: uploadNodeDefinition,
  [CANVAS_NODE_TYPES.imageEdit]: imageEditNodeDefinition,
  [CANVAS_NODE_TYPES.exportImage]: exportImageNodeDefinition,
  [CANVAS_NODE_TYPES.textAnnotation]: textAnnotationNodeDefinition,
  [CANVAS_NODE_TYPES.group]: groupNodeDefinition,
  [CANVAS_NODE_TYPES.storyboardSplit]: storyboardSplitDefinition,
  [CANVAS_NODE_TYPES.storyboardGen]: storyboardGenNodeDefinition,
};

export function getNodeDefinition(type: CanvasNodeType): CanvasNodeDefinition {
  return canvasNodeDefinitions[type];
}

export function getMenuNodeDefinitions(): CanvasNodeDefinition[] {
  return Object.values(canvasNodeDefinitions).filter((definition) => definition.visibleInMenu);
}

export function getNodeTypeForCellType(cellType: CellType | undefined): CanvasNodeType {
  const definition = Object.values(canvasNodeDefinitions).find(
    (item) => item.persistence.cellType === cellType && item.visibleInMenu
  );

  if (definition) {
    return definition.type;
  }

  if (cellType === 'storyboard') {
    return CANVAS_NODE_TYPES.storyboardSplit;
  }

  return CANVAS_NODE_TYPES.textAnnotation;
}

export function nodeHasSourceHandle(type: CanvasNodeType): boolean {
  return canvasNodeDefinitions[type].connectivity.sourceHandle;
}

export function nodeHasTargetHandle(type: CanvasNodeType): boolean {
  return canvasNodeDefinitions[type].connectivity.targetHandle;
}

export function getConnectMenuNodeTypes(handleType: 'source' | 'target'): CanvasNodeType[] {
  const fromSource = handleType === 'source';
  return Object.values(canvasNodeDefinitions)
    .filter((definition) => (fromSource
      ? definition.connectivity.connectMenu.fromSource
      : definition.connectivity.connectMenu.fromTarget))
    .filter((definition) => (fromSource
      ? definition.connectivity.targetHandle
      : definition.connectivity.sourceHandle))
    .map((definition) => definition.type);
}

// For ReactFlow nodeTypes mapping
export function getNodeComponentMap(): Record<CanvasNodeType, AnyComponent> {
  const map: Record<string, AnyComponent> = {};
  for (const [key, def] of Object.entries(canvasNodeDefinitions)) {
    map[key] = def.component;
  }
  return map as Record<CanvasNodeType, AnyComponent>;
}
