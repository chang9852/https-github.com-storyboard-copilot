import {
  Group,
  Image as KonvaImage,
  Layer,
  Stage,
  Transformer,
} from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type Konva from 'konva';
import type { ReactNode, RefObject } from 'react';
import { useTranslation } from 'react-i18next';

import type {
  AnnotationItem,
  AnnotationToolType,
} from '@/features/canvas/tools/annotation';
import type { TextEditorState } from './annotateEditorUtils';

export function AnnotateStage({
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
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onStageKeyDown,
  onTextEditorChange,
  onCommitTextEditor,
  onCancelTextEditor,
}: {
  viewportRef: RefObject<HTMLDivElement>;
  stageHostRef: RefObject<HTMLDivElement>;
  stageRef: RefObject<Konva.Stage>;
  contentGroupRef: RefObject<Konva.Group>;
  transformerRef: RefObject<Konva.Transformer>;
  textInputRef: RefObject<HTMLTextAreaElement>;
  image: HTMLImageElement | null;
  annotations: AnnotationItem[];
  draftAnnotation: AnnotationItem | null;
  textEditorState: TextEditorState | null;
  textEditorStagePos: { x: number; y: number } | null;
  stageWidth: number;
  stageHeight: number;
  scale: number;
  tool: AnnotationToolType;
  transformerKeepRatio: boolean;
  transformerAnchors: Konva.TransformerConfig['enabledAnchors'];
  renderAnnotationNode: (item: AnnotationItem, opacity?: number) => ReactNode;
  onPointerDown: (event: KonvaEventObject<MouseEvent | TouchEvent>) => void;
  onPointerMove: () => void;
  onPointerUp: () => void;
  onStageKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void;
  onTextEditorChange: (value: string) => void;
  onCommitTextEditor: () => void;
  onCancelTextEditor: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div
      ref={viewportRef}
      className="relative h-[min(62vh,640px)] overflow-hidden rounded-xl border border-[rgba(255,255,255,0.12)] bg-bg-dark/85"
    >
      <div
        ref={stageHostRef}
        tabIndex={0}
        className="relative flex h-full w-full items-center justify-center p-2 outline-none"
        onKeyDown={onStageKeyDown}
      >
        <Stage
          ref={stageRef}
          width={stageWidth}
          height={stageHeight}
          onMouseDown={onPointerDown}
          onTouchStart={onPointerDown}
          onMouseMove={onPointerMove}
          onTouchMove={onPointerMove}
          onMouseUp={onPointerUp}
          onTouchEnd={onPointerUp}
          onMouseLeave={onPointerUp}
          className={tool === 'text' ? 'cursor-text' : 'cursor-crosshair'}
        >
          <Layer>
            <Group ref={contentGroupRef} x={0} y={0} scaleX={scale} scaleY={scale}>
              {image && (
                <KonvaImage
                  image={image}
                  x={0}
                  y={0}
                  width={image.naturalWidth}
                  height={image.naturalHeight}
                  name="annotation-background"
                />
              )}
              {annotations.map((item) => renderAnnotationNode(item))}
              {draftAnnotation && renderAnnotationNode(draftAnnotation, 0.75)}
              <Transformer
                ref={transformerRef}
                boundBoxFunc={(oldBox, newBox) => {
                  if (newBox.width < 5 || newBox.height < 5) {
                    return oldBox;
                  }
                  return newBox;
                }}
                rotateEnabled={false}
                borderStroke="#3b82f6"
                anchorStroke="#3b82f6"
                anchorFill="#ffffff"
                anchorSize={8}
                ignoreStroke
                keepRatio={transformerKeepRatio}
                enabledAnchors={transformerAnchors}
              />
            </Group>
          </Layer>
        </Stage>

        {textEditorState && textEditorStagePos && (
          <div
            className="absolute z-20 flex flex-col gap-2 rounded-md border border-[rgba(255,255,255,0.2)] bg-black/75 p-2 backdrop-blur-sm"
            style={{
              left: `${textEditorStagePos.x}px`,
              top: `${textEditorStagePos.y}px`,
              transform: 'translate(0, -100%)',
              minWidth: '180px',
              maxWidth: '300px',
            }}
          >
            <textarea
              ref={textInputRef}
              value={textEditorState.value}
              onChange={(event) => onTextEditorChange(event.target.value)}
              onKeyDown={(event) => {
                if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
                  event.preventDefault();
                  onCommitTextEditor();
                  return;
                }
                if (event.key === 'Escape') {
                  event.preventDefault();
                  onCancelTextEditor();
                }
              }}
              rows={3}
              className="w-full resize-none rounded border border-[rgba(255,255,255,0.18)] bg-bg-dark/90 px-2 py-1.5 text-sm text-text-dark outline-none focus:border-accent"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                className="rounded border border-[rgba(255,255,255,0.22)] px-2 py-1 text-xs text-text-muted hover:bg-bg-dark"
                onClick={onCancelTextEditor}
              >
                {t('annotateEditor.cancel')}
              </button>
              <button
                type="button"
                className="rounded border border-accent/45 bg-accent/20 px-2 py-1 text-xs text-text-dark hover:bg-accent/30"
                onClick={onCommitTextEditor}
              >
                {t('annotateEditor.confirm')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
