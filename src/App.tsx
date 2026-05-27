import { useEffect, useState } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { useTranslation } from "react-i18next";
import { useProjectStore } from "@/stores/projectStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useThemeStore } from "@/stores/themeStore";
import { ProjectList } from "@/features/project/ProjectList";
import { Canvas } from "@/features/canvas/Canvas";
import { SettingsPage } from "@/features/settings/SettingsPage";
import { initializeModels } from "@/features/canvas/models";
import "@/features/canvas/tools/builtInTools";

type Page = "projects" | "canvas";

export default function App() {
  const { t } = useTranslation();
  const { currentProject, closeProject } = useProjectStore();
  const { loadSettings } = useSettingsStore();
  const { theme } = useThemeStore();
  const [page, setPage] = useState<Page>("projects");
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    loadSettings();
    initializeModels();
  }, [loadSettings]);

  useEffect(() => {
    if (currentProject) {
      setPage("canvas");
    }
  }, [currentProject]);

  // 应用主题
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const handleBack = () => {
    closeProject();
    setPage("projects");
  };

  return (
    <ReactFlowProvider>
      <div className="w-full h-full flex flex-col bg-bg-dark">
        {/* Title Bar */}
        <div className="h-10 flex items-center justify-between bg-surface border-b border-border select-none shrink-0">
          <div className="flex-1 h-full flex items-center px-4">
            {currentProject && (
              <button
                onClick={handleBack}
                className="mr-3 p-1 hover:bg-surface-tertiary rounded transition-colors"
                title="返回项目"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M10 3L5 8l5 5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
            <span className="text-sm font-semibold text-text">
              {currentProject ? currentProject.name : "分镜助手"}
            </span>
          </div>

          <div className="flex items-center h-full">
            <button
              onClick={() => setShowSettings(true)}
              className="h-full px-3 hover:bg-surface-tertiary transition-colors"
              title={t("nav.settings")}
            >
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="10" cy="10" r="3" />
                <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.93 4.93l1.41 1.41M13.66 13.66l1.41 1.41M4.93 15.07l1.41-1.41M13.66 6.34l1.41-1.41" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex">
          {/* Projects page */}
          {page === "projects" && (
            <div className="w-full">
              <ProjectList />
            </div>
          )}

          {/* Canvas page */}
          {page === "canvas" && currentProject && (
            <div className="flex-1">
              <Canvas />
            </div>
          )}
        </div>

        {/* Settings dialog */}
        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/30"
              onClick={() => setShowSettings(false)}
            />
            <div className="relative w-[680px] h-[520px] max-w-[90vw] max-h-[85vh] bg-surface-primary border border-border rounded-lg overflow-hidden flex">
              <SettingsPage onClose={() => setShowSettings(false)} />
            </div>
          </div>
        )}
      </div>
    </ReactFlowProvider>
  );
}
