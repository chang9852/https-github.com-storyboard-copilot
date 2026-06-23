import type { Project } from '@/types/project';
import {
  deleteProjectRecord,
  upsertProjectRecord,
} from '@/commands/projectState';
import { toProjectRecord } from './projectRecordMapper';

const UPSERT_DEBOUNCE_MS = 260;
const IDLE_PERSIST_TIMEOUT_MS = 1200;
const FALLBACK_IDLE_DELAY_MS = 64;
const DELETE_RETRY_DELAY_MS = 80;
const MAX_DELETE_RETRIES = 10;

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

    void upsertProjectRecord(toProjectRecord(project))
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

function clearQueuedProjectUpsert(projectId: string): void {
  const timer = projectUpsertTimers.get(projectId);
  if (timer) {
    clearTimeout(timer);
    projectUpsertTimers.delete(projectId);
  }
  queuedProjectUpserts.delete(projectId);
}

export function persistProject(project: Project, immediate?: boolean): void {
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

export function deletePersistedProject(projectId: string): void {
  deletingProjectIds.add(projectId);
  clearQueuedProjectUpsert(projectId);

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
