import type { Project, StoryboardCell, Connection } from '@/types/project';
import type {
  ProjectRecord,
  ProjectSummaryRecord,
} from '@/commands/projectState';

export interface ProjectSummary {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  nodeCount: number;
}

export function toProjectRecord(project: Project): ProjectRecord {
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

export function fromProjectRecord(record: ProjectRecord): Project {
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

export function toProjectSummary(record: ProjectSummaryRecord): ProjectSummary {
  return {
    id: record.id,
    name: record.name,
    createdAt: new Date(record.createdAt).toISOString(),
    updatedAt: new Date(record.updatedAt).toISOString(),
    nodeCount: record.nodeCount,
  };
}
