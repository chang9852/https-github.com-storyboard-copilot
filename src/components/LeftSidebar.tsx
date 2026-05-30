import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, FolderOpen, LayoutGrid } from 'lucide-react';
import { useProjectStore } from '@/stores/projectStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { getConfiguredApiKeyCount } from '@/stores/settingsStore';
import { listModelProviders } from '@/features/canvas/models';
import { useMemo } from 'react';

interface LeftSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function LeftSidebar({ collapsed, onToggle }: LeftSidebarProps) {
  const { t } = useTranslation();
  const { projects, currentProject, openProject, createProject, renameProject } = useProjectStore();
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingProjectName, setEditingProjectName] = useState('');

  const providerIds = useMemo(() => listModelProviders().map((provider) => provider.id), []);
  const configuredApiKeyCount = useSettingsStore((state) =>
    getConfiguredApiKeyCount(state.apiKeys, providerIds)
  );

  const handleCreateProject = () => {
    if (newProjectName.trim()) {
      createProject(newProjectName.trim());
      setNewProjectName('');
      setIsCreating(false);
    }
  };

  const handleRenameConfirm = () => {
    if (editingProjectId && editingProjectName.trim()) {
      renameProject(editingProjectId, editingProjectName.trim());
      setEditingProjectId(null);
      setEditingProjectName('');
    }
  };

  if (collapsed) {
    return (
      <div className="w-14 h-full bg-surface-dark border-r border-border-dark flex flex-col items-center py-4 gap-3">
        <button
          onClick={onToggle}
          className="w-8 h-8 rounded-xl bg-[var(--ui-surface-field)] hover:bg-bg-dark flex items-center justify-center transition-all duration-200"
        >
          <LayoutGrid className="w-4 h-4 text-text-muted" />
        </button>
      </div>
    );
  }

  return (
    <div className="w-56 h-full bg-surface-dark border-r border-border-dark flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border-dark">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-accent/20 flex items-center justify-center">
              <LayoutGrid className="w-4 h-4 text-accent" />
            </div>
            <span className="text-[13px] font-semibold text-text-dark tracking-tight">{t('app.name')}</span>
          </div>
          <button
            onClick={onToggle}
            className="w-6 h-6 rounded-lg hover:bg-bg-dark flex items-center justify-center transition-all duration-200"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-muted">
              <path d="M2 4h12M2 8h12M2 12h12" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 ui-scrollbar">
        {/* Projects */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2.5 px-1">
            <span className="text-[10px] font-medium text-text-muted uppercase tracking-widest">{t('nav.projects')}</span>
            <button
              onClick={() => setIsCreating(true)}
              className="w-5 h-5 rounded-md hover:bg-bg-dark flex items-center justify-center transition-all"
            >
              <Plus className="w-3.5 h-3.5 text-text-muted" />
            </button>
          </div>

          {isCreating && (
            <div className="mb-2">
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
                placeholder={t('project.namePlaceholder')}
                className="w-full px-3 py-2 bg-[var(--ui-surface-field)] border border-[var(--ui-border-soft)] rounded-[var(--ui-radius-lg)] text-[12px] text-text placeholder:text-text-muted/60 focus:outline-none focus:border-accent focus:shadow-[0_0_0_2px_rgba(var(--accent-rgb),0.12)] transition-all"
                autoFocus
              />
            </div>
          )}

          <div className="space-y-0.5">
            {projects.map((project) => (
              <div
                key={project.id}
                className="group"
              >
                {editingProjectId === project.id ? (
                  <input
                    type="text"
                    value={editingProjectName}
                    onChange={(e) => setEditingProjectName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRenameConfirm();
                      if (e.key === 'Escape') {
                        setEditingProjectId(null);
                        setEditingProjectName('');
                      }
                    }}
                    onBlur={handleRenameConfirm}
                    className="w-full px-3 py-2 bg-[var(--ui-surface-field)] border border-accent/40 rounded-[var(--ui-radius-lg)] text-[12px] text-text focus:outline-none"
                    autoFocus
                  />
                ) : (
                  <button
                    onClick={() => openProject(project.id)}
                    onDoubleClick={() => {
                      setEditingProjectId(project.id);
                      setEditingProjectName(project.name);
                    }}
                    className={`w-full px-3 py-2 rounded-[var(--ui-radius-lg)] text-left transition-all duration-200 ${
                      currentProject?.id === project.id
                        ? 'bg-accent/10 border border-accent/20'
                        : 'hover:bg-bg-dark border border-transparent'
                    }`}
                  >
                    <div className="text-[12px] text-text-dark truncate">{project.name}</div>
                    <div className="text-[10px] text-text-muted mt-0.5">
                      {project.cells.length} nodes
                    </div>
                  </button>
                )}
              </div>
            ))}
          </div>

          {projects.length === 0 && !isCreating && (
            <div className="flex flex-col items-center py-6 text-text-muted">
              <FolderOpen className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-xs">{t('project.empty')}</p>
            </div>
          )}
        </div>

        {/* API Status */}
        <div className="mb-5">
          <span className="text-[10px] font-medium text-text-muted uppercase tracking-widest px-1">API</span>
          <div className="mt-2 p-2.5 bg-[var(--ui-surface-field)] rounded-[var(--ui-radius-xl)] border border-[var(--ui-border-soft)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-accent/20 flex items-center justify-center">
                  <span className="text-[9px] font-bold text-accent">K</span>
                </div>
                <span className="text-[11px] text-text-muted">KIE API</span>
              </div>
              <div className="flex items-center gap-1">
                <div className={`w-1.5 h-1.5 rounded-full ${configuredApiKeyCount > 0 ? 'bg-success shadow-lg shadow-success/50' : 'bg-danger/60'}`} />
                <span className={`text-[9px] font-medium ${configuredApiKeyCount > 0 ? 'text-success/80' : 'text-danger/80'}`}>
                  {configuredApiKeyCount > 0 ? 'ON' : 'OFF'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-border-dark">
        <div className="text-[9px] text-text-muted text-center font-mono">
          v1.0.0
        </div>
      </div>
    </div>
  );
}