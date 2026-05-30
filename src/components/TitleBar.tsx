import { useCallback } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Minus, X, Maximize2, Settings, ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Moon, Sun, Languages } from 'lucide-react';
import { useSettingsStore } from '@/stores/settingsStore';
import { useProjectStore } from '@/stores/projectStore';

interface TitleBarProps {
  onSettingsClick: () => void;
  showBackButton?: boolean;
  onBackClick?: () => void;
}

export function TitleBar({ onSettingsClick, showBackButton, onBackClick }: TitleBarProps) {
  const { t, i18n } = useTranslation();
  const theme = useSettingsStore((state) => state.theme);
  const toggleTheme = useSettingsStore((state) => state.toggleTheme);
  const currentProjectName = useProjectStore((state) => state.currentProject?.name);

  const appWindow = getCurrentWindow();
  const isMac =
    typeof navigator !== 'undefined' &&
    /(Mac|iPhone|iPad|iPod)/i.test(`${navigator.platform} ${navigator.userAgent}`);
  const appTitle = t('app.name');
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

  const handleLanguageClick = useCallback(() => {
    const newLang = i18n.language.startsWith('zh') ? 'en' : 'zh';
    i18n.changeLanguage(newLang);
  }, [i18n]);

  const handleThemeClick = useCallback(() => {
    toggleTheme();
  }, [toggleTheme]);

  return (
    <div
      className="h-10 flex items-center justify-between bg-surface-dark border-b border-border-dark select-none z-50 relative"
      onMouseDown={handleDragStart}
    >
      {/* 左侧：标题 */}
      <div className="flex-1 h-full flex items-center px-4 cursor-move">
        {showBackButton && onBackClick && (
          <button
            type="button"
            data-no-drag="true"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onBackClick();
            }}
            className="mr-3 p-1 hover:bg-bg-dark rounded transition-colors"
            title={t('nav.canvas')}
          >
            <ArrowLeft className="w-4 h-4 text-text-muted hover:text-text-dark" />
          </button>
        )}

        <span className="text-sm font-semibold text-text-dark">
          {titleText}
        </span>
      </div>

      {/* 右侧：控制按钮 */}
      <div className="flex items-center h-full">
        {/* 语言切换 */}
        <button
          type="button"
          onClick={handleLanguageClick}
          data-no-drag="true"
          onMouseDown={(e) => e.stopPropagation()}
          className="h-full px-3 hover:bg-bg-dark transition-colors"
          title={i18n.language.startsWith('zh') ? 'Switch to English' : '切换到中文'}
        >
          <Languages className="w-4 h-4 text-text-muted" />
        </button>

        {/* 主题切换 */}
        <button
          type="button"
          onClick={handleThemeClick}
          data-no-drag="true"
          onMouseDown={(e) => e.stopPropagation()}
          className="h-full px-3 hover:bg-bg-dark transition-colors"
          title={theme === 'dark' ? t('settings.theme_light') : t('settings.theme_dark')}
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-text-muted" />
          ) : (
            <Moon className="w-4 h-4 text-text-muted" />
          )}
        </button>

        {/* 设置 */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSettingsClick();
          }}
          data-no-drag="true"
          onMouseDown={(e) => e.stopPropagation()}
          className="h-full px-3 hover:bg-bg-dark transition-colors"
          title={t('settings.title')}
        >
          <Settings className="w-4 h-4 text-text-muted" />
        </button>

        {/* 窗口控制（非Mac） */}
        {!isMac && (
          <>
            <div className="w-px h-4 bg-border-dark mx-1" />

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleMinimize();
              }}
              data-no-drag="true"
              onMouseDown={(e) => e.stopPropagation()}
              className="h-full px-3 hover:bg-bg-dark transition-colors"
              title={t('common.close')}
            >
              <Minus className="w-4 h-4 text-text-muted hover:text-text-dark" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleMaximize();
              }}
              data-no-drag="true"
              onMouseDown={(e) => e.stopPropagation()}
              className="h-full px-3 hover:bg-bg-dark transition-colors"
              title={t('common.close')}
            >
              <Maximize2 className="w-4 h-4 text-text-muted hover:text-text-dark" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleClose();
              }}
              data-no-drag="true"
              onMouseDown={(e) => e.stopPropagation()}
              className="h-full px-3 hover:bg-red-500 transition-colors group"
              title={t('common.close')}
            >
              <X className="w-4 h-4 text-text-muted group-hover:text-white" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}