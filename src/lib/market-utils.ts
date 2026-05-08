import type { PricePoint } from "./market";
import type { WeightedPoint } from "./ranking";

import { rate } from "./market";

import { wl } from "../stores/watchlist.svelte";

export interface Computed {
  row: PricePoint;
  c: {
    common: string;
    t1Diff: string;
    t0Diff: string;
    t1: number;
    t0: number;
    pair: string;
  };
}

export function weightPoints(data: PricePoint[]) {
  return data.flatMap((point): WeightedPoint[] => {
    const c = wl.items.find((i) => i.symbol === point.coin);

    if (c && !c.visible) {
      return [];
    }

    const weight = c?.weight ?? 1;
    const position = c?.position ?? 0;
    const confidence = c?.confidence ?? 1;

    return [
      {
        ...point,
        weight: wl.mode === "position_size" ? position * point.t1 : weight,
        confidence: confidence,
        position: position,
      },
    ];
  });
}

export function getFormattedMarkets(
  points: PricePoint[],
  base: string,
  inverted: boolean,
): Computed[] {
  const baseRow = points.find((r) => r.coin === base);

  const mapped = points.map((p): Computed => {
    // Convert Logic
    let c;
    if (p.coin === base && base !== "usdc") {
      c = {
        t0: inverted ? p.t0 : 1 / p.t0,
        t1: inverted ? p.t1 : 1 / p.t1,
        pair: inverted
          ? `${p.coin.toUpperCase()}/USDC`
          : `USDC/${p.coin.toUpperCase()}`,
      };
    } else if (!baseRow || base === "usdc") {
      c = {
        t0: inverted ? 1 / p.t0 : p.t0,
        t1: inverted ? 1 / p.t1 : p.t1,
        pair: inverted
          ? `${base.toUpperCase()}/${p.coin.toUpperCase()}`
          : `${p.coin.toUpperCase()}/${base.toUpperCase()}`,
      };
    } else {
      const t0 = p.t0 / baseRow.t0;
      const t1 = p.t1 / baseRow.t1;
      c = {
        t0: inverted ? 1 / t0 : t0,
        t1: inverted ? 1 / t1 : t1,
        pair: inverted
          ? `${base.toUpperCase()}/${p.coin.toUpperCase()}`
          : `${p.coin.toUpperCase()}/${base.toUpperCase()}`,
      };
    }

    // Formatting Logic
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
      row: p,
      c: {
        ...c,
        common: t1Str.slice(0, i),
        t1Diff: t1Str.slice(i),
        t0Diff: t0Str.slice(i),
      },
    };
  });

  // Sort Logic
  mapped.sort((a, b) => {
    const rateA = rate(a.c.t1, a.c.t0);
    const rateB = rate(b.c.t1, b.c.t0);
    return inverted ? rateA - rateB : rateB - rateA;
  });

  return mapped;
}
