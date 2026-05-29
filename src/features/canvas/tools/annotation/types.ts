export interface AnnotationItem {
  id: string;
  type: 'arrow' | 'rect' | 'circle' | 'text' | 'freehand';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  lineWidth: number;
  text?: string;
  fontSize?: number;
  points?: { x: number; y: number }[];
}

export interface AnnotationOptions {
  color: string;
  lineWidthPercent: number;
  fontSizePercent: number;
  annotations: string;
}

export interface AnnotationContext {
  canvasWidth: number;
  canvasHeight: number;
}
