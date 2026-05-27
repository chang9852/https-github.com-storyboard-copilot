import type { IdGenerator } from "../application/ports";

export class UuidIdGenerator implements IdGenerator {
  next(): string {
    return crypto.randomUUID();
  }
}

export const idGenerator = new UuidIdGenerator();
