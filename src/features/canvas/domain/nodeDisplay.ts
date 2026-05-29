import { CANVAS_NODE_TYPES } from './canvasNodes';

export const DEFAULT_NODE_DISPLAY_NAME: Record<string, string> = {
  [CANVAS_NODE_TYPES.upload]: '上传图片',
  [CANVAS_NODE_TYPES.imageEdit]: 'AI 生成',
  [CANVAS_NODE_TYPES.exportImage]: '导出图片',
  [CANVAS_NODE_TYPES.textAnnotation]: '文本标注',
  [CANVAS_NODE_TYPES.group]: '分组',
  [CANVAS_NODE_TYPES.storyboardSplit]: '分镜切割',
  [CANVAS_NODE_TYPES.storyboardGen]: '分镜生成',
};

export const NODE_ICONS: Record<string, string> = {
  [CANVAS_NODE_TYPES.upload]: 'upload',
  [CANVAS_NODE_TYPES.imageEdit]: 'sparkles',
  [CANVAS_NODE_TYPES.exportImage]: 'download',
  [CANVAS_NODE_TYPES.textAnnotation]: 'type',
  [CANVAS_NODE_TYPES.group]: 'layers',
  [CANVAS_NODE_TYPES.storyboardSplit]: 'grid',
  [CANVAS_NODE_TYPES.storyboardGen]: 'wand',
};

export const NODE_COLORS: Record<string, string> = {
  [CANVAS_NODE_TYPES.upload]: '#3b82f6',
  [CANVAS_NODE_TYPES.imageEdit]: '#8b5cf6',
  [CANVAS_NODE_TYPES.exportImage]: '#10b981',
  [CANVAS_NODE_TYPES.textAnnotation]: '#f59e0b',
  [CANVAS_NODE_TYPES.group]: '#6b7280',
  [CANVAS_NODE_TYPES.storyboardSplit]: '#ec4899',
  [CANVAS_NODE_TYPES.storyboardGen]: '#f43f5e',
};
