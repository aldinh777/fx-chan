<script lang="ts">
  import { rate, type PricePoint } from "../lib/market";

  const {
    sorted,
    ranking,
    updateAll,
  }: {
    sorted: PricePoint[];
    ranking: { symbol: string; score: number; rate: number }[];
    updateAll: () => void | Promise<void>;
  } = $props();

  let base = $state("usdc");
  let inverted = $state(false);
  let isUpdating = $state(false);

  function setBase(b: string) {
    base = b.toLowerCase();
    inverted = false;
  }

  function toggleInvert() {
    inverted = !inverted;
  }

  function findBaseRow() {
    return sorted.find((r) => r.coin === base);
  }

  function convert(row: PricePoint) {
    if (row.coin === base && base !== "usdc") {
      return {
        t0: inverted ? row.t0 : 1 / row.t0,
        t1: inverted ? row.t1 : 1 / row.t1,
        pair: inverted
          ? `${row.coin.toUpperCase()}/USDC`
          : `USDC/${row.coin.toUpperCase()}`,
      };
    }

    const baseRow = findBaseRow();

    if (!baseRow || base === "usd") {
      return {
        t0: inverted ? 1 / row.t0 : row.t0,
        t1: inverted ? 1 / row.t1 : row.t1,
        pair: inverted
          ? `${base.toUpperCase()}/${row.coin.toUpperCase()}`
          : `${row.coin.toUpperCase()}/${base.toUpperCase()}`,
      };
    }

    const t0 = row.t0 / baseRow.t0;
    const t1 = row.t1 / baseRow.t1;

    return {
      t0: inverted ? 1 / t0 : t0,
      t1: inverted ? 1 / t1 : t1,
      pair: inverted
        ? `${base.toUpperCase()}/${row.coin.toUpperCase()}`
        : `${row.coin.toUpperCase()}/${base.toUpperCase()}`,
    };
  }

  async function handleUpdate() {
    isUpdating = true;
    try {
      await updateAll();
    } finally {
      isUpdating = false;
    }
  }

  let computed = $derived.by(() => {
    base;
    inverted;
    sorted;

    const mapped = sorted.map((row) => {
      const c = convert(row);

      const maxVal = Math.max(Math.abs(c.t1), Math.abs(c.t0));
      let decimals = 9;

      if (maxVal >= 10) {
        decimals = 2;
      } else if (maxVal >= 1) {
        decimals = 4;
      } else {
        decimals = 9;
      }

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
      while (i < t1Str.length && i < t0Str.length && t1Str[i] === t0Str[i]) {
        i++;
      }

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

    mapped.sort((a, b) => {
      const rateA = rate(a.c.t1, a.c.t0);
      const rateB = rate(b.c.t1, b.c.t0);
      return inverted ? rateA - rateB : rateB - rateA;
    });

    return mapped;
  });
</script>

<div class="panel">
  <div class="header">
    <strong>CRYPTO MARKETS</strong>

    <div
      style="display:flex; gap:6px; width: 100%; justify-content: space-between;"
    >
      <button class="btn" onclick={toggleInvert}>
        {inverted ? "NORMAL" : "INVERT"}
      </button>

      <button
        class="btn update-btn"
        onclick={handleUpdate}
        disabled={isUpdating}
        style="flex-grow: 1;"
      >
        {isUpdating ? "UPDATING..." : "UPDATE"}
        {#if isUpdating}
          <div class="loading-bar"></div>
        {/if}
      </button>
    </div>
  </div>

  <table class="table market-table" style="width: 100%;">
    <thead>
      <tr>
        <th>PAIR</th>
        <th>NOW</th>
        <th>OLD</th>
        <th>30D</th>
      </tr>
    </thead>

    <tbody>
      {#each computed as item}
        <tr>
          <td>{item.c.pair}</td>
          <td class="price-cell">
            {item.c.common}<span class="diff-highlight">{item.c.t1Diff}</span>
          </td>
          <td class="price-cell">
            {item.c.common}<span class="diff-highlight">{item.c.t0Diff}</span>
          </td>
          <td class={rate(item.c.t1, item.c.t0) >= 0 ? "pos" : "neg"}>
            {rate(item.c.t1, item.c.t0) >= 0 ? "↑" : "↓"}
            {Math.abs(rate(item.c.t1, item.c.t0)).toFixed(2)}%
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<div class="panel" style="margin-top:10px">
  <div class="header">
    <strong>RELATIVE STRENGTH</strong>
  </div>

  <table class="table strength-table" style="width: 100%;">
    <thead>
      <tr>
        <th>ASSET</th>
        <th>LOG</th>
        <th>RATE</th>
      </tr>
    </thead>

    <tbody>
      {#each ranking as r}
        <tr>
          <td>
            <button
              class="btn"
              style="width:100%"
              onclick={() => setBase(r.symbol)}
            >
              {r.symbol}
            </button>
          </td>
          <td class={r.score >= 0 ? "pos" : "neg"} style="text-align: center;">
            {r.score.toFixed(2)}
          </td>
          <td class={r.rate >= 0 ? "pos" : "neg"} style="text-align: right;">
            {r.rate.toFixed(2)}%
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
