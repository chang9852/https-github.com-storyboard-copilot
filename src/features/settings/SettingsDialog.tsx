import { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '@/stores/settingsStore';
import { UI_CONTENT_OVERLAY_INSET_CLASS, UI_DIALOG_TRANSITION_MS } from '@/components/ui/motion';
import { useDialogTransition } from '@/components/ui/useDialogTransition';
import { useSettingsDraft } from '@/features/settings/useSettingsDraft';
import { ProviderGuidePopover } from '@/features/settings/ProviderGuidePopover';
import { GenerationTab } from '@/features/settings/tabs/GenerationTab';
import { ProvidersTab } from '@/features/settings/tabs/ProvidersTab';
import { AppearanceTab } from '@/features/settings/tabs/AppearanceTab';
import { PricingTab } from '@/features/settings/tabs/PricingTab';
import { AboutTab } from '@/features/settings/tabs/AboutTab';
import type { SettingsCategory } from '@/features/settings/settingsEvents';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  initialCategory?: SettingsCategory;
  onCheckUpdate?: () => Promise<'has-update' | 'up-to-date' | 'failed'>;
}

const CATEGORY_KEYS: SettingsCategory[] = [
  'generation',
  'providers',
  'appearance',
  'pricing',
  'about',
];

export function SettingsDialog({
  isOpen,
  onClose,
  initialCategory = 'generation',
  onCheckUpdate,
}: SettingsDialogProps) {
  const { t } = useTranslation();
  const hideProviderGuidePopover = useSettingsStore((s) => s.hideProviderGuidePopover);
  const { draft, updateDraft, commitDraft } = useSettingsDraft(isOpen);
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>(initialCategory);
  const { shouldRender, isVisible } = useDialogTransition(isOpen, UI_DIALOG_TRANSITION_MS);

  useEffect(() => {
    if (isOpen) {
      setActiveCategory(initialCategory);
    }
  }, [initialCategory, isOpen]);

  const handleSave = useCallback(() => {
    commitDraft();
    onClose();
  }, [commitDraft, onClose]);

  if (!shouldRender) return null;

  return (
    <div className={`fixed ${UI_CONTENT_OVERLAY_INSET_CLASS} z-50 flex items-center justify-center`}>
      <div
        className={`absolute inset-0 bg-black/90 transition-opacity duration-200 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      <div className="relative w-[min(96vw,1120px)]">
        <div
          className={`relative mx-auto h-[500px] w-[700px] overflow-hidden rounded-lg border border-border-dark bg-surface-dark shadow-xl transition-opacity duration-200 ${isVisible ? 'opacity-100' : 'opacity-0'} flex`}
        >
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1 hover:bg-bg-dark rounded transition-colors z-10"
          >
            <X className="w-5 h-5 text-text-muted" />
          </button>

          <div className="w-[180px] bg-bg-dark border-r border-border-dark flex flex-col">
            <div className="px-4 py-4">
              <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
                {t('settings.title')}
              </span>
            </div>
            <nav className="flex-1">
              {CATEGORY_KEYS.map((key) => (
                <button
                  key={key}
                  onClick={() => setActiveCategory(key)}
                  className={`
                    w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors
                    ${activeCategory === key
                      ? 'bg-accent/10 text-text-dark border-l-2 border-accent'
                      : 'text-text-muted hover:bg-bg-dark hover:text-text-dark'
                    }
                  `}
                >
                  <span className="text-sm">{t(`settings.${key}`)}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="flex-1 flex flex-col">
            {activeCategory === 'generation' && (
              <GenerationTab draft={draft} onDraftChange={updateDraft} onSave={handleSave} />
            )}
            {activeCategory === 'providers' && (
              <ProvidersTab draft={draft} onDraftChange={updateDraft} onSave={handleSave} />
            )}
            {activeCategory === 'appearance' && (
              <AppearanceTab draft={draft} onDraftChange={updateDraft} onSave={handleSave} />
            )}
            {activeCategory === 'pricing' && (
              <PricingTab draft={draft} onDraftChange={updateDraft} onSave={handleSave} />
            )}
            {activeCategory === 'about' && (
              <AboutTab draft={draft} onDraftChange={updateDraft} onSave={handleSave} onClose={onClose} onCheckUpdate={onCheckUpdate} />
            )}
          </div>
        </div>
        {activeCategory === 'providers' && !hideProviderGuidePopover && (
          <ProviderGuidePopover isVisible={isVisible} />
        )}
      </div>
    </div>
  );
}