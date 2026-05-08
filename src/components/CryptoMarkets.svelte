<script lang="ts">
  import "./CryptoMarkets.css";

  import { rate, type PricePoint } from "../lib/market";
  import { getFormattedMarkets } from "../lib/market-utils";

  export interface Props {
    points: PricePoint[];
    base: string;
  }
  let { points, base }: Props = $props();

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
    getFormattedMarkets(points, base, inverted),
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
        {@const currentRate = rate(item.c.t1, item.c.t0)}
        <tr>
          <td>{item.c.pair}</td>
          <td class="price-cell">
            {item.c.common}<span
              class="diff-highlight"
              class:text-green={currentRate >= 0}
              class:text-red={currentRate < 0}>{item.c.t1Diff}</span
            >
          </td>
          <td class="price-cell">
            {item.c.common}<span
              class="diff-highlight"
              class:text-green={currentRate >= 0}
              class:text-red={currentRate < 0}>{item.c.t0Diff}</span
            >
          </td>
          <td class={currentRate >= 0 ? "text-green" : "text-red"}>
            {currentRate >= 0 ? "↑" : "↓"}
            {Math.abs(currentRate).toFixed(2)}%
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
