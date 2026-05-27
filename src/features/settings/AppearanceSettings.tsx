import { useTranslation } from "react-i18next";
import { useThemeStore } from "@/stores/themeStore";
export function AppearanceSettings() {
  const { t } = useTranslation();
  const { theme, toggleTheme } = useThemeStore();

  return (
    <div className="p-4 space-y-4">
      <div>
        <h2 className="text-base font-semibold mb-0.5">{t("settings.sections.appearance")}</h2>
        <p className="text-xs text-text-secondary">{t("settings.appearance.description")}</p>
      </div>

      {/* Theme */}
      <section className="space-y-3">
        <h3 className="text-sm font-medium text-text-secondary">{t("settings.theme")}</h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            className={`p-4 rounded-lg border-2 transition-colors ${
              theme === "dark"
                ? "border-accent bg-accent/10"
                : "border-border hover:border-text-muted"
            }`}
            onClick={() => theme !== "dark" && toggleTheme()}
          >
            <div className="w-full aspect-video bg-[#0a0a0a] rounded mb-3 flex items-center justify-center">
              <div className="w-16 h-12 bg-[#1e1e1e] rounded" />
            </div>
            <p className="text-sm font-medium">{t("settings.theme_dark")}</p>
            <p className="text-xs text-text-muted">{t("settings.theme_dark_desc")}</p>
          </button>

          <button
            className={`p-4 rounded-lg border-2 transition-colors ${
              theme === "light"
                ? "border-accent bg-accent/10"
                : "border-border hover:border-text-muted"
            }`}
            onClick={() => theme !== "light" && toggleTheme()}
          >
            <div className="w-full aspect-video bg-[#f5f5f5] rounded mb-3 flex items-center justify-center">
              <div className="w-16 h-12 bg-white rounded border border-gray-200" />
            </div>
            <p className="text-sm font-medium">{t("settings.theme_light")}</p>
            <p className="text-xs text-text-muted">{t("settings.theme_light_desc")}</p>
          </button>
        </div>
      </section>

      {/* Accent Color */}
      <section className="space-y-3">
        <h3 className="text-sm font-medium text-text-secondary">{t("settings.appearance.accent_color")}</h3>
        <div className="flex gap-2">
          {["#3b82f6", "#8b5cf6", "#ec4899", "#ef4444", "#f59e0b", "#22c55e"].map((color) => (
            <button
              key={color}
              className={`w-8 h-8 rounded-full border-2 transition-transform ${
                color === "#3b82f6" ? "border-white scale-110" : "border-transparent hover:scale-105"
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
        <p className="text-xs text-text-muted">{t("settings.appearance.accent_color_desc")}</p>
      </section>

      {/* Font Size */}
      <section className="space-y-3">
        <h3 className="text-sm font-medium text-text-secondary">{t("settings.appearance.font_size")}</h3>
        <div className="flex gap-2">
          {[
            { value: "small", label: "A", size: "text-xs" },
            { value: "medium", label: "A", size: "text-sm" },
            { value: "large", label: "A", size: "text-base" },
          ].map((option) => (
            <button
              key={option.value}
              className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                option.value === "medium"
                  ? "border-accent bg-accent/10"
                  : "border-border hover:border-text-muted"
              } ${option.size}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
