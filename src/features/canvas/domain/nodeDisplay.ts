import { CANVAS_NODE_TYPES } from './canvasNodes';

export const DEFAULT_NODE_DISPLAY_NAME: Record<string, string> = {
  [CANVAS_NODE_TYPES.upload]: 'Upload',
  [CANVAS_NODE_TYPES.imageEdit]: 'AI Generate',
  [CANVAS_NODE_TYPES.exportImage]: 'Export',
  [CANVAS_NODE_TYPES.textAnnotation]: 'Text',
  [CANVAS_NODE_TYPES.group]: 'Group',
  [CANVAS_NODE_TYPES.storyboardSplit]: 'Storyboard',
  [CANVAS_NODE_TYPES.storyboardGen]: 'Storyboard Gen',
};
