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
      cells: currentProject.cells.map((c) => (c.id === id ? { ...c, ...updates } : c)),
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
