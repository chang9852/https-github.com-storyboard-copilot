import { memo, useCallback, useRef } from "react";
import { Handle, Position, type NodeProps, useReactFlow } from "@xyflow/react";
import type { UploadNodeData } from "../domain/canvasNodes";

function UploadNodeComponent({ id, data, selected }: NodeProps & { data: UploadNodeData }) {
  const { updateNodeData } = useReactFlow();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Check if file is an image
      if (!file.type.startsWith("image/")) {
        alert("请选择图片文件");
        return;
      }

      // Read file as data URL
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageUrl = event.target?.result as string;
        updateNodeData(id, { imageUrl, fileName: file.name });
      };
      reader.readAsDataURL(file);
    },
    [id, updateNodeData]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const file = e.dataTransfer.files[0];
      if (!file || !file.type.startsWith("image/")) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const imageUrl = event.target?.result as string;
        updateNodeData(id, { imageUrl, fileName: file.name });
      };
      reader.readAsDataURL(file);
    },
    [id, updateNodeData]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // If image exists, show image preview
  if (data.imageUrl) {
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
        <Handle type="source" position={Position.Right} style={{ width: 8, height: 8, background: "var(--accent)", border: "2px solid white" }} />

        {/* Header */}
        <div style={{ padding: "8px 10px 4px", display: "flex", alignItems: "center", gap: "6px" }}>
          <div
            style={{
              width: "18px",
              height: "18px",
              borderRadius: "4px",
              background: "var(--accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="white" strokeWidth="1.5">
              <rect x="1" y="2" width="12" height="10" rx="1" />
              <circle cx="4" cy="5" r="1.5" />
              <path d="M1 10l3-3 2 2 3-3 4 4" strokeLinecap="round" />
            </svg>
          </div>
          <span
            style={{
              fontSize: "11px",
              color: "var(--text-muted)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              flex: 1,
            }}
          >
            {data.fileName || "上传图片"}
          </span>
        </div>

        {/* Image */}
        <div style={{ margin: "0 8px 8px", borderRadius: "var(--ui-radius-lg)", overflow: "hidden", flex: 1 }}>
          <img
            src={data.imageUrl}
            alt=""
            draggable={false}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        </div>
      </div>
    );
  }

  // Upload placeholder
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        borderRadius: "var(--node-radius)",
        background: "var(--ui-surface-panel)",
        border: `2px dashed ${selected ? "var(--accent)" : "var(--ui-border-soft)"}`,
        boxShadow: selected
          ? "0 0 0 2px rgba(var(--accent-rgb), 0.2)"
          : "none",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        transition: "all 0.2s ease",
      }}
      onClick={handleClick}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <Handle type="source" position={Position.Right} style={{ width: 8, height: 8, background: "var(--accent)", border: "2px solid white" }} />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />

      <div
        style={{
          width: "40px",
          height: "40px",
          borderRadius: "50%",
          background: "var(--ui-surface-field)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "8px",
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>点击或拖拽上传</span>
      <span style={{ fontSize: "9px", color: "var(--text-muted)", marginTop: "4px" }}>支持 JPG、PNG、WebP</span>
    </div>
  );
}

export const UploadNode = memo(UploadNodeComponent);
