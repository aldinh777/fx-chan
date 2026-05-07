import type { PricePoint } from "../market";
import type { CryptoItem } from "../watchlist.svelte";

const API = "https://api.hyperliquid.xyz/info";
const DAY = 24 * 60 * 60 * 1000;

export async function fetchHyperliquidCoin(
  coin: CryptoItem,
): Promise<PricePoint | null> {
  try {
    const now = Date.now();

    // Extract the symbol string from the CryptoItem object
    const symbolString = coin.symbol;

    const res = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "candleSnapshot",
        req: {
          coin: symbolString.toUpperCase(), // Use the extracted string here
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
      base: "usdc",
      coin: symbolString.toLowerCase(), // Return just the string for the PricePoint
      t0,
      t1,
    };
  } catch {
    return null;
  }
}

export async function fetchAll(
  coins: CryptoItem[],
  fetcher: (c: CryptoItem) => Promise<PricePoint | null>,
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
