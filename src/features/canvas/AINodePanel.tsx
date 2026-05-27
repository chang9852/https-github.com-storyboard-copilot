import { useState } from "react";
import { useSettingsStore } from "@/stores/settingsStore";
import { useProjectStore } from "@/stores/projectStore";
import { PROVIDERS, getModelsByProvider, createGenerationTask, pollTaskResult } from "@/services/ai";
import type { ProviderId } from "@/types/ai";

interface AINodePanelProps {
  cellId: string;
  onClose: () => void;
}

type Resolution = "1K" | "2K" | "4K";
type AspectRatio = "16:9" | "4:3" | "3:4" | "1:1";

const RESOLUTIONS: { value: Resolution; label: string; size: number }[] = [
  { value: "1K", label: "1K", size: 1024 },
  { value: "2K", label: "2K", size: 2048 },
  { value: "4K", label: "4K", size: 4096 },
];

const ASPECT_RATIOS: { value: AspectRatio; label: string; widthRatio: number; heightRatio: number }[] = [
  { value: "16:9", label: "16:9", widthRatio: 16, heightRatio: 9 },
  { value: "4:3", label: "4:3", widthRatio: 4, heightRatio: 3 },
  { value: "3:4", label: "3:4", widthRatio: 3, heightRatio: 4 },
  { value: "1:1", label: "1:1", widthRatio: 1, heightRatio: 1 },
];

export function AINodePanel({ cellId, onClose }: AINodePanelProps) {
  const { providerConfigs } = useSettingsStore();
  const { updateCell } = useProjectStore();

  const [provider, setProvider] = useState<ProviderId>("kie");
  const [model, setModel] = useState("nano-banana-pro");
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [resolution, setResolution] = useState<Resolution>("2K");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("16:9");
  const [isGenerating, setIsGenerating] = useState(false);

  const models = getModelsByProvider(provider);

  const getDimensions = () => {
    const res = RESOLUTIONS.find((r) => r.value === resolution);
    const ar = ASPECT_RATIOS.find((a) => a.value === aspectRatio);
    if (!res || !ar) return { width: 2048, height: 1152 };

    const baseSize = res.size;
    const ratio = ar.widthRatio / ar.heightRatio;
    let width = baseSize;
    let height = baseSize / ratio;

    if (height > baseSize) {
      height = baseSize;
      width = baseSize * ratio;
    }

    return { width: Math.round(width), height: Math.round(height) };
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    const apiKey = providerConfigs[provider]?.apiKey;
    if (!apiKey) {
      alert("请先配置 API Key");
      return;
    }

    setIsGenerating(true);
    updateCell(cellId, { status: "generating", prompt, aiProvider: provider, aiModel: model, resolution, aspectRatio });

    const dims = getDimensions();

    try {
      const result = await createGenerationTask({
        provider,
        model,
        prompt,
        negativePrompt: negativePrompt || undefined,
        width: dims.width,
        height: dims.height,
      });

      if (result.status === "completed" && result.task_id) {
        updateCell(cellId, { status: "completed" });
      } else if (result.task_id) {
        const pollResult = await pollTaskResult(provider, result.task_id);
        if (pollResult.images.length > 0) {
          updateCell(cellId, { status: "completed", imageUrl: pollResult.images[0].url });
        } else {
          updateCell(cellId, { status: "error" });
        }
      }
    } catch (err) {
      console.error("Generation failed:", err);
      updateCell(cellId, { status: "error" });
    } finally {
      setIsGenerating(false);
    }

    onClose();
  };

  return (
    <div className="absolute bottom-full left-0 mb-2 w-[380px] bg-surface-primary border border-border rounded-xl p-4 shadow-xl" style={{ boxShadow: "0 12px 40px rgba(0,0,0,0.25), 0 4px 12px rgba(0,0,0,0.15)" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-accent to-blue-600 flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
              <path d="M7 1L12 10H2L7 1Z" fill="white" />
              <circle cx="7" cy="7" r="2" fill="#3b82f6" />
            </svg>
          </div>
          <span className="text-sm font-semibold">AI 生成图片</span>
        </div>
        <button
          onClick={onClose}
          className="w-6 h-6 rounded-lg bg-surface-tertiary hover:bg-danger/20 hover:text-danger flex items-center justify-center transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 3l6 6M9 3l-6 6" strokeLinecap="round" /></svg>
        </button>
      </div>

      {/* Model selector */}
      <div className="flex gap-3 mb-4">
        <div className="flex-1">
          <label className="text-xs text-text-secondary mb-1.5 block">模型</label>
          <select
            value={provider}
            onChange={(e) => { setProvider(e.target.value as ProviderId); setModel(""); }}
            className="w-full px-3 py-2 text-xs bg-surface-tertiary border border-border rounded-lg outline-none focus:border-accent transition-colors"
          >
            {PROVIDERS.filter((p) => providerConfigs[p.id]?.enabled).map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="text-xs text-text-secondary mb-1.5 block">模型名称</label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-surface-tertiary border border-border rounded-lg outline-none focus:border-accent transition-colors"
          >
            {models.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Resolution */}
      <div className="flex items-center gap-3 mb-4">
        <label className="text-xs text-text-secondary">分辨率</label>
        <div className="flex gap-1 bg-surface-tertiary rounded-lg p-1">
          {RESOLUTIONS.map((r) => (
            <button
              key={r.value}
              onClick={() => setResolution(r.value)}
              className={`px-3 py-1.5 text-xs rounded-md transition-all ${
                resolution === r.value
                  ? "bg-accent text-white shadow-sm"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Aspect ratio */}
      <div className="flex items-center gap-3 mb-4">
        <label className="text-xs text-text-secondary">尺寸比例</label>
        <div className="flex gap-1 bg-surface-tertiary rounded-lg p-1">
          {ASPECT_RATIOS.map((ar) => (
            <button
              key={ar.value}
              onClick={() => setAspectRatio(ar.value)}
              className={`px-3 py-1.5 text-xs rounded-md transition-all ${
                aspectRatio === ar.value
                  ? "bg-accent text-white shadow-sm"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {ar.label}
            </button>
          ))}
        </div>
      </div>

      {/* Prompt */}
      <div className="mb-3">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="输入 AI 提示词..."
          className="w-full h-16 px-3 py-2 text-xs bg-surface-tertiary border border-border rounded-lg outline-none resize-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-all"
        />
      </div>

      {/* Negative prompt */}
      <div className="mb-4">
        <input
          type="text"
          value={negativePrompt}
          onChange={(e) => setNegativePrompt(e.target.value)}
          placeholder="负面提示词（可选）..."
          className="w-full px-3 py-2 text-xs bg-surface-tertiary border border-border rounded-lg outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-all"
        />
      </div>

      {/* Generate button */}
      <button
        onClick={handleGenerate}
        disabled={isGenerating || !prompt.trim()}
        className="w-full py-2.5 text-sm font-semibold text-white rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          background: isGenerating || !prompt.trim() ? "#666" : "linear-gradient(135deg, #3b82f6, #2563eb)",
          boxShadow: isGenerating || !prompt.trim() ? "none" : "0 4px 12px rgba(59, 130, 246, 0.35)",
        }}
      >
        {isGenerating ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            生成中...
          </>
        ) : (
          <>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M7 2L12 12L2 12L7 2Z" fill="currentColor" /></svg>
            生成图片
          </>
        )}
      </button>

      {/* Dimensions preview */}
      <div className="mt-3 text-center text-xs text-text-muted">
        输出尺寸: {getDimensions().width} x {getDimensions().height}
      </div>
    </div>
  );
}
