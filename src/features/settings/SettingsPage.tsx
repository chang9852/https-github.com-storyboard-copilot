import { useState } from "react";
import { useTranslation } from "react-i18next";
import { GeneralSettings } from "./GeneralSettings";
import { ApiKeysSettings } from "./ApiKeysSettings";
import { AppearanceSettings } from "./AppearanceSettings";
import { PricingSettings } from "./PricingSettings";
import { AboutSettings } from "./AboutSettings";

type SettingsSection = "general" | "keys" | "appearance" | "pricing" | "about";

const SECTIONS: { id: SettingsSection; icon: string; labelKey: string }[] = [
  { id: "general", icon: "gear", labelKey: "settings.sections.general" },
  { id: "keys", icon: "key", labelKey: "settings.sections.keys" },
  { id: "appearance", icon: "palette", labelKey: "settings.sections.appearance" },
  { id: "pricing", icon: "credit-card", labelKey: "settings.sections.pricing" },
  { id: "about", icon: "info", labelKey: "settings.sections.about" },
];

function SectionIcon({ icon, active }: { icon: string; active: boolean }) {
  const className = `w-4 h-4 ${active ? "text-accent" : "text-text-secondary"}`;

  switch (icon) {
    case "gear":
      return (
        <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="10" cy="10" r="3" />
          <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.93 4.93l1.41 1.41M13.66 13.66l1.41 1.41M4.93 15.07l1.41-1.41M13.66 6.34l1.41-1.41" strokeLinecap="round" />
        </svg>
      );
    case "key":
      return (
        <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M10 2a4 4 0 0 0-4 4c0 1.5.8 2.8 2 3.5V18l2-2 2 2V9.5c1.2-.7 2-2 2-3.5a4 4 0 0 0-4-4z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "palette":
      return (
        <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="10" cy="10" r="8" />
          <circle cx="10" cy="6" r="1.5" fill="currentColor" />
          <circle cx="6" cy="10" r="1.5" fill="currentColor" />
          <circle cx="14" cy="10" r="1.5" fill="currentColor" />
          <circle cx="10" cy="14" r="1.5" fill="currentColor" />
        </svg>
      );
    case "credit-card":
      return (
        <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="2" y="4" width="16" height="12" rx="2" />
          <path d="M2 8h16" />
        </svg>
      );
    case "info":
      return (
        <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="10" cy="10" r="8" />
          <path d="M10 9v4M10 7h.01" strokeLinecap="round" />
        </svg>
      );
    default:
      return null;
  }
}

interface SettingsPageProps {
  onClose: () => void;
}

export function SettingsPage({ onClose }: SettingsPageProps) {
  const { t } = useTranslation();
  const [activeSection, setActiveSection] = useState<SettingsSection>("general");

  const renderContent = () => {
    switch (activeSection) {
      case "general":
        return <GeneralSettings />;
      case "keys":
        return <ApiKeysSettings />;
      case "appearance":
        return <AppearanceSettings />;
      case "pricing":
        return <PricingSettings />;
      case "about":
        return <AboutSettings />;
      default:
        return <GeneralSettings />;
    }
  };

  return (
    <div className="h-full flex">
      {/* Sidebar */}
      <div className="w-44 flex flex-col border-r border-border bg-surface-secondary">
        {/* Header */}
        <div className="px-3 py-3 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-accent flex items-center justify-center">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                  <rect x="2" y="2" width="5" height="5" rx="1" fill="white" />
                  <rect x="9" y="2" width="5" height="5" rx="1" fill="white" opacity="0.7" />
                  <rect x="2" y="9" width="5" height="5" rx="1" fill="white" opacity="0.7" />
                  <rect x="9" y="9" width="5" height="5" rx="1" fill="white" opacity="0.4" />
                </svg>
              </div>
              <span className="text-xs font-semibold">{t("settings.title")}</span>
            </div>
            <button
              onClick={onClose}
              className="w-5 h-5 rounded flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-tertiary transition-colors"
              title={t("common.close")}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M2 2L10 10M10 2L2 10" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-1">
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors ${
                activeSection === section.id
                  ? "bg-accent/10 text-accent border-r-2 border-accent"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface-tertiary"
              }`}
              onClick={() => setActiveSection(section.id)}
            >
              <SectionIcon icon={section.icon} active={activeSection === section.id} />
              {t(section.labelKey)}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-3 py-2 border-t border-border">
          <p className="text-[10px] text-text-muted text-center">v1.0.0</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {renderContent()}
      </div>
    </div>
  );
}
