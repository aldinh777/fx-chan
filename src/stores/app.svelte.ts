import {
  weightCryptoPoints,
  type WeightedCryptoPoint,
  type WeightedFxPoint,
} from "../lib/market";

import { fetchAllCrypto } from "../lib/fetchers/hyperliquid";
import { load } from "../lib/storage";
import { fetchAllForex } from "../lib/fetchers/frankfurter";

class AppStore {
  base = $state(load("base", "usdc"));
  coin = $state(load("coin", "usdc"));
  activeTab = $state(load("activeTab", "dashboard"));

  fxData: WeightedFxPoint[] = $state(load("fx", []));

  cryptoData: WeightedCryptoPoint[] = $state(load("crypto", []));
  cryptoPoints: WeightedCryptoPoint[] = $derived(
    weightCryptoPoints(this.cryptoData),
  );

  chartPanel: HTMLDivElement | undefined = $state();

  async updateForex() {
    this.fxData = await fetchAllForex();
  }

  async updateCrypto() {
    this.cryptoData = await fetchAllCrypto();
  }

  updateCoin(coin: string) {
    this.coin = coin;
    requestAnimationFrame(() => {
      this.chartPanel?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  invertCryptoPair() {
    const coin = this.coin;
    this.coin = this.base;
    this.base = coin;
  }
}

export const app = new AppStore();
