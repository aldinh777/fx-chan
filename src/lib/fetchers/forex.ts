import type { PricePoint } from "../market";

const API = "https://fxapi.app/api/history";

export async function fetchForexPair(
  base: string,
  target: string,
  daysAgo = 30,
): Promise<PricePoint | null> {
  try {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - daysAgo);
    const from = d.toISOString().slice(0, 10);

    const url = `${API}/${base}/${target}.json?from=${from}`;
    const res = await fetch(url);
    const json = await res.json();

    const open = Number(json?.stats?.open);
    const close = Number(json?.stats?.close);

    if (!open || !close) return null;

    return {
      base,
      coin: target,
      t0: open,
      t1: close,
    };
  } catch {
    return null;
  }
}

export async function fetchAllForex(
  base: string,
  targets: string[],
  fetcher: (b: string, t: string) => Promise<PricePoint | null>,
) {
  const res = await Promise.all(targets.map((t) => fetcher(base, t)));

  return res.filter(
    (x): x is PricePoint =>
      x !== null &&
      typeof x.coin === "string" &&
      typeof x.base === "string" &&
      !Number.isNaN(x.t0) &&
      !Number.isNaN(x.t1),
  );
}
