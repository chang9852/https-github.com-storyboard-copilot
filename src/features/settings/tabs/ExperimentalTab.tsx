import { useTranslation } from 'react-i18next';
import { SettingsCheckboxCard } from '../SettingsCheckboxCard';
import type { SettingsDraft } from '../useSettingsDraft';

interface ExperimentalTabProps {
  draft: SettingsDraft;
  onDraftChange: <K extends keyof SettingsDraft>(key: K, value: SettingsDraft[K]) => void;
  onSave: () => void;
}

export function ExperimentalTab({ draft, onDraftChange, onSave }: ExperimentalTabProps) {
  const { t } = useTranslation();

  return (
    <>
      <div className="px-6 py-5 border-b border-border-dark">
        <h2 className="text-lg font-semibold text-text-dark">{t('settings.experimental')}</h2>
        <p className="text-sm text-text-muted mt-1">{t('settings.experimentalDesc')}</p>
      </div>

      <div className="ui-scrollbar flex-1 space-y-4 overflow-y-auto p-6">
        <SettingsCheckboxCard
          checked={draft.enableStoryboardGenGridPreviewShortcut}
          onCheckedChange={(v) => onDraftChange('enableStoryboardGenGridPreviewShortcut', v)}
          title={t('settings.enableStoryboardGenGridPreviewShortcut')}
          description={t('settings.enableStoryboardGenGridPreviewShortcutDesc')}
        />

        <SettingsCheckboxCard
          checked={draft.showStoryboardGenAdvancedRatioControls}
          onCheckedChange={(v) => onDraftChange('showStoryboardGenAdvancedRatioControls', v)}
          title={t('settings.showStoryboardGenAdvancedRatioControls')}
          description={t('settings.showStoryboardGenAdvancedRatioControlsDesc')}
        />

        <SettingsCheckboxCard
          checked={draft.storyboardGenAutoInferEmptyFrame}
          onCheckedChange={(v) => onDraftChange('storyboardGenAutoInferEmptyFrame', v)}
          title={t('settings.storyboardGenAutoInferEmptyFrame')}
          description={t('settings.storyboardGenAutoInferEmptyFrameDesc')}
        />
      </div>

      <div className="flex justify-end border-t border-border-dark px-6 py-4">
        <button
          onClick={onSave}
          className="rounded bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/80"
        >
          {t('common.save')}
        </button>
      </div>
    </>
  );
}