<script lang="ts">
  import "./CryptoMarkets.css";

  import type { WeightedPoint } from "../lib/market";

  import { getFormattedMarkets, type ComputedPoint } from "../lib/market-utils";
  import { tf } from "../stores/timeframe.svelte";

  export interface Props {
    points: WeightedPoint[];
    base: string;
  }
  let { points, base }: Props = $props();

  let inverted = $state(false);

  let computed: ComputedPoint[] = $derived(
    getFormattedMarkets(
      points.filter((p) => p.coin.symbol !== "usdc"),
      base,
      inverted,
    ),
  );
</script>

<div class="panel">
  <div class="header">
    <strong>CRYPTO MARKETS</strong>
    <button class="btn invert-btn" onclick={() => (inverted = !inverted)}>
      {inverted ? "NORMAL" : "INVERT"}
    </button>
  </div>

  <table class="table market-table" style="width: 100%;">
    <thead>
      <tr>
        <th>PAIR</th>
        <th>NOW</th>
        <th>OLD</th>
        <th>{tf.active.label} RETURN</th>
      </tr>
    </thead>
    <tbody>
      {#each computed as item}
        {@const currentRate = item.c.growth}
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
            {Math.abs(currentRate * 100).toFixed(2)}%
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
