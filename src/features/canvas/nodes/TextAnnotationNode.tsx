import { memo, useState, useCallback } from "react";
import { type NodeProps, useReactFlow } from "@xyflow/react";
import type { TextAnnotationNodeData } from "../domain/canvasNodes";
import { NodeHeader } from "../ui/NodeHeader";
import { NodeResizeHandle } from "../ui/NodeResizeHandle";

function TextAnnotationNodeComponent({ id, data, selected }: NodeProps & { data: TextAnnotationNodeData }) {
  const { updateNodeData } = useReactFlow();
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(data.text);

  const handleSaveEdit = useCallback(() => {
    updateNodeData(id, { text: editText });
    setIsEditing(false);
  }, [id, editText, updateNodeData]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      e.stopPropagation();
      if (e.key === "Escape") {
        setIsEditing(false);
        setEditText(data.text);
      }
    },
    [data.text]
  );


  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        borderRadius: "var(--node-radius)",
        background: data.backgroundColor || "var(--ui-surface-panel)",
        border: `1px solid ${selected ? "var(--accent)" : "var(--ui-border-soft)"}`,
        boxShadow: selected
          ? "0 0 0 2px rgba(var(--accent-rgb), 0.2), 0 4px 12px rgba(0,0,0,0.1)"
          : "0 2px 6px rgba(0,0,0,0.06)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >

      <div style={{ padding: "8px 10px 4px" }}>
        <NodeHeader
          icon={
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="1.5">
              <path d="M2 2h8M6 2v8M4 10h4" strokeLinecap="round" />
            </svg>
          }
          titleText="文本标注"
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
              width: "100%",
              height: "100%",
              minHeight: "60px",
              padding: "8px",
              fontSize: `${data.fontSize}px`,
              lineHeight: "1.6",
              color: data.color,
              backgroundColor: "transparent",
              border: "1px solid var(--accent)",
              borderRadius: "var(--ui-radius-lg)",
              outline: "none",
              resize: "none",
              boxShadow: "0 0 0 2px rgba(var(--accent-rgb), 0.1)",
            }}
          />
        ) : (
          <div
            onDoubleClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
              setEditText(data.text);
            }}
            style={{
              fontSize: `${data.fontSize}px`,
              lineHeight: "1.6",
              color: data.color,
              overflow: "hidden",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              height: "100%",
              cursor: "text",
              padding: "4px",
              borderRadius: "var(--ui-radius-lg)",
            }}
          >
            {data.text || "双击编辑..."}
          </div>
        )}
      </div>

      <NodeResizeHandle />
    </div>
  );
}

export const TextAnnotationNode = memo(TextAnnotationNodeComponent);
