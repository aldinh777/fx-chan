import { load, save } from "./storage";

const version: string = "0.0.2";

export function ensureVersionUpdate() {
  const current_version = load("version", "");

  if (current_version !== version) {
    save("version", version);
    localStorage.removeItem("crypto");
  }
}
