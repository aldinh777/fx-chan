import { wl } from "../stores/watchlist.svelte";
import { fetchCoin } from "./fetchers/hyperliquid";

export function _sum(items: number[]) {
  let sum = 0;
  for (const p of items) {
    sum += p;
  }
  return sum;
}

export function _avg(a: number[]) {
  return _sum(a) / a.length;
}

export function _median(a: number[]) {
  const sorted = a.toSorted((a, b) => b - a);
  const mid = (a.length - 1) / 2;
  if (mid % 1 === 0) {
    return sorted[mid];
  } else {
    return (sorted[Math.floor(mid)] + sorted[Math.ceil(mid)]) / 2;
  }
}

export type ReturnSeries = {
  diff: number[];
  log: number[];
  cum_log: number[];
};

export function _returns(p: number[]): ReturnSeries {
  const diff: number[] = [];
  const log: number[] = [];
  const cum_log: number[] = [];
  const p0 = p[0];
  for (let i = 0; i < p.length - 1; i++) {
    const t0 = p[i];
    const t1 = p[i + 1];
    diff.push(t1 - t0);
    log.push(Math.log(t1 / t0));
    cum_log.push(Math.log(t1 / p0));
  }
  return { diff, log, cum_log };
}

export function _variance(r: number[]) {
  const avg = _avg(r);
  return _avg(r.map((r) => (r - avg) ** 2));
}

export function _covariance(a: number[], b: number[]) {
  const avg_a = _avg(a);
  const avg_b = _avg(b);
  return _avg(a.map((a, i) => (a - avg_a) * (b[i] - avg_b)));
}

export type CorelationMatrix = Record<string, Record<string, number>>;

export async function _correlation(): Promise<CorelationMatrix> {
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
      const cc0 = await fetchCoin(c0);
      const cc1 = await fetchCoin(c1);
      const covariance = _covariance(cc0.returns.log, cc1.returns.log);
      const covolatility =
        Math.sqrt(_variance(cc0.returns.log)) *
        Math.sqrt(_variance(cc1.returns.log));
      setMatrix(c0, c1, covariance / covolatility);
    }
  }

  return matrix;
}
