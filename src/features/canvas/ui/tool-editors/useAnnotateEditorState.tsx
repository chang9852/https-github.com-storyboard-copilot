import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Arrow,
  Ellipse,
  Line,
  Rect,
  Text,
} from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type Konva from 'konva';

import type { ToolOptions } from '@/features/canvas/tools';
import {
  normalizeAnnotationRect,
  parseAnnotationItems,
  stringifyAnnotationItems,
  type AnnotationItem,
  type AnnotationToolType,
  createAnnotationId,
} from '@/features/canvas/tools/annotation';
import { resolveImageDisplayUrl } from '@/features/canvas/application/imageData';
import {
  MAX_LINE_WIDTH_PERCENT,
  MAX_TEXT_SIZE_PERCENT,
  MIN_LINE_WIDTH_PERCENT,
  MIN_TEXT_SIZE_PERCENT,
  VIEWPORT_MIN_HEIGHT_PX,
  VIEWPORT_MIN_WIDTH_PX,
  VIEWPORT_PADDING_PX,
  canSelectByTool,
  canTransformAnnotation,
  clamp,
  fontSizeToPercent,
  lineWidthToPercent,
  percentToFontSize,
  percentToLineWidth,
  pruneUndefinedToolOptionsPatch,
  resolveTextBaseSize,
  toNumber,
  toText,
  updateAnnotationPosition,
  updateAnnotationTransform,
  type DraftState,
  type TextEditorState,
} from './annotateEditorUtils';

export function useAnnotateEditorState({
  options,
  onOptionsChange,
  sourceImageUrl,
}: {
  options: ToolOptions;
  onOptionsChange: (options: ToolOptions) => void;
  sourceImageUrl: string;
}) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [tool, setTool] = useState<AnnotationToolType>('rect');
  const [annotations, setAnnotations] = useState<AnnotationItem[]>(() =>
    parseAnnotationItems(options.annotations)
  );
  const [draft, setDraft] = useState<DraftState | null>(null);
  const [undoStack, setUndoStack] = useState<AnnotationItem[][]>([]);
  const [redoStack, setRedoStack] = useState<AnnotationItem[][]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [textEditorState, setTextEditorState] = useState<TextEditorState | null>(null);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });

  const stageRef = useRef<Konva.Stage | null>(null);
  const contentGroupRef = useRef<Konva.Group | null>(null);
  const transformerRef = useRef<Konva.Transformer | null>(null);
  const shapeRefs = useRef<Map<string, Konva.Node>>(new Map());
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const stageHostRef = useRef<HTMLDivElement | null>(null);
  const textInputRef = useRef<HTMLTextAreaElement | null>(null);

  const color = toText(options.color, '#ff4d4f');
  const textBaseSize = useMemo(() => resolveTextBaseSize(image), [image]);
  const rawLineWidthPercent = toNumber(options.lineWidthPercent, NaN);
  const legacyLineWidth = Math.max(1, toNumber(options.lineWidth, 4));
  const lineWidthPercent = clamp(
    Number.isFinite(rawLineWidthPercent)
      ? rawLineWidthPercent
      : lineWidthToPercent(legacyLineWidth, textBaseSize),
    MIN_LINE_WIDTH_PERCENT,
    MAX_LINE_WIDTH_PERCENT
  );
  const lineWidth = percentToLineWidth(lineWidthPercent, textBaseSize);
  const rawTextPercent = toNumber(options.fontSizePercent, NaN);
  const legacyFontSize = Math.max(10, toNumber(options.fontSize, 28));
  const textSizePercent = clamp(
    Number.isFinite(rawTextPercent)
      ? rawTextPercent
      : fontSizeToPercent(legacyFontSize, textBaseSize),
    MIN_TEXT_SIZE_PERCENT,
    MAX_TEXT_SIZE_PERCENT
  );
  const fontSize = percentToFontSize(textSizePercent, textBaseSize);

  useEffect(() => {
    const nextAnnotations = parseAnnotationItems(options.annotations);
    setAnnotations(nextAnnotations);
    if (selectedId && !nextAnnotations.some((item) => item.id === selectedId)) {
      setSelectedId(null);
    }
  }, [options.annotations, selectedId]);

  useEffect(() => {
    const img = new window.Image();
    img.onload = () => setImage(img);
    img.onerror = () => setImage(null);
    img.src = resolveImageDisplayUrl(sourceImageUrl);
  }, [sourceImageUrl]);

  useEffect(() => {
    const element = viewportRef.current;
    if (!element) {
      return;
    }

    const updateViewportSize = () => {
      const rect = element.getBoundingClientRect();
      setViewportSize({
        width: Math.max(0, Math.round(rect.width)),
        height: Math.max(0, Math.round(rect.height)),
      });
    };

    updateViewportSize();
    const observer = new ResizeObserver(updateViewportSize);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const { stageWidth, stageHeight, scale } = useMemo(() => {
    if (!image) {
      return { stageWidth: 820, stageHeight: 480, scale: 1 };
    }

    const maxWidth = Math.max(
      VIEWPORT_MIN_WIDTH_PX,
      viewportSize.width - VIEWPORT_PADDING_PX * 2
    );
    const maxHeight = Math.max(
      VIEWPORT_MIN_HEIGHT_PX,
      viewportSize.height - VIEWPORT_PADDING_PX * 2
    );
    const ratio = Math.min(maxWidth / image.naturalWidth, maxHeight / image.naturalHeight, 1);
    return {
      stageWidth: Math.max(1, Math.round(image.naturalWidth * ratio)),
      stageHeight: Math.max(1, Math.round(image.naturalHeight * ratio)),
      scale: ratio,
    };
  }, [image, viewportSize.height, viewportSize.width]);

  const selectedAnnotation = useMemo(
    () => annotations.find((item) => item.id === selectedId) ?? null,
    [annotations, selectedId]
  );
  const activeStyleKind = useMemo<'shape' | 'text' | null>(() => {
    if (tool === 'text') {
      return 'text';
    }
    if (tool === 'rect' || tool === 'ellipse' || tool === 'arrow' || tool === 'pen') {
      return 'shape';
    }
    return null;
  }, [tool]);

  const updateOptionsPayload = useCallback(
    (nextAnnotations: AnnotationItem[], nextOptionsPatch: Partial<ToolOptions> = {}, saveHistory = false) => {
      if (saveHistory) {
        setUndoStack((prev) => [...prev, annotations].slice(-40));
        setRedoStack([]);
      }
      onOptionsChange({
        ...options,
        ...nextOptionsPatch,
        annotations: stringifyAnnotationItems(nextAnnotations),
      });
      setAnnotations(nextAnnotations);
    },
    [annotations, onOptionsChange, options]
  );

  const getImagePoint = useCallback(() => {
    const stage = stageRef.current;
    const group = contentGroupRef.current;
    if (!stage || !group || !image) {
      return null;
    }

    const pointer = stage.getPointerPosition();
    if (!pointer) {
      return null;
    }

    const transform = group.getAbsoluteTransform().copy();
    transform.invert();
    const imagePoint = transform.point(pointer);
    return {
      x: clamp(imagePoint.x, 0, image.naturalWidth),
      y: clamp(imagePoint.y, 0, image.naturalHeight),
    };
  }, [image]);

  const toHostPoint = useCallback((x: number, y: number) => {
    const group = contentGroupRef.current;
    const stage = stageRef.current;
    const host = stageHostRef.current;

    let stagePoint: { x: number; y: number };
    if (!group) {
      stagePoint = { x: x * scale, y: y * scale };
    } else {
      stagePoint = group.getAbsoluteTransform().point({ x, y });
    }

    if (!stage || !host) {
      return stagePoint;
    }

    const stageRect = stage.container().getBoundingClientRect();
    const hostRect = host.getBoundingClientRect();
    return {
      x: stagePoint.x + (stageRect.left - hostRect.left),
      y: stagePoint.y + (stageRect.top - hostRect.top),
    };
  }, [scale]);

  const startTextEditing = useCallback((item: AnnotationItem | null, fallbackPoint?: { x: number; y: number }) => {
    const targetItem = item && item.type === 'text' ? item : null;
    const x = targetItem ? targetItem.x : (fallbackPoint?.x ?? 0);
    const y = targetItem ? targetItem.y : (fallbackPoint?.y ?? 0);
    setTextEditorState({
      annotationId: targetItem?.id ?? null,
      x,
      y,
      value: targetItem?.text ?? '',
    });
    setSelectedId(targetItem?.id ?? null);
    requestAnimationFrame(() => {
      textInputRef.current?.focus();
      textInputRef.current?.select();
    });
  }, []);

  const handleCommitTextEditor = useCallback(() => {
    if (!textEditorState) {
      return;
    }

    const value = textEditorState.value.trim();
    if (textEditorState.annotationId) {
      const nextAnnotations = annotations
        .map((item) => {
          if (item.id !== textEditorState.annotationId || item.type !== 'text') {
            return item;
          }
          if (!value) {
            return null;
          }
          return {
            ...item,
            text: value,
            color,
            fontSize,
          };
        })
        .filter((item): item is AnnotationItem => Boolean(item));
      updateOptionsPayload(nextAnnotations, {}, true);
      setTextEditorState(null);
      return;
    }

    if (!value) {
      setTextEditorState(null);
      return;
    }

    const nextItem: AnnotationItem = {
      id: createAnnotationId(),
      type: 'text',
      x: textEditorState.x,
      y: textEditorState.y,
      text: value,
      color,
      fontSize,
    };
    const nextAnnotations = [...annotations, nextItem];
    updateOptionsPayload(nextAnnotations, {}, true);
    setSelectedId(nextItem.id);
    setTextEditorState(null);
  }, [annotations, color, fontSize, textEditorState, updateOptionsPayload]);

  const handleCancelTextEditor = useCallback(() => {
    setTextEditorState(null);
  }, []);

  const handleTextEditorChange = useCallback((value: string) => {
    setTextEditorState((previous) =>
      previous
        ? {
          ...previous,
          value,
        }
        : previous
    );
  }, []);

  const handleToolChange = useCallback((nextTool: AnnotationToolType) => {
    setTool(nextTool);
    if (nextTool !== 'text') {
      setTextEditorState(null);
    }
  }, []);

  const buildDraftAnnotation = useCallback(
    (currentX: number, currentY: number): AnnotationItem | null => {
      if (!draft) {
        return null;
      }

      if (draft.tool === 'pen') {
        const points = [...(draft.points ?? [draft.startX, draft.startY]), currentX, currentY];
        return {
          id: 'draft-pen',
          type: 'pen',
          points,
          stroke: color,
          lineWidth,
        };
      }

      if (draft.tool === 'arrow') {
        return {
          id: 'draft-arrow',
          type: 'arrow',
          points: [draft.startX, draft.startY, currentX, currentY],
          stroke: color,
          lineWidth,
        };
      }

      const rect = normalizeAnnotationRect(draft.startX, draft.startY, currentX, currentY);

      if (draft.tool === 'rect') {
        return {
          id: 'draft-rect',
          type: 'rect',
          ...rect,
          stroke: color,
          lineWidth,
        };
      }

      return {
        id: 'draft-ellipse',
        type: 'ellipse',
        ...rect,
        stroke: color,
        lineWidth,
      };
    },
    [color, draft, lineWidth]
  );

  const draftAnnotation = useMemo(() => {
    if (!draft) {
      return null;
    }
    if (draft.tool === 'pen') {
      return {
        id: 'draft-pen',
        type: 'pen',
        points: draft.points ?? [draft.startX, draft.startY],
        stroke: color,
        lineWidth,
      } as AnnotationItem;
    }
    return buildDraftAnnotation(draft.currentX, draft.currentY);
  }, [buildDraftAnnotation, color, draft, lineWidth]);

  const handlePointerDown = useCallback((event: KonvaEventObject<MouseEvent | TouchEvent>) => {
    stageHostRef.current?.focus();
    const point = getImagePoint();
    if (!point) {
      return;
    }

    const target = event.target;
    const isBackgroundTarget = target === target.getStage() || target.name() === 'annotation-background';
    if (!isBackgroundTarget) {
      return;
    }

    if (tool === 'text') {
      startTextEditing(null, point);
      return;
    }

    setTextEditorState(null);
    setSelectedId(null);
    setDraft({
      tool: tool as Exclude<AnnotationToolType, 'text'>,
      startX: point.x,
      startY: point.y,
      currentX: point.x,
      currentY: point.y,
      points: tool === 'pen' ? [point.x, point.y] : undefined,
    });
  }, [getImagePoint, startTextEditing, tool]);

  const handlePointerMove = useCallback(() => {
    if (!draft) {
      return;
    }

    const point = getImagePoint();
    if (!point) {
      return;
    }

    if (draft.tool === 'pen') {
      setDraft((previous) => {
        if (!previous || previous.tool !== 'pen') {
          return previous;
        }
        return {
          ...previous,
          currentX: point.x,
          currentY: point.y,
          points: [...(previous.points ?? [previous.startX, previous.startY]), point.x, point.y],
        };
      });
      return;
    }

    setDraft((previous) =>
      previous
        ? {
          ...previous,
          currentX: point.x,
          currentY: point.y,
        }
        : previous
    );
  }, [draft, getImagePoint]);

  const handlePointerUp = useCallback(() => {
    if (!draft) {
      return;
    }

    const point = getImagePoint();
    const finalX = point?.x ?? draft.currentX;
    const finalY = point?.y ?? draft.currentY;
    const nextItem = buildDraftAnnotation(finalX, finalY);
    if (!nextItem) {
      setDraft(null);
      return;
    }

    if (
      (nextItem.type === 'rect' || nextItem.type === 'ellipse')
      && (nextItem.width < 4 || nextItem.height < 4)
    ) {
      setDraft(null);
      return;
    }

    if (nextItem.type === 'arrow') {
      const [x1, y1, x2, y2] = nextItem.points;
      if (Math.hypot(x2 - x1, y2 - y1) < 4) {
        setDraft(null);
        return;
      }
    }

    if (nextItem.type === 'pen' && nextItem.points.length < 6) {
      setDraft(null);
      return;
    }

    const createdItem = { ...nextItem, id: createAnnotationId() } as AnnotationItem;
    const nextAnnotations = [...annotations, createdItem];
    updateOptionsPayload(nextAnnotations, {}, true);
    setSelectedId(createdItem.id);
    setDraft(null);
  }, [annotations, buildDraftAnnotation, draft, getImagePoint, updateOptionsPayload]);

  const handleDeleteSelected = useCallback(() => {
    if (!selectedId) {
      return;
    }
    const nextAnnotations = annotations.filter((item) => item.id !== selectedId);
    updateOptionsPayload(nextAnnotations, {}, true);
    setSelectedId(null);
  }, [annotations, selectedId, updateOptionsPayload]);

  const handleClearAnnotations = useCallback(() => {
    setUndoStack((prev) => [...prev, annotations].slice(-40));
    setRedoStack([]);
    setSelectedId(null);
    updateOptionsPayload([], {}, false);
  }, [annotations, updateOptionsPayload]);

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) {
      return;
    }
    const previous = undoStack[undoStack.length - 1];
    setRedoStack((prev) => [...prev, annotations].slice(-40));
    setUndoStack((prev) => prev.slice(0, -1));
    onOptionsChange({
      ...options,
      annotations: stringifyAnnotationItems(previous),
    });
    setAnnotations(previous);
  }, [annotations, onOptionsChange, options, undoStack]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) {
      return;
    }
    const next = redoStack[redoStack.length - 1];
    setUndoStack((prev) => [...prev, annotations].slice(-40));
    setRedoStack((prev) => prev.slice(0, -1));
    onOptionsChange({
      ...options,
      annotations: stringifyAnnotationItems(next),
    });
    setAnnotations(next);
  }, [annotations, onOptionsChange, options, redoStack]);

  const handleStyleInputChange = useCallback((patch: Partial<ToolOptions>) => {
    const safePatch = pruneUndefinedToolOptionsPatch(patch);
    const nextOptions = { ...options, ...safePatch } as ToolOptions;
    onOptionsChange(nextOptions);

    if (!selectedAnnotation) {
      return;
    }

    const nextAnnotations = annotations.map((item) => {
      if (item.id !== selectedAnnotation.id) {
        return item;
      }

      if (item.type === 'text') {
        const nextTextPercent = clamp(
          toNumber(nextOptions.fontSizePercent, fontSizeToPercent(item.fontSize, textBaseSize)),
          MIN_TEXT_SIZE_PERCENT,
          MAX_TEXT_SIZE_PERCENT
        );
        return {
          ...item,
          color: toText(nextOptions.color, item.color),
          fontSize: percentToFontSize(nextTextPercent, textBaseSize),
        };
      }

      return {
        ...item,
        stroke: toText(nextOptions.color, item.stroke),
        lineWidth: percentToLineWidth(
          clamp(
            toNumber(nextOptions.lineWidthPercent, lineWidthToPercent(item.lineWidth, textBaseSize)),
            MIN_LINE_WIDTH_PERCENT,
            MAX_LINE_WIDTH_PERCENT
          ),
          textBaseSize
        ),
      };
    });
    updateOptionsPayload(nextAnnotations, safePatch, true);
  }, [annotations, onOptionsChange, options, selectedAnnotation, textBaseSize, updateOptionsPayload]);

  const handleStageKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (textEditorState) {
      return;
    }
    const key = event.key.toLowerCase();
    const command = event.ctrlKey || event.metaKey;

    if (command && key === 'z' && !event.shiftKey) {
      event.preventDefault();
      handleUndo();
      return;
    }

    if (command && (key === 'y' || (key === 'z' && event.shiftKey))) {
      event.preventDefault();
      handleRedo();
      return;
    }

    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      handleDeleteSelected();
    }
  }, [handleDeleteSelected, handleRedo, handleUndo, textEditorState]);

  useEffect(() => {
    if (!selectedAnnotation || textEditorState) {
      return;
    }

    let patch: Partial<ToolOptions> = {};
    if (selectedAnnotation.type === 'text') {
      patch = {
        color: selectedAnnotation.color,
        fontSizePercent: clamp(
          fontSizeToPercent(selectedAnnotation.fontSize, textBaseSize),
          MIN_TEXT_SIZE_PERCENT,
          MAX_TEXT_SIZE_PERCENT
        ),
      };
    } else {
      patch = {
        color: selectedAnnotation.stroke,
        lineWidthPercent: clamp(
          lineWidthToPercent(selectedAnnotation.lineWidth, textBaseSize),
          MIN_LINE_WIDTH_PERCENT,
          MAX_LINE_WIDTH_PERCENT
        ),
      };
    }

    const safePatch = pruneUndefinedToolOptionsPatch(patch);
    const hasChange = Object.entries(safePatch).some(
      ([key, value]) => !Object.is(options[key], value)
    );
    if (!hasChange) {
      return;
    }

    const nextOptions = {
      ...options,
      ...safePatch,
    } as ToolOptions;
    onOptionsChange(nextOptions);
  }, [onOptionsChange, options, selectedAnnotation, textBaseSize, textEditorState]);

  useEffect(() => {
    const transformer = transformerRef.current;
    if (!transformer) {
      return;
    }
    if (!selectedId) {
      transformer.nodes([]);
      transformer.getLayer()?.batchDraw();
      return;
    }

    const selectedNode = shapeRefs.current.get(selectedId);
    if (!selectedNode || !selectedAnnotation || !canTransformAnnotation(selectedAnnotation)) {
      transformer.nodes([]);
      transformer.getLayer()?.batchDraw();
      return;
    }
    transformer.nodes([selectedNode]);
    transformer.getLayer()?.batchDraw();
  }, [selectedAnnotation, selectedId]);

  const bindShapeRef = useCallback((id: string, node: Konva.Node | null) => {
    if (node) {
      shapeRefs.current.set(id, node);
      return;
    }
    shapeRefs.current.delete(id);
  }, []);

  const handleAnnotationDragEnd = useCallback((item: AnnotationItem, event: KonvaEventObject<DragEvent>) => {
    const node = event.target;
    const nextX = node.x();
    const nextY = node.y();
    if (item.type === 'arrow' || item.type === 'pen') {
      node.x(0);
      node.y(0);
    }
    const nextAnnotations = annotations.map((current) =>
      current.id === item.id
        ? updateAnnotationPosition(current, nextX, nextY)
        : current
    );
    updateOptionsPayload(nextAnnotations, {}, true);
  }, [annotations, updateOptionsPayload]);

  const handleAnnotationTransformEnd = useCallback((item: AnnotationItem, event: KonvaEventObject<Event>) => {
    const node = event.target;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    const nextX = node.x();
    const nextY = node.y();
    node.scaleX(1);
    node.scaleY(1);
    if (item.type === 'arrow' || item.type === 'pen') {
      node.x(0);
      node.y(0);
    }

    const nextAnnotations = annotations.map((current) =>
      current.id === item.id
        ? updateAnnotationTransform(current, nextX, nextY, scaleX, scaleY)
        : current
    );
    updateOptionsPayload(nextAnnotations, {}, true);
  }, [annotations, updateOptionsPayload]);

  const renderAnnotationNode = useCallback((item: AnnotationItem, opacity = 1) => {
    const isSelected = selectedId === item.id;
    const canInteract = canSelectByTool(tool, item);
    const draggable = canInteract && isSelected;

    const commonHandlers = {
      draggable,
      onClick: () => {
        if (canInteract) {
          setSelectedId(item.id);
        }
      },
      onTap: () => {
        if (canInteract) {
          setSelectedId(item.id);
        }
      },
      onDragEnd: (event: KonvaEventObject<DragEvent>) => handleAnnotationDragEnd(item, event),
      onTransformEnd: (event: KonvaEventObject<Event>) => handleAnnotationTransformEnd(item, event),
    };

    if (item.type === 'rect') {
      return (
        <Rect
          key={item.id}
          ref={(node) => bindShapeRef(item.id, node)}
          x={item.x}
          y={item.y}
          width={item.width}
          height={item.height}
          stroke={item.stroke}
          strokeWidth={item.lineWidth}
          opacity={opacity}
          strokeScaleEnabled={false}
          {...commonHandlers}
        />
      );
    }

    if (item.type === 'ellipse') {
      return (
        <Ellipse
          key={item.id}
          ref={(node) => bindShapeRef(item.id, node)}
          x={item.x + item.width / 2}
          y={item.y + item.height / 2}
          radiusX={item.width / 2}
          radiusY={item.height / 2}
          stroke={item.stroke}
          strokeWidth={item.lineWidth}
          opacity={opacity}
          strokeScaleEnabled={false}
          {...commonHandlers}
        />
      );
    }

    if (item.type === 'arrow') {
      return (
        <Arrow
          key={item.id}
          ref={(node) => bindShapeRef(item.id, node)}
          points={item.points}
          stroke={item.stroke}
          fill={item.stroke}
          strokeWidth={item.lineWidth}
          pointerLength={Math.max(10, item.lineWidth * 4)}
          pointerWidth={Math.max(10, item.lineWidth * 3)}
          opacity={opacity}
          strokeScaleEnabled={false}
          {...commonHandlers}
        />
      );
    }

    if (item.type === 'pen') {
      return (
        <Line
          key={item.id}
          ref={(node) => bindShapeRef(item.id, node)}
          points={item.points}
          stroke={item.stroke}
          strokeWidth={item.lineWidth}
          lineJoin="round"
          lineCap="round"
          opacity={opacity}
          strokeScaleEnabled={false}
          {...commonHandlers}
        />
      );
    }

    return (
      <Text
        key={item.id}
        ref={(node) => bindShapeRef(item.id, node)}
        x={item.x}
        y={item.y}
        text={item.text}
        fill={item.color}
        fontStyle="bold"
        fontSize={item.fontSize}
        lineHeight={1.2}
        opacity={opacity}
        {...commonHandlers}
        onDblClick={(event) => {
          event.cancelBubble = true;
          startTextEditing(item);
        }}
      />
    );
  }, [
    bindShapeRef,
    handleAnnotationDragEnd,
    handleAnnotationTransformEnd,
    selectedId,
    startTextEditing,
    tool,
  ]);

  const textEditorStagePos = useMemo(() => {
    if (!textEditorState) {
      return null;
    }
    return toHostPoint(textEditorState.x, textEditorState.y);
  }, [textEditorState, toHostPoint]);

  const transformerKeepRatio = selectedAnnotation?.type === 'text';
  const transformerAnchors: Konva.TransformerConfig['enabledAnchors'] = transformerKeepRatio
    ? ['top-left', 'top-right', 'bottom-left', 'bottom-right']
    : [
      'top-left',
      'top-center',
      'top-right',
      'middle-right',
      'bottom-right',
      'bottom-center',
      'bottom-left',
      'middle-left',
    ];

  return {
    toolbarProps: {
      tool,
      activeStyleKind,
      color,
      lineWidthPercent,
      textSizePercent,
      canUndo: undoStack.length > 0,
      canRedo: redoStack.length > 0,
      canDeleteSelected: Boolean(selectedId),
      canClear: annotations.length > 0,
      onToolChange: handleToolChange,
      onStyleInputChange: handleStyleInputChange,
      onUndo: handleUndo,
      onRedo: handleRedo,
      onDeleteSelected: handleDeleteSelected,
      onClear: handleClearAnnotations,
    },
    stageProps: {
      viewportRef,
      stageHostRef,
      stageRef,
      contentGroupRef,
      transformerRef,
      textInputRef,
      image,
      annotations,
      draftAnnotation,
      textEditorState,
      textEditorStagePos,
      stageWidth,
      stageHeight,
      scale,
      tool,
      transformerKeepRatio,
      transformerAnchors,
      renderAnnotationNode,
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onStageKeyDown: handleStageKeyDown,
      onTextEditorChange: handleTextEditorChange,
      onCommitTextEditor: handleCommitTextEditor,
      onCancelTextEditor: handleCancelTextEditor,
    },
  };
}
