import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { getTool } from "../tools/registry";
import type { NodeToolType } from "../domain/canvasNodes";
import type { ToolExecuteParams } from "../tools/types";
import { CropToolEditor } from "./tool-editors/CropToolEditor";
import { SplitStoryboardToolEditor } from "./tool-editors/SplitStoryboardToolEditor";
import { AnnotateToolEditor } from "./tool-editors/AnnotateToolEditor";

interface NodeToolDialogProps {
  toolType: NodeToolType;
  imageUrl: string;
  nodeId: string;
  onExecute: (params: ToolExecuteParams) => Promise<void>;
  onClose: () => void;
}

export function NodeToolDialog({ toolType, imageUrl, nodeId, onExecute, onClose }: NodeToolDialogProps) {
  const tool = getTool(toolType);

  if (!tool) {
    console.error(`Tool not found: ${toolType}`);
    onClose();
    return null;
  }

  // Route to the appropriate editor based on tool type
  if (toolType === "crop") {
    return (
      <CropToolEditor
        tool={tool}
        imageUrl={imageUrl}
        nodeId={nodeId}
        onExecute={onExecute}
        onClose={onClose}
      />
    );
  }

  if (toolType === "split-storyboard") {
    return (
      <SplitStoryboardToolEditor
        tool={tool}
        imageUrl={imageUrl}
        nodeId={nodeId}
        onExecute={onExecute}
        onClose={onClose}
      />
    );
  }

  if (toolType === "annotate") {
    return (
      <AnnotateToolEditor
        plugin={tool}
        options={{}}
        onOptionsChange={() => {}}
        sourceImageUrl={imageUrl}
      />
    );
  }

  // Default: generic tool editor
  return (
    <GenericToolEditor
      tool={tool}
      imageUrl={imageUrl}
      nodeId={nodeId}
      onExecute={onExecute}
      onClose={onClose}
    />
  );
}

// Generic tool editor for tools without custom UI
function GenericToolEditor({
  tool,
  imageUrl,
  nodeId,
  onExecute,
  onClose,
}: {
  tool: ReturnType<typeof getTool>;
  imageUrl: string;
  nodeId: string;
  onExecute: (params: ToolExecuteParams) => Promise<void>;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [fields, setFields] = useState<Record<string, unknown>>(() => {
    const initial: Record<string, unknown> = {};
    if (tool) {
      for (const schema of tool.fieldSchemas) {
        initial[schema.key] = schema.defaultValue;
      }
    }
    return initial;
  });

  const [isProcessing, setIsProcessing] = useState(false);

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

  if (!tool) return null;

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
          minWidth: "320px",
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

        {/* Preview */}
        <div style={{ marginBottom: "16px", borderRadius: "8px", overflow: "hidden", border: "1px solid var(--ui-border-soft)" }}>
          <img
            src={imageUrl}
            alt="Preview"
            style={{ width: "100%", maxHeight: "200px", objectFit: "contain", display: "block" }}
          />
        </div>

        {/* Fields */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "16px" }}>
          {tool.fieldSchemas.map((schema) => (
            <div key={schema.key}>
              <label style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>
                {schema.label}
              </label>
              {schema.type === "select" ? (
                <select
                  value={fields[schema.key] as string}
                  onChange={(e) => handleFieldChange(schema.key, e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px",
                    background: "var(--ui-surface-field)",
                    border: "1px solid var(--ui-border-soft)",
                    borderRadius: "6px",
                    fontSize: "12px",
                    color: "var(--text)",
                    cursor: "pointer",
                  }}
                >
                  {schema.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : schema.type === "number" ? (
                <input
                  type="number"
                  value={fields[schema.key] as number}
                  onChange={(e) => handleFieldChange(schema.key, Number(e.target.value))}
                  min={schema.min}
                  max={schema.max}
                  step={schema.step}
                  style={{
                    width: "100%",
                    padding: "8px",
                    background: "var(--ui-surface-field)",
                    border: "1px solid var(--ui-border-soft)",
                    borderRadius: "6px",
                    fontSize: "12px",
                    color: "var(--text)",
                  }}
                />
              ) : schema.type === "boolean" ? (
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={fields[schema.key] as boolean}
                    onChange={(e) => handleFieldChange(schema.key, e.target.checked)}
                  />
                  <span style={{ fontSize: "12px", color: "var(--text)" }}>{t('cropEditor.enable')}</span>
                </label>
              ) : schema.type === "color" ? (
                <input
                  type="color"
                  value={fields[schema.key] as string}
                  onChange={(e) => handleFieldChange(schema.key, e.target.value)}
                  style={{
                    width: "100%",
                    height: "36px",
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
            {t('cropEditor.cancel')}
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
            {t('cropEditor.apply')}
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
