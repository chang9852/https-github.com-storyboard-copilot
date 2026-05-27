import { useTranslation } from "react-i18next";

export function PricingSettings() {
  const { t } = useTranslation();

  const pricingData = [
    {
      provider: "KIE",
      credits: "~6 credits/image",
      price: "~$0.03/image",
      models: ["GPT Image 2", "Nano Banana Pro", "Flux 2 Pro", "Imagen 4"],
    },
    {
      provider: "fal",
      credits: "Per request",
      price: "Varies by model",
      models: ["Flux 2 Pro", "Nano Banana Pro (Gemini)", "Recraft V3"],
    },
    {
      provider: "派欧云",
      credits: "-",
      price: "-",
      models: [],
    },
    {
      provider: "GRSAI",
      credits: "-",
      price: "-",
      models: [],
    },
  ];

  return (
    <div className="p-4 space-y-4">
      <div>
        <h2 className="text-base font-semibold mb-0.5">{t("settings.sections.pricing")}</h2>
        <p className="text-xs text-text-secondary">{t("settings.pricing.description")}</p>
      </div>

      {/* Pricing Cards */}
      <div className="space-y-3">
        {pricingData.map((item) => (
          <div
            key={item.provider}
            className="p-4 bg-surface-secondary rounded-lg border border-border"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">{item.provider}</span>
              {item.price !== "-" ? (
                <span className="text-sm font-semibold text-accent">{item.price}</span>
              ) : (
                <span className="text-xs text-text-muted">{t("settings.pricing.pending")}</span>
              )}
            </div>

            {item.models.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-text-secondary">
                  <span>{t("settings.pricing.credits")}</span>
                  <span>{item.credits}</span>
                </div>
                <div className="flex flex-wrap gap-1 pt-1">
                  {item.models.map((model) => (
                    <span
                      key={model}
                      className="px-2 py-0.5 text-[10px] bg-surface-tertiary text-text-secondary rounded"
                    >
                      {model}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-text-muted">{t("settings.pricing.no_models")}</p>
            )}
          </div>
        ))}
      </div>

      {/* Tips */}
      <div className="p-4 bg-accent/5 border border-accent/20 rounded-lg">
        <h4 className="text-sm font-medium text-accent mb-2">{t("settings.pricing.tips_title")}</h4>
        <ul className="text-xs text-text-secondary space-y-1">
          <li>{t("settings.pricing.tip_1")}</li>
          <li>{t("settings.pricing.tip_2")}</li>
          <li>{t("settings.pricing.tip_3")}</li>
        </ul>
      </div>
    </div>
  );
}
