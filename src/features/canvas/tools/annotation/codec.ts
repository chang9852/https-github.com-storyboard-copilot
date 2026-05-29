import type { AnnotationItem } from './types';

export function stringifyAnnotationItems(items: AnnotationItem[]): string {
  return JSON.stringify(items);
}

export function parseAnnotationItems(raw: string): AnnotationItem[] {
  if (!raw || raw.trim() === '') return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed as AnnotationItem[];
    }
    return [];
  } catch {
    return [];
  }
}

export function createAnnotationId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
