// Image Reference Pool for deduplication
// Uses __img_ref__ prefix encoding to reduce storage size

const IMAGE_REF_PREFIX = "__img_ref__";

export interface ImagePoolEntry {
  key: string;
  dataUrl: string;
  refCount: number;
}

export class ImageReferencePool {
  private pool = new Map<string, string>();
  private reverseIndex = new Map<string, string>();

  // Encode image URL with reference if it exists in pool
  encode(imageUrl: string): string {
    if (!imageUrl) return imageUrl;

    // Check if already encoded
    if (imageUrl.startsWith(IMAGE_REF_PREFIX)) {
      return imageUrl;
    }

    // Check if image exists in pool
    const existingKey = this.reverseIndex.get(imageUrl);
    if (existingKey) {
      return `${IMAGE_REF_PREFIX}${existingKey}`;
    }

    // Add to pool
    const key = this.generateKey(imageUrl);
    this.pool.set(key, imageUrl);
    this.reverseIndex.set(imageUrl, key);

    return `${IMAGE_REF_PREFIX}${key}`;
  }

  // Decode image reference to actual URL
  decode(encoded: string): string {
    if (!encoded || !encoded.startsWith(IMAGE_REF_PREFIX)) {
      return encoded;
    }

    const key = encoded.slice(IMAGE_REF_PREFIX.length);
    return this.pool.get(key) || encoded;
  }

  // Check if string is an encoded reference
  isReference(encoded: string): boolean {
    return encoded?.startsWith(IMAGE_REF_PREFIX) ?? false;
  }

  // Get all images in pool
  getAllImages(): Map<string, string> {
    return new Map(this.pool);
  }

  // Get pool size
  get size(): number {
    return this.pool.size;
  }

  // Clear pool
  clear(): void {
    this.pool.clear();
    this.reverseIndex.clear();
  }

  // Remove unused images
  prune(usedKeys: Set<string>): void {
    for (const [key] of this.pool) {
      if (!usedKeys.has(key)) {
        const url = this.pool.get(key);
        this.pool.delete(key);
        if (url) {
          this.reverseIndex.delete(url);
        }
      }
    }
  }

  private generateKey(imageUrl: string): string {
    // Simple hash for key generation
    let hash = 0;
    for (let i = 0; i < imageUrl.length; i++) {
      const char = imageUrl.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }
}

export const imageReferencePool = new ImageReferencePool();

// Helper functions for encoding/decoding project data
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function encodeProjectImages<T extends { cells: any[] }>(project: T): T {
  const encoded = { ...project };
  encoded.cells = project.cells.map((cell: { imageUrl?: string }) => {
    if (cell.imageUrl) {
      return { ...cell, imageUrl: imageReferencePool.encode(cell.imageUrl) };
    }
    return cell;
  });
  return encoded;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function decodeProjectImages<T extends { cells: any[] }>(project: T): T {
  const decoded = { ...project };
  decoded.cells = project.cells.map((cell: { imageUrl?: string }) => {
    if (cell.imageUrl) {
      return { ...cell, imageUrl: imageReferencePool.decode(cell.imageUrl) };
    }
    return cell;
  });
  return decoded;
}
