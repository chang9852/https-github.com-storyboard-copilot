import { useTranslation } from 'react-i18next';
import { UiButton } from '@/components/ui/primitives';
import { openSettingsDialog } from './settingsEvents';

interface MissingApiKeyHintProps {
  className?: string;
}

export function MissingApiKeyHint({ className = '' }: MissingApiKeyHintProps) {
  const { t } = useTranslation();

  return (
    <div className={`flex w-full justify-center ${className}`}>
      <div className="pointer-events-auto inline-flex max-w-[680px] items-center gap-3 rounded-lg border border-[var(--ui-border-soft)] bg-[var(--ui-surface-panel)] px-5 py-4 text-center shadow-[var(--ui-shadow-panel)] backdrop-blur">
        <p className="text-sm leading-7 text-text-muted sm:text-[15px]">
          {t('settings.missingAnyApiKeyMessage')}
        </p>
        <UiButton
          type="button"
          variant="primary"
          size="sm"
          className="shrink-0"
          onClick={() => openSettingsDialog({ category: 'providers' })}
        >
          {t('settings.openProvidersSettings')}
        </UiButton>
      </div>
    </div>
  );
}
