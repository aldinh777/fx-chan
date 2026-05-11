<script lang="ts">
  import "./TradingView.css";

  import {
    CandlestickSeries,
    ColorType,
    createChart,
    HistogramSeries,
    LineSeries,
    type CandlestickData,
    type HistogramData,
    type IChartApi,
    type ISeriesApi,
    type LineData,
    type UTCTimestamp,
  } from "lightweight-charts";

  import { onMount } from "svelte";
  import { calculatePriceAction } from "../lib/fetchers/hyperliquid";
  import { formatPrice, formatVolume, getPriceFormat } from "../lib/formatter";
  import { app } from "../stores/app.svelte";
  import CryptoIcon from "./CryptoIcon.svelte";

  interface ChartTooltip {
    visible: boolean;
    time: string;
    base: number;
    volume: number;
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
  let marketSeries: ISeriesApi<"Line"> | undefined = $state();
  let volumeSeries: ISeriesApi<"Histogram"> | undefined = $state();

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

  let tooltip: ChartTooltip = $state({
    visible: false,
    time: "",
    base: 0,
    volume: 0,
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

      candleSeries?.applyOptions({
        priceFormat: {
          type: "price",
          precision: format.precision,
          minMove: format.minMove,
        },
      });

      candleSeries?.setData(ohlcs);
      candleSeries?.setData(ohlcs);
      marketSeries?.setData(averages);
      volumeSeries?.setData(volumes);
      volumeSeries?.priceScale().applyOptions({
        scaleMargins: {
          top: 0.82,
          bottom: 0,
        },
      });
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
      localization: {
        priceFormatter(price: number) {
          return formatPrice(price);
        },
        timeFormatter(timestamp: UTCTimestamp) {
          return new Date(timestamp * 1000).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          });
        },
      },
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

    marketSeries = chart.addSeries(LineSeries, {
      color: "#a855f7",
      lineWidth: 1,
      priceLineVisible: false,
    });

    volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: {
        type: "volume",
      },
      priceScaleId: "volume",
      priceLineVisible: false,
      lastValueVisible: false,
    });

    chart.subscribeCrosshairMove((p) => {
      if (!container || !candleSeries || !marketSeries || !volumeSeries) {
        return;
      }

      if (!p.point || !p.time || p.point.x < 0 || p.point.y < 0) {
        tooltip.visible = false;
        return;
      }

      const d = p.seriesData.get(candleSeries) as CandlestickData;
      const g = p.seriesData.get(marketSeries) as LineData;
      const v = p.seriesData.get(volumeSeries) as HistogramData;

      if (tooltipContainer) {
        shiftRightaBit = p.point.x < tooltipContainer.clientWidth + 24;
      }

      if (!d || !g || !v) {
        tooltip.visible = false;
        return;
      }

      tooltip = {
        visible: true,

        time: new Date(Number(p.time) * 1000).toLocaleString(),

        base: g.value,
        volume: v.value,

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
          {coinPair.symbol}
        </div>

        <div
          class="price-row"
          class:positive={coinPair.growth >= 0}
          class:negative={coinPair.growth < 0}
        >
          <span class="price">
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
  </div>

  <div bind:this={container} class="chart-container">
    {#if tooltip.visible}
      <!-- left calculation => left:12 width:160 padding*2:16 margin(left*2):24 = 212  -->
      <div
        bind:this={tooltipContainer}
        class="tooltip"
        class:positive={tooltip.change >= 0}
        class:negative={tooltip.change < 0}
        style:left="{shiftRightaBit ? 212 : 12}px"
      >
        <div class="time">
          {tooltip.time}
        </div>

        <div class="ohlc-row">
          <span>Base</span>
          <span class="text-purple">{formatPrice(tooltip.base)}</span>
        </div>

        <div class="separator"></div>

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

        <div class="separator"></div>

        <div class="ohlc-row">
          <span>Volume</span>
          <span>{formatVolume(tooltip.volume)}</span>
        </div>

        <div class="ohlc-row">
          <span>Change</span>
          <span>
            {formatPrice(tooltip.diff)}
            ({tooltip.change > 0 ? "+" : ""}{tooltip.change.toFixed(2)}%)
          </span>
        </div>
      </div>
    {/if}
  </div>
</div>
