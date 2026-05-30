import { useTranslation } from 'react-i18next';
import { UiSelect } from '@/components/ui';
import type { SettingsDraft } from '../useSettingsDraft';

interface AppearanceTabProps {
  draft: SettingsDraft;
  onDraftChange: <K extends keyof SettingsDraft>(key: K, value: SettingsDraft[K]) => void;
  onSave: () => void;
}

export function AppearanceTab({ draft, onDraftChange, onSave }: AppearanceTabProps) {
  const { t } = useTranslation();

  return (
    <>
      <div className="px-6 py-5 border-b border-border-dark">
        <h2 className="text-lg font-semibold text-text-dark">{t('settings.appearance')}</h2>
        <p className="text-sm text-text-muted mt-1">{t('settings.appearanceDesc')}</p>
      </div>

      <div className="ui-scrollbar flex-1 space-y-4 overflow-y-auto p-6">
        <div className="rounded-lg border border-border-dark bg-bg-dark p-4">
          <h3 className="text-sm font-medium text-text-dark">{t('settings.radiusPreset')}</h3>
          <p className="mt-1 text-xs text-text-muted">{t('settings.radiusPresetDesc')}</p>
          <div className="mt-3">
            <UiSelect
              value={draft.uiRadiusPreset}
              onChange={(event) => onDraftChange('uiRadiusPreset', event.target.value as SettingsDraft['uiRadiusPreset'])}
              className="h-9 text-sm"
            >
              <option value="compact">{t('settings.radiusCompact')}</option>
              <option value="default">{t('settings.radiusDefault')}</option>
              <option value="large">{t('settings.radiusLarge')}</option>
            </UiSelect>
          </div>
        </div>

        <div className="rounded-lg border border-border-dark bg-bg-dark p-4">
          <h3 className="text-sm font-medium text-text-dark">{t('settings.themeTone')}</h3>
          <p className="mt-1 text-xs text-text-muted">{t('settings.themeToneDesc')}</p>
          <div className="mt-3">
            <UiSelect
              value={draft.themeTonePreset}
              onChange={(event) => onDraftChange('themeTonePreset', event.target.value as SettingsDraft['themeTonePreset'])}
              className="h-9 text-sm"
            >
              <option value="neutral">{t('settings.toneNeutral')}</option>
              <option value="warm">{t('settings.toneWarm')}</option>
              <option value="cool">{t('settings.toneCool')}</option>
            </UiSelect>
          </div>
        </div>

        <div className="rounded-lg border border-border-dark bg-bg-dark p-4">
          <h3 className="text-sm font-medium text-text-dark">{t('settings.edgeRoutingMode')}</h3>
          <p className="mt-1 text-xs text-text-muted">{t('settings.edgeRoutingModeDesc')}</p>
          <div className="mt-3">
            <UiSelect
              value={draft.canvasEdgeRoutingMode}
              onChange={(event) => onDraftChange('canvasEdgeRoutingMode', event.target.value as SettingsDraft['canvasEdgeRoutingMode'])}
              className="h-9 text-sm"
            >
              <option value="spline">{t('settings.edgeRoutingSpline')}</option>
              <option value="orthogonal">{t('settings.edgeRoutingOrthogonal')}</option>
              <option value="smartOrthogonal">{t('settings.edgeRoutingSmartOrthogonal')}</option>
            </UiSelect>
          </div>
        </div>

        <div className="rounded-lg border border-border-dark bg-bg-dark p-4">
          <h3 className="text-sm font-medium text-text-dark">{t('settings.accentColor')}</h3>
          <p className="mt-1 text-xs text-text-muted">{t('settings.accentColorDesc')}</p>
          <div className="mt-3 flex items-center gap-2">
            <input
              type="color"
              value={draft.accentColor}
              onChange={(event) => onDraftChange('accentColor', event.target.value)}
              className="h-9 w-12 rounded border border-border-dark bg-surface-dark p-1"
            />
            <input
              value={draft.accentColor}
              onChange={(event) => onDraftChange('accentColor', event.target.value)}
              placeholder="#3B82F6"
              className="h-9 flex-1 rounded border border-border-dark bg-surface-dark px-3 text-sm text-text-dark outline-none placeholder:text-text-muted"
            />
            <button
              type="button"
              className="inline-flex h-9 items-center justify-center rounded border border-border-dark bg-surface-dark px-3 text-xs text-text-dark transition-colors hover:bg-bg-dark"
              onClick={() => onDraftChange('accentColor', '#3B82F6')}
            >
              {t('settings.resetAccentColor')}
            </button>
          </div>
        </div>
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