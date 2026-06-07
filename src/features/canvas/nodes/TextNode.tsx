import { memo, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Handle, Position, type NodeProps, useReactFlow } from "@xyflow/react";
import type { StoryboardCell } from "@/types/project";
import { NodeHeader } from "../ui/NodeHeader";
import { NodeResizeHandle } from "../ui/NodeResizeHandle";

function TextNodeComponent({ id, data, selected }: NodeProps & { data: StoryboardCell }) {
  const { t } = useTranslation();
  const { updateNodeData } = useReactFlow();
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(data.prompt || "");

  const handleSaveEdit = useCallback(() => {
    updateNodeData(id, { prompt: editText });
    setIsEditing(false);
  }, [id, editText, updateNodeData]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === "Escape") {
      setIsEditing(false);
      setEditText(data.prompt || "");
    }
  }, [data.prompt]);


  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        borderRadius: "var(--node-radius)",
        background: "var(--ui-surface-panel)",
        border: `1px solid ${selected ? "var(--accent)" : "var(--ui-border-soft)"}`,
        boxShadow: selected
          ? "0 0 0 2px rgba(var(--accent-rgb), 0.2), 0 4px 12px rgba(0,0,0,0.1)"
          : "0 2px 6px rgba(0,0,0,0.06)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <Handle type="target" position={Position.Left} style={{ width: 8, height: 8, background: "var(--accent)", border: "2px solid white" }} />
      <Handle type="source" position={Position.Right} style={{ width: 8, height: 8, background: "var(--accent)", border: "2px solid white" }} />


      <div style={{ padding: "8px 10px 4px" }}>
        <NodeHeader
          icon={
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="1.5">
              <path d="M2 2h8M6 2v8M4 10h4" strokeLinecap="round" />
            </svg>
          }
          titleText={data.cellType === "text_annotation" ? t('textNode.annotation') : t('textNode.textBlock')}
        />
      </div>

      <div style={{ padding: "4px 10px 10px", flex: 1 }}>
        {isEditing ? (
          <textarea
            autoFocus
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onBlur={handleSaveEdit}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              width: "100%", height: "100%", minHeight: "60px",
              padding: "8px", fontSize: "11px", lineHeight: "1.6",
              backgroundColor: "var(--ui-surface-field)", color: "var(--text)",
              border: "1px solid var(--accent)", borderRadius: "var(--ui-radius-lg)",
              outline: "none", resize: "none",
              boxShadow: "0 0 0 2px rgba(var(--accent-rgb), 0.1)",
            }}
          />
        ) : (
          <div
            onDoubleClick={(e) => { e.stopPropagation(); setIsEditing(true); setEditText(data.prompt || ""); }}
            style={{
              fontSize: "11px", lineHeight: "1.6",
              color: data.prompt ? "var(--text)" : "var(--text-muted)",
              overflow: "hidden", whiteSpace: "pre-wrap", wordBreak: "break-word",
              height: "100%", cursor: "text", padding: "4px", borderRadius: "var(--ui-radius-lg)",
            }}
          >
            {data.prompt || t('textNode.dblClickEdit')}
          </div>
        )}
      </div>

      <NodeResizeHandle />
    </div>
  );
}

export const TextNode = memo(TextNodeComponent);
