import { createHash } from "node:crypto";

export const toArray = (value: string | string[]): string[] => {
  return Array.isArray(value) ? value : value ? [value] : [];
};

export const shortHash = (...parts: string[]): string => {
  return createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 8);
};


