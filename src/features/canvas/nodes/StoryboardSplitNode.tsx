import { memo, useCallback, useMemo, useState } from "react";
import { Handle, Position, type NodeProps, useReactFlow } from "@xyflow/react";
import { useTranslation } from "react-i18next";
import { saveImageSourceToDownloads } from "@/commands/image";
import { useCanvasStore } from "@/stores/canvasStore";
import {
  CANVAS_NODE_TYPES,
  type StoryboardExportOptions,
  type StoryboardFrameItem,
  type StoryboardSplitNodeData,
} from "../domain/canvasNodes";
import { canvasToDataUrl, loadImageElement } from "../application/imageData";
import { CanvasNodeImage } from "../ui/CanvasNodeImage";
import { NodeHeader } from "../ui/NodeHeader";
import { NodeResizeHandle } from "../ui/NodeResizeHandle";

const DEFAULT_EXPORT_OPTIONS: StoryboardExportOptions = {
  showFrameIndex: false,
  showFrameNote: false,
  notePlacement: "overlay",
  imageFit: "cover",
  frameIndexPrefix: "S",
  cellGap: 8,
  outerPadding: 0,
  fontSize: 12,
  backgroundColor: "#0f1115",
  textColor: "#f8fafc",
};

function fitRect(
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
  mode: StoryboardExportOptions["imageFit"]
) {
  const sourceRatio = sourceWidth / sourceHeight;
  const targetRatio = targetWidth / targetHeight;
  const shouldCover = mode === "cover";
  const widthLimited = shouldCover ? sourceRatio < targetRatio : sourceRatio > targetRatio;
  const width = widthLimited ? targetWidth : targetHeight * sourceRatio;
  const height = widthLimited ? targetWidth / sourceRatio : targetHeight;
  return {
    x: (targetWidth - width) / 2,
    y: (targetHeight - height) / 2,
    width,
    height,
  };
}

function drawExportLabel(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  options: StoryboardExportOptions
) {
  if (!text.trim()) return;
  context.save();
  context.font = `${Math.max(8, options.fontSize)}px sans-serif`;
  context.textBaseline = "top";
  const padding = Math.max(4, Math.round(options.fontSize * 0.45));
  const lineHeight = Math.max(12, Math.round(options.fontSize * 1.25));
  const clippedText = text.length > 80 ? `${text.slice(0, 80)}...` : text;
  const metrics = context.measureText(clippedText);
  const boxWidth = Math.min(maxWidth, metrics.width + padding * 2);
  const boxHeight = lineHeight + padding * 2;
  context.fillStyle = "rgba(0, 0, 0, 0.58)";
  context.fillRect(x, y, boxWidth, boxHeight);
  context.fillStyle = options.textColor;
  context.fillText(clippedText, x + padding, y + padding, maxWidth - padding * 2);
  context.restore();
}

export const StoryboardSplitNode = memo(({ id, data, selected }: NodeProps & { data: StoryboardSplitNodeData }) => {
  const { t } = useTranslation();
  const { getNode } = useReactFlow();
  const addNodesWithEdges = useCanvasStore((state) => state.addNodesWithEdges);
  const [exportPanelOpen, setExportPanelOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportOptions, setExportOptions] = useState<StoryboardExportOptions>({
    ...DEFAULT_EXPORT_OPTIONS,
    ...data.exportOptions,
  });

  const gridInfo = useMemo(() => {
    if (data.gridRows && data.gridCols) {
      return { rows: data.gridRows, cols: data.gridCols };
    }

    const match = typeof data.prompt === "string" ? data.prompt.match(/(\d+)×(\d+)/) : null;
    if (match) {
      return { rows: parseInt(match[1]), cols: parseInt(match[2]) };
    }
    return { rows: 2, cols: 2 };
  }, [data.gridCols, data.gridRows, data.prompt]);

  const totalFrames = gridInfo.rows * gridInfo.cols;
  const frames = useMemo<StoryboardFrameItem[]>(() => {
    const existingFrames = Array.isArray(data.frames) ? data.frames : [];
    if (existingFrames.length >= totalFrames) return existingFrames.slice(0, totalFrames);

    return Array.from({ length: totalFrames }, (_item, index) => {
      const frame = existingFrames[index];
      return frame ?? {
        id: `placeholder-${index}`,
        imageUrl: null,
        previewImageUrl: null,
        aspectRatio: data.frameAspectRatio,
        note: "",
        order: index,
      };
    });
  }, [data.frameAspectRatio, data.frames, totalFrames]);

  const frameImages = useMemo(
    () => frames.map((frame) => frame.imageUrl).filter((url): url is string => Boolean(url)),
    [frames]
  );

  const createFrameOutputNode = useCallback((frame: StoryboardFrameItem, index: number) => ({
    type: CANVAS_NODE_TYPES.exportImage,
    data: {
      imageUrl: frame.imageUrl,
      previewImageUrl: frame.previewImageUrl ?? frame.imageUrl,
      aspectRatio: frame.aspectRatio ?? data.frameAspectRatio ?? data.aspectRatio ?? "1:1",
      resultKind: "storyboardFrameEdit" as const,
      displayName: `${t('storyboard.frameTitle', { index: index + 1 })}`,
    },
  }), [data.aspectRatio, data.frameAspectRatio, t]);

  const handleOutputFrame = useCallback((frame: StoryboardFrameItem, index: number) => {
    if (!frame.imageUrl) return;
    const currentNode = getNode(id);
    const outputNode = createFrameOutputNode(frame, index);
    addNodesWithEdges([{
      ...outputNode,
      position: {
        x: (currentNode?.position.x ?? 0) + 430,
        y: (currentNode?.position.y ?? 0) + index * 40,
      },
    }], [{ source: id, targetIndex: 0 }]);
  }, [addNodesWithEdges, createFrameOutputNode, getNode, id]);

  const handleOutputAllFrames = useCallback(() => {
    const outputFrames = frames
      .map((frame, index) => ({ frame, index }))
      .filter(({ frame }) => Boolean(frame.imageUrl));
    if (outputFrames.length === 0) return;

    const currentNode = getNode(id);
    const originX = (currentNode?.position.x ?? 0) + 430;
    const originY = currentNode?.position.y ?? 0;
    const nodeGapX = 240;
    const nodeGapY = 220;
    const layoutCols = Math.max(1, Math.min(gridInfo.cols, 3));

    addNodesWithEdges(
      outputFrames.map(({ frame, index }, outputIndex) => ({
        ...createFrameOutputNode(frame, index),
        position: {
          x: originX + (outputIndex % layoutCols) * nodeGapX,
          y: originY + Math.floor(outputIndex / layoutCols) * nodeGapY,
        },
      })),
      outputFrames.map((_item, targetIndex) => ({ source: id, targetIndex }))
    );
  }, [addNodesWithEdges, createFrameOutputNode, frames, getNode, gridInfo.cols, id]);

  const handleMergeExport = useCallback(async () => {
    const outputFrames = frames.filter((frame) => Boolean(frame.imageUrl));
    if (outputFrames.length === 0 || isExporting) return;

    setIsExporting(true);
    try {
      const images = await Promise.all(outputFrames.map((frame) => loadImageElement(frame.imageUrl!)));
      const cellWidth = Math.max(1, Math.max(...images.map((image) => image.naturalWidth)));
      const cellHeight = Math.max(1, Math.max(...images.map((image) => image.naturalHeight)));
      const gap = Math.max(0, Math.floor(exportOptions.cellGap));
      const padding = Math.max(0, Math.floor(exportOptions.outerPadding));
      const canvas = document.createElement("canvas");
      canvas.width = padding * 2 + gridInfo.cols * cellWidth + Math.max(0, gridInfo.cols - 1) * gap;
      canvas.height = padding * 2 + gridInfo.rows * cellHeight + Math.max(0, gridInfo.rows - 1) * gap;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Cannot initialize canvas");

      context.fillStyle = exportOptions.backgroundColor;
      context.fillRect(0, 0, canvas.width, canvas.height);

      images.forEach((image, imageIndex) => {
        const frame = outputFrames[imageIndex];
        const row = Math.floor((frame.order ?? imageIndex) / gridInfo.cols);
        const col = (frame.order ?? imageIndex) % gridInfo.cols;
        const cellX = padding + col * (cellWidth + gap);
        const cellY = padding + row * (cellHeight + gap);
        const rect = fitRect(image.naturalWidth, image.naturalHeight, cellWidth, cellHeight, exportOptions.imageFit);
        context.drawImage(image, cellX + rect.x, cellY + rect.y, rect.width, rect.height);

        const labelParts = [
          exportOptions.showFrameIndex ? `${exportOptions.frameIndexPrefix}${imageIndex + 1}` : "",
          exportOptions.showFrameNote ? frame.note : "",
        ].filter(Boolean);
        drawExportLabel(context, labelParts.join("  "), cellX + 6, cellY + 6, cellWidth - 12, exportOptions);
      });

      const savedPath = await saveImageSourceToDownloads(
        canvasToDataUrl(canvas),
        `storyboard-split-${gridInfo.rows}x${gridInfo.cols}`
      );
      alert(t('storyboard.exportedTo', { path: savedPath }));
    } catch (error) {
      console.error("Storyboard split export failed:", error);
      alert(t('storyboard.exportFailed'));
    } finally {
      setIsExporting(false);
    }
  }, [exportOptions, frames, gridInfo.cols, gridInfo.rows, isExporting, t]);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        borderRadius: "var(--node-radius)",
        background: "rgba(255, 255, 255, 0.75)",
        border: `1px solid ${selected ? "var(--accent)" : "var(--ui-border-soft)"}`,
        boxShadow: selected
          ? "0 0 0 2px rgba(99, 102, 241, 0.2), 0 0 25px rgba(99, 102, 241, 0.25), 0 4px 12px rgba(0,0,0,0.1)"
          : "0 2px 8px rgba(31, 38, 135, 0.06)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <Handle type="target" position={Position.Left} style={{ width: 8, height: 8, background: "var(--accent)", border: "2px solid white" }} />
      <Handle type="source" position={Position.Right} style={{ width: 8, height: 8, background: "var(--accent)", border: "2px solid white" }} />


      <div style={{ padding: "8px 10px 6px" }}>
        <NodeHeader
          icon={
            <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="1.5">
              <rect x="2" y="2" width="5" height="5" rx="1" />
              <rect x="9" y="2" width="5" height="5" rx="1" />
              <rect x="2" y="9" width="5" height="5" rx="1" />
              <rect x="9" y="9" width="5" height="5" rx="1" />
            </svg>
          }
          titleText={t('storyboard.splitTitle')}
          metaText={t('splitEditor.gridInfo', { rows: gridInfo.rows, cols: gridInfo.cols, count: totalFrames })}
        />
      </div>

      {/* Image Grid */}
      <div style={{ flex: 1, padding: "0 10px", overflow: "auto" }}>
        {frameImages.length > 0 ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${gridInfo.cols}, 1fr)`,
              gap: "2px",
              borderRadius: "4px",
              overflow: "hidden",
            }}
          >
            {frames.map((frame, index) => (
              <div
                key={frame.id || index}
                style={{
                  aspectRatio: "1",
                  background: "var(--ui-surface-field)",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {frame.imageUrl ? (
                  <CanvasNodeImage
                    src={frame.previewImageUrl ?? frame.imageUrl}
                    viewerSourceUrl={frame.imageUrl}
                    viewerImageList={frameImages}
                    alt={`Frame ${index + 1}`}
                    draggable={false}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                ) : null}
                <span style={{
                  position: "absolute",
                  top: "2px",
                  left: "2px",
                  fontSize: "8px",
                  color: "white",
                  background: "rgba(0,0,0,0.6)",
                  padding: "1px 4px",
                  borderRadius: "2px",
                }}>
                  {String(index + 1).padStart(2, "0")}
                </span>
                {frame.imageUrl && (
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      handleOutputFrame(frame, index);
                    }}
                    style={{
                      position: "absolute",
                      right: "2px",
                      bottom: "2px",
                      padding: "2px 5px",
                      fontSize: "8px",
                      fontWeight: 500,
                      color: "white",
                      background: "var(--accent)",
                      border: "none",
                      borderRadius: "3px",
                      cursor: "pointer",
                    }}
                  >
                    {t('splitEditor.outputFrame')}
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div style={{
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text-muted)",
            fontSize: "10px",
          }}>
            {t('splitEditor.waitingResult')}
          </div>
        )}
      </div>

      {/* Export Controls */}
      <div style={{ padding: "8px 10px", display: "flex", gap: "4px" }}>
        <button
          onClick={handleOutputAllFrames}
          disabled={frameImages.length === 0}
          style={{
            flex: 1,
            padding: "6px",
            fontSize: "9px",
            fontWeight: 500,
            color: frameImages.length === 0 ? "var(--text-muted)" : "white",
            background: frameImages.length === 0 ? "var(--ui-surface-field)" : "var(--accent)",
            border: frameImages.length === 0 ? "1px solid var(--ui-border-soft)" : "none",
            borderRadius: "var(--ui-radius-lg)",
            cursor: frameImages.length === 0 ? "not-allowed" : "pointer",
            opacity: frameImages.length === 0 ? 0.65 : 1,
          }}
        >
          {t('splitEditor.outputAllFrames')}
        </button>
        <button
          onClick={() => setExportPanelOpen(!exportPanelOpen)}
          style={{
            flex: 1,
            padding: "6px",
            fontSize: "9px",
            fontWeight: 500,
            color: "var(--text-muted)",
            background: "var(--ui-surface-field)",
            border: "1px solid var(--ui-border-soft)",
            borderRadius: "var(--ui-radius-lg)",
            cursor: "pointer",
          }}
        >
          {t('splitEditor.exportSettings')}
        </button>
        <button
          onClick={handleMergeExport}
          disabled={frameImages.length === 0 || isExporting}
          style={{
            flex: 1,
            padding: "6px",
            fontSize: "9px",
            fontWeight: 500,
            color: frameImages.length === 0 ? "var(--text-muted)" : "white",
            background: frameImages.length === 0 ? "var(--ui-surface-field)" : "var(--accent)",
            border: frameImages.length === 0 ? "1px solid var(--ui-border-soft)" : "none",
            borderRadius: "var(--ui-radius-lg)",
            cursor: frameImages.length === 0 || isExporting ? "not-allowed" : "pointer",
            opacity: isExporting ? 0.72 : 1,
          }}
        >
          {isExporting ? t('storyboard.exporting') : t('splitEditor.mergeExport')}
        </button>
      </div>

      {/* Export Panel */}
      {exportPanelOpen && (
        <div style={{
          padding: "8px 10px",
          borderTop: "1px solid var(--ui-border-soft)",
          display: "flex",
          flexDirection: "column",
          gap: "6px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <input
              type="checkbox"
              id={`${id}-showIndex`}
              checked={exportOptions.showFrameIndex}
              onChange={(event) => setExportOptions((prev) => ({ ...prev, showFrameIndex: event.target.checked }))}
              style={{ width: "12px", height: "12px" }}
            />
            <label htmlFor={`${id}-showIndex`} style={{ fontSize: "9px", color: "var(--text-muted)" }}>{t('splitEditor.showIndex')}</label>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <input
              type="checkbox"
              id={`${id}-showNote`}
              checked={exportOptions.showFrameNote}
              onChange={(event) => setExportOptions((prev) => ({ ...prev, showFrameNote: event.target.checked }))}
              style={{ width: "12px", height: "12px" }}
            />
            <label htmlFor={`${id}-showNote`} style={{ fontSize: "9px", color: "var(--text-muted)" }}>{t('splitEditor.showDesc')}</label>
          </div>
          <div style={{ display: "flex", gap: "4px" }}>
            <button
              type="button"
              onClick={() => setExportOptions((prev) => ({ ...prev, imageFit: "cover" }))}
              style={{
                flex: 1,
                padding: "4px",
                fontSize: "9px",
                color: exportOptions.imageFit === "cover" ? "white" : "var(--text-muted)",
                background: exportOptions.imageFit === "cover" ? "var(--accent)" : "var(--ui-surface-field)",
                border: "1px solid var(--ui-border-soft)",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              {t('splitEditor.cover')}
            </button>
            <button
              type="button"
              onClick={() => setExportOptions((prev) => ({ ...prev, imageFit: "contain" }))}
              style={{
                flex: 1,
                padding: "4px",
                fontSize: "9px",
                color: exportOptions.imageFit === "contain" ? "white" : "var(--text-muted)",
                background: exportOptions.imageFit === "contain" ? "var(--accent)" : "var(--ui-surface-field)",
                border: "1px solid var(--ui-border-soft)",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              {t('splitEditor.contain')}
            </button>
          </div>
          <div style={{ display: "flex", gap: "4px" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "8px", color: "var(--text-muted)", marginBottom: "2px" }}>{t('splitEditor.gap')}</div>
              <input
                type="number"
                value={exportOptions.cellGap}
                min={0}
                max={50}
                onChange={(event) => setExportOptions((prev) => ({ ...prev, cellGap: Number(event.target.value) }))}
                style={{ width: "100%", padding: "4px", fontSize: "9px", background: "var(--ui-surface-field)", border: "1px solid var(--ui-border-soft)", borderRadius: "4px", outline: "none" }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "8px", color: "var(--text-muted)", marginBottom: "2px" }}>{t('splitEditor.bgColor')}</div>
              <input
                type="color"
                value={exportOptions.backgroundColor}
                onChange={(event) => setExportOptions((prev) => ({ ...prev, backgroundColor: event.target.value }))}
                style={{ width: "100%", height: "24px", padding: "2px", background: "var(--ui-surface-field)", border: "1px solid var(--ui-border-soft)", borderRadius: "4px", cursor: "pointer" }}
              />
            </div>
          </div>
        </div>
      )}

      <NodeResizeHandle />
    </div>
  );
});

StoryboardSplitNode.displayName = "StoryboardSplitNode";
