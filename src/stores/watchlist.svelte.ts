import type { CryptoItem } from "../lib/market";

import { load } from "../lib/storage";

export type WeightMode = "target_weight" | "position_size";

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
];

const defaultItems = defaultCoins.map((coin) => ({
  id: coin,
  symbol: coin,
  visible: true,
  weight: 1,
  position: 0,
}));

class WatchlistStore {
  items = $state<CryptoItem[]>(load("watchlist", defaultItems));
  mode = $state<WeightMode>(load("watchlist_mode", "target_weight"));

  add(symbol: string): { success: boolean; message?: string } {
    const cleanSymbol = symbol.trim().toLowerCase();

    if (!cleanSymbol)
      return { success: false, message: "Symbol cannot be empty." };

    if (this.items.some((c) => c.symbol === cleanSymbol)) {
      return {
        success: false,
        message: `${cleanSymbol} is already in your list!`,
      };
    }

    this.items.push({
      id: cleanSymbol,
      symbol: cleanSymbol,
      visible: true,
      weight: 1,
      position: 0,
    });

    return { success: true };
  }

  remove(id: string) {
    this.items = this.items.filter((c) => c.id !== id);
  }

  toggleVisibility(id: string) {
    const item = this.items.find((c) => c.id === id);
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
