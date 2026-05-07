<script lang="ts">
  import { rate, type PricePoint } from "../lib/market";

  const {
    sorted,
    ranking,
    updateAll,
  }: {
    sorted: PricePoint[];
    ranking: { symbol: string; score: number }[];
    updateAll: () => void | Promise<void>;
  } = $props();

  let base = $state("usd");
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
    if (row.coin === base && base !== "usd") {
      return {
        t0: inverted ? row.t0 : 1 / row.t0,
        t1: inverted ? row.t1 : 1 / row.t1,
        pair: inverted
          ? `${row.coin.toUpperCase()}/USD`
          : `USD/${row.coin.toUpperCase()}`,
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
    // explicit dependencies
    base;
    inverted;
    sorted;

    const mapped = sorted.map((row) => {
      const c = convert(row);

      // Format both prices to 6 decimal places as strings
      const t1Str = c.t1.toFixed(6);
      const t0Str = c.t0.toFixed(6);

      // Find the index where the two strings diverge
      let i = 0;
      while (i < t1Str.length && i < t0Str.length && t1Str[i] === t0Str[i]) {
        i++;
      }

      return {
        row,
        c: {
          ...c,
          // Split the strings at the divergence index
          common: t1Str.slice(0, i),
          t1Diff: t1Str.slice(i),
          t0Diff: t0Str.slice(i),
        },
      };
    });

    // Keep the list sorted dynamically based on the recalculated rate
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

    <div style="display:flex; gap:6px;">
      <button class="btn" onclick={toggleInvert}>
        {inverted ? "NORMAL" : "INVERT"}
      </button>

      <button
        class="btn update-btn"
        onclick={handleUpdate}
        disabled={isUpdating}
      >
        {isUpdating ? "UPDATING..." : "UPDATE CRYPTO"}
        {#if isUpdating}
          <div class="loading-bar"></div>
        {/if}
      </button>
    </div>
  </div>

  <table class="table">
    <thead>
      <tr>
        <th>PAIR</th>
        <th>NOW</th>
        <th>OLD</th>
        <th>30D</th>
        <th></th>
      </tr>
    </thead>

    <tbody>
      {#each computed as item}
        <tr>
          <td>{item.c.pair}</td>

          <!-- Render the common part normally, and highlight the differing part -->
          <td class="price-cell">
            {item.c.common}<span class="diff-highlight">{item.c.t1Diff}</span>
          </td>
          <td class="price-cell">
            {item.c.common}<span class="diff-highlight">{item.c.t0Diff}</span>
          </td>

          <td class={rate(item.c.t1, item.c.t0) >= 0 ? "pos" : "neg"}>
            {rate(item.c.t1, item.c.t0).toFixed(2)}%
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

  <table class="table">
    <thead>
      <tr>
        <th>ASSET</th>
        <th>SCORE</th>
      </tr>
    </thead>

    <tbody>
      {#each ranking as r}
        <tr>
          <td>
            <button class="btn" onclick={() => setBase(r.symbol)}>
              {r.symbol}
            </button>
          </td>

          <td class={r.score >= 0 ? "pos" : "neg"}>
            {r.score.toFixed(2)}%
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<style>
  /* Loading Bar Styles */
  .update-btn {
    position: relative;
    overflow: hidden;
  }

  .loading-bar {
    position: absolute;
    bottom: 0;
    left: 0;
    height: 3px;
    background-color: currentColor;
    opacity: 0.7;
    animation: load-animation 1s infinite ease-in-out;
  }

  @keyframes load-animation {
    0% {
      width: 0%;
      left: 0;
    }
    50% {
      width: 100%;
      left: 0;
    }
    100% {
      width: 0%;
      left: 100%;
    }
  }

  /* Price Diff Highlight Styles */
  .price-cell {
    font-variant-numeric: tabular-nums; /* Keeps digits horizontally aligned */
  }

  .diff-highlight {
    font-weight: 700;
    color: #ffaa00; /* Choose an accent color that fits your theme */
    /* Alternatively, you can use a subtle background: 
       background-color: rgba(255, 170, 0, 0.2); 
       border-radius: 2px; */
  }
</style>
