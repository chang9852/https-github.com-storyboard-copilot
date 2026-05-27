import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useProjectStore } from "@/stores/projectStore";
import { Dialog, Input, UiButton } from "@/components/ui";

type SortField = "createdAt" | "updatedAt" | "name";
type SortOrder = "desc" | "asc";

export function ProjectList() {
  const { t } = useTranslation();
  const { projects, createProject, deleteProject, openProject } = useProjectStore();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [sortField, setSortField] = useState<SortField>("updatedAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const sortedProjects = useMemo(() => {
    const sorted = [...projects].sort((a, b) => {
      let comparison = 0;
      if (sortField === "name") {
        comparison = a.name.localeCompare(b.name);
      } else {
        const dateA = new Date(a[sortField]).getTime();
        const dateB = new Date(b[sortField]).getTime();
        comparison = dateA - dateB;
      }
      return sortOrder === "desc" ? -comparison : comparison;
    });
    return sorted;
  }, [projects, sortField, sortOrder]);

  const handleCreate = () => {
    if (newName.trim()) {
      const project = createProject(newName.trim(), newDesc.trim());
      setNewName("");
      setNewDesc("");
      setShowCreate(false);
      openProject(project.id);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-surface shrink-0">
        <h1 className="text-sm font-semibold">{t("project.title")}</h1>

        <div className="flex items-center gap-2">
          {/* Sort control */}
          <div className="flex items-center gap-1 bg-[var(--ui-surface-field)] border border-[color:var(--ui-border-soft)] rounded-lg px-2 py-1">
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as SortField)}
              className="bg-transparent text-xs text-text-muted outline-none cursor-pointer hover:text-text transition-colors"
            >
              <option value="updatedAt">最后更新</option>
              <option value="createdAt">创建日期</option>
              <option value="name">名称</option>
            </select>
            <div className="w-px h-3 bg-border" />
            <button
              onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
              className="text-text-muted hover:text-text transition-colors"
              title={sortOrder === "desc" ? "降序" : "升序"}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                {sortOrder === "desc" ? (
                  <path d="M3 4h6M3 7h4M3 10h2" strokeLinecap="round" />
                ) : (
                  <path d="M3 10h6M3 7h4M3 4h2" strokeLinecap="round" />
                )}
              </svg>
            </button>
          </div>

          {/* Create button */}
          <UiButton variant="primary" size="sm" onClick={() => setShowCreate(true)}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 2V12M2 7H12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            {t("project.create")}
          </UiButton>
        </div>
      </div>

      {/* Project grid */}
      <div className="flex-1 overflow-auto p-5">
        {sortedProjects.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-text-muted">
            <div className="w-16 h-16 rounded-2xl bg-[var(--ui-surface-field)] border border-[color:var(--ui-border-soft)] flex items-center justify-center mb-4">
              <svg width="28" height="28" viewBox="0 0 32 32" fill="none" className="opacity-40">
                <rect x="4" y="4" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
                <rect x="18" y="4" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
                <rect x="4" y="18" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
                <rect x="18" y="18" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
              </svg>
            </div>
            <p className="text-sm mb-1">{t("project.empty")}</p>
            <p className="text-xs opacity-60">点击创建按钮开始</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {sortedProjects.map((project) => (
              <div
                key={project.id}
                className="group relative border border-[color:var(--ui-border-soft)] bg-[var(--ui-surface-field)] rounded-xl p-3 cursor-pointer hover:border-accent/40 hover:shadow-md transition-all duration-150"
                onClick={() => openProject(project.id)}
              >
                {/* Preview */}
                <div className="aspect-video bg-surface rounded-lg mb-2.5 flex items-center justify-center overflow-hidden">
                  {project.cells.length > 0 ? (
                    <div className="grid grid-cols-2 gap-1 w-full h-full p-1.5">
                      {project.cells.slice(0, 4).map((cell) => (
                        <div
                          key={cell.id}
                          className="bg-[var(--ui-surface-field)] rounded overflow-hidden"
                        >
                          {cell.imageUrl ? (
                            <img
                              src={cell.imageUrl}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-text-muted text-[10px] px-1">
                              {cell.prompt?.slice(0, 10) || "..."}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <svg width="24" height="24" viewBox="0 0 32 32" fill="none" className="text-text-muted opacity-25">
                      <rect x="4" y="4" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
                      <rect x="18" y="4" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
                      <rect x="4" y="18" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
                      <rect x="18" y="18" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                  )}
                </div>

                {/* Info */}
                <h3 className="text-xs font-medium truncate">{project.name}</h3>
                <p className="text-[10px] text-text-muted mt-0.5">
                  {new Date(project.updatedAt).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
                </p>

                {/* Delete button */}
                <button
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 rounded-md bg-[var(--ui-surface-panel)] hover:bg-danger/10 hover:text-danger transition-all"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(t("project.dialog.confirm") + "?")) {
                      deleteProject(project.id);
                    }
                  }}
                >
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                    <path d="M3 3L9 9M9 3L3 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title={t("project.dialog.create_title")}
        onConfirm={handleCreate}
        confirmText={t("project.dialog.confirm")}
        cancelText={t("project.dialog.cancel")}
      >
        <div className="flex flex-col gap-4">
          <Input
            label={t("project.dialog.name_placeholder")}
            placeholder={t("project.dialog.name_placeholder")}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            autoFocus
          />
          <Input
            label={t("project.dialog.desc_placeholder")}
            placeholder={t("project.dialog.desc_placeholder")}
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
          />
        </div>
      </Dialog>
    </div>
  );
}
