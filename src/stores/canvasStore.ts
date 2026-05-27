import { create } from "zustand";
import { useProjectStore } from "./projectStore";

interface CanvasStore {
  transform: { x: number; y: number; scale: number };
  setTransform: (t: { x: number; y: number; scale: number }) => void;
  fitToScreen: (containerWidth: number, containerHeight: number) => void;
  zoomTo: (scale: number, centerX?: number, centerY?: number) => void;
}

const MIN_SCALE = 0.1;
const MAX_SCALE = 3;
const PADDING = 80;

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  transform: { x: 0, y: 0, scale: 1 },

  setTransform: (t) => set({ transform: t }),

  fitToScreen: (containerWidth, containerHeight) => {
    const cells = useProjectStore.getState().currentProject?.cells;
    if (!cells || cells.length === 0) {
      set({ transform: { x: 0, y: 0, scale: 1 } });
      return;
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const cell of cells) {
      minX = Math.min(minX, cell.position.x);
      minY = Math.min(minY, cell.position.y);
      maxX = Math.max(maxX, cell.position.x + cell.size.width);
      maxY = Math.max(maxY, cell.position.y + cell.size.height);
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
}));
