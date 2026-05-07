import { rate, type PricePoint } from "./market";

export function getFormattedMarkets(
  points: PricePoint[],
  base: string,
  inverted: boolean,
) {
  const baseRow = points.find((r) => r.coin === base);

  const mapped = points.map((row) => {
    // 1. Convert Logic
    let c;
    if (row.coin === base && base !== "usdc") {
      c = {
        t0: inverted ? row.t0 : 1 / row.t0,
        t1: inverted ? row.t1 : 1 / row.t1,
        pair: inverted
          ? `${row.coin.toUpperCase()}/USDC`
          : `USDC/${row.coin.toUpperCase()}`,
      };
    } else if (!baseRow || base === "usd") {
      c = {
        t0: inverted ? 1 / row.t0 : row.t0,
        t1: inverted ? 1 / row.t1 : row.t1,
        pair: inverted
          ? `${base.toUpperCase()}/${row.coin.toUpperCase()}`
          : `${row.coin.toUpperCase()}/${base.toUpperCase()}`,
      };
    } else {
      const t0 = row.t0 / baseRow.t0;
      const t1 = row.t1 / baseRow.t1;
      c = {
        t0: inverted ? 1 / t0 : t0,
        t1: inverted ? 1 / t1 : t1,
        pair: inverted
          ? `${base.toUpperCase()}/${row.coin.toUpperCase()}`
          : `${row.coin.toUpperCase()}/${base.toUpperCase()}`,
      };
    }

    // 2. Formatting Logic
    const maxVal = Math.max(Math.abs(c.t1), Math.abs(c.t0));
    let decimals = maxVal >= 10 ? 2 : maxVal >= 1 ? 4 : 9;

    let t1Str = c.t1.toFixed(decimals);
    let t0Str = c.t0.toFixed(decimals);

    let trimCount = 0;
    while (
      trimCount < decimals &&
      t1Str[t1Str.length - 1 - trimCount] === "0" &&
      t0Str[t0Str.length - 1 - trimCount] === "0"
    ) {
      trimCount++;
    }

    if (trimCount > 0) {
      t1Str = t1Str.slice(0, -trimCount);
      t0Str = t0Str.slice(0, -trimCount);
    }

    if (t1Str.endsWith(".")) t1Str = t1Str.slice(0, -1);
    if (t0Str.endsWith(".")) t0Str = t0Str.slice(0, -1);

    let i = 0;
    while (i < t1Str.length && i < t0Str.length && t1Str[i] === t0Str[i]) i++;

    return {
      row,
      c: {
        ...c,
        common: t1Str.slice(0, i),
        t1Diff: t1Str.slice(i),
        t0Diff: t0Str.slice(i),
      },
    };
  });

  // 3. Sort Logic
  mapped.sort((a, b) => {
    const rateA = rate(a.c.t1, a.c.t0);
    const rateB = rate(b.c.t1, b.c.t0);
    return inverted ? rateA - rateB : rateB - rateA;
  });

  return mapped;
}
