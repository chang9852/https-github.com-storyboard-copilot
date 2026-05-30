import { memo, useMemo, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { SlidersHorizontal } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PROVIDERS, getModelsByProvider } from '@/services/ai';
import type { ProviderId } from '@/types/ai';
import { NODE_CONTROL_CHIP_CLASS, NODE_CONTROL_ICON_CLASS } from './nodeControlStyles';

export interface AspectRatioOption {
  value: string;
  label: string;
}

export interface ResolutionOption {
  value: string;
  label: string;
}

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

const DEFAULT_RESOLUTIONS: ResolutionOption[] = [
  { value: '0.5K', label: '0.5K' },
  { value: '1K', label: '1K' },
  { value: '2K', label: '2K' },
  { value: '4K', label: '4K' },
];

const DEFAULT_ASPECT_RATIOS: AspectRatioOption[] = [
  { value: '1:1', label: '1:1' },
  { value: '16:9', label: '16:9' },
  { value: '9:16', label: '9:16' },
  { value: '4:3', label: '4:3' },
  { value: '3:4', label: '3:4' },
  { value: '21:9', label: '21:9' },
];

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
  const containerRef = useRef<HTMLDivElement>(null);
  const [openPanel, setOpenPanel] = useState<'model' | 'params' | null>(null);

  const currentModels = useMemo(() => getModelsByProvider(selectedProvider), [selectedProvider]);
  const selectedModel = useMemo(
    () => currentModels.find((m) => m.id === selectedModelId) ?? currentModels[0],
    [currentModels, selectedModelId]
  );
  const providerLabel = useMemo(
    () => PROVIDERS.find((p) => p.id === selectedProvider)?.name ?? selectedProvider,
    [selectedProvider]
  );

  const selectedRatioLabel = DEFAULT_ASPECT_RATIOS.find((r) => r.value === selectedAspectRatio)?.label ?? selectedAspectRatio;
  const selectedResLabel = DEFAULT_RESOLUTIONS.find((r) => r.value === selectedResolution)?.label ?? selectedResolution;

  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      const target = event.target as globalThis.Node;
      if (containerRef.current?.contains(target)) return;
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
          className={`${NODE_CONTROL_CHIP_CLASS} flex items-center gap-1 bg-surface-dark/80 border border-[rgba(255,255,255,0.1)] text-white/70 hover:text-white hover:border-[rgba(255,255,255,0.2)] transition-colors`}
          onClick={(e) => {
            e.stopPropagation();
            setOpenPanel(openPanel === 'model' ? null : 'model');
          }}
        >
          <span className="text-[11px] font-medium">{selectedModel?.name ?? 'Model'}</span>
          <span className="text-[10px] text-white/40">{providerLabel}</span>
        </button>

        {openPanel === 'model' && createPortal(
          <div
            className="fixed z-[80] min-w-[320px] rounded-xl border border-[rgba(255,255,255,0.1)] bg-[rgba(17,17,24,0.95)] p-3 shadow-2xl backdrop-blur-sm"
            style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
          >
            {/* Providers */}
            <div className="mb-3">
              <div className="mb-2 text-xs font-medium text-white/50">{t('modelParams.provider', 'Provider')}</div>
              <div className="flex flex-wrap gap-2">
                {PROVIDERS.map((provider) => {
                  const active = provider.id === selectedProvider;
                  return (
                    <button
                      key={provider.id}
                      className={`rounded-lg border px-3 py-2 text-xs transition-colors ${
                        active
                          ? 'border-accent/50 bg-accent/15 text-white'
                          : 'border-[rgba(255,255,255,0.1)] bg-white/5 text-white/50 hover:border-[rgba(255,255,255,0.2)]'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onProviderChange(provider.id as ProviderId);
                        const models = getModelsByProvider(provider.id as ProviderId);
                        if (models.length > 0) onModelChange(models[0].id);
                      }}
                    >
                      {provider.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Models */}
            <div>
              <div className="mb-2 text-xs font-medium text-white/50">{t('modelParams.model', 'Model')}</div>
              <div className="flex flex-wrap gap-2">
                {currentModels.map((model) => {
                  const active = model.id === selectedModelId;
                  return (
                    <button
                      key={model.id}
                      className={`rounded-lg border px-3 py-2 text-xs transition-colors ${
                        active
                          ? 'border-accent/50 bg-accent/15 text-white'
                          : 'border-[rgba(255,255,255,0.1)] bg-white/5 text-white/50 hover:border-[rgba(255,255,255,0.2)]'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onModelChange(model.id);
                        setOpenPanel(null);
                      }}
                    >
                      {model.name}
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
          className={`${NODE_CONTROL_CHIP_CLASS} flex items-center gap-1 bg-surface-dark/80 border border-[rgba(255,255,255,0.1)] text-white/70 hover:text-white hover:border-[rgba(255,255,255,0.2)] transition-colors`}
          onClick={(e) => {
            e.stopPropagation();
            setOpenPanel(openPanel === 'params' ? null : 'params');
          }}
        >
          <SlidersHorizontal className={NODE_CONTROL_ICON_CLASS} />
          <span className="text-[11px]">{selectedRatioLabel}</span>
          <span className="text-[10px] text-white/40">· {selectedResLabel}</span>
        </button>

        {openPanel === 'params' && createPortal(
          <div
            className="fixed z-[80] min-w-[320px] rounded-xl border border-[rgba(255,255,255,0.1)] bg-[rgba(17,17,24,0.95)] p-3 shadow-2xl backdrop-blur-sm"
            style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
          >
            {/* Resolution */}
            <div className="mb-3">
              <div className="mb-2 text-xs text-white/50">{t('modelParams.quality', 'Quality')}</div>
              <div className="grid grid-cols-4 gap-1 rounded-xl border border-[rgba(255,255,255,0.1)] bg-white/5 p-1">
                {DEFAULT_RESOLUTIONS.map((item) => {
                  const active = item.value === selectedResolution;
                  return (
                    <button
                      key={item.value}
                      className={`h-8 rounded-lg text-sm transition-colors ${
                        active ? 'bg-surface-dark text-white' : 'text-white/50 hover:bg-white/10'
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
              <div className="mb-2 text-xs text-white/50">{t('modelParams.aspectRatio', 'Aspect Ratio')}</div>
              <div className="grid grid-cols-5 gap-1 rounded-xl border border-[rgba(255,255,255,0.1)] bg-white/5 p-1">
                {DEFAULT_ASPECT_RATIOS.map((item) => {
                  const active = item.value === selectedAspectRatio;
                  return (
                    <button
                      key={item.value}
                      className={`rounded-lg px-1 py-1.5 transition-colors ${
                        active ? 'bg-surface-dark text-white' : 'text-white/50 hover:bg-white/10'
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
