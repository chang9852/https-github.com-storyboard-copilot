import { useState, useMemo, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSettingsStore } from "@/stores/settingsStore";
import { useProjectStore } from "@/stores/projectStore";
import { PROVIDERS, getModelsByProvider, createGenerationTask, pollTaskResult } from "@/services/ai";
import { getImageModel, listModelProviders } from "@/features/canvas/models";
import type { AspectRatioOption, ResolutionOption } from "@/features/canvas/models";
import type { ProviderId } from "@/types/ai";

interface AINodePanelProps {
  cellId: string;
  onClose: () => void;
}

const FALLBACK_RESOLUTIONS: ResolutionOption[] = [
  { value: "1K", label: "1K" },
  { value: "2K", label: "2K" },
  { value: "4K", label: "4K" },
];

const FALLBACK_ASPECT_RATIOS: AspectRatioOption[] = [
  { value: "16:9", label: "16:9" },
  { value: "4:3", label: "4:3" },
  { value: "3:4", label: "3:4" },
  { value: "1:1", label: "1:1" },
  { value: "9:16", label: "9:16" },
  { value: "21:9", label: "21:9" },
];

export function AINodePanel({ cellId, onClose }: AINodePanelProps) {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language?.startsWith('zh');
  const { providerConfigs } = useSettingsStore();
  const { updateCell } = useProjectStore();

  const [provider, setProvider] = useState<ProviderId>("kie");
  const [model, setModel] = useState("kie/nano-banana-2");
  const [resolution, setResolution] = useState("1K");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const models = getModelsByProvider(provider);

  // Derive valid options from the selected model definition
  const modelDef = useMemo(() => getImageModel(model), [model]);
  const resolutions = modelDef?.resolutions?.length ? modelDef.resolutions : FALLBACK_RESOLUTIONS;
  const aspectRatios = modelDef?.aspectRatios?.length ? modelDef.aspectRatios : FALLBACK_ASPECT_RATIOS;

  // Auto-reset resolution & aspect ratio when model changes
  const prevModelRef = useRef(model);
  useEffect(() => {
    if (prevModelRef.current !== model) {
      prevModelRef.current = model;
      const validRes = modelDef?.resolutions?.length ? modelDef.resolutions : FALLBACK_RESOLUTIONS;
      const validAR = modelDef?.aspectRatios?.length ? modelDef.aspectRatios : FALLBACK_ASPECT_RATIOS;
      if (!validRes.some((r) => r.value === resolution)) {
        setResolution(modelDef?.defaultResolution ?? validRes[0]?.value ?? "1K");
      }
      if (!validAR.some((a) => a.value === aspectRatio)) {
        setAspectRatio(modelDef?.defaultAspectRatio ?? validAR[0]?.value ?? "1:1");
      }
    }
  }, [model]); // eslint-disable-line react-hooks/exhaustive-deps

  const getDimensions = () => {
    const resValue = resolution;
    const baseSize = { "0.5K": 512, "1K": 1024, "2K": 2048, "4K": 4096 }[resValue] ?? 1024;
    const arMap: Record<string, { w: number; h: number }> = {
      "1:1": { w: 1, h: 1 }, "16:9": { w: 16, h: 9 }, "9:16": { w: 9, h: 16 },
      "4:3": { w: 4, h: 3 }, "3:4": { w: 3, h: 4 }, "21:9": { w: 21, h: 9 },
      "2:3": { w: 2, h: 3 }, "3:2": { w: 3, h: 2 }, "5:4": { w: 5, h: 4 },
      "4:5": { w: 4, h: 5 }, "1:4": { w: 1, h: 4 }, "1:8": { w: 1, h: 8 },
      "4:1": { w: 4, h: 1 }, "8:1": { w: 8, h: 1 },
    };
    const ar = arMap[aspectRatio] ?? { w: 1, h: 1 };
    const ratio = ar.w / ar.h;
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
        aspectRatio,
        resolution,
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
          <span className="text-sm font-semibold">{t('ai.title', 'AI 生成图片')}</span>
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
          <label className="text-xs text-text-secondary mb-1.5 block">{t('ai.provider', '供应商')}</label>
          <select
            value={provider}
            onChange={(e) => {
              const newProvider = e.target.value as ProviderId;
              setProvider(newProvider);
              const newModels = getModelsByProvider(newProvider);
              if (newModels.length > 0) {
                setModel(newModels[0].id);
              }
            }}
            className="w-full px-3 py-2 text-xs bg-surface-tertiary border border-border rounded-lg outline-none focus:border-accent transition-colors"
          >
            {PROVIDERS.map((p) => {
              const providerDef = listModelProviders().find(pd => pd.id === p.id);
              const providerDisplay = isZh && providerDef?.labelZh ? providerDef.labelZh : p.name;
              return (
                <option key={p.id} value={p.id}>{providerDisplay}</option>
              );
            })}
          </select>
        </div>
        <div className="flex-1">
          <label className="text-xs text-text-secondary mb-1.5 block">{t('ai.model', '模型')}</label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-surface-tertiary border border-border rounded-lg outline-none focus:border-accent transition-colors"
          >
            {models.map((m) => {
              const mDef = getImageModel(m.id);
              const modelDisplay = isZh && mDef?.displayNameZh ? mDef.displayNameZh : m.name;
              return (
                <option key={m.id} value={m.id}>{modelDisplay}</option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Resolution */}
      <div className="flex items-center gap-3 mb-4">
        <label className="text-xs text-text-secondary shrink-0">{t('modelParams.quality', '画质')}</label>
        <div className="flex gap-1 bg-surface-tertiary rounded-lg p-1" style={{ gridTemplateColumns: `repeat(${resolutions.length}, 1fr)`, display: 'grid' }}>
          {resolutions.map((r) => {
            const active = resolution === r.value;
            return (
              <button
                key={r.value}
                onClick={() => setResolution(r.value)}
                className={`px-3 py-1.5 text-xs rounded-md transition-all ${
                  active
                    ? "bg-accent text-white shadow-sm"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {r.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Aspect ratio */}
      <div className="flex items-center gap-3 mb-4">
        <label className="text-xs text-text-secondary shrink-0">{t('modelParams.aspectRatio', '比例')}</label>
        <div className="flex flex-wrap gap-1 bg-surface-tertiary rounded-lg p-1">
          {aspectRatios.map((ar) => {
            const active = aspectRatio === ar.value;
            return (
              <button
                key={ar.value}
                onClick={() => setAspectRatio(ar.value)}
                className={`px-2.5 py-1.5 text-xs rounded-md transition-all ${
                  active
                    ? "bg-accent text-white shadow-sm"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {ar.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Prompt */}
      <div className="mb-3">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={t('ai.prompt', '输入 AI 提示词...')}
          className="w-full h-16 px-3 py-2 text-xs bg-surface-tertiary border border-border rounded-lg outline-none resize-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-all"
        />
      </div>

      {/* Negative prompt */}
      <div className="mb-4">
        <input
          type="text"
          value={negativePrompt}
          onChange={(e) => setNegativePrompt(e.target.value)}
          placeholder={t('ai.negative_prompt', '负面提示词（可选）…')}
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
            {t('ai.generate', '生成图片')}
          </>
        )}
      </button>

      {/* Dimensions preview */}
      <div className="mt-3 text-center text-xs text-text-muted">
        {t('ai.outputSize', '输出尺寸')}: {getDimensions().width} x {getDimensions().height}
      </div>
    </div>
  );
}
