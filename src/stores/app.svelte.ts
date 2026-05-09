import type { WeightedPoint } from "../lib/market";

import { fetchAllCrypto } from "../lib/fetchers/hyperliquid";
import { weightPoints } from "../lib/market-utils";
import { load } from "../lib/storage";

class AppStore {
  base = $state("usdc");
  cryptoData: WeightedPoint[] = $state(load("crypto", []));
  activeTab = $state(load("activeTab", "dashboard"));
  points: WeightedPoint[] = $derived(weightPoints(this.cryptoData));

  async updateCrypto() {
    this.cryptoData = await fetchAllCrypto();
  }

  updateBaseAndMoveToMarket(base: string) {
    this.base = base;
    this.activeTab = "dashboard";
  }
}

export const app = new AppStore();
