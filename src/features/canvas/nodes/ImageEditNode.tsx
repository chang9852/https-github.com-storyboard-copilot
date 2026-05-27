import { memo, useState, useCallback } from "react";
import { Handle, Position, type NodeProps, useReactFlow } from "@xyflow/react";
import { createGenerationTask, pollTaskResult, getModelsByProvider } from "@/services/ai";
import { useSettingsStore } from "@/stores/settingsStore";
import type { ImageEditNodeData } from "../domain/canvasNodes";
import type { ProviderId } from "@/types/ai";

type AspectRatioIcon = "auto" | "square" | "portrait" | "landscape";

interface AspectRatioOption {
  value: string;
  label: string;
  icon: AspectRatioIcon;
  width: number;
  height: number;
}

const QUICK_ASPECT_RATIOS: AspectRatioOption[] = [
  { value: "auto", label: "自动", icon: "auto", width: 1024, height: 1024 },
  { value: "1:1", label: "1:1", icon: "square", width: 1024, height: 1024 },
  { value: "16:9", label: "16:9", icon: "landscape", width: 1024, height: 576 },
  { value: "9:16", label: "9:16", icon: "portrait", width: 576, height: 1024 },
  { value: "4:3", label: "4:3", icon: "landscape", width: 1024, height: 768 },
  { value: "3:4", label: "3:4", icon: "portrait", width: 768, height: 1024 },
];

function AspectRatioIconSvg({ type, size = 16 }: { type: AspectRatioIcon; size?: number }) {
  const color = "var(--text-muted)";
  const strokeWidth = 1.5;

  if (type === "auto") {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth={strokeWidth}>
        <path d="M4 6L8 2L12 6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4 10L8 14L12 10" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (type === "square") {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth={strokeWidth}>
        <rect x="3" y="3" width="10" height="10" rx="1" />
      </svg>
    );
  }

  if (type === "portrait") {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth={strokeWidth}>
        <rect x="4" y="2" width="8" height="12" rx="1" />
      </svg>
    );
  }

  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth={strokeWidth}>
      <rect x="2" y="4" width="12" height="8" rx="1" />
    </svg>
  );
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function ImageEditNodeComponent({ id, data, selected }: NodeProps & { data: ImageEditNodeData }) {
  const { updateNodeData, addNodes, addEdges } = useReactFlow();
  const { providerConfigs } = useSettingsStore();

  const [prompt, setPrompt] = useState(data.prompt || "");
  const [selectedProvider, setSelectedProvider] = useState<ProviderId>(data.provider || "kie");
  const [selectedModel, setSelectedModel] = useState(data.model || "nano-banana-pro");
  const [selectedAspectRatio, setSelectedAspectRatio] = useState(data.aspectRatio || "1:1");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<string>("");
  const [elapsedTime, setElapsedTime] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const models = getModelsByProvider(selectedProvider);
  const aspectRatio = QUICK_ASPECT_RATIOS.find((r) => r.value === selectedAspectRatio) || QUICK_ASPECT_RATIOS[1];

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
      setError("请输入提示词");
      return;
    }

    const apiKey = providerConfigs[selectedProvider]?.apiKey;
    if (!apiKey) {
      setError("请先在设置中配置 API Key");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGenerationProgress("正在提交任务...");
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
        width: aspectRatio.width,
        height: aspectRatio.height,
        numImages: 1,
        aspectRatio: selectedAspectRatio,
        resolution: "2K",
      });

      setGenerationProgress("任务已提交，等待生成...");

      const pollResult = await pollTaskResult(selectedProvider, result.task_id, (_status, elapsed) => {
        setGenerationProgress(`生成中... ${elapsed ? `${elapsed}秒` : ""}`);
        if (elapsed) setElapsedTime(elapsed);
      });

      if (pollResult.images && pollResult.images.length > 0) {
        // Update current node with generated image
        updateNodeData(id, {
          imageUrl: pollResult.images[0].url,
          isGenerating: false,
        });

        // Create a new export image node
        const newNodeId = generateId();
        addNodes({
          id: newNodeId,
          type: "exportImage",
          position: {
            x: (data.size?.width || 380) + 50,
            y: 0,
          },
          data: {
            images: [pollResult.images[0].url],
            selectedImageIndex: 0,
          },
          style: { width: 320, height: 240 },
        });

        addEdges({
          id: generateId(),
          source: id,
          target: newNodeId,
          type: "smoothstep",
          animated: true,
          style: { stroke: "#3b82f6", strokeWidth: 2 },
        });
      }
    } catch (err: any) {
      console.error("Generation failed:", err);
      setError(err.message || "生成失败，请重试");
      updateNodeData(id, { isGenerating: false });
    } finally {
      clearInterval(timer);
      setIsGenerating(false);
      setGenerationProgress("");
      setElapsedTime(0);
    }
  }, [id, prompt, selectedProvider, selectedModel, aspectRatio, selectedAspectRatio, data, providerConfigs, updateNodeData, addNodes, addEdges]);

  // If image is generated, show preview
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
            <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
              <path d="M7 1L12 10H2L7 1Z" fill="white" />
              <circle cx="7" cy="7" r="2" fill="var(--accent)" />
            </svg>
          </div>
          <span style={{ fontSize: "11px", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
            {prompt.slice(0, 25) || "AI 生成"}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              updateNodeData(id, { imageUrl: undefined });
            }}
            style={{
              width: "16px",
              height: "16px",
              borderRadius: "4px",
              border: "none",
              background: "var(--ui-surface-field)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="var(--text-muted)" strokeWidth="1.5">
              <path d="M1 1l6 6M7 1l-6 6" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Image */}
        <div style={{ margin: "0 8px 8px", borderRadius: "var(--ui-radius-lg)", overflow: "hidden", flex: 1 }}>
          <img src={data.imageUrl} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        </div>
      </div>
    );
  }

  // AI generation node
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

      {/* Left side - Prompt input */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", borderRight: "1px solid var(--ui-border-soft)" }}>
        {/* Header */}
        <div style={{ padding: "8px 10px 6px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
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
              <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
                <path d="M7 1L12 10H2L7 1Z" fill="white" />
                <circle cx="7" cy="7" r="2" fill="var(--accent)" />
              </svg>
            </div>
            <span style={{ fontSize: "11px", fontWeight: 500, color: "var(--text)" }}>AI 图片</span>
          </div>
        </div>

        {/* Textarea */}
        <div style={{ flex: 1, padding: "0 10px" }}>
          <textarea
            value={prompt}
            onChange={handlePromptChange}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            placeholder="输入 AI 提示词..."
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

        {/* Error message */}
        {error && (
          <div style={{ padding: "4px 10px", fontSize: "10px", color: "var(--danger)", display: "flex", alignItems: "center", gap: "4px" }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <circle cx="6" cy="6" r="5" stroke="var(--danger)" strokeWidth="1.5" />
              <path d="M6 4v3M6 8.5v.5" stroke="var(--danger)" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            {error}
          </div>
        )}

        {/* Generation progress */}
        {isGenerating && generationProgress && (
          <div style={{ padding: "4px 10px", fontSize: "10px", color: "var(--accent)", display: "flex", alignItems: "center", gap: "4px", background: "rgba(var(--accent-rgb), 0.05)", margin: "0 10px", borderRadius: "var(--ui-radius-lg)" }}>
            <div style={{ width: "10px", height: "10px", border: "2px solid var(--accent)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
            {generationProgress}
          </div>
        )}

        {/* Bottom control bar */}
        <div style={{ padding: "8px 10px", display: "flex", flexDirection: "column", gap: "8px" }}>
          {/* Provider & Model selectors row */}
          <div style={{ display: "flex", gap: "6px" }}>
            <select
              value={selectedProvider}
              onChange={(e) => {
                setSelectedProvider(e.target.value as ProviderId);
                const newModels = getModelsByProvider(e.target.value as ProviderId);
                if (newModels.length > 0) {
                  setSelectedModel(newModels[0].id);
                }
              }}
              style={{
                flex: 1,
                padding: "4px 6px",
                background: "var(--ui-surface-field)",
                border: "1px solid var(--ui-border-soft)",
                borderRadius: "var(--ui-radius-lg)",
                fontSize: "10px",
                color: "var(--text-muted)",
                cursor: "pointer",
                outline: "none",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <option value="kie">KIE</option>
              <option value="fal">fal</option>
            </select>

            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              style={{
                flex: 1,
                padding: "4px 6px",
                background: "var(--ui-surface-field)",
                border: "1px solid var(--ui-border-soft)",
                borderRadius: "var(--ui-radius-lg)",
                fontSize: "10px",
                color: "var(--text-muted)",
                cursor: "pointer",
                outline: "none",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
          </div>

          {/* Aspect Ratio buttons */}
          <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }} onClick={(e) => e.stopPropagation()}>
            {QUICK_ASPECT_RATIOS.map((ratio) => (
              <button
                key={ratio.value}
                onClick={() => setSelectedAspectRatio(ratio.value)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "3px",
                  padding: "4px 8px",
                  borderRadius: "var(--ui-radius-lg)",
                  border: "1px solid var(--ui-border-soft)",
                  background: selectedAspectRatio === ratio.value ? "var(--accent)" : "var(--ui-surface-field)",
                  color: selectedAspectRatio === ratio.value ? "white" : "var(--text-muted)",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  fontSize: "9px",
                  fontWeight: 500,
                }}
              >
                <AspectRatioIconSvg type={ratio.icon} size={10} />
                {ratio.label}
              </button>
            ))}
          </div>

          {/* Generate button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleGenerate();
            }}
            disabled={isGenerating || !prompt.trim()}
            style={{
              width: "100%",
              padding: "8px",
              fontSize: "11px",
              fontWeight: 500,
              color: "white",
              background: isGenerating || !prompt.trim() ? "var(--text-muted)" : "var(--accent)",
              border: "none",
              borderRadius: "var(--ui-radius-lg)",
              cursor: isGenerating || !prompt.trim() ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "4px",
            }}
          >
            {isGenerating ? (
              <div style={{ width: "10px", height: "10px", border: "2px solid white", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
            ) : (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M5 1L8 8H2L5 1Z" fill="white" />
              </svg>
            )}
            {isGenerating ? `${elapsedTime}s` : "生成"}
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
