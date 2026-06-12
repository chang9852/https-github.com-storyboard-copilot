import { memo, useMemo, useState } from "react";
import { Handle, Position } from "@xyflow/react";
import { useTranslation } from "react-i18next";
import type { StoryboardCell } from "@/types/project";
import { NodeHeader } from "../ui/NodeHeader";
import { NodeResizeHandle } from "../ui/NodeResizeHandle";

interface StoryboardSplitNodeProps {
  data: StoryboardCell;
  selected?: boolean;
}

export const StoryboardSplitNode = memo(({ data, selected }: StoryboardSplitNodeProps) => {
  const { t } = useTranslation();
  const [exportPanelOpen, setExportPanelOpen] = useState(false);

  // 解析网格信息
  const gridInfo = useMemo(() => {
    const match = data.prompt?.match(/(\d+)×(\d+)/);
    if (match) {
      return { rows: parseInt(match[1]), cols: parseInt(match[2]) };
    }
    return { rows: 2, cols: 2 };
  }, [data.prompt]);

  const totalFrames = gridInfo.rows * gridInfo.cols;

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
        {data.imageUrl ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${gridInfo.cols}, 1fr)`,
              gap: "2px",
              borderRadius: "4px",
              overflow: "hidden",
            }}
          >
            {/* 显示切割后的网格 */}
            {Array.from({ length: totalFrames }, (_, index) => (
              <div
                key={index}
                style={{
                  aspectRatio: "1",
                  background: "var(--ui-surface-field)",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {/* 使用CSS背景图片切割显示 */}
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    backgroundImage: `url(${data.imageUrl})`,
                    backgroundSize: `${gridInfo.cols * 100}% ${gridInfo.rows * 100}%`,
                    backgroundPosition: `${(index % gridInfo.cols) * (100 / (gridInfo.cols - 1 || 1))}% ${Math.floor(index / gridInfo.cols) * (100 / (gridInfo.rows - 1 || 1))}%`,
                  }}
                />
                {/* 序号标签 */}
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
          style={{
            flex: 1,
            padding: "6px",
            fontSize: "9px",
            fontWeight: 500,
            color: "white",
            background: "var(--accent)",
            border: "none",
            borderRadius: "var(--ui-radius-lg)",
            cursor: "pointer",
          }}
        >
          {t('splitEditor.mergeExport')}
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
            <input type="checkbox" id="showIndex" style={{ width: "12px", height: "12px" }} />
            <label htmlFor="showIndex" style={{ fontSize: "9px", color: "var(--text-muted)" }}>{t('splitEditor.showIndex')}</label>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <input type="checkbox" id="showNote" style={{ width: "12px", height: "12px" }} />
            <label htmlFor="showNote" style={{ fontSize: "9px", color: "var(--text-muted)" }}>{t('splitEditor.showDesc')}</label>
          </div>
          <div style={{ display: "flex", gap: "4px" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "8px", color: "var(--text-muted)", marginBottom: "2px" }}>{t('splitEditor.gap')}</div>
              <input type="number" defaultValue={8} min={0} max={50} style={{ width: "100%", padding: "4px", fontSize: "9px", background: "var(--ui-surface-field)", border: "1px solid var(--ui-border-soft)", borderRadius: "4px", outline: "none" }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "8px", color: "var(--text-muted)", marginBottom: "2px" }}>{t('splitEditor.bgColor')}</div>
              <input type="color" defaultValue="#0f1115" style={{ width: "100%", height: "24px", padding: "2px", background: "var(--ui-surface-field)", border: "1px solid var(--ui-border-soft)", borderRadius: "4px", cursor: "pointer" }} />
            </div>
          </div>
        </div>
      )}

      <NodeResizeHandle />
    </div>
  );
});

StoryboardSplitNode.displayName = "StoryboardSplitNode";
