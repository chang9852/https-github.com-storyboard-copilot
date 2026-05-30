import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSettingsStore } from "@/stores/settingsStore";
import { Button, Input } from "@/components/ui";
import { PROVIDERS } from "@/services/ai";

export function ApiKeysSettings() {
  const { t } = useTranslation();
  const { providerConfigs, setProviderApiKey } = useSettingsStore();
  const [saved, setSaved] = useState(false);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const toggleShowKey = (providerId: string) => {
    setShowKeys((prev) => ({ ...prev, [providerId]: !prev[providerId] }));
  };

  return (
    <div className="p-4 space-y-4">
      <div>
        <h2 className="text-base font-semibold mb-0.5">{t("settings.sections.keys")}</h2>
        <p className="text-xs text-text-secondary">{t("settings.keys.description")}</p>
      </div>

      {/* Provider API Keys */}
      <div className="space-y-3">
        {PROVIDERS.map((provider) => (
          <div
            key={provider.id}
            className="p-4 bg-surface-secondary rounded-lg border border-border space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{provider.name}</span>
                {provider.baseUrl ? (
                  <span className="px-1.5 py-0.5 text-[10px] bg-success/10 text-success rounded">
                    {t("settings.keys.available")}
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 text-[10px] bg-warning/10 text-warning rounded">
                    {t("settings.keys.coming_soon")}
                  </span>
                )}
              </div>
            </div>

            {provider.baseUrl ? (
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Input
                    type={showKeys[provider.id] ? "text" : "password"}
                    placeholder={`${t("settings.api_key")} - ${provider.name}`}
                    value={providerConfigs[provider.id]?.apiKey || ""}
                    onChange={(e) => setProviderApiKey(provider.id, e.target.value)}
                  />
                  <button
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                    onClick={() => toggleShowKey(provider.id)}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                      {showKeys[provider.id] ? (
                        <>
                          <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" />
                          <circle cx="8" cy="8" r="2" />
                        </>
                      ) : (
                        <>
                          <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" />
                          <path d="M3 13L13 3" strokeLinecap="round" />
                        </>
                      )}
                    </svg>
                  </button>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (providerConfigs[provider.id]?.apiKey) {
                      setProviderApiKey(provider.id, "");
                    }
                  }}
                >
                  {t("common.delete")}
                </Button>
              </div>
            ) : (
              <p className="text-xs text-text-muted">
                {t("settings.keys.pending_docs")}
              </p>
            )}

            {/* Supported models */}
            {provider.models.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {provider.models.slice(0, 6).map((model) => (
                  <span
                    key={model.id}
                    className="px-2 py-0.5 text-[10px] bg-surface-tertiary text-text-secondary rounded"
                  >
                    {model.name}
                  </span>
                ))}
                {provider.models.length > 6 && (
                  <span className="px-2 py-0.5 text-[10px] bg-surface-tertiary text-text-muted rounded">
                    +{provider.models.length - 6}
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Save Button */}
      <div className="pt-4">
        <Button variant="primary" onClick={handleSave}>
          {saved ? t("settings.saved") : t("settings.save")}
        </Button>
      </div>
    </div>
  );
}
