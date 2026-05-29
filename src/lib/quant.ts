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

export async function _correlation(): Promise<
  [corr: CorelationMatrix, beta: CorelationMatrix, alpha: CorelationMatrix]
> {
  const matrix: CorelationMatrix = {};
  const betaMatrix: CorelationMatrix = {};
  const alphaMatrix: CorelationMatrix = {};
  const setMatrix = (
    c0: string,
    c1: string,
    v: number,
    o: CorelationMatrix = matrix,
  ) => {
    if (!o[c0]) {
      o[c0] = {};
    }
    o[c0][c1] = v;
  };

  const coins = wl.cryptos.filter((p) => p.visible).map((p) => p.symbol);

  for (const c0 of coins) {
    for (const c1 of coins) {
      const cc0 = await fetchCoin(c0);
      const cc1 = await fetchCoin(c1);

      const r0 = _avg(cc0.returns.log) * cc0.returns.log.length;
      const r1 = _avg(cc1.returns.log) * cc1.returns.log.length;

      const variance0 = _variance(cc0.returns.log);
      const variance1 = _variance(cc1.returns.log);

      const covariance = _covariance(cc0.returns.log, cc1.returns.log);
      const covolatility = Math.sqrt(variance0) * Math.sqrt(variance1);
      const corelation = covariance / covolatility;
      const beta = covariance / variance1;
      const expected = beta * r1;
      const alpha = r0 - expected;
      const alphaPct = Math.exp(alpha) - 1;

      setMatrix(c0, c1, corelation);
      setMatrix(c0, c1, beta, betaMatrix);
      setMatrix(c0, c1, alphaPct, alphaMatrix);
    }
  }

  return [matrix, betaMatrix, alphaMatrix];
}
