<script lang="ts">
  import "./TradingView.css";

  import {
    createChart,
    ColorType,
    CandlestickSeries,
    type BarData,
    type ISeriesApi,
    type UTCTimestamp,
    type IChartApi,
    type CandlestickData,
  } from "lightweight-charts";

  import { fetchCoin } from "../lib/fetchers/hyperliquid";
  import { app } from "../stores/app.svelte";
  import CryptoIcon from "./CryptoIcon.svelte";
  import { onMount } from "svelte";

  interface ChartTooltip {
    visible: boolean;
    x: number;
    y: number;
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
    change: number;
  }

  let container: HTMLDivElement | undefined = $state();
  let chart: IChartApi | undefined = $state();
  let series: ISeriesApi<"Candlestick"> | undefined = $state();
  let chartVisible = $derived(app.base !== "usdc");
  let activeCoin = $derived(
    app.cryptoData.find((c) => c.coin.symbol === app.base),
  );
  let tooltip: ChartTooltip = $state({
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

  const resize = () => {
    chart?.applyOptions({
      width: container?.clientWidth,
    });
    chart?.timeScale().fitContent();
  };

  $effect(() => {
    if (!chartVisible || !chart || !series || !container) {
      return;
    }

    requestAnimationFrame(() => {
      resize();
    });

    fetchCoin(app.base, true).then((candles) => {
      const ohlcs = candles.map((c) => {
        const time = Math.floor(c.t / 1000) as UTCTimestamp;
        return {
          open: parseFloat(c.o),
          high: parseFloat(c.h),
          low: parseFloat(c.l),
          close: parseFloat(c.c),
          time,
        } as CandlestickData;
      });

      series?.setData(ohlcs);
      chart?.timeScale().fitContent();
    });
  });

  $effect(() => {
    app.chartPanel = container;
  });

  $effect(() => {
    if (!container || chart) {
      return;
    }

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
      if (!container || !series) {
        return;
      }

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
  });

  onMount(() => {
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      chart?.remove();
    };
  });
</script>

{#if chartVisible}
  <div class="panel">
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
                ({activeCoin.performance.growth > 0 ? "+" : ""}{(
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
            <span>O</span>
            <span>{tooltip.open}</span>
          </div>

          <div class="ohlc-row">
            <span>H</span>
            <span>{tooltip.high}</span>
          </div>

          <div class="ohlc-row">
            <span>L</span>
            <span>{tooltip.low}</span>
          </div>

          <div class="ohlc-row">
            <span>C</span>
            <span>{tooltip.close}</span>
          </div>

          <div class="ohlc-row" style="text-align: right;">
            <span></span>
            <span>
              {tooltip.change.toFixed(2)}%
            </span>
            <span></span>
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}
