import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FolderOpen, Plus, Trash2 } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';
import { SettingsCheckboxCard } from '../SettingsCheckboxCard';
import {
  SETTINGS_CARD_CLASS,
  SETTINGS_FIELD_CLASS,
  SETTINGS_FOOTER_CLASS,
  SETTINGS_HEADER_CLASS,
  SETTINGS_SUBTLE_BUTTON_CLASS,
} from '@/features/settings/settingsStyles';
import type { SettingsDraft } from '../useSettingsDraft';

interface GenerationTabProps {
  draft: SettingsDraft;
  onDraftChange: <K extends keyof SettingsDraft>(key: K, value: SettingsDraft[K]) => void;
  onSave: () => void;
}

export function GenerationTab({ draft, onDraftChange, onSave }: GenerationTabProps) {
  const { t } = useTranslation();
  const [localDownloadPathInput, setLocalDownloadPathInput] = useState('');

  const handlePickDownloadPath = async () => {
    try {
      const selected = await open({ directory: true, multiple: false });
      if (!selected || Array.isArray(selected)) return;
      const paths = draft.downloadPresetPaths;
      if (paths.includes(selected)) return;
      onDraftChange('downloadPresetPaths', [...paths, selected].slice(0, 8));
    } catch (error) {
      console.error('Failed to pick download path', error);
    }
  };

  const handleAddDownloadPathFromInput = () => {
    const next = localDownloadPathInput.trim();
    if (!next) return;
    const paths = draft.downloadPresetPaths;
    if (paths.includes(next)) return;
    onDraftChange('downloadPresetPaths', [...paths, next].slice(0, 8));
    setLocalDownloadPathInput('');
  };

  const handleRemoveDownloadPath = (path: string) => {
    onDraftChange(
      'downloadPresetPaths',
      draft.downloadPresetPaths.filter((p) => p !== path)
    );
  };

  return (
    <>
      <div className={SETTINGS_HEADER_CLASS}>
        <h2 className="text-lg font-semibold text-text-dark">{t('settings.generation')}</h2>
        <p className="text-sm text-text-muted mt-1">{t('settings.generationDesc')}</p>
      </div>

      <div className="ui-scrollbar flex-1 space-y-4 overflow-y-auto p-6">
        <SettingsCheckboxCard
          checked={draft.storyboardGenKeepStyleConsistent}
          onCheckedChange={(v) => onDraftChange('storyboardGenKeepStyleConsistent', v)}
          title={t('settings.storyboardGenKeepStyleConsistent')}
          description={t('settings.storyboardGenKeepStyleConsistentDesc')}
        />

        <SettingsCheckboxCard
          checked={draft.storyboardGenDisableTextInImage}
          onCheckedChange={(v) => onDraftChange('storyboardGenDisableTextInImage', v)}
          title={t('settings.storyboardGenDisableTextInImage')}
          description={t('settings.storyboardGenDisableTextInImageDesc')}
        />

        <SettingsCheckboxCard
          checked={draft.storyboardGenAutoInferEmptyFrame}
          onCheckedChange={(v) => onDraftChange('storyboardGenAutoInferEmptyFrame', v)}
          title={t('settings.storyboardGenAutoInferEmptyFrame')}
          description={t('settings.storyboardGenAutoInferEmptyFrameDesc')}
        />

        <SettingsCheckboxCard
          checked={draft.ignoreAtTagWhenCopyingAndGenerating}
          onCheckedChange={(v) => onDraftChange('ignoreAtTagWhenCopyingAndGenerating', v)}
          title={t('settings.ignoreAtTagWhenCopyingAndGenerating')}
          description={t('settings.ignoreAtTagWhenCopyingAndGeneratingDesc')}
        />

        <SettingsCheckboxCard
          checked={draft.useUploadFilenameAsNodeTitle}
          onCheckedChange={(v) => onDraftChange('useUploadFilenameAsNodeTitle', v)}
          title={t('settings.useUploadFilenameAsNodeTitle')}
          description={t('settings.useUploadFilenameAsNodeTitleDesc')}
        />

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

        <div className={SETTINGS_CARD_CLASS}>
          <div className="mb-3">
            <h3 className="text-sm font-medium text-text-dark">{t('settings.downloadPresetPaths')}</h3>
            <p className="mt-1 text-xs text-text-muted">{t('settings.downloadPresetPathsDesc')}</p>
          </div>

          <div className="mb-2 flex items-center gap-2">
            <input
              value={localDownloadPathInput}
              onChange={(e) => setLocalDownloadPathInput(e.target.value)}
              placeholder={t('settings.downloadPathPlaceholder')}
              className={`h-9 flex-1 px-3 text-sm ${SETTINGS_FIELD_CLASS}`}
            />
            <button
              type="button"
              className={`inline-flex h-9 items-center justify-center px-3 text-xs ${SETTINGS_SUBTLE_BUTTON_CLASS}`}
              onClick={handleAddDownloadPathFromInput}
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              {t('settings.addPath')}
            </button>
            <button
              type="button"
              className={`inline-flex h-9 items-center justify-center px-3 text-xs ${SETTINGS_SUBTLE_BUTTON_CLASS}`}
              onClick={handlePickDownloadPath}
            >
              <FolderOpen className="mr-1 h-3.5 w-3.5" />
              {t('settings.chooseFolder')}
            </button>
          </div>

          <div className="space-y-1">
            {draft.downloadPresetPaths.length > 0 ? (
              draft.downloadPresetPaths.map((path) => (
                <div
                  key={path}
                  className="flex items-center gap-2 rounded border border-[var(--ui-border-soft)] bg-[var(--ui-surface-field)] px-2 py-1.5"
                >
                  <span className="truncate text-xs text-text-dark">{path}</span>
                  <button
                    type="button"
                    className="ml-auto inline-flex h-6 w-6 items-center justify-center rounded text-text-muted transition-colors hover:bg-[var(--ui-glass-bg-hover)] hover:text-text-dark"
                    onClick={() => handleRemoveDownloadPath(path)}
                    title={t('common.delete')}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            ) : (
              <div className="text-xs text-text-muted">{t('settings.noDownloadPresetPaths')}</div>
            )}
          </div>
        </div>
      </div>

      <div className={SETTINGS_FOOTER_CLASS}>
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
