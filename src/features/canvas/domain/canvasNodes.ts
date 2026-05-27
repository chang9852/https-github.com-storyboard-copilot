import type { ProviderId } from "@/types/ai";

// Node type keys
export type NodeToolType = "crop" | "annotate" | "split-storyboard";

export interface ImageEditNodeData {
  prompt: string;
  negativePrompt?: string;
  model: string;
  provider: ProviderId;
  size: { width: number; height: number };
  aspectRatio: string;
  extraParams?: Record<string, unknown>;
  isGenerating: boolean;
  generatingStartTime?: number;
  error?: string;
  imageUrl?: string;
}

export interface UploadNodeData {
  imageUrl: string;
  fileName?: string;
}

export interface ExportImageNodeData {
  images: string[];
  selectedImageIndex?: number;
}

export interface TextAnnotationNodeData {
  text: string;
  fontSize: number;
  color: string;
  backgroundColor?: string;
}

export interface GroupNodeData {
  label: string;
  childNodeIds: string[];
}

export interface StoryboardSplitNodeData {
  gridRows: number;
  gridCols: number;
  frames: Array<{
    id: string;
    imageUrl: string | null;
    note: string;
    order: number;
  }>;
  exportOptions: {
    showFrameIndex: boolean;
    showFrameNote: boolean;
    notePlacement: "overlay" | "bottom";
    imageFit: "cover" | "contain";
    frameIndexPrefix: string;
    cellGap: number;
    fontSize: number;
    backgroundColor: string;
    textColor: string;
  };
}

export interface StoryboardGenNodeData {
  gridRows: number;
  gridCols: number;
  frames: Array<{
    id: string;
    description: string;
    referenceIndex: number | null;
  }>;
  model: string;
  provider: ProviderId;
  size: { width: number; height: number };
  aspectRatio: string;
  isGenerating: boolean;
}

// Union type for all node data
export type CanvasNodeData =
  | ImageEditNodeData
  | UploadNodeData
  | ExportImageNodeData
  | TextAnnotationNodeData
  | GroupNodeData
  | StoryboardSplitNodeData
  | StoryboardGenNodeData;

// Node type enum
export const NodeTypes = {
  upload: "upload",
  imageEdit: "imageEdit",
  exportImage: "exportImage",
  textAnnotation: "textAnnotation",
  group: "group",
  storyboardSplit: "storyboardSplit",
  storyboardGen: "storyboardGen",
} as const;

export type NodeTypeKey = (typeof NodeTypes)[keyof typeof NodeTypes];

// Helper to check node data type
export function isImageEditNodeData(data: CanvasNodeData): data is ImageEditNodeData {
  return "prompt" in data && "model" in data && "provider" in data;
}

export function isUploadNodeData(data: CanvasNodeData): data is UploadNodeData {
  return "imageUrl" in data && !("frames" in data);
}

export function isExportImageNodeData(data: CanvasNodeData): data is ExportImageNodeData {
  return "images" in data && Array.isArray(data.images);
}

export function isTextAnnotationNodeData(data: CanvasNodeData): data is TextAnnotationNodeData {
  return "text" in data && "fontSize" in data;
}

export function isGroupNodeData(data: CanvasNodeData): data is GroupNodeData {
  return "label" in data && "childNodeIds" in data;
}

export function isStoryboardSplitNodeData(data: CanvasNodeData): data is StoryboardSplitNodeData {
  return "frames" in data && "exportOptions" in data;
}

export function isStoryboardGenNodeData(data: CanvasNodeData): data is StoryboardGenNodeData {
  return "frames" in data && "gridRows" in data && "isGenerating" in data;
}
