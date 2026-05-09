<script lang="ts">
  import "./CryptoMarkets.css";

  import { getFormattedMarkets, type ComputedPoint } from "../lib/market-utils";
  import { tf } from "../stores/timeframe.svelte";
  import { app } from "../stores/app.svelte";
  import TradingView from "./TradingView.svelte";

  let inverted = $state(false);

  let computed: ComputedPoint[] = $derived(
    getFormattedMarkets(
      app.points.filter((p) => p.coin.symbol !== "usdc"),
      app.base,
      inverted,
    ),
  );
</script>

<TradingView />

<div class="panel">
  <div class="header">
    <strong>CRYPTO MARKETS</strong>

    <div class="controls">
      <select id="base-select" bind:value={app.base}>
        {#each app.points as p}
          <option value={p.coin.symbol}>{p.coin.symbol.toUpperCase()}</option>
        {/each}
      </select>

      <button class="btn invert-btn" onclick={() => (inverted = !inverted)}>
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
