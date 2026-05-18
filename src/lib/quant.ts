import { fetchCoin } from "./fetchers/hyperliquid";

function returns(prices: number[]) {
  const rets: number[] = [];
  for (let i = 0; i < prices.length - 1; i++) {
    const t0 = prices[i];
    const t1 = prices[i + 1];
    rets.push(Math.log(t1 / t0));
  }
  return rets;
}

function deviations(returns: number[]) {
  let sum = 0;
  for (const r of returns) {
    sum += r;
  }
  const mean = sum / returns.length;
  return returns.map((r) => r - mean);
}

function covariance(d0: number[], d1: number[]) {
  let sum = 0;
  for (let i = 0; i < d0.length; i++) {
    sum += d0[i] * d1[i];
  }
  return sum / d0.length;
}

function volatility(d0: number[]) {
  let sum = 0;
  for (const d of d0) {
    sum += d ** 2;
  }
  const variance = sum / d0.length;
  return Math.sqrt(variance);
}

export async function correlation(a: string, b: string) {
  const c0 = await fetchCoin(a);
  const c1 = await fetchCoin(b);

  const r0 = returns(c0.map((c) => c.c));
  const r1 = returns(c1.map((c) => c.c));

  const d0 = deviations(r0);
  const d1 = deviations(r1);

  const cov = covariance(d0, d1);

  const v0 = volatility(d0);
  const v1 = volatility(d1);

  const cor = cov / (v0 * v1);
  return cor;
}
