import { useState } from 'react';
import { useProjectStore } from '@/stores/projectStore';

interface LeftSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const TEMPLATES = [
  { id: '15', name: '15镜头故事板', shots: 15, icon: '15' },
  { id: '25', name: '25镜头故事板', shots: 25, icon: '25' },
  { id: '30', name: '30镜头长片', shots: 30, icon: '30' },
];

export function LeftSidebar({ collapsed, onToggle }: LeftSidebarProps) {
  const { projects, currentProject, openProject, createProject } = useProjectStore();
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  const handleCreateProject = () => {
    if (newProjectName.trim()) {
      createProject(newProjectName.trim());
      setNewProjectName('');
      setIsCreating(false);
    }
  };

  if (collapsed) {
    return (
      <div className="w-14 h-full bg-[#111118] border-r border-white/[0.04] flex flex-col items-center py-4 gap-3">
        <button
          onClick={onToggle}
          className="w-8 h-8 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center transition-all duration-200"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white/50">
            <path d="M2 4h12M2 8h12M2 12h12" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="w-56 h-full bg-[#111118] border-r border-white/[0.04] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/[0.04]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="1.5">
                <rect x="2" y="2" width="5" height="5" rx="1" />
                <rect x="9" y="2" width="5" height="5" rx="1" />
                <rect x="2" y="9" width="5" height="5" rx="1" />
                <rect x="9" y="9" width="5" height="5" rx="1" />
              </svg>
            </div>
            <span className="text-[13px] font-semibold text-white/90 tracking-tight">Storyboard</span>
          </div>
          <button
            onClick={onToggle}
            className="w-6 h-6 rounded-lg hover:bg-white/[0.06] flex items-center justify-center transition-all duration-200"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white/30">
              <path d="M2 4h12M2 8h12M2 12h12" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {/* Projects */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2.5 px-1">
            <span className="text-[10px] font-medium text-white/30 uppercase tracking-widest">Projects</span>
            <button
              onClick={() => setIsCreating(true)}
              className="w-5 h-5 rounded-md hover:bg-white/[0.06] flex items-center justify-center transition-all"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white/40">
                <path d="M5 2v6M2 5h6" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {isCreating && (
            <div className="mb-2">
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
                placeholder="新项目名称..."
                className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-[12px] text-white placeholder-white/20 focus:outline-none focus:border-violet-500/40 transition-all"
                autoFocus
              />
            </div>
          )}

          <div className="space-y-0.5">
            {projects.map((project) => (
              <button
                key={project.id}
                onClick={() => openProject(project.id)}
                className={`w-full px-3 py-2 rounded-lg text-left transition-all duration-200 ${
                  currentProject?.id === project.id
                    ? 'bg-violet-500/10 border border-violet-500/20'
                    : 'hover:bg-white/[0.04] border border-transparent'
                }`}
              >
                <div className="text-[12px] text-white/70 truncate">{project.name}</div>
                <div className="text-[10px] text-white/25 mt-0.5 font-mono">
                  {project.cells.length} nodes
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* API Status */}
        <div className="mb-5">
          <span className="text-[10px] font-medium text-white/30 uppercase tracking-widest px-1">API</span>
          <div className="mt-2 p-2.5 bg-white/[0.02] rounded-xl border border-white/[0.04]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                  <span className="text-[9px] font-bold text-white">K</span>
                </div>
                <span className="text-[11px] text-white/50">KIE API</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/50" />
                <span className="text-[9px] text-emerald-400/80 font-medium">ON</span>
              </div>
            </div>
          </div>
        </div>

        {/* Templates */}
        <div>
          <span className="text-[10px] font-medium text-white/30 uppercase tracking-widest px-1">Templates</span>
          <div className="mt-2 space-y-1">
            {TEMPLATES.map((template) => (
              <button
                key={template.id}
                className="w-full px-3 py-2 bg-white/[0.02] hover:bg-white/[0.05] rounded-lg border border-white/[0.04] hover:border-white/[0.08] transition-all duration-200 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-white/50 group-hover:text-white/70 transition-colors">{template.name}</span>
                  <span className="text-[10px] text-white/20 font-mono">{template.shots}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-white/[0.04]">
        <div className="text-[9px] text-white/20 text-center font-mono">
          v1.0.0
        </div>
      </div>
    </div>
  );
}
