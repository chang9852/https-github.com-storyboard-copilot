import { memo, useCallback, useEffect, useState, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { useCanvasStore } from '@/stores/canvasStore';

export const ImageViewerModal = memo(() => {
  const { isOpen, activeImageUrl, imageList, currentIndex } = useCanvasStore((state) => state.imageViewer);
  const closeImageViewer = useCanvasStore((state) => state.closeImageViewer);
  const navigateImageViewer = useCanvasStore((state) => state.navigateImageViewer);

  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const positionStart = useRef({ x: 0, y: 0 });

  const hasMultipleImages = imageList.length > 1;

  const handlePrev = useCallback(() => {
    if (!hasMultipleImages) return;
    navigateImageViewer('prev');
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  }, [hasMultipleImages, navigateImageViewer]);

  const handleNext = useCallback(() => {
    if (!hasMultipleImages) return;
    navigateImageViewer('next');
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  }, [hasMultipleImages, navigateImageViewer]);

  const handleZoomIn = useCallback(() => {
    setScale((prev) => Math.min(prev * 1.25, 5));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale((prev) => Math.max(prev / 1.25, 0.2));
  }, []);

  const handleReset = useCallback(() => {
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    positionStart.current = { ...position };
  }, [position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: positionStart.current.x + (e.clientX - dragStart.current.x),
      y: positionStart.current.y + (e.clientY - dragStart.current.y),
    });
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeImageViewer();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === '+' || e.key === '=') {
        handleZoomIn();
      } else if (e.key === '-') {
        handleZoomOut();
      } else if (e.key === '0') {
        handleReset();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeImageViewer, handlePrev, handleNext, handleZoomIn, handleZoomOut, handleReset]);

  useEffect(() => {
    if (isOpen) {
      setScale(1);
      setRotation(0);
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen, activeImageUrl]);

  if (!isOpen || !activeImageUrl) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={closeImageViewer}
    >
      {/* Close button */}
      <button
        className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
        onClick={closeImageViewer}
      >
        <X className="h-5 w-5" />
      </button>

      {/* Controls */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 rounded-full bg-black/60 px-3 py-2 backdrop-blur-sm">
        <button
          className="p-1.5 rounded-full hover:bg-white/20 text-white transition-colors"
          onClick={(e) => { e.stopPropagation(); handleZoomOut(); }}
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <span className="text-xs text-white/70 min-w-[40px] text-center">{Math.round(scale * 100)}%</span>
        <button
          className="p-1.5 rounded-full hover:bg-white/20 text-white transition-colors"
          onClick={(e) => { e.stopPropagation(); handleZoomIn(); }}
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <div className="w-px h-4 bg-white/20" />
        <button
          className="p-1.5 rounded-full hover:bg-white/20 text-white transition-colors"
          onClick={(e) => { e.stopPropagation(); handleReset(); }}
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

      {/* Navigation arrows */}
      {hasMultipleImages && (
        <>
          <button
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            onClick={(e) => { e.stopPropagation(); handlePrev(); }}
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            onClick={(e) => { e.stopPropagation(); handleNext(); }}
          >
            <ChevronRight className="h-6 w-6" />
          </button>
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 text-xs text-white/70 bg-black/40 px-3 py-1 rounded-full">
            {currentIndex + 1} / {imageList.length}
          </div>
        </>
      )}

      {/* Image */}
      <div
        className="w-full h-full flex items-center justify-center overflow-hidden"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <img
          src={activeImageUrl}
          alt="Preview"
          className="max-w-[90vw] max-h-[90vh] object-contain select-none"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
            cursor: isDragging ? 'grabbing' : 'grab',
            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
          }}
          draggable={false}
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  );
});

ImageViewerModal.displayName = 'ImageViewerModal';
