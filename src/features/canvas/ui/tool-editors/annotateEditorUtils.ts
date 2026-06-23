import type { ToolOptions } from '@/features/canvas/tools';
import type {
  AnnotationItem,
  AnnotationToolType,
} from '@/features/canvas/tools/annotation';

export const VIEWPORT_PADDING_PX = 16;
export const VIEWPORT_MIN_WIDTH_PX = 220;
export const VIEWPORT_MIN_HEIGHT_PX = 180;
export const DEFAULT_TEXT_SIZE_PERCENT = 10;
export const MIN_TEXT_SIZE_PERCENT = 1;
export const MAX_TEXT_SIZE_PERCENT = 30;
export const DEFAULT_LINE_WIDTH_PERCENT = 0.4;
export const MIN_LINE_WIDTH_PERCENT = 0.1;
export const MAX_LINE_WIDTH_PERCENT = 3;

export type DraftState = {
  tool: Exclude<AnnotationToolType, 'text'>;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  points?: number[];
};

export interface TextEditorState {
  annotationId: string | null;
  x: number;
  y: number;
  value: string;
}

export function toNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function toText(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function resolveTextBaseSize(image: HTMLImageElement | null): number {
  if (!image) {
    return 1000;
  }
  return Math.max(320, Math.min(image.naturalWidth, image.naturalHeight));
}

export function percentToFontSize(percent: number, baseSize: number): number {
  return Math.max(10, Math.round(baseSize * (percent / 100)));
}

export function fontSizeToPercent(fontSize: number, baseSize: number): number {
  if (!Number.isFinite(fontSize) || fontSize <= 0) {
    return DEFAULT_TEXT_SIZE_PERCENT;
  }
  return (fontSize / Math.max(1, baseSize)) * 100;
}

export function percentToLineWidth(percent: number, baseSize: number): number {
  return Math.max(1, Math.round(baseSize * (percent / 100)));
}

export function lineWidthToPercent(lineWidth: number, baseSize: number): number {
  if (!Number.isFinite(lineWidth) || lineWidth <= 0) {
    return DEFAULT_LINE_WIDTH_PERCENT;
  }
  return (lineWidth / Math.max(1, baseSize)) * 100;
}

function getPointsBounds(points: number[]): { minX: number; minY: number } {
  const xs = points.filter((_, index) => index % 2 === 0);
  const ys = points.filter((_, index) => index % 2 === 1);
  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
  };
}

export function updateAnnotationPosition(
  item: AnnotationItem,
  newX: number,
  newY: number
): AnnotationItem {
  if (item.type === 'arrow' || item.type === 'pen') {
    const { minX, minY } = getPointsBounds(item.points);
    const dx = newX - minX;
    const dy = newY - minY;
    return {
      ...item,
      points: item.points.map((point, index) => (index % 2 === 0 ? point + dx : point + dy)),
    } as AnnotationItem;
  }

  if (item.type === 'rect' || item.type === 'ellipse' || item.type === 'text') {
    return { ...item, x: newX, y: newY };
  }

  return item;
}

export function updateAnnotationTransform(
  item: AnnotationItem,
  newX: number,
  newY: number,
  scaleX: number,
  scaleY: number
): AnnotationItem {
  if (item.type === 'rect' || item.type === 'ellipse') {
    return {
      ...item,
      x: newX,
      y: newY,
      width: Math.max(5, item.width * scaleX),
      height: Math.max(5, item.height * scaleY),
    };
  }

  if (item.type === 'text') {
    return {
      ...item,
      x: newX,
      y: newY,
      fontSize: Math.max(8, Math.round(item.fontSize * Math.max(scaleX, scaleY))),
    };
  }

  if (item.type === 'arrow' || item.type === 'pen') {
    const { minX, minY } = getPointsBounds(item.points);
    return {
      ...item,
      points: item.points.map((point, index) => {
        if (index % 2 === 0) {
          return newX + (point - minX) * scaleX;
        }
        return newY + (point - minY) * scaleY;
      }),
    } as AnnotationItem;
  }

  return item;
}

export function canSelectByTool(tool: AnnotationToolType, item: AnnotationItem): boolean {
  return tool === item.type;
}

export function canTransformAnnotation(item: AnnotationItem): boolean {
  return Boolean(item);
}

export function pruneUndefinedToolOptionsPatch(patch: Partial<ToolOptions>): Partial<ToolOptions> {
  const next: Partial<ToolOptions> = {};
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) {
      continue;
    }
    next[key] = value;
  }
  return next;
}
