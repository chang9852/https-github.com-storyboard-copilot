import { useTranslation } from "react-i18next";
import { useSettingsStore } from "@/stores/settingsStore";
import { Select } from "@/components/ui";
import { PROVIDERS } from "@/services/ai";

export function GeneralSettings() {
  const { t } = useTranslation();
  const { providerConfigs } = useSettingsStore();

  return (
    <div className="p-4 space-y-4">
      <div>
        <h2 className="text-base font-semibold mb-0.5">{t("settings.sections.general")}</h2>
        <p className="text-xs text-text-secondary">{t("settings.general.description")}</p>
      </div>

      {/* Default Provider */}
      <section className="space-y-3">
        <h3 className="text-sm font-medium text-text-secondary">{t("settings.general.default_provider")}</h3>
        <div className="p-3 bg-surface-secondary rounded-lg border border-border">
          <Select
            label={t("ai.provider")}
            value="kie"
            options={PROVIDERS.filter((p) => p.enabled && providerConfigs[p.id]?.apiKey).map((p) => ({
              value: p.id,
              label: p.name,
            }))}
          />
        </div>
      </section>

      {/* Default Grid Layout */}
      <section className="space-y-3">
        <h3 className="text-sm font-medium text-text-secondary">{t("settings.general.default_grid")}</h3>
        <div className="p-3 bg-surface-secondary rounded-lg border border-border">
          <Select
            label={t("ai.grid_layout")}
            value="3x3"
            options={[
              { value: "2x2", label: t("ai.grid_2x2") },
              { value: "3x3", label: t("ai.grid_3x3") },
            ]}
          />
        </div>
      </section>

      {/* Auto Save */}
      <section className="space-y-3">
        <h3 className="text-sm font-medium text-text-secondary">{t("settings.general.auto_save")}</h3>
        <div className="flex items-center justify-between p-3 bg-surface-secondary rounded-lg border border-border">
          <span className="text-sm">{t("settings.general.auto_save_desc")}</span>
          <div className="w-10 h-5 bg-accent rounded-full relative cursor-pointer">
            <div className="absolute right-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform" />
          </div>
        </div>
      </section>

      {/* Language */}
      <section className="space-y-3">
        <h3 className="text-sm font-medium text-text-secondary">{t("settings.language")}</h3>
        <div className="p-3 bg-surface-secondary rounded-lg border border-border">
          <Select
            label={t("settings.language")}
            value={typeof window !== 'undefined' ? (localStorage.getItem("language") || "zh") : "zh"}
            onChange={(e) => {
              localStorage.setItem("language", e.target.value);
              window.location.reload();
            }}
            options={[
              { value: "zh", label: "中文" },
              { value: "en", label: "English" },
            ]}
          />
        </div>
      </section>
    </div>
  );
}
