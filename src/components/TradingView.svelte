<script lang="ts">
  import "./TradingView.css";

  import type { CandlestickData, UTCTimestamp } from "lightweight-charts";
  import { onMount } from "svelte";

  import { calculatePriceAction } from "../lib/fetchers/hyperliquid";
  import { formatPrice, formatVolume, getPriceFormat } from "../lib/formatter";
  import { app } from "../stores/app.svelte";
  import { chart } from "../stores/chart.svelte";
  import CryptoIcon from "./CryptoIcon.svelte";
  import TimeFrameBar from "./TimeFrameBar.svelte";

  interface CoinPair {
    symbol: string;
    growth: number;
    price: number;
  }

  interface CoinPair {
    symbol: string;
    growth: number;
    change: number;
    price: number;
  }

  let coinPair: CoinPair = $derived.by(() => {
    const coin = app.cryptoData.find((c) => c.coin.symbol === app.coin);
    const base = app.cryptoData.find((c) => c.coin.symbol === app.base);

    const t1coin = coin?.price.t1 || 1;
    const t0coin = coin?.price.t0 || 1;
    const t1base = base?.price.t1 || 1;
    const t0base = base?.price.t0 || 1;

    const t1price = t1coin / t1base;
    const t0price = t0coin / t0base;
    const change = t1price - t0price;
    const growth = change / t0price;

    return {
      symbol: `${app.coin.toUpperCase()}/${app.base.toUpperCase()}`,
      price: t1price,
      change,
      growth,
    };
  });

  let loading = $state(false);

  $effect(() => chart.init());
  $effect(() => {
    app.chartPanel = chart.chartContainer;
  });

  $effect(() => {
    loading = true;

    requestAnimationFrame(() => {
      chart.resize();
    });

    calculatePriceAction(app.coin, app.base)
      .then((prices) => {
        if (!chart.chart || !chart.candleSeries || !chart.volumeSeries) {
          return;
        }

        const ohlcs = prices.map((c) => {
          const time = Math.floor(c.t / 1000) as UTCTimestamp;
          return {
            open: c.o,
            high: c.h,
            low: c.l,
            close: c.c,
            time,
          } satisfies CandlestickData;
        });
        const volumes = prices.map((c) => {
          const time = Math.floor(c.t / 1000) as UTCTimestamp;
          return {
            time,
            value: c.v,
            color:
              c.c >= c.o ? "rgba(38, 166, 154, 0.5)" : "rgba(239, 83, 80, 0.5)",
          };
        });

        const priceSample = prices.at(-1)?.c || 0;
        const format = getPriceFormat(priceSample);

        chart.candleSeries?.applyOptions({
          priceFormat: {
            type: "price",
            precision: format.precision,
            minMove: format.minMove,
          },
        });

        chart.candleSeries?.setData(ohlcs);
        chart.volumeSeries?.setData(volumes);
        chart.volumeSeries?.priceScale().applyOptions({
          scaleMargins: {
            top: 0.82,
            bottom: 0,
          },
        });
        chart.chart?.timeScale().fitContent();
      })
      .finally(() => {
        loading = false;
      });
  });

  const onResize = () => chart.resize();
  onMount(() => {
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      chart.chart?.remove();
      chart.chart = undefined;
      chart.candleSeries = undefined;
      chart.volumeSeries = undefined;
    };
  });
</script>

<div class="panel">
  <div class="chart-header">
    <div class="pair">
      <div class="left">
        <CryptoIcon symbol={app.coin} size={32} />

        <div class="pair-info">
          <div class="symbol-chart">
            {coinPair.symbol}
          </div>

          <div
            class="price-row"
            class:positive={coinPair.growth >= 0}
            class:negative={coinPair.growth < 0}
          >
            <span class="price-chart">
              {formatPrice(coinPair.price)}
            </span>

            <span class="change">
              ({coinPair.growth > 0 ? "+" : ""}{(coinPair.growth * 100).toFixed(
                2,
              )}%)
            </span>
          </div>
        </div>
      </div>

      <div class="controls">
        <select bind:value={app.coin}>
          {#each app.cryptoPoints as p}
            <option value={p.coin.symbol}>
              {p.coin.symbol.toUpperCase()}
            </option>
          {/each}
        </select>

        <select bind:value={app.base}>
          {#each app.cryptoPoints as p}
            <option value={p.coin.symbol}>
              {p.coin.symbol.toUpperCase()}
            </option>
          {/each}
        </select>

        <button class="btn invert-btn" onclick={() => app.invertCryptoPair()}>
          INVERT
        </button>
      </div>
    </div>
  </div>

  <TimeFrameBar />

  <div bind:this={chart.chartContainer} class="chart-container">
    {#if loading}
      <div class="loading-overlay">
        <div class="spinner"></div>
      </div>
    {/if}
    {#if chart.tooltip.visible}
      <!-- left calculation => left:12 width:100 padding*2:16 margin(left*2):24 = 212  -->
      <div
        bind:this={chart.tooltipContainer}
        class="tooltip"
        class:positive={chart.tooltip.change >= 0}
        class:negative={chart.tooltip.change < 0}
        style:left="{chart.shiftRightaBit ? 172 : 12}px"
      >
        <div class="time">
          {chart.tooltip.time}
        </div>

        <div class="separator"></div>

        <div class="ohlc-row">
          <span>Open</span>
          <span>{formatPrice(chart.tooltip.open)}</span>
        </div>

        <div class="ohlc-row">
          <span>High</span>
          <span>{formatPrice(chart.tooltip.high)}</span>
        </div>

        <div class="ohlc-row">
          <span>Low</span>
          <span>{formatPrice(chart.tooltip.low)}</span>
        </div>

        <div class="ohlc-row">
          <span>Close</span>
          <span>{formatPrice(chart.tooltip.close)}</span>
        </div>

        <div class="separator"></div>

        <div class="ohlc-row">
          <span>Change</span>
          <span>
            {chart.tooltip.change.toFixed(2)}%
          </span>
        </div>

        <div class="ohlc-row">
          <span>Diff</span>
          <span>
            {formatPrice(chart.tooltip.diff)}
          </span>
        </div>

        <div class="ohlc-row">
          <span>Volume</span>
          <span>{formatVolume(chart.tooltip.volume)}</span>
        </div>
      </div>
    {/if}
  </div>
</div>
