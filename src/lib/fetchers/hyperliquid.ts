import type { PricePoint } from "../market";

const API = "https://api.hyperliquid.xyz/info";
const DAY = 24 * 60 * 60 * 1000;

export async function fetchHyperliquidCoin(
  coin: string,
): Promise<PricePoint | null> {
  try {
    const now = Date.now();

    const res = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "candleSnapshot",
        req: {
          coin: coin.toUpperCase(),
          interval: "1d",
          startTime: now - 30 * DAY,
          endTime: now,
        },
      }),
    });

    const json = await res.json();

    if (!Array.isArray(json) || json.length === 0) return null;

    const t0 = Number(json[0]?.o);
    const t1 = Number(json.at(-1)?.c);

    if (!t0 || !t1) return null;

    return {
      base: "usdt",
      coin,
      t0,
      t1,
    };
  } catch {
    return null;
  }
}

export async function fetchAll(
  coins: string[],
  fetcher: (c: string) => Promise<PricePoint | null>,
) {
  const res = await Promise.all(coins.map(fetcher));

  return res.filter(
    (x): x is PricePoint =>
      x !== null &&
      typeof x.coin === "string" &&
      typeof x.base === "string" &&
      !Number.isNaN(x.t0) &&
      !Number.isNaN(x.t1),
  );
}
