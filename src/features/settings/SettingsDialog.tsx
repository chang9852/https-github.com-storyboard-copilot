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
import { SETTINGS_PANEL_CLASS } from '@/features/settings/settingsStyles';
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
          className={`relative mx-auto flex h-[500px] w-[700px] overflow-hidden rounded-lg border transition-opacity duration-200 ${SETTINGS_PANEL_CLASS} ${isVisible ? 'opacity-100' : 'opacity-0'}`}
        >
          <button
            onClick={onClose}
            className="absolute right-3 top-3 z-10 rounded p-1 transition-colors hover:bg-[var(--ui-surface-field)]"
          >
            <X className="w-5 h-5 text-text-muted" />
          </button>

          <div className="flex w-[180px] flex-col border-r border-[var(--ui-border-soft)] bg-[var(--ui-surface-field)]">
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
                      ? 'border-l-2 border-accent bg-accent/10 text-text-dark'
                      : 'text-text-muted hover:bg-[var(--ui-glass-bg-hover)] hover:text-text-dark'
                    }
                  `}
                >
                  <span className="text-sm">{t(`settings.sections.${key}`)}</span>
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
