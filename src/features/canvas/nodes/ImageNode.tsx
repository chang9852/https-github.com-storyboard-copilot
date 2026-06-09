import { memo, useState, useCallback } from "react";
import { Handle, Position, useReactFlow } from "@xyflow/react";
import { useTranslation } from "react-i18next";
import { createGenerationTask, pollTaskResult, getModelsByProvider } from "@/services/ai";
import { useSettingsStore } from "@/stores/settingsStore";
import { DEFAULT_IMAGE_MODEL_ID } from "@/features/canvas/models";
import { ModelParamsControls } from "@/features/canvas/ui/ModelParamsControls";
import type { ProviderId } from "@/types/ai";
import { NodeHeader } from "../ui/NodeHeader";
import { CanvasNodeImage } from "../ui/CanvasNodeImage";
import { NodeResizeHandle } from "../ui/NodeResizeHandle";

interface ImageNodeData {
  id?: string;
  projectId?: string;
  cellType?: string;
  prompt?: string;
  status?: string;
  imageUrl?: string | null;
  size?: { width: number; height: number };
  position?: { x: number; y: number };
  aiProvider?: string;
  aiModel?: string;
  aspectRatio?: string;
  isGenerating?: boolean;
  [key: string]: unknown;
}

interface ImageNodeProps {
  id: string;
  data: ImageNodeData;
  selected?: boolean;
}

function ImageNodeComponent({ id, data, selected }: ImageNodeProps) {
  const { t } = useTranslation();
  const { updateNodeData } = useReactFlow();
  const { providerConfigs } = useSettingsStore();

  const [prompt, setPrompt] = useState(data.prompt || "");
  const [selectedProvider, setSelectedProvider] = useState<ProviderId>(
    (data.aiProvider as ProviderId) || "kie"
  );
  const [selectedModel, setSelectedModel] = useState(
    (data.aiModel as string) || DEFAULT_IMAGE_MODEL_ID
  );
  const [selectedResolution, setSelectedResolution] = useState("1K");
  const [selectedAspectRatio, setSelectedAspectRatio] = useState(
    (data.aspectRatio as string) || "1:1"
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<string>("");
  const [elapsedTime, setElapsedTime] = useState(0);
  const [error, setError] = useState<string | null>(null);

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
        width: 1024,
        height: 1024,
        numImages: 1,
        aspectRatio: selectedAspectRatio,
        resolution: selectedResolution,
      });

      setGenerationProgress(t('ai.generatingWaiting'));

      const pollResult = await pollTaskResult(selectedProvider, result.task_id, (_status, elapsed) => {
        setGenerationProgress(elapsed ? t('ai.generatingSeconds', { seconds: elapsed }) : t('ai.generating'));
        if (elapsed) setElapsedTime(elapsed);
      });

      if (pollResult.images && pollResult.images.length > 0) {
        updateNodeData(id, {
          imageUrl: pollResult.images[0].url,
          isGenerating: false,
        });
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
  }, [id, prompt, selectedProvider, selectedModel, selectedResolution, selectedAspectRatio, data, providerConfigs, updateNodeData, t]);

  if (data.imageUrl && !isGenerating) {
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
              <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="white" strokeWidth="1.5">
                <rect x="1" y="2" width="12" height="10" rx="1" />
                <circle cx="4" cy="5" r="1.5" />
                <path d="M1 10l3-3 2 2 3-3 4 4" strokeLinecap="round" />
              </svg>
            }
            titleText={data.prompt?.slice(0, 25) || t('ai.imageTitle')}
          />
        </div>

        <div style={{ margin: "0 8px 8px", borderRadius: "var(--ui-radius-lg)", overflow: "hidden", flex: 1 }}>
          <CanvasNodeImage
            src={data.imageUrl}
            alt=""
            draggable={false}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            viewerImageList={[data.imageUrl]}
          />
        </div>

        <NodeResizeHandle />
      </div>
    );
  }

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
        overflow: "hidden",
      }}
    >
      <Handle type="target" position={Position.Left} style={{ width: 8, height: 8, background: "var(--accent)", border: "2px solid white" }} />
      <Handle type="source" position={Position.Right} style={{ width: 8, height: 8, background: "var(--accent)", border: "2px solid white" }} />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", borderRight: "1px solid var(--ui-border-soft)" }}>
        <div style={{ padding: "8px 10px 6px" }}>
          <NodeHeader
            icon={
              <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
                <path d="M7 1L12 10H2L7 1Z" fill="white" />
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
              width: "100%",
              height: "100%",
              minHeight: "80px",
              padding: "8px",
              fontSize: "11px",
              lineHeight: "1.5",
              color: "var(--text)",
              background: "var(--ui-surface-field)",
              border: "1px solid var(--ui-border-soft)",
              borderRadius: "var(--ui-radius-lg)",
              outline: "none",
              resize: "none",
              fontFamily: "inherit",
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
              selectedResolution={selectedResolution}
              selectedAspectRatio={selectedAspectRatio}
              onProviderChange={(p) => {
                setSelectedProvider(p);
                const newModels = getModelsByProvider(p);
                if (newModels.length > 0) {
                  setSelectedModel(newModels[0].id);
                }
              }}
              onModelChange={setSelectedModel}
              onResolutionChange={setSelectedResolution}
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

export const ImageNode = memo(ImageNodeComponent);