import { wl } from "../stores/watchlist.svelte";
import { fetchCoin, type CoinData } from "./fetchers/hyperliquid";
import type { CryptoItem } from "./market";

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
  const cfx: Record<string, CoinData> = {};

  for (const coin of coins) {
    cfx[coin] = await fetchCoin(coin);
  }

  for (const c0 of coins) {
    for (const c1 of coins) {
      const cc0 = cfx[c0];
      const cc1 = cfx[c1];

      const r0 = cc0.returns.log.reduce((a, b) => a + b, 0);
      const r1 = cc1.returns.log.reduce((a, b) => a + b, 0);

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

export interface IndexFactor {
  coin: string;
  correlation: number;
  beta: number;
  alpha: number;
}

const safeNum = (v: number) => (Number.isFinite(v) ? v : 0);
const _coin_weight = (coin: CryptoItem, data: CoinData): number => {
  if (wl.mode === "target_weight") {
    return safeNum(coin.weight ?? 1);
  }

  // position_size mode (stabilized)
  const pos = coin.position ?? 0;
  const price = data.candles[data.candles.length - 1]?.c ?? 0;

  return safeNum(Math.sign(pos) * Math.log1p(Math.abs(pos)) * price);
};

export async function _index_factor(): Promise<IndexFactor[]> {
  const coins = wl.cryptos.filter((p) => p.visible).map((p) => p.symbol);
  if (coins.length === 0) return [];

  const cfx: Record<string, CoinData> = {};
  await Promise.all(
    coins.map(async (coin) => {
      cfx[coin] = await fetchCoin(coin);
    }),
  );

  // =========================
  // PREINDEX
  // =========================
  const cryptoMap = new Map(wl.cryptos.map((c) => [c.symbol, c]));

  // =========================
  // BUILD IDX RETURNS
  // =========================
  const len = Math.min(...coins.map((c) => cfx[c].returns.log.length));
  const idxReturns: number[] = [];

  for (let i = 0; i < len; i++) {
    let sum = 0;
    let wsum = 0;

    for (const coin of coins) {
      const v = cfx[coin].returns.log[i];
      if (!Number.isFinite(v)) continue;

      const crypto = cryptoMap.get(coin)!;
      const data = cfx[coin];

      const w = _coin_weight(crypto, data);
      if (!Number.isFinite(w) || w === 0) continue;

      sum += v * w;
      wsum += w;
    }

    idxReturns.push(wsum ? sum / wsum : 0);
  }

  // =========================
  // IDX STATS
  // =========================
  const idxVariance = _variance(idxReturns);
  const idxReturn = _avg(idxReturns);
  const safeIdxVar = idxVariance || 1e-12;

  // =========================
  // FACTORS
  // =========================
  const factors: IndexFactor[] = [];

  for (const coin of coins) {
    const data = cfx[coin];
    const returns = data.returns.log;

    const variance = _variance(returns);
    const covariance = _covariance(returns, idxReturns);

    const denom = Math.sqrt(variance) * Math.sqrt(idxVariance);

    const correlation = denom ? covariance / denom : 0;
    const beta = covariance / safeIdxVar;

    const meanReturn = _avg(returns) * returns.length;
    const expected = beta * idxReturn;

    const diff = Math.max(Math.min(meanReturn - expected, 50), -50);
    const alpha = Math.exp(diff) - 1;

    factors.push({
      coin,
      correlation,
      beta,
      alpha,
    });
  }

  return factors;
}
