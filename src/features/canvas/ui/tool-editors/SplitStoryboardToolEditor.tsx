import { useState, useCallback } from "react";
import type { CanvasToolPlugin, ToolExecuteParams } from "../../tools/types";

interface SplitStoryboardToolEditorProps {
  tool: CanvasToolPlugin;
  imageUrl: string;
  nodeId: string;
  onExecute: (params: ToolExecuteParams) => Promise<void>;
  onClose: () => void;
}

export function SplitStoryboardToolEditor({
  tool,
  imageUrl,
  nodeId,
  onExecute,
  onClose,
}: SplitStoryboardToolEditorProps) {
  const [fields, setFields] = useState<Record<string, unknown>>(() => {
    const initial: Record<string, unknown> = {};
    for (const schema of tool.fieldSchemas) {
      initial[schema.key] = schema.defaultValue;
    }
    return initial;
  });

  const [isProcessing, setIsProcessing] = useState(false);

  const rows = (fields.rows as number) || 2;
  const cols = (fields.cols as number) || 3;
  const totalFrames = rows * cols;

  const handleFieldChange = useCallback((key: string, value: unknown) => {
    setFields((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleExecute = useCallback(async () => {
    setIsProcessing(true);
    try {
      await onExecute({ imageUrl, fields, nodeId });
      onClose();
    } catch (error) {
      console.error("Tool execution failed:", error);
    } finally {
      setIsProcessing(false);
    }
  }, [imageUrl, fields, nodeId, onExecute, onClose]);

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--ui-surface-panel)",
          borderRadius: "12px",
          padding: "20px",
          minWidth: "400px",
          maxWidth: "500px",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {tool.icon}
            <span style={{ fontSize: "14px", fontWeight: 500, color: "var(--text)" }}>{tool.label}</span>
          </div>
          <button
            onClick={onClose}
            style={{
              width: "24px",
              height: "24px",
              borderRadius: "6px",
              border: "none",
              background: "var(--ui-surface-field)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="var(--text-muted)" strokeWidth="1.5">
              <path d="M2 2l8 8M10 2l-8 8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Grid Preview */}
        <div style={{ marginBottom: "16px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${cols}, 1fr)`,
              gap: `${fields.gap || 4}px`,
              background: (fields.backgroundColor as string) || "#000",
              padding: `${fields.gap || 4}px`,
              borderRadius: "8px",
            }}
          >
            {Array.from({ length: totalFrames }, (_, i) => (
              <div
                key={i}
                style={{
                  aspectRatio: "16/9",
                  background: `url(${imageUrl}) center/cover`,
                  borderRadius: "4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "10px",
                  color: "white",
                  textShadow: "0 1px 2px rgba(0,0,0,0.5)",
                }}
              >
                {i + 1}
              </div>
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: "8px", fontSize: "12px", color: "var(--text-muted)" }}>
            {rows} x {cols} = {totalFrames} 格
          </div>
        </div>

        {/* Fields */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
          {tool.fieldSchemas.map((schema) => (
            <div key={schema.key}>
              <label style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>
                {schema.label}
              </label>
              {schema.type === "number" ? (
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <button
                    onClick={() => handleFieldChange(schema.key, Math.max(schema.min || 0, (fields[schema.key] as number) - (schema.step || 1)))}
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "6px",
                      border: "1px solid var(--ui-border-soft)",
                      background: "var(--ui-surface-field)",
                      cursor: "pointer",
                      fontSize: "14px",
                      color: "var(--text-muted)",
                    }}
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={fields[schema.key] as number}
                    onChange={(e) => handleFieldChange(schema.key, Number(e.target.value))}
                    min={schema.min}
                    max={schema.max}
                    step={schema.step}
                    style={{
                      flex: 1,
                      padding: "6px",
                      textAlign: "center",
                      background: "var(--ui-surface-field)",
                      border: "1px solid var(--ui-border-soft)",
                      borderRadius: "6px",
                      fontSize: "12px",
                      color: "var(--text)",
                    }}
                  />
                  <button
                    onClick={() => handleFieldChange(schema.key, Math.min(schema.max || 100, (fields[schema.key] as number) + (schema.step || 1)))}
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "6px",
                      border: "1px solid var(--ui-border-soft)",
                      background: "var(--ui-surface-field)",
                      cursor: "pointer",
                      fontSize: "14px",
                      color: "var(--text-muted)",
                    }}
                  >
                    +
                  </button>
                </div>
              ) : schema.type === "color" ? (
                <input
                  type="color"
                  value={fields[schema.key] as string}
                  onChange={(e) => handleFieldChange(schema.key, e.target.value)}
                  style={{
                    width: "100%",
                    height: "32px",
                    padding: "2px",
                    background: "var(--ui-surface-field)",
                    border: "1px solid var(--ui-border-soft)",
                    borderRadius: "6px",
                    cursor: "pointer",
                  }}
                />
              ) : null}
            </div>
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              padding: "8px 16px",
              fontSize: "12px",
              color: "var(--text-muted)",
              background: "var(--ui-surface-field)",
              border: "1px solid var(--ui-border-soft)",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            取消
          </button>
          <button
            onClick={handleExecute}
            disabled={isProcessing}
            style={{
              padding: "8px 16px",
              fontSize: "12px",
              fontWeight: 500,
              color: "white",
              background: isProcessing ? "var(--text-muted)" : "var(--accent)",
              border: "none",
              borderRadius: "6px",
              cursor: isProcessing ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            {isProcessing && (
              <div
                style={{
                  width: "12px",
                  height: "12px",
                  border: "2px solid white",
                  borderTopColor: "transparent",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                }}
              />
            )}
            分割
          </button>
        </div>

        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}
