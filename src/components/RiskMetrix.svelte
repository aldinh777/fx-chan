<script lang="ts">
  import "./RiskMetrix.css";

  import type { AssetRanking } from "../lib/market";
  import { tf } from "../stores/timeframe.svelte";
  import CryptoIcon from "./CryptoIcon.svelte";

  export interface Props {
    ranking: AssetRanking[];
    base: string;
  }

  let { ranking, base = $bindable() }: Props = $props();

  function formatPrice(val: number | undefined) {
    if (val === undefined) return "0.00";
    if (val < 0.01) return val.toFixed(6);
    if (val < 1) return val.toFixed(4);
    if (val > 1000) return val.toFixed(0);
    return val.toFixed(2);
  }

  const volumeFormatter = new Intl.NumberFormat("en-US", {
    notation: "compact",
    compactDisplay: "short",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  function formatVolume(val: number | undefined) {
    if (val === undefined || isNaN(val)) return "0.00";
    return volumeFormatter.format(val);
  }

  // Calculates how "full" the bar should be based on current price vs dynamic range
  function getRangePercentage(current: number, low: number, high: number) {
    if (high <= low) return 100;
    const percentage = ((current - low) / (high - low)) * 100;
    return Math.max(0, Math.min(100, percentage));
  }

  // Tooltip Action (Unchanged)
  function tooltip(node: HTMLElement, text: string) {
    let tooltipEl: HTMLDivElement | null = null;

    function mouseEnter() {
      if (tooltipEl) {
        tooltipEl.remove();
      }

      tooltipEl = document.createElement("div");
      tooltipEl.textContent = text;
      tooltipEl.className = "tooltip-popup";
      document.body.appendChild(tooltipEl);

      const rect = node.getBoundingClientRect();
      tooltipEl.style.left = `${rect.left + rect.width / 2}px`;
      tooltipEl.style.top = `${rect.top - 10}px`;
    }

    function mouseLeave() {
      if (tooltipEl) {
        tooltipEl.remove();
        tooltipEl = null;
      }
    }

    node.addEventListener("mouseenter", mouseEnter);
    node.addEventListener("mouseleave", mouseLeave);

    return {
      update(newText: string) {
        text = newText;
        if (tooltipEl) tooltipEl.textContent = text;
      },
      destroy() {
        node.removeEventListener("mouseenter", mouseEnter);
        node.removeEventListener("mouseleave", mouseLeave);
        if (tooltipEl) tooltipEl.remove();
      },
    };
  }
</script>

<div class="panel" style="margin-top: 10px;">
  <div class="header">
    <strong>COOL STATISTICS ({tf.active.label})</strong>
  </div>

  <div class="metrics-grid">
    {#each ranking as r}
      <div class="stat-card">
        <!-- Card Header: Primary Info -->
        <div class="card-header">
          <button
            class="btn asset-btn"
            onclick={() => (base = r.symbol.toLowerCase())}
          >
            <CryptoIcon symbol={r.symbol} size={20} />
            {r.symbol}
          </button>
          <div class="primary-price {r.rate >= 0 ? 'text-green' : 'text-red'}">
            ${formatPrice(r.current)}
          </div>
        </div>

        <!-- Progress Bar for L/H Range -->
        <div class="range-container">
          <div class="range-labels">
            <span class="text-muted text-small"
              >L: ${formatPrice(r.stats.low)}</span
            >
            <span class="text-muted text-small"
              >H: ${formatPrice(r.stats.high)}</span
            >
          </div>
          <div class="progress-bar">
            <div
              class="progress-fill"
              style="width: {getRangePercentage(
                r.current,
                r.stats.low,
                r.stats.high,
              )}%;"
            ></div>
          </div>
        </div>

        <!-- Card Body: Dense Stats List -->
        <div class="card-body">
          <div class="stat-row">
            <span
              class="label help"
              use:tooltip={"Strength Index: Asset performance rank vs market average (0.00 is average)"}
            >
              Strength Index
            </span>
            <span class="value {r.score >= 0 ? 'text-green' : 'text-red'}"
              >{r.score.toFixed(2)}</span
            >
          </div>

          <div class="stat-row">
            <span
              class="label help"
              use:tooltip={"Relative %: Asset performance compared to the total market average"}
              >Relative %</span
            >
            <span class="value {r.rate >= 0 ? 'text-green' : 'text-red'}"
              >{r.rate > 0 ? "+" : ""}{r.rate.toFixed(2)}%</span
            >
          </div>

          <div class="stat-row">
            <span
              class="label help"
              use:tooltip={"Relative Zero: The price this asset would be at if it had moved exactly with the market average"}
            >
              Relative Zero
            </span>
            <span class="value text-purple"
              >${formatPrice(r.stats.base_price)}</span
            >
          </div>

          <div class="stat-row">
            <span
              class="label help"
              use:tooltip={"Simple moving average of the daily closes"}
              >Average Price</span
            >
            <span class="value text-muted">${formatPrice(r.stats.avg)}</span>
          </div>

          <div class="stat-row">
            <span
              class="label help"
              use:tooltip={"Largest peak-to-trough price drop"}
              >Max Drawdown</span
            >
            <span class="value badge-dd"
              >-{(r.stats.max_drawdown * 100).toFixed(2)}%</span
            >
          </div>
          <div class="stat-row">
            <span
              class="label help"
              use:tooltip={`Realized Volatility: Average price swing (High-to-Low) over the ${tf.active.label} period`}
            >
              Volatility
            </span>
            <span class="value text-purple"
              >{(r.stats.volatility * 100).toFixed(2)}%</span
            >
          </div>

          <div class="stat-row">
            <span
              class="label help"
              use:tooltip={"Relative Volume (Current / Avg). > 1.0 means high activity."}
            >
              Vol Intensity
            </span>
            <span
              class="value"
              style="color: {r.stats.intensity > 1.5
                ? 'var(--accent)'
                : 'var(--muted)'}"
            >
              {r.stats.intensity.toFixed(2)}x
            </span>
          </div>

          <div class="stat-row">
            <span
              class="label help"
              use:tooltip={`Total USD value traded over the ${tf.active.interval} period. High volume = High liquidity.`}
              >{tf.active.interval} Volume</span
            >
            <span class="value text-muted">
              ${formatVolume(r.stats.volume)}
            </span>
          </div>

          <div class="stat-row">
            <span
              class="label help"
              use:tooltip={"Risk-Adjusted Return. Higher means a smoother, safer uptrend."}
            >
              Sharpe Ratio
            </span>
            <span
              class="value"
              style="color: {r.stats.sharpe > 1 ? '#fcee0a' : 'var(--text)'}"
            >
              {r.stats.sharpe.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    {/each}
  </div>
</div>
