import type { PricePoint } from "./market";

export function load(key: string): PricePoint[] {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
}

export function save(key: string, data: PricePoint[]) {
  localStorage.setItem(key, JSON.stringify(data));
}
