import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { getVersion } from '@tauri-apps/api/app';
import { SettingsCheckboxCard } from '../SettingsCheckboxCard';
import {
  SETTINGS_CARD_CLASS,
  SETTINGS_FOOTER_CLASS,
  SETTINGS_HEADER_CLASS,
  SETTINGS_SUBTLE_BUTTON_CLASS,
} from '@/features/settings/settingsStyles';
import type { SettingsDraft } from '../useSettingsDraft';

interface AboutTabProps {
  draft: SettingsDraft;
  onDraftChange: <K extends keyof SettingsDraft>(key: K, value: SettingsDraft[K]) => void;
  onSave: () => void;
  onClose: () => void;
  onCheckUpdate?: () => Promise<'has-update' | 'up-to-date' | 'failed'>;
}

export function AboutTab({ draft, onDraftChange, onSave, onClose, onCheckUpdate }: AboutTabProps) {
  const { t } = useTranslation();
  const [appVersion, setAppVersion] = useState('');
  const [checkUpdateStatus, setCheckUpdateStatus] = useState<'' | 'checking' | 'has-update' | 'up-to-date' | 'failed'>('');

  useEffect(() => {
    let mounted = true;
    const loadAppVersion = async () => {
      try {
        const version = await getVersion();
        if (mounted) setAppVersion(version);
      } catch {
        if (mounted) setAppVersion('');
      }
    };
    void loadAppVersion();
    return () => { mounted = false; };
  }, []);

  const handleCheckUpdate = useCallback(async () => {
    if (!onCheckUpdate) return;
    setCheckUpdateStatus('checking');
    const status = await onCheckUpdate();
    setCheckUpdateStatus(status);
  }, [onCheckUpdate]);

  return (
    <>
      <div className={SETTINGS_HEADER_CLASS}>
        <h2 className="text-lg font-semibold text-text-dark">{t('settings.sections.about')}</h2>
        <p className="text-sm text-text-muted mt-1">{t('settings.aboutDesc')}</p>
      </div>

      <div className="ui-scrollbar flex-1 space-y-4 overflow-y-auto p-6">
        <div className={SETTINGS_CARD_CLASS}>
          <div className="flex items-start gap-4">
            <img
              src="/app-icon.png"
              alt={t('settings.aboutAppName')}
              className="h-14 w-14 rounded-lg border border-[var(--ui-border-soft)] object-cover"
            />
            <div className="min-w-0 flex-1">
              <a
                href="https://space.bilibili.com/39337803"
                target="_blank"
                rel="noreferrer"
                className="text-base font-semibold text-accent hover:underline"
              >
                {t('settings.aboutAppName')}
              </a>
              <p className="mt-1 text-sm text-text-muted">{t('settings.aboutIntro')}</p>
            </div>
          </div>
        </div>

        <div className={`${SETTINGS_CARD_CLASS} space-y-2 text-sm`}>
          <p className="text-text-dark">
            {t('settings.aboutVersionLabel')}: <span className="text-text-muted">{appVersion || t('settings.aboutVersionUnknown')}</span>
          </p>
          <p className="text-text-dark">
            {t('settings.aboutAuthorLabel')}:{' '}
            <a
              href="https://space.bilibili.com/39337803"
              target="_blank"
              rel="noreferrer"
              className="text-accent hover:underline"
            >
              {t('settings.aboutAuthor')}
            </a>
          </p>
          <p className="text-text-dark">
            {t('settings.aboutRepositoryLabel')}:{' '}
            <a
              href="https://github.com/chang9852/https-github.com-storyboard-copilot"
              target="_blank"
              rel="noreferrer"
              className="text-accent hover:underline break-all"
            >
              https://github.com/chang9852/https-github.com-storyboard-copilot
            </a>
          </p>
        </div>

        <div className="space-y-3">
          <SettingsCheckboxCard
            checked={draft.autoCheckAppUpdateOnLaunch}
            onCheckedChange={(v) => onDraftChange('autoCheckAppUpdateOnLaunch', v)}
            title={t('settings.autoCheckUpdateOnLaunch')}
            description={t('settings.autoCheckUpdateOnLaunchDesc')}
          />
          <SettingsCheckboxCard
            checked={draft.enableUpdateDialog}
            onCheckedChange={(v) => onDraftChange('enableUpdateDialog', v)}
            title={t('settings.enableUpdateDialog')}
            description={t('settings.enableUpdateDialogDesc')}
          />
          <div className="pt-1">
            <button
              type="button"
              onClick={() => { void handleCheckUpdate(); }}
              className={`px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50 ${SETTINGS_SUBTLE_BUTTON_CLASS}`}
              disabled={checkUpdateStatus === 'checking'}
            >
              {checkUpdateStatus === 'checking'
                ? t('settings.checkingUpdate')
                : t('settings.checkUpdateNow')}
            </button>
            {checkUpdateStatus !== '' && (
              <p className="mt-2 text-xs text-text-muted">
                {checkUpdateStatus === 'has-update' && t('settings.checkUpdateHasUpdate')}
                {checkUpdateStatus === 'up-to-date' && t('settings.checkUpdateUpToDate')}
                {checkUpdateStatus === 'failed' && t('settings.checkUpdateFailed')}
                {checkUpdateStatus === 'checking' && t('settings.checkingUpdate')}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className={SETTINGS_FOOTER_CLASS}>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className={`px-4 py-2 text-sm font-medium ${SETTINGS_SUBTLE_BUTTON_CLASS}`}
          >
            {t('common.close')}
          </button>
          <button
            onClick={onSave}
            className="rounded bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/80"
          >
            {t('common.save')}
          </button>
        </div>
      </div>
    </>
  );
}
