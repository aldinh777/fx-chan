import { load, save } from "./storage";

export const version: string = "v0.0.10";

export function ensureVersionUpdate() {
  const current_version = load("version", "");

  if (current_version !== version) {
    save("version", version);
    localStorage.removeItem("crypto");
    localStorage.removeItem("watchlist");
  }
}
