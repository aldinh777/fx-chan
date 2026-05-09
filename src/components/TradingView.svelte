<script lang="ts">
  import { onMount } from "svelte";
  import {
    createChart,
    ColorType,
    CandlestickSeries,
    type BarData,
    type ISeriesApi,
    type UTCTimestamp,
    type IChartApi,
  } from "lightweight-charts";

  import { fetchCoin } from "../lib/fetchers/hyperliquid";
  import { app } from "../stores/app.svelte";
  import CryptoIcon from "./CryptoIcon.svelte";

  let container: HTMLDivElement;
  let chart: IChartApi;
  let series: ISeriesApi<"Candlestick">;
  let chartVisible = $derived(app.base !== "usdc");
  let activeCoin = $derived(
    app.cryptoData.find((c) => c.coin.symbol === app.base),
  );
  let tooltip = $state({
    visible: false,

    x: 0,
    y: 0,

    time: "",

    open: 0,
    high: 0,
    low: 0,
    close: 0,

    change: 0,
  });

  $effect(() => {
    if (chartVisible) {
      fetchCoin(app.base).then((candles) => {
        const ohlcs = candles.map((c) => {
          const time = Math.floor(c.t / 1000) as UTCTimestamp;
          return {
            open: parseFloat(c.o),
            high: parseFloat(c.h),
            low: parseFloat(c.l),
            close: parseFloat(c.c),
            time,
          };
        });
        series.setData(ohlcs);
        chart.timeScale().fitContent();
      });
    }
  });

  onMount(() => {
    chart = createChart(container, {
      width: container.clientWidth,
      height: 320,

      layout: {
        background: {
          type: ColorType.Solid,
          color: "#111827",
        },
        textColor: "#d1d5db",
      },

      grid: {
        vertLines: {
          color: "#1f2937",
        },
        horzLines: {
          color: "#1f2937",
        },
      },

      crosshair: {
        vertLine: {
          color: "#374151",
        },
        horzLine: {
          color: "#374151",
        },
      },

      rightPriceScale: {
        borderColor: "#374151",
      },

      timeScale: {
        borderColor: "#374151",
        timeVisible: true,
        secondsVisible: false,
        fixRightEdge: true,
      },

      handleScale: false,
      handleScroll: false,
    });

    series = chart.addSeries(CandlestickSeries, {
      upColor: "#26a69a",
      downColor: "#ef5350",
      borderVisible: false,
      wickUpColor: "#26a69a",
      wickDownColor: "#ef5350",
    });

    chart.subscribeCrosshairMove((p) => {
      if (!p.point || !p.time || p.point.x < 0 || p.point.y < 0) {
        tooltip.visible = false;
        return;
      }
      const d = p.seriesData.get(series) as BarData;

      if (!d) {
        tooltip.visible = false;
        return;
      }

      const TOOLTIP_WIDTH = 160;
      const TOOLTIP_HEIGHT = 140;
      const PADDING = 16;

      let x = p.point.x + PADDING;
      let y = p.point.y + PADDING;

      // move left if near right edge
      if (x + TOOLTIP_WIDTH > container.clientWidth) {
        x = p.point.x - TOOLTIP_WIDTH - PADDING;
      }

      // move up if near bottom edge
      if (y + TOOLTIP_HEIGHT > container.clientHeight) {
        y = p.point.y - TOOLTIP_HEIGHT - PADDING;
      }

      // final clamp
      x = Math.max(0, x);
      y = Math.max(0, y);

      tooltip = {
        visible: true,
        x,
        y,

        time: new Date(Number(p.time) * 1000).toLocaleString(),

        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,

        change: ((d.close - d.open) / d.open) * 100,
      };
    });

    const resize = () => {
      chart.applyOptions({
        width: container.clientWidth,
      });

      chart.timeScale().fitContent();
    };

    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      chart.remove();
    };
  });
</script>

<div class="panel" style="display: {chartVisible ? 'block' : 'none'};">
  <div class="chart-header">
    <div class="pair">
      <CryptoIcon symbol={app.base} size={32} />

      <div class="pair-info">
        <div class="symbol">
          {app.base.toUpperCase()}/USDC
        </div>

        <div class="price-row">
          <span
            class="price"
            class:positive={activeCoin && activeCoin.performance.growth >= 0}
            class:negative={activeCoin && activeCoin.performance.growth < 0}
          >
            {activeCoin?.price.t1}
          </span>

          <span
            class:positive={activeCoin && activeCoin.performance.growth >= 0}
            class:negative={activeCoin && activeCoin.performance.growth < 0}
            class="change"
          >
            {#if activeCoin?.performance.growth != null}
              ({activeCoin.performance.growth > 0 ? "+" : "-"}{(
                activeCoin.performance.growth * 100
              ).toFixed(2)}%)
            {/if}
          </span>
        </div>
      </div>
    </div>
  </div>

  <div bind:this={container} class="chart-container">
    {#if tooltip.visible}
      <div
        class="tooltip"
        class:positive={tooltip.change >= 0}
        class:negative={tooltip.change < 0}
        style:left="{tooltip.x}px"
        style:top="{tooltip.y}px"
      >
        <div class="time">
          {tooltip.time}
        </div>

        <div class="ohlc-row">
          <span class="o">O</span>
          <span>{tooltip.open}</span>
        </div>

        <div class="ohlc-row">
          <span class="h">H</span>
          <span>{tooltip.high}</span>
        </div>

        <div class="ohlc-row">
          <span class="l">L</span>
          <span>{tooltip.low}</span>
        </div>

        <div class="ohlc-row">
          <span class="c">C</span>
          <span>{tooltip.close}</span>
        </div>

        <div class="ohlc-row">
          {tooltip.change.toFixed(2)}%
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .chart-header {
    display: flex;
    align-items: center;
    justify-content: space-between;

    margin-bottom: 12px;
  }

  .pair {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .pair-info {
    display: flex;
    flex-direction: column;
  }

  .symbol {
    font-size: 15px;
    color: var(--text);
    letter-spacing: 0.02em;
  }

  .price-row {
    display: flex;
    align-items: baseline;
    gap: 8px;
  }

  .price {
    font-size: 20px;
    font-weight: 700;
  }

  .change {
    font-size: 13px;
    font-weight: 600;
  }

  .chart-container {
    position: relative;
    width: 100%;
  }

  .tooltip {
    position: absolute;
    z-index: 10;
    min-width: 140px;
    padding: 10px 12px;
    border-radius: 10px;
    background: rgba(15, 23, 42, 0.95);
    border: 1px solid #334155;
    font-size: 12px;
    pointer-events: none;
    backdrop-filter: blur(8px);
  }

  .time {
    margin-bottom: 8px;
    color: var(--muted);
    font-size: 11px;
  }

  .positive {
    color: var(--green);
  }

  .negative {
    color: var(--red);
  }

  .ohlc-row {
    display: flex;
    justify-content: space-between;

    gap: 12px;
  }
</style>
