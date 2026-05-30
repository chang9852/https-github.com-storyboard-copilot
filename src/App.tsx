import { useEffect, useState } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { useProjectStore } from "@/stores/projectStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useThemeStore } from "@/stores/themeStore";
import { Canvas } from "@/features/canvas/Canvas";
import { LeftSidebar } from "@/components/LeftSidebar";
import { TitleBar } from "@/components/TitleBar";
import "@/features/canvas/tools/builtInTools";

export default function App() {
  const { currentProject, closeProject } = useProjectStore();
  const { loadSettings } = useSettingsStore();
  const { theme } = useThemeStore();
  const [showSettings, setShowSettings] = useState(false);
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const handleBack = () => {
    closeProject();
  };

  return (
    <ReactFlowProvider>
      <div className="w-full h-full flex flex-col bg-[#0a0a0f] overflow-hidden">
        {/* Title Bar */}
        <TitleBar
          onSettingsClick={() => setShowSettings(true)}
          showBackButton={!!currentProject}
          onBackClick={handleBack}
        />

        {/* Main Content - Two Column Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar */}
          <LeftSidebar
            collapsed={leftSidebarCollapsed}
            onToggle={() => setLeftSidebarCollapsed(!leftSidebarCollapsed)}
          />

          {/* Center Canvas - Full Width */}
          <div className="flex-1 relative">
            <Canvas />
          </div>
        </div>

        {/* Settings Dialog */}
        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowSettings(false)}
            />
            <div className="relative w-[680px] h-[520px] max-w-[90vw] max-h-[85vh] bg-[#1a1a2e]/95 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden flex shadow-2xl">
              <div className="w-full h-full flex items-center justify-center text-white/50">
                设置页面开发中...
              </div>
            </div>
          </div>
        )}
      </div>
    </ReactFlowProvider>
  );
}
