import { memo, useState, useCallback } from "react";
import { Handle, Position, type NodeProps, useReactFlow } from "@xyflow/react";
import { useTranslation } from "react-i18next";
import { createGenerationTask, pollTaskResult } from "@/services/ai";
import { useSettingsStore } from "@/stores/settingsStore";
import { useCanvasStore } from "@/stores/canvasStore";
import type { ImageEditNodeData } from "../domain/canvasNodes";
import type { ProviderId } from "@/types/ai";
import { NodeHeader } from "../ui/NodeHeader";
import { NodeResizeHandle } from "../ui/NodeResizeHandle";
import { ModelParamsControls } from "../ui/ModelParamsControls";

const ASPECT_RATIO_DIMENSIONS: Record<string, { width: number; height: number }> = {
  "auto": { width: 1024, height: 1024 },
  "1:1": { width: 1024, height: 1024 },
  "16:9": { width: 1024, height: 576 },
  "9:16": { width: 576, height: 1024 },
  "4:3": { width: 1024, height: 768 },
  "3:4": { width: 768, height: 1024 },
  "21:9": { width: 1024, height: 438 },
  "2:3": { width: 768, height: 1024 },
  "3:2": { width: 1024, height: 683 },
  "5:4": { width: 1024, height: 819 },
  "4:5": { width: 819, height: 1024 },
  "1:4": { width: 256, height: 1024 },
  "1:8": { width: 128, height: 1024 },
  "4:1": { width: 1024, height: 256 },
  "8:1": { width: 1024, height: 128 },
};

function getAspectDimensions(ratio: string): { width: number; height: number } {
  return ASPECT_RATIO_DIMENSIONS[ratio] ?? ASPECT_RATIO_DIMENSIONS["1:1"];
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function ImageEditNodeComponent({ id, data, selected }: NodeProps & { data: ImageEditNodeData }) {
  const { t } = useTranslation();
  const { updateNodeData, getNode } = useReactFlow();
  const addNode = useCanvasStore((s) => s.addNode);
  const addCanvasEdge = useCanvasStore((s) => s.addCanvasEdge);
  const { providerConfigs } = useSettingsStore();

  const [prompt, setPrompt] = useState(data.prompt || "");
  const [selectedProvider, setSelectedProvider] = useState<ProviderId>(data.provider || "kie");
  const [selectedModel, setSelectedModel] = useState(data.model || "kie/nano-banana-2");
  const [selectedAspectRatio, setSelectedAspectRatio] = useState(data.aspectRatio || "1:1");
  const [selectedSize, setSelectedSize] = useState<string>(
    (typeof data.size === 'string' ? data.size : undefined) || "1K"
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<string>("");
  const [elapsedTime, setElapsedTime] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const aspectDims = getAspectDimensions(selectedAspectRatio);

  const handlePromptChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    e.stopPropagation();
    setPrompt(e.target.value);
    setError(null);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    e.stopPropagation();
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      setError(t('ai.no_prompt'));
      return;
    }

    const apiKey = providerConfigs[selectedProvider]?.apiKey;
    if (!apiKey) {
      setError(t('ai.no_api_key'));
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGenerationProgress(t('ai.generatingProgress'));
    setElapsedTime(0);
    updateNodeData(id, { prompt, isGenerating: true });

    const timer = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);

    try {
      const result = await createGenerationTask({
        provider: selectedProvider,
        model: selectedModel,
        prompt: prompt.trim(),
        width: aspectDims.width,
        height: aspectDims.height,
        numImages: 1,
        aspectRatio: selectedAspectRatio,
      });

      setGenerationProgress(t('ai.generatingWaiting'));

      const pollResult = await pollTaskResult(selectedProvider, result.task_id, (_status, elapsed) => {
        setGenerationProgress(t('ai.generatingSeconds', { seconds: elapsed }));
        if (elapsed) setElapsedTime(elapsed);
      });

      if (pollResult.images && pollResult.images.length > 0) {
        updateNodeData(id, { isGenerating: false });

        // 创建下游输出节点（图片显示在新节点中，不在原节点内联）
        const currentNode = getNode(id);
        const nodeWidth = 380;
        const newNodePosition = {
          x: (currentNode?.position?.x || 0) + nodeWidth + 50,
          y: currentNode?.position?.y || 0,
        };

        const newNodeId = addNode("exportImageNode", newNodePosition, {
          imageUrl: pollResult.images[0].url,
        });

        addCanvasEdge(id, newNodeId);
      }
    } catch (err: any) {
      console.error("Generation failed:", err);
      const errMsg = err?.message || err?.details || String(err) || t('ai.generation_failed');
      setError(errMsg);
      updateNodeData(id, { isGenerating: false });
    } finally {
      clearInterval(timer);
      setIsGenerating(false);
      setGenerationProgress("");
      setElapsedTime(0);
    }
  }, [id, prompt, selectedProvider, selectedModel, aspectDims, selectedAspectRatio, data, providerConfigs, updateNodeData, getNode, addNode, addCanvasEdge, t]);


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
        overflow: "hidden",
      }}
    >
      <Handle type="target" position={Position.Left} style={{ width: 8, height: 8, background: "var(--accent)", border: "2px solid var(--surface)" }} />
      <Handle type="source" position={Position.Right} style={{ width: 8, height: 8, background: "var(--accent)", border: "2px solid var(--surface)" }} />


      <div style={{ flex: 1, display: "flex", flexDirection: "column", borderRight: "1px solid var(--ui-border-soft)" }}>
        <div style={{ padding: "8px 10px 6px" }}>
          <NodeHeader
            icon={
              <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
                <path d="M7 1L12 10H2L7 1Z" fill="var(--text)" />
                <circle cx="7" cy="7" r="2" fill="var(--accent)" />
              </svg>
            }
            titleText={t('ai.imageTitle')}
          />
        </div>

        <div style={{ flex: 1, padding: "0 10px" }}>
          <textarea
            value={prompt}
            onChange={handlePromptChange}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            placeholder={t('ai.promptPlaceholder')}
            style={{
              width: "100%", height: "100%", minHeight: "80px", padding: "8px",
              fontSize: "11px", lineHeight: "1.5", color: "var(--text)",
              background: "var(--ui-surface-field)", border: "1px solid var(--ui-border-soft)",
              borderRadius: "var(--ui-radius-lg)", outline: "none", resize: "none", fontFamily: "inherit",
            }}
          />
        </div>

        {error && (
          <div style={{ padding: "4px 10px", fontSize: "10px", color: "var(--danger)", display: "flex", alignItems: "center", gap: "4px" }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <circle cx="6" cy="6" r="5" stroke="var(--danger)" strokeWidth="1.5" />
              <path d="M6 4v3M6 8.5v.5" stroke="var(--danger)" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            {error}
          </div>
        )}

        {isGenerating && generationProgress && (
          <div style={{ padding: "4px 10px", fontSize: "10px", color: "var(--accent)", display: "flex", alignItems: "center", gap: "4px", background: "rgba(var(--accent-rgb), 0.05)", margin: "0 10px", borderRadius: "var(--ui-radius-lg)" }}>
            <div style={{ width: "10px", height: "10px", border: "2px solid var(--accent)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
            {generationProgress}
          </div>
        )}

        <div style={{ padding: "8px 10px", display: "flex", flexDirection: "column", gap: "8px" }}>
          <div onClick={(e) => e.stopPropagation()}>
            <ModelParamsControls
              selectedProvider={selectedProvider}
              selectedModelId={selectedModel}
              selectedResolution={selectedSize}
              selectedAspectRatio={selectedAspectRatio}
              onProviderChange={(p) => setSelectedProvider(p)}
              onModelChange={setSelectedModel}
              onResolutionChange={setSelectedSize}
              onAspectRatioChange={setSelectedAspectRatio}
            />
          </div>

          <button
            onClick={(e) => { e.stopPropagation(); handleGenerate(); }}
            disabled={isGenerating || !prompt.trim()}
            style={{
              width: "100%", padding: "8px", fontSize: "11px", fontWeight: 500, color: "#fff",
              background: isGenerating || !prompt.trim() ? "var(--text-muted)" : "var(--accent)",
              border: "none", borderRadius: "var(--ui-radius-lg)",
              cursor: isGenerating || !prompt.trim() ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "4px",
            }}
          >
            {isGenerating ? (
              <div style={{ width: "10px", height: "10px", border: "2px solid rgba(255,255,255,0.8)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
            ) : (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M5 1L8 8H2L5 1Z" fill="#fff" />
              </svg>
            )}
            {isGenerating ? `${elapsedTime}s` : t('canvas.cell.generate')}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export const ImageEditNode = memo(ImageEditNodeComponent);
