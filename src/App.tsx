import { useEffect, useState } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { useProjectStore } from '@/stores/projectStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { Canvas } from '@/features/canvas/Canvas';
import { ProjectManager } from '@/features/project/ProjectManager';
import { TitleBar } from '@/components/TitleBar';
import { SettingsDialog } from '@/features/settings/SettingsDialog';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { subscribeOpenSettingsDialog, type SettingsCategory } from '@/features/settings/settingsEvents';
import '@/features/canvas/tools/builtInTools';

function toRgbCssValue(hexColor: string): string {
  const hex = hexColor.replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
    return '59 130 246';
  }
  const r = Number.parseInt(hex.slice(0, 2), 16);
  const g = Number.parseInt(hex.slice(2, 4), 16);
  const b = Number.parseInt(hex.slice(4, 6), 16);
  return `${r} ${g} ${b}`;
}

export default function App() {
  const { currentProject, closeProject, loadProjects } = useProjectStore();
  const { loadSettings } = useSettingsStore();
  const theme = useSettingsStore((state) => state.theme);
  const uiRadiusPreset = useSettingsStore((state) => state.uiRadiusPreset);
  const themeTonePreset = useSettingsStore((state) => state.themeTonePreset);
  const accentColor = useSettingsStore((state) => state.accentColor);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsInitialCategory, setSettingsInitialCategory] = useState<SettingsCategory>('general');

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.uiRadius = uiRadiusPreset;
  }, [uiRadiusPreset]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.themeTone = themeTonePreset;
  }, [themeTonePreset]);

  useEffect(() => {
    const root = document.documentElement;
    const isMac =
      typeof navigator !== 'undefined'
      && /(Mac|iPhone|iPad|iPod)/i.test(`${navigator.platform} ${navigator.userAgent}`);
    root.dataset.platform = isMac ? 'macos' : 'default';
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const normalized = accentColor.startsWith('#') ? accentColor : `#${accentColor}`;
    root.style.setProperty('--accent', normalized);
    root.style.setProperty('--accent-rgb', toRgbCssValue(normalized));
  }, [accentColor]);

  useEffect(() => {
    const unsubscribe = subscribeOpenSettingsDialog(({ category }) => {
      setSettingsInitialCategory(category ?? 'general');
      setShowSettings(true);
    });
    return unsubscribe;
  }, []);

  const handleBack = () => {
    closeProject();
  };

  return (
    <ReactFlowProvider>
      <ErrorBoundary>
        <div className="w-full h-full flex flex-col bg-bg-dark">
          <TitleBar
            onSettingsClick={() => {
              setSettingsInitialCategory('general');
              setShowSettings(true);
            }}
            showBackButton={!!currentProject}
            onBackClick={handleBack}
          />

          <main className="flex-1 relative overflow-hidden">
            {currentProject ? <Canvas /> : <ProjectManager />}
          </main>

          <SettingsDialog
            isOpen={showSettings}
            onClose={() => setShowSettings(false)}
            initialCategory={settingsInitialCategory}
          />
        </div>
      </ErrorBoundary>
    </ReactFlowProvider>
  );
}