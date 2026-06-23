import { useTranslation } from 'react-i18next';
import { UiSelect } from '@/components/ui';
import { GRSAI_CREDIT_TIERS } from '@/features/canvas/pricing/types';
import { SettingsCheckboxCard } from '../SettingsCheckboxCard';
import {
  SETTINGS_CARD_CLASS,
  SETTINGS_FIELD_CLASS,
  SETTINGS_FOOTER_CLASS,
  SETTINGS_HEADER_CLASS,
} from '@/features/settings/settingsStyles';
import type { SettingsDraft } from '../useSettingsDraft';

interface PricingTabProps {
  draft: SettingsDraft;
  onDraftChange: <K extends keyof SettingsDraft>(key: K, value: SettingsDraft[K]) => void;
  onSave: () => void;
}

export function PricingTab({ draft, onDraftChange, onSave }: PricingTabProps) {
  const { t, i18n } = useTranslation();

  return (
    <>
      <div className={SETTINGS_HEADER_CLASS}>
        <h2 className="text-lg font-semibold text-text-dark">{t('settings.sections.pricing')}</h2>
        <p className="text-sm text-text-muted mt-1">{t('settings.pricingDesc')}</p>
      </div>

      <div className="ui-scrollbar flex-1 space-y-4 overflow-y-auto p-6">
        <SettingsCheckboxCard
          checked={draft.showNodePrice}
          onCheckedChange={(v) => onDraftChange('showNodePrice', v)}
          title={t('settings.showNodePrice')}
          description={t('settings.showNodePriceDesc')}
        />

        <div className={SETTINGS_CARD_CLASS}>
          <h3 className="text-sm font-medium text-text-dark">{t('settings.priceDisplayCurrencyMode')}</h3>
          <p className="mt-1 text-xs text-text-muted">{t('settings.priceDisplayCurrencyModeDesc')}</p>
          <div className="mt-3">
            <UiSelect
              value={draft.priceDisplayCurrencyMode}
              onChange={(event) => onDraftChange('priceDisplayCurrencyMode', event.target.value as SettingsDraft['priceDisplayCurrencyMode'])}
              className="h-9 text-sm"
            >
              <option value="auto">{t('settings.priceCurrencyAuto')}</option>
              <option value="cny">{t('settings.priceCurrencyCny')}</option>
              <option value="usd">{t('settings.priceCurrencyUsd')}</option>
            </UiSelect>
          </div>
        </div>

        <div className={SETTINGS_CARD_CLASS}>
          <h3 className="text-sm font-medium text-text-dark">{t('settings.usdToCnyRate')}</h3>
          <p className="mt-1 text-xs text-text-muted">{t('settings.usdToCnyRateDesc')}</p>
          <div className="mt-3">
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={draft.usdToCnyRate}
              onChange={(event) => onDraftChange('usdToCnyRate', event.target.value)}
              className={`h-9 w-full px-3 text-sm ${SETTINGS_FIELD_CLASS}`}
            />
          </div>
        </div>

        <SettingsCheckboxCard
          checked={draft.preferDiscountedPrice}
          onCheckedChange={(v) => onDraftChange('preferDiscountedPrice', v)}
          title={t('settings.preferDiscountedPrice')}
          description={t('settings.preferDiscountedPriceDesc')}
        />

        <div className={SETTINGS_CARD_CLASS}>
          <h3 className="text-sm font-medium text-text-dark">{t('settings.grsaiCreditTier')}</h3>
          <p className="mt-1 text-xs text-text-muted">{t('settings.grsaiCreditTierDesc')}</p>
          <div className="mt-3">
            <UiSelect
              value={draft.grsaiCreditTierId}
              onChange={(event) => onDraftChange('grsaiCreditTierId', event.target.value as SettingsDraft['grsaiCreditTierId'])}
              className="h-9 text-sm"
            >
              {GRSAI_CREDIT_TIERS.map((tier) => (
                <option key={tier.id} value={tier.id}>
                  {t('settings.grsaiCreditTierOption', {
                    price: tier.priceCny.toFixed(2),
                    credits: tier.credits.toLocaleString(i18n.language.startsWith('zh') ? 'zh-CN' : 'en-US'),
                  })}
                </option>
              ))}
            </UiSelect>
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
