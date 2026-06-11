import { useEffect, useState } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { useProjectStore } from '@/stores/projectStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { Canvas } from '@/features/canvas/Canvas';
import { ProjectManager } from '@/features/project/ProjectManager';
import { TitleBar } from '@/components/TitleBar';
import { SettingsDialog } from '@/features/settings/SettingsDialog';
import { UpdateAvailableDialog } from '@/components/UpdateAvailableDialog';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { subscribeOpenSettingsDialog, type SettingsCategory } from '@/features/settings/settingsEvents';
import { checkForUpdate } from '@/features/update/application/checkForUpdate';
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
  const { currentProject, closeProject, hydrate } = useProjectStore();
  const { loadSettings } = useSettingsStore();
  const theme = useSettingsStore((state) => state.theme);
  const uiRadiusPreset = useSettingsStore((state) => state.uiRadiusPreset);
  const themeTonePreset = useSettingsStore((state) => state.themeTonePreset);
  const accentColor = useSettingsStore((state) => state.accentColor);
  const autoCheckUpdate = useSettingsStore((state) => state.autoCheckAppUpdateOnLaunch);
  const enableUpdateDialog = useSettingsStore((state) => state.enableUpdateDialog);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsInitialCategory, setSettingsInitialCategory] = useState<SettingsCategory>('generation');
  const [updateInfo, setUpdateInfo] = useState<{ currentVersion?: string; latestVersion?: string } | null>(null);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Auto-check for updates on launch
  useEffect(() => {
    if (!autoCheckUpdate) return;
    const timer = setTimeout(async () => {
      const result = await checkForUpdate();
      if (result.hasUpdate && enableUpdateDialog) {
        setUpdateInfo({
          currentVersion: result.currentVersion,
          latestVersion: result.latestVersion!,
        });
      }
    }, 3000); // Delay 3s to let app fully load
    return () => clearTimeout(timer);
  }, [autoCheckUpdate, enableUpdateDialog]);

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
      setSettingsInitialCategory(category ?? 'generation');
      setShowSettings(true);
    });
    return unsubscribe;
  }, []);

  const handleBack = () => {
    closeProject();
  };

  const handleCheckUpdate = async (): Promise<'has-update' | 'up-to-date' | 'failed'> => {
    const result = await checkForUpdate();
    if (result.hasUpdate) {
      if (enableUpdateDialog) {
        setUpdateInfo({
          currentVersion: result.currentVersion,
          latestVersion: result.latestVersion!,
        });
      }
      return 'has-update';
    }
    if (result.error) return 'failed';
    return 'up-to-date';
  };

  return (
    <ReactFlowProvider>
      <ErrorBoundary>
        <div className="w-full h-full flex flex-col bg-bg-dark">
          <TitleBar
            onSettingsClick={() => {
              setSettingsInitialCategory('generation');
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
            onCheckUpdate={handleCheckUpdate}
          />

          {updateInfo && (
            <UpdateAvailableDialog
              isOpen={true}
              onClose={() => setUpdateInfo(null)}
              currentVersion={updateInfo.currentVersion}
              latestVersion={updateInfo.latestVersion}
            />
          )}
        </div>
      </ErrorBoundary>
    </ReactFlowProvider>
  );
}