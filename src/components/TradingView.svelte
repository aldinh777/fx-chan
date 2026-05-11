<script lang="ts">
  import "./TradingView.css";

  import {
    CandlestickSeries,
    ColorType,
    createChart,
    LineSeries,
    type CandlestickData,
    type IChartApi,
    type ISeriesApi,
    type LineData,
    type UTCTimestamp,
  } from "lightweight-charts";

  import { onMount } from "svelte";
  import { calculatePriceAction } from "../lib/fetchers/hyperliquid";
  import { formatPrice } from "../lib/formatter";
  import { app } from "../stores/app.svelte";
  import CryptoIcon from "./CryptoIcon.svelte";

  interface ChartTooltip {
    visible: boolean;
    time: string;
    base: number;
    open: number;
    high: number;
    low: number;
    close: number;
    diff: number;
    change: number;
  }

  let container: HTMLDivElement | undefined = $state();
  let tooltipContainer: HTMLDivElement | undefined = $state();
  let shiftRightaBit = $state(false);
  let chart: IChartApi | undefined = $state();
  let candleSeries: ISeriesApi<"Candlestick"> | undefined = $state();
  let lineSeries: ISeriesApi<"Line"> | undefined = $state();
  let activeCoin = $derived(
    app.cryptoData.find((c) => c.coin.symbol === app.coin),
  );
  let tooltip: ChartTooltip = $state({
    visible: false,
    time: "",
    base: 0,
    open: 0,
    high: 0,
    low: 0,
    close: 0,
    diff: 0,
    change: 0,
  });

  const resize = () => {
    chart?.applyOptions({
      width: container?.clientWidth,
    });
    chart?.timeScale().fitContent();
  };

  $effect(() => {
    if (!chart || !candleSeries || !container) {
      return;
    }

    requestAnimationFrame(() => {
      resize();
    });

    calculatePriceAction(app.coin, app.base).then(({ prices, market_avg }) => {
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
      const averages = market_avg.map((p, i) => {
        const time = Math.floor(p.t / 1000) as UTCTimestamp;
        return {
          value: prices[i].c / p.r,
          time,
        } satisfies LineData;
      });

      candleSeries?.setData(ohlcs);
      lineSeries?.setData(averages);
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

    candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#26a69a",
      downColor: "#ef5350",
      borderVisible: false,
      wickDownColor: "#ef5350",
      wickUpColor: "#26a69a",
    });

    lineSeries = chart.addSeries(LineSeries, {
      color: "#a855f7",
      lineWidth: 1,
      priceLineVisible: false,
    });

    chart.subscribeCrosshairMove((p) => {
      if (!container || !candleSeries || !lineSeries) {
        return;
      }

      if (!p.point || !p.time || p.point.x < 0 || p.point.y < 0) {
        tooltip.visible = false;
        return;
      }

      const d = p.seriesData.get(candleSeries) as CandlestickData;
      const g = p.seriesData.get(lineSeries) as LineData;

      if (tooltipContainer) {
        shiftRightaBit = p.point.x < tooltipContainer.clientWidth + 24;
      }

      if (!d || !g) {
        tooltip.visible = false;
        return;
      }

      tooltip = {
        visible: true,

        time: new Date(Number(p.time) * 1000).toLocaleString(),

        base: g.value,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,

        diff: d.close - d.open,
        change: ((d.close - d.open) / d.open) * 100,
      } satisfies ChartTooltip;
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

<div class="panel">
  <div class="chart-header">
    <div class="pair">
      <CryptoIcon symbol={app.coin} size={32} />

      <div class="pair-info">
        <div class="symbol">
          {app.coin.toUpperCase()}/{app.base.toUpperCase()}
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
        bind:this={tooltipContainer}
        class="tooltip"
        class:positive={tooltip.change >= 0}
        class:negative={tooltip.change < 0}
        style:left="{shiftRightaBit ? 224 : 12}px"
        style:top="12px"
      >
        <div class="time">
          {tooltip.time}
        </div>

        <div class="ohlc-row">
          <span>Base</span>
          <span class="text-purple">{formatPrice(tooltip.base)}</span>
        </div>

        <div class="ohlc-row">
          <span>Open</span>
          <span>{formatPrice(tooltip.open)}</span>
        </div>

        <div class="ohlc-row">
          <span>High</span>
          <span>{formatPrice(tooltip.high)}</span>
        </div>

        <div class="ohlc-row">
          <span>Low</span>
          <span>{formatPrice(tooltip.low)}</span>
        </div>

        <div class="ohlc-row">
          <span>Close</span>
          <span>{formatPrice(tooltip.close)}</span>
        </div>

        <div class="ohlc-row">
          <span>Change</span>
          <span>{formatPrice(tooltip.diff)}</span>
        </div>

        <div class="ohlc-row">
          <span>%</span>
          <span>({tooltip.change.toFixed(2)}%)</span>
        </div>
      </div>
    {/if}
  </div>
</div>
