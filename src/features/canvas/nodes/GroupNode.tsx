import { memo } from "react";
import { type NodeProps } from "@xyflow/react";
import { useTranslation } from "react-i18next";
import type { GroupNodeData } from "../domain/canvasNodes";
import { NodeHeader } from "../ui/NodeHeader";
import { NodeResizeHandle } from "../ui/NodeResizeHandle";

function GroupNodeComponent({ data, selected }: NodeProps & { data: GroupNodeData }) {
  const { t } = useTranslation();
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        borderRadius: "var(--node-radius)",
        background: "rgba(var(--accent-rgb), 0.05)",
        border: `2px dashed ${selected ? "var(--accent)" : "var(--ui-border-soft)"}`,
        boxShadow: selected ? "0 0 0 2px rgba(99, 102, 241, 0.2), 0 0 25px rgba(99, 102, 241, 0.25)" : "none",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "8px 12px",
          borderBottom: "1px dashed var(--ui-border-soft)",
        }}
      >
        <NodeHeader
          icon={
            <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="1.5">
              <rect x="2" y="2" width="12" height="12" rx="2" strokeDasharray="4 2" />
            </svg>
          }
          titleText={data.label}
          metaText={t('group.nodeCount', { count: data.childNodeIds.length })}
        />
      </div>

      <div style={{ flex: 1, padding: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: "11px", color: "var(--text-muted)", fontStyle: "italic" }}>
          {t('group.dragToGroup')}
        </span>
      </div>

      <NodeResizeHandle />
    </div>
  );
}

export const GroupNode = memo(GroupNodeComponent);
