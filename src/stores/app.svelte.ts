import type { WeightedPoint } from "../lib/market";

import { fetchAllCrypto } from "../lib/fetchers/hyperliquid";
import { weightPoints } from "../lib/market-utils";
import { load } from "../lib/storage";

class AppStore {
  base = $state(load("base", "usdc"));
  cryptoData: WeightedPoint[] = $state(load("crypto", []));
  activeTab = $state(load("activeTab", "dashboard"));
  points: WeightedPoint[] = $derived(weightPoints(this.cryptoData));

  chartPanel: HTMLDivElement | undefined = $state();

  async updateCrypto() {
    this.cryptoData = await fetchAllCrypto();
  }

  updateBaseAndMoveToMarket(base: string) {
    this.base = base;

    requestAnimationFrame(() => {
      this.chartPanel?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
  }
}

export const app = new AppStore();
