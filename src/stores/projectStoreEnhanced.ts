import { create } from "zustand";
import type { Project, StoryboardCell, Connection } from "@/types/project";
import { sqlitePersistence } from "@/features/canvas/infrastructure/sqlitePersistence";
import {
  encodeProjectImages,
  decodeProjectImages,
} from "@/features/canvas/infrastructure/imageReferencePool";

// Debounce utility
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function debounce<T extends (...args: any[]) => any>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }) as T;
}

// Idle callback utility
function scheduleIdleCallback(fn: () => void): void {
  if ("requestIdleCallback" in window) {
    (window as { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(fn);
  } else {
    setTimeout(fn, 100);
  }
}

interface ProjectStoreEnhanced {
  projects: Project[];
  currentProject: Project | null;

  // Project operations
  loadProjects: () => Promise<void>;
  createProject: (name: string, description?: string) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;
  openProject: (id: string) => Promise<void>;
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

  // Viewport (lightweight channel)
  viewport: { x: number; y: number; scale: number };
  updateViewport: (viewport: { x: number; y: number; scale: number }) => void;
}

// Full project save (debounced + idle scheduling)
const saveFullProject = debounce((project: Project) => {
  scheduleIdleCallback(async () => {
    try {
      const encoded = encodeProjectImages(project);
      await sqlitePersistence.saveProject(encoded);
    } catch (e) {
      console.error("Failed to save project:", e);
    }
  });
}, 1000);

// Viewport save (independent debounce)
const saveViewport = debounce((projectId: string, viewport: { x: number; y: number; scale: number }) => {
  scheduleIdleCallback(async () => {
    try {
      await sqlitePersistence.updateViewport(projectId, viewport);
    } catch (e) {
      console.error("Failed to save viewport:", e);
    }
  });
}, 500);

export const useProjectStoreEnhanced = create<ProjectStoreEnhanced>((set, get) => ({
  projects: [],
  currentProject: null,
  selectedCellId: null,
  viewport: { x: 0, y: 0, scale: 1 },

  loadProjects: async () => {
    try {
      const projects = await sqlitePersistence.listProjects();
      set({ projects });
    } catch (e) {
      console.error("Failed to load projects:", e);
      // Fallback to localStorage
      const data = localStorage.getItem("storyboard-projects");
      if (data) {
        set({ projects: JSON.parse(data) });
      }
    }
  },

  createProject: async (name, description = "") => {
    const now = new Date().toISOString();
    const project: Project = {
      id: crypto.randomUUID(),
      name,
      description,
      createdAt: now,
      updatedAt: now,
      cells: [],
      connections: [],
    };

    try {
      await sqlitePersistence.saveProject(project);
      set((state) => ({
        projects: [...state.projects, project],
      }));
    } catch (e) {
      console.error("Failed to create project:", e);
      // Fallback to local state
      set((state) => ({
        projects: [...state.projects, project],
      }));
    }

    return project;
  },

  deleteProject: async (id) => {
    try {
      await sqlitePersistence.deleteProject(id);
    } catch (e) {
      console.error("Failed to delete project:", e);
    }

    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
      currentProject: state.currentProject?.id === id ? null : state.currentProject,
    }));
  },

  openProject: async (id) => {
    try {
      const project = await sqlitePersistence.getProject(id);
      if (project) {
        const decoded = decodeProjectImages(project);
        set({ currentProject: decoded, selectedCellId: null });
        return;
      }
    } catch (e) {
      console.error("Failed to open project from SQLite:", e);
    }

    // Fallback to local state
    const project = get().projects.find((p) => p.id === id);
    if (project) {
      set({ currentProject: project, selectedCellId: null });
    }
  },

  closeProject: () => {
    // Flush any pending saves
    const { currentProject } = get();
    if (currentProject) {
      saveFullProject(currentProject);
    }
    set({ currentProject: null, selectedCellId: null });
  },

  updateProject: (updates) => {
    const { currentProject, projects } = get();
    if (!currentProject) return;

    const updated = { ...currentProject, ...updates, updatedAt: new Date().toISOString() };
    const updatedProjects = projects.map((p) => (p.id === updated.id ? updated : p));

    set({ currentProject: updated, projects: updatedProjects });
    saveFullProject(updated);
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

    set({ currentProject: updated, projects: updatedProjects });
    saveFullProject(updated);
  },

  updateCell: (id, updates) => {
    const { currentProject, projects } = get();
    if (!currentProject) return;

    const updated = {
      ...currentProject,
      cells: currentProject.cells.map((c) => (c.id === id ? { ...c, ...updates } : c)),
      updatedAt: new Date().toISOString(),
    };
    const updatedProjects = projects.map((p) => (p.id === updated.id ? updated : p));

    set({ currentProject: updated, projects: updatedProjects });
    saveFullProject(updated);
  },

  deleteCell: (id) => {
    const { currentProject, projects } = get();
    if (!currentProject) return;

    // Track image for cleanup
    const cell = currentProject.cells.find((c) => c.id === id);
    if (cell?.imageUrl) {
      sqlitePersistence.untrackImageRef(currentProject.id, id).catch(console.warn);
    }

    const updated = {
      ...currentProject,
      cells: currentProject.cells.filter((c) => c.id !== id),
      connections: currentProject.connections.filter(
        (conn) => conn.fromCellId !== id && conn.toCellId !== id
      ),
      updatedAt: new Date().toISOString(),
    };
    const updatedProjects = projects.map((p) => (p.id === updated.id ? updated : p));

    set({
      currentProject: updated,
      projects: updatedProjects,
      selectedCellId: get().selectedCellId === id ? null : get().selectedCellId,
    });
    saveFullProject(updated);
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

    set({ currentProject: updated, projects: updatedProjects });
    saveFullProject(updated);
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

    set({ currentProject: updated, projects: updatedProjects });
    saveFullProject(updated);
  },

  selectCell: (id) => {
    set({ selectedCellId: id });
  },

  updateViewport: (viewport) => {
    const { currentProject } = get();
    if (!currentProject) return;

    set({ viewport });
    saveViewport(currentProject.id, viewport);
  },
}));
