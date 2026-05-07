import { load } from "./storage"; // Import the load function

export type CryptoItem = {
  id: string;
  symbol: string;
  visible: boolean;
  weight: number;
  confidence: number;
};

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
  id: crypto.randomUUID(),
  symbol: coin.toUpperCase(),
  visible: true,
  weight: 1,
  confidence: 1,
}));

class WatchlistStore {
  items = $state<CryptoItem[]>(load("watchlist", defaultItems));

  add(symbol: string): { success: boolean; message?: string } {
    const cleanSymbol = symbol.trim().toUpperCase();

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
      confidence: 1,
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
}

export const watchlist = new WatchlistStore();
