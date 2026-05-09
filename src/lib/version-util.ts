import { load, save } from "./storage";

declare const __APP_VERSION__: string;

export const version: string = __APP_VERSION__;

export function ensureVersionUpdate() {
  const current_version = load("version", "");

  if (current_version !== version) {
    save("version", version);
    localStorage.removeItem("crypto");
  }
}
