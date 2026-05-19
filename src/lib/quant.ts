import { wl } from "../stores/watchlist.svelte";
import { fetchCoin } from "./fetchers/hyperliquid";

export function calcSum(items: number[]) {
  let sum = 0;
  for (const p of items) {
    sum += p;
  }
  return sum;
}

export function calcMean(items: number[]) {
  return calcSum(items) / items.length;
}

export function calcReturns(prices: number[]) {
  const rets: number[] = [];
  for (let i = 0; i < prices.length - 1; i++) {
    const t0 = prices[i];
    const t1 = prices[i + 1];
    rets.push(Math.log(t1 / t0));
  }
  return rets;
}

export function calcDeviations(returns: number[]) {
  const mean = calcMean(returns);
  return returns.map((r) => r - mean);
}

export function calcCovariance(d0: number[], d1: number[]) {
  return calcSum(d0.map((d, i) => d * d1[i])) / (d0.length - 1);
}

export function calcVolatility(d0: number[]) {
  return Math.sqrt(calcSum(d0.map((d) => d ** 2)) / (d0.length - 1));
}

export type CorelationMatrix = Record<string, Record<string, number>>;

export async function correlation(): Promise<CorelationMatrix> {
  const matrix: CorelationMatrix = {};
  const setMatrix = (c0: string, c1: string, v: number) => {
    if (!matrix[c0]) {
      matrix[c0] = {};
    }
    matrix[c0][c1] = v;
  };

  const coins = wl.cryptos.map((p) => p.symbol);

  for (const c0 of coins) {
    for (const c1 of coins) {
      if (c0 === c1) {
        setMatrix(c0, c1, 1);
        continue;
      }
      if (matrix[c0]?.[c1]) {
        continue;
      }
      const cc0 = await fetchCoin(c0);
      const cc1 = await fetchCoin(c1);
      const covariance = calcCovariance(cc0.deviations, cc1.deviations);
      setMatrix(c0, c1, covariance / (cc0.volatility * cc1.volatility));
    }
  }

  return matrix;
}
