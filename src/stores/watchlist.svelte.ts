import type { CryptoItem, ForexItem } from "../lib/market";

import { load } from "../lib/storage";

export type WeightMode = "target_weight" | "position_size";

const defaultFxs = ["eur", "jpy", "gbp", "chf", "aud", "sgd", "idr"].map(
  (f) =>
    ({
      id: f,
      symbol: f,
      visible: true,
    }) satisfies ForexItem,
);

const defaultCoins = [
  "btc",
  "eth",
  "sol",
  "xrp",
  "bnb",
  "hype",
  "mon",
  "zec",
  "xmr",
  "sui",
  "trx",
  "ada",
].map(
  (c) =>
    ({
      id: c,
      symbol: c,
      visible: true,
      weight: 1,
      position: 0,
    }) satisfies CryptoItem,
);

class WatchlistStore {
  fxs = $state<ForexItem[]>(load("wlFxs", defaultFxs));
  cryptos = $state<CryptoItem[]>(load("wlCryptos", defaultCoins));
  mode = $state<WeightMode>(load("wlMode", "target_weight"));

  add(symbol: string): { success: boolean; message?: string } {
    const cleanSymbol = symbol.trim().toLowerCase();
    if (!cleanSymbol) {
      return { success: false, message: "Symbol cannot be empty." };
    }
    if (this.cryptos.some((c) => c.symbol === cleanSymbol)) {
      return {
        success: false,
        message: `${cleanSymbol} is already in your list!`,
      };
    }
    this.cryptos.push({
      id: cleanSymbol,
      symbol: cleanSymbol,
      visible: true,
      weight: 1,
      position: 0,
    });
    return { success: true };
  }

  remove(id: string) {
    this.cryptos = this.cryptos.filter((c) => c.id !== id);
  }

  toggleVisibility(id: string) {
    const item = this.cryptos.find((c) => c.id === id);
    if (item) {
      item.visible = !item.visible;
    }
  }

  toggleMode() {
    this.mode =
      this.mode === "target_weight" ? "position_size" : "target_weight";
  }
}

export const wl = new WatchlistStore();
