import { memo, useMemo, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { SlidersHorizontal } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PROVIDERS, getModelsByProvider } from '@/services/ai';
import { getImageModel, listModelProviders } from '@/features/canvas/models';
import type { ProviderId } from '@/types/ai';
import type { AspectRatioOption, ResolutionOption } from '@/features/canvas/models';
import { NODE_CONTROL_CHIP_CLASS, NODE_CONTROL_ICON_CLASS } from './nodeControlStyles';

export type { AspectRatioOption, ResolutionOption };

interface ModelParamsControlsProps {
  selectedProvider: ProviderId;
  selectedModelId: string;
  selectedResolution: string;
  selectedAspectRatio: string;
  onProviderChange: (providerId: ProviderId) => void;
  onModelChange: (modelId: string) => void;
  onResolutionChange: (resolution: string) => void;
  onAspectRatioChange: (aspectRatio: string) => void;
}

const FALLBACK_RESOLUTIONS: ResolutionOption[] = [
  { value: '0.5K', label: '0.5K' },
  { value: '1K', label: '1K' },
  { value: '2K', label: '2K' },
  { value: '4K', label: '4K' },
];

const FALLBACK_ASPECT_RATIOS: AspectRatioOption[] = [
  { value: '1:1', label: '1:1' },
  { value: '16:9', label: '16:9' },
  { value: '9:16', label: '9:16' },
  { value: '4:3', label: '4:3' },
  { value: '3:4', label: '3:4' },
  { value: '21:9', label: '21:9' },
];

/**
 * Get the resolution & aspect ratio options that are valid for the currently
 * selected model, falling back to a generous default when no model is matched.
 */
function useModelOptions(modelId: string) {
  return useMemo(() => {
    const model = getImageModel(modelId);
    const resolutions = model?.resolutions?.length ? model.resolutions : FALLBACK_RESOLUTIONS;
    const aspectRatios = model?.aspectRatios?.length ? model.aspectRatios : FALLBACK_ASPECT_RATIOS;
    const defaultResolution = model?.defaultResolution ?? resolutions[0]?.value ?? '1K';
    const defaultAspectRatio = model?.defaultAspectRatio ?? aspectRatios[0]?.value ?? '1:1';
    return { resolutions, aspectRatios, defaultResolution, defaultAspectRatio };
  }, [modelId]);
}

export const ModelParamsControls = memo(({
  selectedProvider,
  selectedModelId,
  selectedResolution,
  selectedAspectRatio,
  onProviderChange,
  onModelChange,
  onResolutionChange,
  onAspectRatioChange,
}: ModelParamsControlsProps) => {
  const { t } = useTranslation();
  const { i18n } = useTranslation();
  const isZh = i18n.language?.startsWith('zh');
  const containerRef = useRef<HTMLDivElement>(null);
  const modelPanelRef = useRef<HTMLDivElement>(null);
  const paramsPanelRef = useRef<HTMLDivElement>(null);
  const [openPanel, setOpenPanel] = useState<'model' | 'params' | null>(null);

  const providerDefs = useMemo(() => listModelProviders(), []);
  const currentModels = useMemo(() => getModelsByProvider(selectedProvider), [selectedProvider]);
  const selectedModel = useMemo(
    () => currentModels.find((m) => m.id === selectedModelId) ?? currentModels[0],
    [currentModels, selectedModelId]
  );
  const selectedModelDef = useMemo(() => getImageModel(selectedModelId), [selectedModelId]);
  const selectedModelDisplay = useMemo(() => {
    if (isZh && selectedModelDef?.displayNameZh) return selectedModelDef.displayNameZh;
    return selectedModel?.name ?? 'Model';
  }, [selectedModel, selectedModelDef, isZh]);
  const providerLabel = useMemo(() => {
    const p = providerDefs.find((p) => p.id === selectedProvider);
    return p ? (isZh && p.labelZh ? p.labelZh : p.label) : selectedProvider;
  }, [selectedProvider, providerDefs, isZh]);

  const { resolutions, aspectRatios } = useModelOptions(selectedModelId);

  const selectedRatioLabel = aspectRatios.find((r) => r.value === selectedAspectRatio)?.label ?? selectedAspectRatio;
  const selectedResLabel = resolutions.find((r) => r.value === selectedResolution)?.label ?? selectedResolution;

  // Auto-reset resolution & aspect ratio when the selected model changes
  // so the user never sees an invalid combination.
  const prevModelIdRef = useRef(selectedModelId);
  useEffect(() => {
    if (prevModelIdRef.current !== selectedModelId) {
      prevModelIdRef.current = selectedModelId;

      const model = getImageModel(selectedModelId);
      const validResolutions = model?.resolutions?.length ? model.resolutions : FALLBACK_RESOLUTIONS;
      const validAspectRatios = model?.aspectRatios?.length ? model.aspectRatios : FALLBACK_ASPECT_RATIOS;

      // Reset resolution if the current one is not available for this model
      if (!validResolutions.some((r) => r.value === selectedResolution)) {
        onResolutionChange(model?.defaultResolution ?? validResolutions[0]?.value ?? '1K');
      }
      // Reset aspect ratio if the current one is not available for this model
      if (!validAspectRatios.some((r) => r.value === selectedAspectRatio)) {
        onAspectRatioChange(model?.defaultAspectRatio ?? validAspectRatios[0]?.value ?? '1:1');
      }
    }
  }, [selectedModelId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      const target = event.target as globalThis.Node;
      if (containerRef.current?.contains(target)) return;
      if (modelPanelRef.current?.contains(target)) return;
      if (paramsPanelRef.current?.contains(target)) return;
      setOpenPanel(null);
    };
    document.addEventListener('mousedown', handleOutside, true);
    return () => document.removeEventListener('mousedown', handleOutside, true);
  }, []);

  return (
    <div ref={containerRef} className="flex items-center gap-1">
      {/* Model selector */}
      <div className="relative">
        <button
          className={`${NODE_CONTROL_CHIP_CLASS} flex items-center gap-1 bg-[var(--ui-surface-field)] border border-[var(--ui-border-soft)] text-[var(--text)] hover:border-[var(--ui-border-strong)] transition-colors`}
          onClick={(e) => {
            e.stopPropagation();
            setOpenPanel(openPanel === 'model' ? null : 'model');
          }}
        >
          <span className="text-[11px] font-medium text-[var(--text)]">{selectedModelDisplay}</span>
          <span className="text-[10px] text-[var(--text-muted)]">{providerLabel}</span>
        </button>

        {openPanel === 'model' && createPortal(
          <div
            ref={modelPanelRef}
            className="fixed z-[80] min-w-[320px] rounded-xl border border-[var(--ui-border-soft)] bg-[var(--ui-surface-panel)] p-3 shadow-2xl backdrop-blur-sm"
            style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
          >
            {/* Providers */}
            <div className="mb-3">
              <div className="mb-2 text-xs font-medium text-[var(--text-muted)]">{t('modelParams.provider', 'Provider')}</div>
              <div className="flex flex-wrap gap-2">
                {PROVIDERS.map((provider) => {
                  const active = provider.id === selectedProvider;
                  const providerDef = providerDefs.find((p) => p.id === provider.id);
                  const providerDisplay = isZh && providerDef?.labelZh ? providerDef.labelZh : provider.name;
                  return (
                    <button
                      key={provider.id}
                      className={`rounded-lg border px-3 py-2 text-xs transition-colors ${
                        active
                          ? 'border-accent/50 bg-accent/15 text-[var(--text)]'
                          : 'border-[var(--ui-border-soft)] bg-[var(--ui-surface-field)] text-[var(--text-muted)] hover:border-[var(--ui-border-strong)]'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onProviderChange(provider.id as ProviderId);
                        const models = getModelsByProvider(provider.id as ProviderId);
                        if (models.length > 0) onModelChange(models[0].id);
                      }}
                    >
                      {providerDisplay}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Models */}
            <div>
              <div className="mb-2 text-xs font-medium text-[var(--text-muted)]">{t('modelParams.model', 'Model')}</div>
              <div className="flex flex-wrap gap-2">
                {currentModels.map((model) => {
                  const active = model.id === selectedModelId;
                  const modelDef = getImageModel(model.id);
                  const modelDisplay = isZh && modelDef?.displayNameZh ? modelDef.displayNameZh : model.name;
                  return (
                    <button
                      key={model.id}
                      className={`rounded-lg border px-3 py-2 text-xs transition-colors ${
                        active
                          ? 'border-accent/50 bg-accent/15 text-[var(--text)]'
                          : 'border-[var(--ui-border-soft)] bg-[var(--ui-surface-field)] text-[var(--text-muted)] hover:border-[var(--ui-border-strong)]'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onModelChange(model.id);
                        setOpenPanel(null);
                      }}
                    >
                      {modelDisplay}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>

      {/* Params selector */}
      <div className="relative">
        <button
          className={`${NODE_CONTROL_CHIP_CLASS} flex items-center gap-1 bg-[var(--ui-surface-field)] border border-[var(--ui-border-soft)] text-[var(--text)] hover:border-[var(--ui-border-strong)] transition-colors`}
          onClick={(e) => {
            e.stopPropagation();
            setOpenPanel(openPanel === 'params' ? null : 'params');
          }}
        >
          <SlidersHorizontal className={NODE_CONTROL_ICON_CLASS} />
          <span className="text-[11px] text-[var(--text)]">{selectedRatioLabel}</span>
          <span className="text-[10px] text-[var(--text-muted)]">· {selectedResLabel}</span>
        </button>

        {openPanel === 'params' && createPortal(
          <div
            ref={paramsPanelRef}
            className="fixed z-[80] min-w-[320px] rounded-xl border border-[var(--ui-border-soft)] bg-[var(--ui-surface-panel)] p-3 shadow-2xl backdrop-blur-sm"
            style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
          >
            {/* Resolution */}
            <div className="mb-3">
              <div className="mb-2 text-xs text-[var(--text-muted)]">{t('modelParams.quality', 'Quality')}</div>
              <div className="grid gap-1 rounded-xl border border-[var(--ui-border-soft)] bg-[var(--ui-surface-field)] p-1" style={{ gridTemplateColumns: `repeat(${Math.min(resolutions.length, 4)}, 1fr)` }}>
                {resolutions.map((item) => {
                  const active = item.value === selectedResolution;
                  return (
                    <button
                      key={item.value}
                      className={`h-8 rounded-lg text-sm transition-colors ${
                        active ? 'bg-[var(--surface)] text-[var(--text)] shadow-sm' : 'text-[var(--text-muted)] hover:bg-[var(--surface)]'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onResolutionChange(item.value);
                      }}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Aspect Ratio */}
            <div>
              <div className="mb-2 text-xs text-[var(--text-muted)]">{t('modelParams.aspectRatio', 'Aspect Ratio')}</div>
              <div className="grid gap-1 rounded-xl border border-[var(--ui-border-soft)] bg-[var(--ui-surface-field)] p-1" style={{ gridTemplateColumns: `repeat(${Math.min(aspectRatios.length, 5)}, 1fr)` }}>
                {aspectRatios.map((item) => {
                  const active = item.value === selectedAspectRatio;
                  return (
                    <button
                      key={item.value}
                      className={`rounded-lg px-1 py-1.5 transition-colors ${
                        active ? 'bg-[var(--surface)] text-[var(--text)] shadow-sm' : 'text-[var(--text-muted)] hover:bg-[var(--surface)]'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onAspectRatioChange(item.value);
                      }}
                    >
                      <div className="text-[10px] text-center">{item.label}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    </div>
  );
});

ModelParamsControls.displayName = 'ModelParamsControls';
