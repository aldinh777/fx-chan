<script lang="ts">
  import { rate, type PricePoint } from "../lib/market";
  import { getFormattedMarkets } from "../lib/market-utils";

  export interface Props {
    sorted: PricePoint[];
    base: string;
    updateAll(): void | Promise<void>;
  }
  let { sorted, base, updateAll }: Props = $props();

  let isUpdating = $state(false);

  async function handleUpdate() {
    isUpdating = true;
    try {
      await updateAll();
    } finally {
      isUpdating = false;
    }
  }
  let inverted = $state(false);

  interface Computed {
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

  let computed: Computed[] = $derived(
    getFormattedMarkets(sorted, base, inverted),
  );
</script>

<div class="panel">
  <div class="header">
    <strong>CRYPTO MARKETS</strong>
    <div
      style="display:flex; gap:6px; width: 100%; justify-content: space-between;"
    >
      <button class="btn" onclick={() => (inverted = !inverted)}>
        {inverted ? "NORMAL" : "INVERT"}
      </button>

      <button
        class="btn update-btn"
        onclick={handleUpdate}
        disabled={isUpdating}
        style="flex-grow: 1;"
      >
        {isUpdating ? "UPDATING..." : "UPDATE"}
        {#if isUpdating}<div class="loading-bar"></div>{/if}
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
