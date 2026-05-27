export interface CanvasState {
  zoom: number;
  panOffset: { x: number; y: number };
  selectedCellId: string | null;
  isDragging: boolean;
  isPanning: boolean;
}

export interface CanvasTransform {
  x: number;
  y: number;
  scale: number;
}

export interface DragState {
  isDragging: boolean;
  startPos: { x: number; y: number };
  currentPos: { x: number; y: number };
}
