import { useTranslation } from "react-i18next";

export function AboutSettings() {
  const { t } = useTranslation();

  return (
    <div className="p-4 space-y-4">
      <div>
        <h2 className="text-base font-semibold mb-0.5">{t("settings.sections.about")}</h2>
        <p className="text-xs text-text-secondary">{t("settings.about.description")}</p>
      </div>

      {/* App Info */}
      <section className="space-y-3">
        <div className="p-4 bg-surface-secondary rounded-lg border border-border">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-lg bg-accent flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="2" width="5" height="5" rx="1" fill="white" />
                <rect x="9" y="2" width="5" height="5" rx="1" fill="white" opacity="0.7" />
                <rect x="2" y="9" width="5" height="5" rx="1" fill="white" opacity="0.7" />
                <rect x="9" y="9" width="5" height="5" rx="1" fill="white" opacity="0.4" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-semibold">{t("app.name")}</h3>
              <p className="text-xs text-text-muted">{t("app.subtitle")}</p>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-text-secondary">{t("settings.about.version")}</span>
              <span>1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">{t("settings.about.tauri_version")}</span>
              <span>2.x</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">{t("settings.about.react_version")}</span>
              <span>18.x</span>
            </div>
          </div>
        </div>
      </section>

      {/* Links */}
      <section className="space-y-3">
        <h3 className="text-sm font-medium text-text-secondary">{t("settings.about.links")}</h3>
        <div className="space-y-2">
          {[
            { label: t("settings.about.documentation"), url: "#" },
            { label: t("settings.about.report_issue"), url: "#" },
            { label: t("settings.about.check_updates"), url: "#" },
          ].map((link) => (
            <a
              key={link.label}
              href={link.url}
              className="flex items-center justify-between p-3 bg-surface-secondary rounded-lg border border-border hover:border-accent transition-colors"
            >
              <span className="text-sm">{link.label}</span>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-muted">
                <path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          ))}
        </div>
      </section>

      {/* Copyright */}
      <div className="pt-4 text-center">
        <p className="text-xs text-text-muted">
          &copy; 2024 TianYuanYiFang. All rights reserved.
        </p>
      </div>
    </div>
  );
}
