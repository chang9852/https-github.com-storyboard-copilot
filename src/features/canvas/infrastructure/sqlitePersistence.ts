import { invoke } from "@tauri-apps/api/core";
import type { Project } from "@/types/project";

// Project record for SQLite
export interface ProjectRecord {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  thumbnail?: string;
  cells_json: string;
  connections_json: string;
  viewport_json?: string;
}

// Image reference for deduplication
export interface ImageRef {
  id: string;
  project_id: string;
  cell_id: string;
  image_key: string;
  created_at: string;
}

// AI Generation job
export interface AiGenerationJob {
  id: string;
  project_id: string;
  cell_id: string;
  provider: string;
  model: string;
  prompt: string;
  status: "pending" | "processing" | "completed" | "failed";
  result_json?: string;
  error?: string;
  created_at: string;
  updated_at: string;
}

// SQLite Persistence Service
export class SqlitePersistence {
  // Project operations
  async listProjects(): Promise<Project[]> {
    const records = await invoke<ProjectRecord[]>("list_project_summaries");
    return records.map(this.recordToProject);
  }

  async getProject(id: string): Promise<Project | null> {
    try {
      const record = await invoke<ProjectRecord>("get_project_record", { projectId: id });
      return this.recordToProject(record);
    } catch {
      return null;
    }
  }

  async saveProject(project: Project): Promise<void> {
    const record = this.projectToRecord(project);
    await invoke("upsert_project_record", { record });
  }

  async updateViewport(projectId: string, viewport: { x: number; y: number; scale: number }): Promise<void> {
    await invoke("update_project_viewport_record", {
      projectId,
      viewportJson: JSON.stringify(viewport),
    });
  }

  async renameProject(id: string, name: string): Promise<void> {
    await invoke("rename_project_record", { projectId: id, name });
  }

  async deleteProject(id: string): Promise<void> {
    await invoke("delete_project_record", { projectId: id });
  }

  // Image reference operations
  async trackImageRef(projectId: string, cellId: string, imageUrl: string): Promise<string> {
    const imageKey = this.extractImageKey(imageUrl);
    try {
      await invoke("track_image_ref", {
        projectId,
        cellId,
        imageKey,
      });
    } catch (e) {
      console.warn("Failed to track image ref:", e);
    }
    return imageKey;
  }

  async untrackImageRef(projectId: string, cellId: string): Promise<void> {
    try {
      await invoke("untrack_image_ref", {
        projectId,
        cellId,
      });
    } catch (e) {
      console.warn("Failed to untrack image ref:", e);
    }
  }

  async pruneUnreferencedImages(projectId: string): Promise<void> {
    try {
      await invoke("prune_unreferenced_images", { projectId });
    } catch (e) {
      console.warn("Failed to prune images:", e);
    }
  }

  // AI Generation job operations
  async saveGenerationJob(job: AiGenerationJob): Promise<void> {
    await invoke("save_ai_generation_job", { job });
  }

  async getGenerationJob(id: string): Promise<AiGenerationJob | null> {
    try {
      return await invoke<AiGenerationJob>("get_ai_generation_job", { jobId: id });
    } catch {
      return null;
    }
  }

  async updateGenerationJob(id: string, updates: Partial<AiGenerationJob>): Promise<void> {
    await invoke("update_ai_generation_job", { jobId: id, updates });
  }

  // Helper methods
  private recordToProject(record: ProjectRecord): Project {
    return {
      id: record.id,
      name: record.name,
      description: record.description,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
      thumbnail: record.thumbnail,
      cells: JSON.parse(record.cells_json || "[]"),
      connections: JSON.parse(record.connections_json || "[]"),
    };
  }

  private projectToRecord(project: Project): ProjectRecord {
    return {
      id: project.id,
      name: project.name,
      description: project.description,
      created_at: project.createdAt,
      updated_at: project.updatedAt,
      thumbnail: project.thumbnail,
      cells_json: JSON.stringify(project.cells),
      connections_json: JSON.stringify(project.connections),
    };
  }

  private extractImageKey(imageUrl: string): string {
    // For data URLs, use a hash
    if (imageUrl.startsWith("data:")) {
      return `img_${imageUrl.slice(0, 50).replace(/[^a-zA-Z0-9]/g, "_")}`;
    }
    // For URLs, use the URL as key
    return imageUrl;
  }
}

export const sqlitePersistence = new SqlitePersistence();
