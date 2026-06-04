import { create } from "zustand";
import type { Project, StoryboardCell, Connection } from "@/types/project";
import {
  listProjectSummaries,
  getProjectRecord,
  upsertProjectRecord,
  renameProjectRecord,
  deleteProjectRecord,
  type ProjectSummaryRecord,
  type ProjectRecord as TauriProjectRecord,
} from "@/commands/projectState";

const UPSERT_DEBOUNCE_MS = 260;
const IDLE_PERSIST_TIMEOUT_MS = 1200;
const FALLBACK_IDLE_DELAY_MS = 64;

interface ProjectStore {
  projects: Project[];
  currentProject: Project | null;
  isOpeningProject: boolean;
  isHydrated: boolean;

  // Project operations
  hydrate: () => Promise<void>;
  loadProjects: () => void;
  createProject: (name: string, description?: string) => Project;
  deleteProject: (id: string) => void;
  openProject: (id: string) => void;
  closeProject: () => void;
  updateProject: (updates: Partial<Project>) => void;
  renameProject: (id: string, name: string) => void;

  // Cell operations
  addCell: (cell: StoryboardCell) => void;
  updateCell: (id: string, updates: Partial<StoryboardCell>) => void;
  deleteCell: (id: string) => void;

  // Connection operations
  addConnection: (connection: Connection) => void;
  deleteConnection: (id: string) => void;

  // Selection
  selectedCellId: string | null;
  selectCell: (id: string | null) => void;
}

const EXPORT_RESULT_NODE_DEFAULT_WIDTH = 384;
const EXPORT_RESULT_NODE_MIN_WIDTH = 168;
const EXPORT_RESULT_NODE_MIN_HEIGHT = 168;

function parseAspectRatioValue(aspectRatio: string): number {
  const [rawWidth = '1', rawHeight = '1'] = aspectRatio.split(':');
  const width = Number(rawWidth);
  const height = Number(rawHeight);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return 1;
  }
  return width / height;
}

function isImageAutoResizableType(cellType?: string): boolean {
  return cellType === 'upload_image' || cellType === 'ai_image';
}

function maybeApplyImageAutoResize(
  cell: StoryboardCell,
  updates: Partial<StoryboardCell>
): StoryboardCell {
  if (!isImageAutoResizableType(cell.cellType)) {
    return cell;
  }

  const hasImageRelatedChange = 'imageUrl' in updates || 'aspectRatio' in updates;
  if (!hasImageRelatedChange) {
    return cell;
  }

  const isSizeManuallyAdjusted = (updates as any).isSizeManuallyAdjusted ?? (cell as any).isSizeManuallyAdjusted ?? false;
  if (isSizeManuallyAdjusted) {
    return cell;
  }

  const nextImageUrl = updates.imageUrl ?? cell.imageUrl;
  if (typeof nextImageUrl !== 'string' || nextImageUrl.trim().length === 0) {
    return cell;
  }

  const nextAspectRatio = updates.aspectRatio ?? (cell as any).aspectRatio ?? '1:1';
  const aspectValue = parseAspectRatioValue(nextAspectRatio);
  const nextWidth = Math.max(EXPORT_RESULT_NODE_MIN_WIDTH, cell.size?.width ?? EXPORT_RESULT_NODE_DEFAULT_WIDTH);
  const nextHeight = Math.max(
    EXPORT_RESULT_NODE_MIN_HEIGHT,
    Math.round(nextWidth / Math.max(0.1, aspectValue))
  );

  return {
    ...cell,
    size: { width: nextWidth, height: nextHeight },
  };
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// --- Debounced SQLite Persistence ---

const queuedProjectUpserts = new Map<string, Project>();
const projectUpsertTimers = new Map<string, ReturnType<typeof setTimeout>>();
const projectUpsertsInFlight = new Set<string>();
const deletingProjectIds = new Set<string>();

interface FlushOptions {
  bypassIdle?: boolean;
}

function scheduleIdlePersist(task: () => void): void {
  const idleHost = globalThis as typeof globalThis & {
    requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
  };

  if (typeof idleHost.requestIdleCallback === 'function') {
    idleHost.requestIdleCallback(task, { timeout: IDLE_PERSIST_TIMEOUT_MS });
    return;
  }

  setTimeout(task, FALLBACK_IDLE_DELAY_MS);
}

function flushProjectUpsert(projectId: string, options?: FlushOptions): void {
  if (deletingProjectIds.has(projectId) || projectUpsertsInFlight.has(projectId)) {
    return;
  }

  const project = queuedProjectUpserts.get(projectId);
  if (!project) {
    return;
  }

  queuedProjectUpserts.delete(projectId);
  projectUpsertsInFlight.add(projectId);

  const settle = () => {
    projectUpsertsInFlight.delete(projectId);

    if (deletingProjectIds.has(projectId)) {
      return;
    }

    if (queuedProjectUpserts.has(projectId)) {
      flushProjectUpsert(projectId);
    }
  };

  const executePersist = () => {
    if (deletingProjectIds.has(projectId)) {
      settle();
      return;
    }

    const record = toTauriRecord(project);
    void upsertProjectRecord(record)
      .catch((error) => {
        console.error('Failed to persist project record', error);
      })
      .finally(settle);
  };

  if (options?.bypassIdle) {
    executePersist();
    return;
  }

  scheduleIdlePersist(executePersist);
}

function queueProjectUpsert(project: Project, immediate?: boolean): void {
  const projectId = project.id;
  deletingProjectIds.delete(projectId);
  queuedProjectUpserts.set(projectId, project);

  const existingTimer = projectUpsertTimers.get(projectId);
  if (existingTimer) {
    clearTimeout(existingTimer);
    projectUpsertTimers.delete(projectId);
  }

  const debounceMs = immediate ? 0 : UPSERT_DEBOUNCE_MS;
  if (debounceMs <= 0) {
    flushProjectUpsert(projectId, { bypassIdle: true });
    return;
  }

  const timer = setTimeout(() => {
    projectUpsertTimers.delete(projectId);
    flushProjectUpsert(projectId);
  }, debounceMs);
  projectUpsertTimers.set(projectId, timer);
}

function persistProject(project: Project, immediate?: boolean): void {
  queueProjectUpsert(project, immediate);
}

function clearQueuedProjectUpsert(projectId: string): void {
  const timer = projectUpsertTimers.get(projectId);
  if (timer) {
    clearTimeout(timer);
    projectUpsertTimers.delete(projectId);
  }
  queuedProjectUpserts.delete(projectId);
}

function persistProjectDelete(projectId: string): void {
  deletingProjectIds.add(projectId);
  clearQueuedProjectUpsert(projectId);

  const DELETE_RETRY_DELAY_MS = 80;
  const MAX_DELETE_RETRIES = 10;

  const attemptDelete = (retryCount: number): void => {
    if (projectUpsertsInFlight.has(projectId)) {
      if (retryCount >= MAX_DELETE_RETRIES) {
        deletingProjectIds.delete(projectId);
        return;
      }

      setTimeout(() => {
        attemptDelete(retryCount + 1);
      }, DELETE_RETRY_DELAY_MS);
      return;
    }

    void deleteProjectRecord(projectId)
      .catch((error) => {
        console.error('Failed to delete project record', error);
      })
      .finally(() => {
        deletingProjectIds.delete(projectId);
      });
  };

  attemptDelete(0);
}

// --- Serialization Helpers ---

function toTauriRecord(project: Project): TauriProjectRecord {
  return {
    id: project.id,
    name: project.name,
    createdAt: new Date(project.createdAt).getTime(),
    updatedAt: new Date(project.updatedAt).getTime(),
    nodeCount: project.cells?.length ?? 0,
    nodesJson: JSON.stringify(project.cells ?? []),
    edgesJson: JSON.stringify(project.connections ?? []),
    viewportJson: JSON.stringify({ x: 0, y: 0, zoom: 1 }),
    historyJson: JSON.stringify({ past: [], future: [] }),
  };
}

function fromTauriRecord(record: TauriProjectRecord): Project {
  let cells: StoryboardCell[] = [];
  let connections: Connection[] = [];

  try {
    cells = JSON.parse(record.nodesJson);
  } catch {
    cells = [];
  }
  try {
    connections = JSON.parse(record.edgesJson);
  } catch {
    connections = [];
  }

  return {
    id: record.id,
    name: record.name,
    description: '',
    createdAt: new Date(record.createdAt).toISOString(),
    updatedAt: new Date(record.updatedAt).toISOString(),
    cells,
    connections,
  };
}

function toProjectSummary(record: ProjectSummaryRecord): { id: string; name: string; createdAt: string; updatedAt: string; nodeCount: number } {
  return {
    id: record.id,
    name: record.name,
    createdAt: new Date(record.createdAt).toISOString(),
    updatedAt: new Date(record.updatedAt).toISOString(),
    nodeCount: record.nodeCount,
  };
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  projects: [],
  currentProject: null,
  selectedCellId: null,
  isOpeningProject: false,
  isHydrated: false,

  hydrate: async () => {
    if (get().isHydrated) {
      return;
    }

    try {
      const records = await listProjectSummaries();
      const projects = records.map(toProjectSummary).map((summary) => ({
        id: summary.id,
        name: summary.name,
        description: '',
        createdAt: summary.createdAt,
        updatedAt: summary.updatedAt,
        cells: [],
        connections: [],
      })).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      set({ projects, isHydrated: true });
    } catch (error) {
      console.error('Failed to hydrate project summaries from SQLite', error);
      set({ projects: [], isHydrated: true });
    }
  },

  loadProjects: () => {
    // Legacy alias - hydrate handles loading from SQLite
    void get().hydrate();
  },

  createProject: (name, description = "") => {
    const now = new Date().toISOString();
    const project: Project = {
      id: generateId(),
      name,
      description,
      createdAt: now,
      updatedAt: now,
      cells: [],
      connections: [],
    };

    const projects = [...get().projects, project];
    persistProject(project, true);
    set({ projects, currentProject: project });
    return project;
  },

  deleteProject: (id) => {
    const projects = get().projects.filter((p) => p.id !== id);
    persistProjectDelete(id);
    set((state) => ({
      projects,
      currentProject: state.currentProject?.id === id ? null : state.currentProject,
    }));
  },

  openProject: (id) => {
    set({ isOpeningProject: true });

    void (async () => {
      try {
        const record = await getProjectRecord(id);
        if (!record) {
          set({ isOpeningProject: false });
          return;
        }

        const project = fromTauriRecord(record);
        set((state) => ({
          currentProject: project,
          isOpeningProject: false,
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, updatedAt: project.updatedAt } : p
          ),
        }));
      } catch (error) {
        console.error('Failed to open project', error);
        set({ isOpeningProject: false });
      }
    })();
  },

  closeProject: () => {
    const { currentProject } = get();
    if (currentProject) {
      persistProject(currentProject, true);
    }
    set({ currentProject: null, selectedCellId: null });
  },

  updateProject: (updates) => {
    const { currentProject, projects } = get();
    if (!currentProject) return;

    const updated = { ...currentProject, ...updates, updatedAt: new Date().toISOString() };
    const updatedProjects = projects.map((p) => (p.id === updated.id ? updated : p));

    persistProject(updated);
    set({ currentProject: updated, projects: updatedProjects });
  },

  renameProject: (id, name) => {
    const { currentProject, projects } = get();
    const now = new Date().toISOString();

    const updatedProjects = projects.map((p) =>
      p.id === id ? { ...p, name, updatedAt: now } : p
    );

    if (currentProject?.id === id) {
      const updated = { ...currentProject, name, updatedAt: now };
      persistProject(updated, true);
      set({
        projects: updatedProjects,
        currentProject: updated,
      });
    } else {
      void renameProjectRecord(id, name, new Date(now).getTime()).catch((error) => {
        console.error('Failed to rename project record', error);
      });
      set({ projects: updatedProjects });
    }
  },

  addCell: (cell) => {
    const { currentProject, projects } = get();
    if (!currentProject) return;

    const updated: Project = {
      ...currentProject,
      cells: [...currentProject.cells, cell],
      updatedAt: new Date().toISOString(),
    };
    const updatedProjects = projects.map((p) => (p.id === updated.id ? updated : p));

    persistProject(updated);
    set({ currentProject: updated, projects: updatedProjects });
  },

  updateCell: (id, updates) => {
    const { currentProject, projects } = get();
    if (!currentProject) return;

    const updated: Project = {
      ...currentProject,
      cells: currentProject.cells.map((c) => {
        if (c.id !== id) return c;
        return maybeApplyImageAutoResize(c, updates);
      }),
      updatedAt: new Date().toISOString(),
    };
    const updatedProjects = projects.map((p) => (p.id === updated.id ? updated : p));

    persistProject(updated);
    set({ currentProject: updated, projects: updatedProjects });
  },

  deleteCell: (id) => {
    const { currentProject, projects } = get();
    if (!currentProject) return;

    const updated: Project = {
      ...currentProject,
      cells: currentProject.cells.filter((c) => c.id !== id),
      connections: currentProject.connections.filter(
        (conn) => conn.fromCellId !== id && conn.toCellId !== id
      ),
      updatedAt: new Date().toISOString(),
    };
    const updatedProjects = projects.map((p) => (p.id === updated.id ? updated : p));

    persistProject(updated);
    set({
      currentProject: updated,
      projects: updatedProjects,
      selectedCellId: get().selectedCellId === id ? null : get().selectedCellId,
    });
  },

  addConnection: (connection) => {
    const { currentProject, projects } = get();
    if (!currentProject) return;

    const updated: Project = {
      ...currentProject,
      connections: [...currentProject.connections, connection],
      updatedAt: new Date().toISOString(),
    };
    const updatedProjects = projects.map((p) => (p.id === updated.id ? updated : p));

    persistProject(updated);
    set({ currentProject: updated, projects: updatedProjects });
  },

  deleteConnection: (id) => {
    const { currentProject, projects } = get();
    if (!currentProject) return;

    const updated: Project = {
      ...currentProject,
      connections: currentProject.connections.filter((c) => c.id !== id),
      updatedAt: new Date().toISOString(),
    };
    const updatedProjects = projects.map((p) => (p.id === updated.id ? updated : p));

    persistProject(updated);
    set({ currentProject: updated, projects: updatedProjects });
  },

  selectCell: (id) => {
    set({ selectedCellId: id });
  },
}));