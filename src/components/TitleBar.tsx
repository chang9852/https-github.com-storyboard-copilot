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
  const appTitle = '分镜助手';
  const titleText = currentProjectName ? `${currentProjectName}` : appTitle;

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

  return (
    <div
      className="h-11 flex items-center justify-between bg-[#1a1a2e] border-b border-[#2a2a4a] select-none z-50 relative"
      onMouseDown={handleDragStart}
    >
      {/* 左侧：Logo + 标题 */}
      <div className="flex-1 h-full flex items-center px-4 cursor-move gap-3">
        {showBackButton && onBackClick && (
          <button
            type="button"
            data-no-drag="true"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onBackClick();
            }}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-all duration-200 hover:scale-105"
            title="返回"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-400 hover:text-white">
              <path d="M10 3L5 8l5 5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}

        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="1.5">
              <rect x="2" y="2" width="5" height="5" rx="1" />
              <rect x="9" y="2" width="5" height="5" rx="1" />
              <rect x="2" y="9" width="5" height="5" rx="1" />
              <rect x="9" y="9" width="5" height="5" rx="1" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-white/90 tracking-wide">
            {titleText}
          </span>
        </div>
      </div>

      {/* 右侧：控制按钮 */}
      <div className="flex items-center h-full">
        {/* 主题切换 */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleTheme();
          }}
          data-no-drag="true"
          onMouseDown={(e) => e.stopPropagation()}
          className="h-full px-3 hover:bg-white/10 transition-all duration-200 group"
          title={theme === 'dark' ? '浅色模式' : '深色模式'}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-400 group-hover:text-white transition-colors">
            {theme === 'dark' ? (
              <path d="M8 12a4 4 0 100-8 4 4 0 000 8zM8 2v1M8 13v1M2 8h1M13 8h1M4.93 4.93l.71.71M10.36 10.36l.71.71M4.93 11.07l.71-.71M10.36 5.64l.71-.71" strokeLinecap="round" />
            ) : (
              <path d="M12 10a6 6 0 01-6-6 6 6 0 016 6z" strokeLinecap="round" strokeLinejoin="round" />
            )}
          </svg>
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
          className="h-full px-3 hover:bg-white/10 transition-all duration-200 group"
          title="设置"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-400 group-hover:text-white transition-colors">
            <circle cx="8" cy="8" r="2" />
            <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" strokeLinecap="round" />
          </svg>
        </button>

        {/* 窗口控制（非Mac） */}
        {!isMac && (
          <>
            <div className="w-px h-4 bg-white/10 mx-1" />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleMinimize();
              }}
              data-no-drag="true"
              onMouseDown={(e) => e.stopPropagation()}
              className="h-full px-3 hover:bg-white/10 transition-all duration-200 group"
              title="最小化"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-400 group-hover:text-white transition-colors">
                <path d="M1 5h8" strokeLinecap="round" />
              </svg>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleMaximize();
              }}
              data-no-drag="true"
              onMouseDown={(e) => e.stopPropagation()}
              className="h-full px-3 hover:bg-white/10 transition-all duration-200 group"
              title="最大化"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-400 group-hover:text-white transition-colors">
                <rect x="1" y="1" width="8" height="8" rx="1" />
              </svg>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleClose();
              }}
              data-no-drag="true"
              onMouseDown={(e) => e.stopPropagation()}
              className="h-full px-3 hover:bg-red-500 transition-all duration-200 group"
              title="关闭"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-400 group-hover:text-white transition-colors">
                <path d="M1 1l8 8M9 1l-8 8" strokeLinecap="round" />
              </svg>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
