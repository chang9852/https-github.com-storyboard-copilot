import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useProjectStore } from "@/stores/projectStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { Button, Select } from "@/components/ui";
import { PROVIDERS, getModelsByProvider, createGenerationTask, pollTaskResult } from "@/services/ai";
import type { ProviderId } from "@/types/ai";

export function AIPanel() {
  const { t } = useTranslation();
  const { currentProject, selectedCellId, updateCell } = useProjectStore();
  const { providerConfigs } = useSettingsStore();

  const [provider, setProvider] = useState<ProviderId>("kie");
  const [model, setModel] = useState("");
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [generating, setGenerating] = useState(false);

  const selectedCell = currentProject?.cells.find((c) => c.id === selectedCellId);
  const models = getModelsByProvider(provider);

  const handleGenerate = async () => {
    if (!selectedCell || !prompt.trim() || !model) return;

    const apiKey = providerConfigs[provider]?.apiKey;
    if (!apiKey) {
      alert(t("ai.no_api_key"));
      return;
    }

    setGenerating(true);
    updateCell(selectedCell.id, { status: "generating", prompt, aiProvider: provider, aiModel: model });

    try {
      const result = await createGenerationTask({
        provider,
        model,
        prompt,
        negativePrompt: negativePrompt || undefined,
        width: 1024,
        height: 1024,
      });

      if (result.status === "completed" && result.task_id) {
        // fal returns completed immediately
        updateCell(selectedCell.id, { status: "completed" });
      } else if (result.task_id) {
        // KIE is async — poll for result
        const pollResult = await pollTaskResult(provider, result.task_id);
        if (pollResult.images.length > 0) {
          updateCell(selectedCell.id, { status: "completed", imageUrl: pollResult.images[0].url });
        } else {
          updateCell(selectedCell.id, { status: "error" });
        }
      }
    } catch (err) {
      console.error("Generation failed:", err);
      updateCell(selectedCell.id, { status: "error" });
    } finally {
      setGenerating(false);
    }
  };

  const handlePromptChange = (value: string) => {
    setPrompt(value);
    if (selectedCell) {
      updateCell(selectedCell.id, { prompt: value });
    }
  };

  return (
    <div className="h-full flex flex-col border-t border-border bg-surface-secondary">
      {/* Header */}
      <div className="px-3 py-2 border-b border-border">
        <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
          {t("ai.title")}
        </h3>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-3 space-y-3">
        {/* Provider */}
        <Select
          label={t("ai.provider")}
          value={provider}
          onChange={(e) => {
            setProvider(e.target.value as ProviderId);
            setModel("");
          }}
          options={PROVIDERS.filter((p) => providerConfigs[p.id]?.enabled).map((p) => ({
            value: p.id,
            label: p.name,
          }))}
        />

        {/* Model */}
        <Select
          label={t("ai.model")}
          value={model}
          onChange={(e) => setModel(e.target.value)}
          placeholder="Select model..."
          options={models.map((m) => ({
            value: m.id,
            label: m.name,
          }))}
        />

        {/* Prompt */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-text-secondary">{t("ai.prompt")}</label>
          <textarea
            className="px-3 py-2 rounded text-sm bg-surface-primary text-text-primary border border-border outline-none focus:border-accent resize-none"
            rows={3}
            placeholder={t("canvas.cell.add_prompt")}
            value={prompt}
            onChange={(e) => handlePromptChange(e.target.value)}
          />
        </div>

        {/* Negative Prompt */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-text-secondary">{t("ai.negative_prompt")}</label>
          <textarea
            className="px-3 py-2 rounded text-sm bg-surface-primary text-text-primary border border-border outline-none focus:border-accent resize-none"
            rows={2}
            placeholder="Things to avoid..."
            value={negativePrompt}
            onChange={(e) => setNegativePrompt(e.target.value)}
          />
        </div>

        {/* Grid Layout */}
        <Select
          label={t("ai.grid_layout")}
          value="3x3"
          options={[
            { value: "2x2", label: t("ai.grid_2x2") },
            { value: "3x3", label: t("ai.grid_3x3") },
          ]}
        />
      </div>

      {/* Footer / Generate Button */}
      <div className="p-3 border-t border-border">
        <Button
          variant="primary"
          className="w-full"
          onClick={handleGenerate}
          disabled={!selectedCell || !prompt.trim() || generating || !model}
        >
          {generating ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              {t("ai.generating")}
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 2L12 12L2 12L7 2Z" fill="currentColor" />
              </svg>
              {t("ai.generate")}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
