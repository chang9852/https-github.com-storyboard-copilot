import { create } from "zustand";
import type { Project, StoryboardCell, Connection } from "@/types/project";

interface ProjectStore {
  projects: Project[];
  currentProject: Project | null;

  // Project operations
  loadProjects: () => void;
  createProject: (name: string, description?: string) => Project;
  deleteProject: (id: string) => void;
  openProject: (id: string) => void;
  closeProject: () => void;
  updateProject: (updates: Partial<Project>) => void;

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

const STORAGE_KEY = "storyboard-projects";

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

function saveToStorage(projects: Project[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

function loadFromStorage(): Project[] {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  projects: [],
  currentProject: null,
  selectedCellId: null,

  loadProjects: () => {
    const projects = loadFromStorage();
    set({ projects });
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
    saveToStorage(projects);
    set({ projects });
    return project;
  },

  deleteProject: (id) => {
    const projects = get().projects.filter((p) => p.id !== id);
    saveToStorage(projects);
    set((state) => ({
      projects,
      currentProject: state.currentProject?.id === id ? null : state.currentProject,
    }));
  },

  openProject: (id) => {
    const project = get().projects.find((p) => p.id === id);
    if (project) {
      set({ currentProject: project, selectedCellId: null });
    }
  },

  closeProject: () => {
    set({ currentProject: null, selectedCellId: null });
  },

  updateProject: (updates) => {
    const { currentProject, projects } = get();
    if (!currentProject) return;

    const updated = { ...currentProject, ...updates, updatedAt: new Date().toISOString() };
    const updatedProjects = projects.map((p) => (p.id === updated.id ? updated : p));

    saveToStorage(updatedProjects);
    set({ currentProject: updated, projects: updatedProjects });
  },

  addCell: (cell) => {
    const { currentProject, projects } = get();
    if (!currentProject) return;

    const updated = {
      ...currentProject,
      cells: [...currentProject.cells, cell],
      updatedAt: new Date().toISOString(),
    };
    const updatedProjects = projects.map((p) => (p.id === updated.id ? updated : p));

    saveToStorage(updatedProjects);
    set({ currentProject: updated, projects: updatedProjects });
  },

  updateCell: (id, updates) => {
    const { currentProject, projects } = get();
    if (!currentProject) return;

    const updated = {
      ...currentProject,
      cells: currentProject.cells.map((c) => {
        if (c.id !== id) return c;
        return maybeApplyImageAutoResize(c, updates);
      }),
      updatedAt: new Date().toISOString(),
    };
    const updatedProjects = projects.map((p) => (p.id === updated.id ? updated : p));

    saveToStorage(updatedProjects);
    set({ currentProject: updated, projects: updatedProjects });
  },

  deleteCell: (id) => {
    const { currentProject, projects } = get();
    if (!currentProject) return;

    const updated = {
      ...currentProject,
      cells: currentProject.cells.filter((c) => c.id !== id),
      connections: currentProject.connections.filter(
        (conn) => conn.fromCellId !== id && conn.toCellId !== id
      ),
      updatedAt: new Date().toISOString(),
    };
    const updatedProjects = projects.map((p) => (p.id === updated.id ? updated : p));

    saveToStorage(updatedProjects);
    set({
      currentProject: updated,
      projects: updatedProjects,
      selectedCellId: get().selectedCellId === id ? null : get().selectedCellId,
    });
  },

  addConnection: (connection) => {
    const { currentProject, projects } = get();
    if (!currentProject) return;

    const updated = {
      ...currentProject,
      connections: [...currentProject.connections, connection],
      updatedAt: new Date().toISOString(),
    };
    const updatedProjects = projects.map((p) => (p.id === updated.id ? updated : p));

    saveToStorage(updatedProjects);
    set({ currentProject: updated, projects: updatedProjects });
  },

  deleteConnection: (id) => {
    const { currentProject, projects } = get();
    if (!currentProject) return;

    const updated = {
      ...currentProject,
      connections: currentProject.connections.filter((c) => c.id !== id),
      updatedAt: new Date().toISOString(),
    };
    const updatedProjects = projects.map((p) => (p.id === updated.id ? updated : p));

    saveToStorage(updatedProjects);
    set({ currentProject: updated, projects: updatedProjects });
  },

  selectCell: (id) => {
    set({ selectedCellId: id });
  },
}));
