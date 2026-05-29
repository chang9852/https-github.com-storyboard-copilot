import { useCallback, useEffect, useRef, useState, type MouseEvent, type RefObject, type SyntheticEvent } from 'react';

export interface ImageViewerTransformHandlers {
  containerRef: RefObject<HTMLDivElement>;
  imageRef: RefObject<HTMLImageElement>;
  scaleDisplayRef: RefObject<HTMLDivElement>;
  viewerOpacity: number;
  isDragging: boolean;
  resetView: () => void;
  handleImageMouseDown: (e: MouseEvent<HTMLImageElement>) => void;
  handleContainerMouseMove: (e: MouseEvent) => void;
  handleContainerMouseUp: () => void;
  handleImageMouseMove: (e: MouseEvent<HTMLImageElement>) => void;
  handleImageLoad: (e: SyntheticEvent<HTMLImageElement>) => void;
  isPointOnImageContent: (clientX: number, clientY: number) => boolean;
}

export function useImageViewerTransform(isOpen: boolean): ImageViewerTransformHandlers {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const scaleDisplayRef = useRef<HTMLDivElement>(null);

  const [viewerOpacity, setViewerOpacity] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const cssScaleRef = useRef(1);
  const imageScaleRef = useRef(1);
  const imagePositionRef = useRef({ x: 0, y: 0 });
  const targetScaleRef = useRef(1);
  const targetPositionRef = useRef({ x: 0, y: 0 });
  const dragStartRef = useRef({ x: 0, y: 0 });

  const updateImageTransform = useCallback((): void => {
    const img = imageRef.current;
    if (!img) return;
    const scale = imageScaleRef.current;
    const pos = imagePositionRef.current;
    img.style.transform = `scale(${scale}) translate(${pos.x / scale}px, ${pos.y / scale}px)`;
    if (scaleDisplayRef.current) {
      const totalScale = cssScaleRef.current * scale;
      scaleDisplayRef.current.innerText = `${Math.round(totalScale * 100)}%`;
    }
  }, []);

  const resetView = useCallback((): void => {
    imageScaleRef.current = 1;
    imagePositionRef.current = { x: 0, y: 0 };
    targetScaleRef.current = 1;
    targetPositionRef.current = { x: 0, y: 0 };
    updateImageTransform();
  }, [updateImageTransform]);

  const isPointOnImageContent = useCallback((clientX: number, clientY: number): boolean => {
    const img = imageRef.current;
    if (!img || !img.naturalWidth || !img.naturalHeight) return false;
    const rect = img.getBoundingClientRect();
    return (
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom
    );
  }, []);

  const handleImageMouseDown = useCallback((e: MouseEvent<HTMLImageElement>): void => {
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleContainerMouseMove = useCallback((e: MouseEvent): void => {
    if (!isDragging) return;

    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    dragStartRef.current = { x: e.clientX, y: e.clientY };

    imagePositionRef.current.x += dx;
    imagePositionRef.current.y += dy;
    targetPositionRef.current.x = imagePositionRef.current.x;
    targetPositionRef.current.y = imagePositionRef.current.y;

    updateImageTransform();
  }, [isDragging, updateImageTransform]);

  const handleContainerMouseUp = useCallback((): void => {
    setIsDragging(false);
  }, []);

  const handleImageMouseMove = useCallback((_e: MouseEvent<HTMLImageElement>): void => {
    // Handle hover effects if needed
  }, []);

  const handleImageLoad = useCallback((_e: SyntheticEvent<HTMLImageElement>): void => {
    setViewerOpacity(1);
    resetView();
  }, [resetView]);

  // Handle wheel zoom
  useEffect(() => {
    if (!isOpen) return;

    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent): void => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.max(0.1, Math.min(10, imageScaleRef.current * delta));
      imageScaleRef.current = newScale;
      targetScaleRef.current = newScale;
      updateImageTransform();
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [isOpen, updateImageTransform]);

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        resetView();
      } else if (e.key === '+' || e.key === '=') {
        imageScaleRef.current = Math.min(10, imageScaleRef.current * 1.2);
        updateImageTransform();
      } else if (e.key === '-') {
        imageScaleRef.current = Math.max(0.1, imageScaleRef.current * 0.8);
        updateImageTransform();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, resetView, updateImageTransform]);

  return {
    containerRef,
    imageRef,
    scaleDisplayRef,
    viewerOpacity,
    isDragging,
    resetView,
    handleImageMouseDown,
    handleContainerMouseMove,
    handleContainerMouseUp,
    handleImageMouseMove,
    handleImageLoad,
    isPointOnImageContent,
  };
}
