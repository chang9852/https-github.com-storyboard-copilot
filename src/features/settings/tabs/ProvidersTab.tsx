import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff } from 'lucide-react';
import { UiSelect } from '@/components/ui';
import { listModelProviders } from '@/features/canvas/models';
import { GRSAI_NANO_BANANA_PRO_MODEL_OPTIONS } from '@/features/canvas/models/providers/grsai';
import type { SettingsDraft } from '../useSettingsDraft';

const PROVIDER_REGISTER_URLS: Record<string, string> = {
  ppio: 'https://ppio.com/user/register?invited_by=WGY0DZ',
  grsai: 'https://grsai.com',
  kie: 'https://kie.ai?ref=eef20ef0b0595cad227d45b29c635f6c',
  fal: 'https://fal.ai',
};

const PROVIDER_GET_KEY_URLS: Record<string, string> = {
  ppio: 'https://ppio.com/settings/key-management',
  grsai: 'https://grsai.com/zh/dashboard/api-keys',
  kie: 'https://kie.ai/api-key',
  fal: 'https://fal.ai/dashboard/keys',
};

const PROVIDER_ORDER = ['kie', 'ppio', 'fal', 'grsai'];

interface ProvidersTabProps {
  draft: SettingsDraft;
  onDraftChange: <K extends keyof SettingsDraft>(key: K, value: SettingsDraft[K]) => void;
  onSave: () => void;
}

export function ProvidersTab({ draft, onDraftChange, onSave }: ProvidersTabProps) {
  const { t, i18n } = useTranslation();
  const [revealedApiKeys, setRevealedApiKeys] = useState<Record<string, boolean>>({});

  const providers = listModelProviders().slice().sort((left, right) => {
    const leftIndex = PROVIDER_ORDER.indexOf(left.id);
    const rightIndex = PROVIDER_ORDER.indexOf(right.id);
    return (leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex) - (rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex);
  });

  return (
    <>
      <div className="px-6 py-5 border-b border-border-dark">
        <h2 className="text-lg font-semibold text-text-dark">{t('settings.providers')}</h2>
        <p className="text-sm text-text-muted mt-1">{t('settings.providersDesc')}</p>
      </div>

      <div className="ui-scrollbar flex-1 space-y-4 overflow-y-auto p-6">
        {providers.map((provider) => {
          const displayName = i18n.language.startsWith('zh') ? provider.label : provider.name;
          const isRevealed = Boolean(revealedApiKeys[provider.id]);

          return (
            <div key={provider.id} className="rounded-lg border border-border-dark bg-bg-dark p-4">
              <div className="mb-3">
                <h3 className="text-sm font-medium text-text-dark">{displayName}</h3>
                {PROVIDER_REGISTER_URLS[provider.id] && PROVIDER_GET_KEY_URLS[provider.id] ? (
                  <p className="text-xs text-text-muted">
                    {t('settings.providerApiKeyGuidePrefix')}{' '}
                    <a
                      href={PROVIDER_REGISTER_URLS[provider.id]}
                      target="_blank"
                      rel="noreferrer"
                      className="text-accent hover:underline"
                    >
                      {t('settings.providerRegisterLink')}
                    </a>
                    {t('settings.providerApiKeyGuideMiddle')}{' '}
                    <a
                      href={PROVIDER_GET_KEY_URLS[provider.id]}
                      target="_blank"
                      rel="noreferrer"
                      className="text-accent hover:underline"
                    >
                      {t('settings.getApiKeyLink')}
                    </a>
                  </p>
                ) : (
                  <p className="text-xs text-text-muted">{provider.id}</p>
                )}
              </div>

              <div className="relative">
                <input
                  type={isRevealed ? 'text' : 'password'}
                  value={draft.apiKeys[provider.id] ?? ''}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    onDraftChange('apiKeys', { ...draft.apiKeys, [provider.id]: nextValue });
                  }}
                  placeholder={t('settings.enterApiKey')}
                  className="w-full rounded border border-border-dark bg-surface-dark px-3 py-2 pr-10 text-sm text-text-dark placeholder:text-text-muted"
                />
                <button
                  type="button"
                  onClick={() =>
                    setRevealedApiKeys((prev) => ({
                      ...prev,
                      [provider.id]: !isRevealed,
                    }))
                  }
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 hover:bg-bg-dark"
                >
                  {isRevealed ? (
                    <EyeOff className="h-4 w-4 text-text-muted" />
                  ) : (
                    <Eye className="h-4 w-4 text-text-muted" />
                  )}
                </button>
              </div>

              {provider.id === 'grsai' && (
                <div className="mt-3">
                  <div className="mb-1 text-xs font-medium text-text-dark">
                    {t('settings.nanoBananaProModel')}
                  </div>
                  <p className="mb-2 text-xs text-text-muted">
                    {t('settings.nanoBananaProModelDesc')}
                  </p>
                  <UiSelect
                    value={draft.grsaiNanoBananaProModel}
                    onChange={(event) => onDraftChange('grsaiNanoBananaProModel', event.target.value)}
                    className="h-9 text-sm"
                  >
                    {GRSAI_NANO_BANANA_PRO_MODEL_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </UiSelect>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="px-6 py-4 border-t border-border-dark flex justify-end">
        <button
          onClick={onSave}
          className="px-4 py-2 text-sm font-medium bg-accent text-white rounded hover:bg-accent/80 transition-colors"
        >
          {t('common.save')}
        </button>
      </div>
    </>
  );
}