import { z } from "zod";

// Record ids are UUIDs. Anything else is treated as "not found" before reaching the database.
export function isUuid(value: string): boolean {
  return z.uuid().safeParse(value).success;
}
