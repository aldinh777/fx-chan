<script lang="ts">
  import "./CryptoMarkets.css";

  import { tf } from "../stores/timeframe.svelte";
  import { app } from "../stores/app.svelte";
  import {
    getFormattedCryptoMarkets,
    getFormattedFxMarkets,
    type ComputedCryptoPoint,
    type ComputedFxPoint,
  } from "../lib/market-utils";
  import TimeFrameBar from "./TimeFrameBar.svelte";

  let formattedCrypto: ComputedCryptoPoint[] = $derived(
    getFormattedCryptoMarkets(
      app.cryptoPoints.filter((p) => p.coin.symbol !== "usdc"),
      app.base,
    ),
  );
  let formattedFx: ComputedFxPoint[] = $derived(
    getFormattedFxMarkets(app.fxData),
  );
</script>

<div class="panel">
  <div class="header">
    <strong>FX MARKETS</strong>
  </div>

  <TimeFrameBar mode="fx" />

  <table class="table market-table" style="width: 100%;">
    <thead>
      <tr>
        <th>PAIR</th>
        <th>NOW</th>
        <th>OLD</th>
        <th>RETURN</th>
      </tr>
    </thead>

    <tbody>
      {#each formattedFx as item}
        {@const currentRate = item.c.growth}

        <tr>
          <td>{item.c.pair}</td>

          <td class="price-cell">
            {item.c.common}<span
              class="diff-highlight"
              class:text-green={currentRate >= 0}
              class:text-red={currentRate < 0}
            >
              {item.c.t1Diff}
            </span>
          </td>

          <td class="price-cell">
            {item.c.common}<span
              class="diff-highlight"
              class:text-green={currentRate >= 0}
              class:text-red={currentRate < 0}
            >
              {item.c.t0Diff}
            </span>
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

<div class="panel">
  <div class="header">
    <strong>CRYPTO MARKETS</strong>
  </div>

  <TimeFrameBar />

  <table class="table market-table" style="width: 100%;">
    <thead>
      <tr>
        <th>PAIR</th>
        <th>NOW</th>
        <th>OLD</th>
        <th>{tf.crypto.label} RETURN</th>
      </tr>
    </thead>
    <tbody>
      {#each formattedCrypto as item}
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
