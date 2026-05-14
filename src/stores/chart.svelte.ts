import {
  CandlestickSeries,
  ColorType,
  createChart,
  HistogramSeries,
  type CandlestickData,
  type HistogramData,
  type IChartApi,
  type UTCTimestamp,
} from "lightweight-charts";

import { formatPrice } from "../lib/formatter";

function initChart(container: HTMLDivElement) {
  return createChart(container, {
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
}

function candles(chart: IChartApi | undefined) {
  return chart?.addSeries(CandlestickSeries, {
    upColor: "#26a69a",
    downColor: "#ef5350",
    borderVisible: false,
    wickDownColor: "#ef5350",
    wickUpColor: "#26a69a",
  });
}

function volumes(chart: IChartApi | undefined) {
  return chart?.addSeries(HistogramSeries, {
    priceFormat: {
      type: "volume",
    },
    priceScaleId: "volume",
    priceLineVisible: false,
    lastValueVisible: false,
  });
}

interface ChartTooltip {
  visible: boolean;
  time: string;
  volume: number;
  open: number;
  high: number;
  low: number;
  close: number;
  diff: number;
  change: number;
}

class Charters {
  chartContainer: HTMLDivElement | undefined = $state();
  chart = $derived(this.chartContainer && initChart(this.chartContainer));
  candleSeries = $derived(candles(this.chart));
  volumeSeries = $derived(volumes(this.chart));
  tooltip: ChartTooltip = $state({
    visible: false,
    time: "",
    volume: 0,
    open: 0,
    high: 0,
    low: 0,
    close: 0,
    diff: 0,
    change: 0,
  });

  tooltipContainer: HTMLDivElement | undefined = $state();
  shiftRightaBit = $state(false);

  initTooltip() {
    this.chart?.subscribeCrosshairMove((p) => {
      if (
        !this.chartContainer ||
        !this.tooltipContainer ||
        !this.candleSeries ||
        !this.volumeSeries
      ) {
        return;
      }

      if (!p.point || !p.time || p.point.x < 0 || p.point.y < 0) {
        this.tooltip.visible = false;
        return;
      }

      const d = p.seriesData.get(this.candleSeries) as CandlestickData;
      const v = p.seriesData.get(this.volumeSeries) as HistogramData;

      if (this.tooltipContainer) {
        this.shiftRightaBit =
          p.point.x < this.tooltipContainer.clientWidth + 24;
      }

      if (!d || !v) {
        this.tooltip.visible = false;
        return;
      }

      this.tooltip = {
        visible: true,

        time: new Date(Number(p.time) * 1000).toLocaleTimeString("id-ID", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        }),

        volume: v.value,

        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,

        diff: d.close - d.open,
        change: ((d.close - d.open) / d.open) * 100,
      } satisfies ChartTooltip;
    });
  }

  resize() {
    this.chart?.applyOptions({
      width: this.chartContainer?.clientWidth,
    });
    this.chart?.timeScale().fitContent();
  }
}

export const chart = new Charters();
