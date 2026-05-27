import { useCallback } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useThemeStore } from '@/stores/themeStore';
import { useProjectStore } from '@/stores/projectStore';

interface TitleBarProps {
  onSettingsClick: () => void;
  showBackButton?: boolean;
  onBackClick?: () => void;
}

export function TitleBar({ onSettingsClick, showBackButton, onBackClick }: TitleBarProps) {
  const { theme, toggleTheme } = useThemeStore();
  const currentProjectName = useProjectStore((state) => state.currentProject?.name);

  const appWindow = getCurrentWindow();
  const isMac =
    typeof navigator !== 'undefined' &&
    /(Mac|iPhone|iPad|iPod)/i.test(`${navigator.platform} ${navigator.userAgent}`);
  const appTitle = 'Storyboard Copilot';
  const titleText = currentProjectName ? `${currentProjectName} - ${appTitle}` : appTitle;

  const handleMinimize = useCallback(async () => {
    await appWindow.minimize();
  }, [appWindow]);

  const handleMaximize = useCallback(async () => {
    const isMaximized = await appWindow.isMaximized();
    if (isMaximized) {
      await appWindow.unmaximize();
    } else {
      await appWindow.maximize();
    }
  }, [appWindow]);

  const handleClose = useCallback(async () => {
    await appWindow.close();
  }, [appWindow]);

  const handleDragStart = useCallback(async (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement | null;
    if (target?.closest('button') || target?.closest('[data-no-drag="true"]')) {
      return;
    }
    await appWindow.startDragging();
  }, [appWindow]);

  const handleThemeClick = useCallback(() => {
    toggleTheme();
  }, [toggleTheme]);

  return (
    <div className="h-10 flex items-center justify-between bg-surface-dark border-b border-border-dark select-none z-50 relative">
      <div
        className="flex-1 h-full flex items-center px-4 cursor-move"
        onMouseDown={handleDragStart}
      >
        {showBackButton && onBackClick && (
          <button
            type="button"
            data-no-drag="true"
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onBackClick();
            }}
            className="mr-3 p-1 hover:bg-bg-dark rounded transition-colors"
            title="Back"
          >
            <span className="w-4 h-4 text-text-muted hover:text-text-dark">←</span>
          </button>
        )}
        <span className="text-sm font-semibold text-text-dark">
          {titleText}
        </span>
      </div>

      <div className="flex items-center h-full">
        <button
          type="button"
          onClick={handleThemeClick}
          className="h-full px-3 hover:bg-bg-dark transition-colors"
          title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
        >
          <span className="w-4 h-4 text-text-muted">{theme === 'dark' ? '☀' : '☾'}</span>
        </button>

        <button
          type="button"
          onClick={onSettingsClick}
          className="h-full px-3 hover:bg-bg-dark transition-colors"
          title="Settings"
        >
          <span className="w-4 h-4 text-text-muted">⚙</span>
        </button>

        {!isMac && (
          <>
            <div className="w-px h-4 bg-border-dark mx-1" />
            <button
              type="button"
              onClick={handleMinimize}
              className="h-full px-3 hover:bg-bg-dark transition-colors"
              title="Minimize"
            >
              <span className="w-4 h-4 text-text-muted hover:text-text-dark">−</span>
            </button>
            <button
              type="button"
              onClick={handleMaximize}
              className="h-full px-3 hover:bg-bg-dark transition-colors"
              title="Maximize"
            >
              <span className="w-4 h-4 text-text-muted hover:text-text-dark">□</span>
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="h-full px-3 hover:bg-red-500 transition-colors group"
              title="Close"
            >
              <span className="w-4 h-4 text-text-muted group-hover:text-white">×</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
