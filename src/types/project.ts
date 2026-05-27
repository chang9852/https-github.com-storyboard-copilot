export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  thumbnail?: string;
  cells: StoryboardCell[];
  connections: Connection[];
}

export type CellType = "text_block" | "image_block" | "ai_image" | "upload_image" | "text_annotation" | "storyboard" | "storyboard_gen";

export interface StoryboardCell {
  id: string;
  projectId: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  imageUrl?: string;
  prompt?: string;
  negativePrompt?: string;
  dialogue?: string;
  notes?: string;
  cellType?: CellType;
  shotType?: ShotType | "image_block" | "text_block";
  cameraMovement?: CameraMovement;
  duration?: number;
  aiProvider?: string;
  aiModel?: string;
  resolution?: "1K" | "2K" | "4K";
  aspectRatio?: "16:9" | "4:3" | "3:4" | "1:1";
  status: "idle" | "generating" | "completed" | "error";
}

export interface Connection {
  id: string;
  fromCellId: string;
  toCellId: string;
  label?: string;
}

// 分镜生成帧
export interface StoryboardGenFrame {
  id: string;
  description: string;
  referenceIndex: number | null;
}

// 分镜切割帧
export interface StoryboardSplitFrame {
  id: string;
  imageUrl: string | null;
  previewImageUrl?: string | null;
  note: string;
  order: number;
}

// 分镜导出选项
export interface StoryboardExportOptions {
  showFrameIndex: boolean;
  showFrameNote: boolean;
  notePlacement: "overlay" | "bottom";
  imageFit: "cover" | "contain";
  frameIndexPrefix: string;
  cellGap: number;
  fontSize: number;
  backgroundColor: string;
  textColor: string;
}

// 分镜生成节点数据
export interface StoryboardGenData {
  gridRows: number;
  gridCols: number;
  frames: StoryboardGenFrame[];
  model: string;
  size: "1K" | "2K" | "4K";
  aspectRatio: string;
  isGenerating: boolean;
}

// 分镜切割节点数据
export interface StoryboardSplitData {
  gridRows: number;
  gridCols: number;
  frames: StoryboardSplitFrame[];
  exportOptions: StoryboardExportOptions;
}

export type ShotType =
  | "long_shot"
  | "full_shot"
  | "medium_shot"
  | "close_shot"
  | "close_up"
  | "extreme_close_up";

export type CameraMovement =
  | "static"
  | "push"
  | "pull"
  | "pan"
  | "tilt"
  | "dolly"
  | "crane"
  | "follow"
  | "orbit";

export const SHOT_TYPES: Record<ShotType, { zh: string; en: string }> = {
  long_shot: { zh: "远景", en: "Long Shot" },
  full_shot: { zh: "全景", en: "Full Shot" },
  medium_shot: { zh: "中景", en: "Medium Shot" },
  close_shot: { zh: "近景", en: "Close Shot" },
  close_up: { zh: "特写", en: "Close-up" },
  extreme_close_up: { zh: "大特写", en: "Extreme Close-up" },
};

export const CAMERA_MOVEMENTS: Record<CameraMovement, { zh: string; en: string }> = {
  static: { zh: "固定", en: "Static" },
  push: { zh: "推", en: "Push In" },
  pull: { zh: "拉", en: "Pull Out" },
  pan: { zh: "摇", en: "Pan" },
  tilt: { zh: "俯仰", en: "Tilt" },
  dolly: { zh: "移动", en: "Dolly" },
  crane: { zh: "升降", en: "Crane" },
  follow: { zh: "跟", en: "Follow" },
  orbit: { zh: "环绕", en: "Orbit" },
};
