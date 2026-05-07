<script lang="ts">
  import type { AssetRanking } from "../lib/market";

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

  // Calculates how "full" the bar should be based on current price vs 30D range
  function getRangePercentage(current: number, low: number, high: number) {
    if (high <= low) return 100; // Fallback to prevent division by zero
    const percentage = ((current - low) / (high - low)) * 100;
    // Clamp the value between 0% and 100% just in case of weird wick data
    return Math.max(0, Math.min(100, percentage));
  }
</script>

<div class="panel" style="margin-top: 10px;">
  <div class="header">
    <strong>PRICE ACTION & RISK (30D)</strong>
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
            {r.symbol}
          </button>
          <div class="primary-price">
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
            <!-- The fill width is dynamically calculated! -->
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
            <span class="label">Strength Index</span>
            <span class="value {r.score >= 0 ? 'text-green' : 'text-red'}">
              {r.score.toFixed(2)}
            </span>
          </div>

          <div class="stat-row">
            <span class="label">Growth Rate</span>
            <span class="value {r.rate >= 0 ? 'text-green' : 'text-red'}">
              {r.rate > 0 ? "+" : ""}{r.rate.toFixed(2)}%
            </span>
          </div>

          <div class="stat-row">
            <span class="label">Average (30D)</span>
            <span class="value text-muted">${formatPrice(r.stats.avg)}</span>
          </div>

          <div class="stat-row">
            <span class="label">Baseline Price</span>
            <span class="value text-purple"
              >${formatPrice(r.stats.baseline)}</span
            >
          </div>

          <div class="stat-row">
            <span class="label">Max Drawdown</span>
            <span class="value badge-dd">
              -{(r.stats.max_drawdown * 100).toFixed(2)}%
            </span>
          </div>
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  /* Responsive Grid Setup */
  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 16px;
    margin-top: 16px;
  }

  /* Individual Card Styling */
  .stat-card {
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid var(--border, #333);
    border-radius: 8px;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  /* Card Header */
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--border, #444);
    padding-bottom: 8px;
  }

  .asset-btn {
    font-weight: bold;
    letter-spacing: 1px;
    padding: 4px 12px;
  }

  .primary-price {
    font-size: 1.2em;
    font-weight: bold;
  }

  /* Range Bar Styles */
  .range-container {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-top: 4px;
    margin-bottom: 4px;
  }

  .range-labels {
    display: flex;
    justify-content: space-between;
    font-size: 0.85em;
  }

  .text-small {
    font-size: 0.85em;
  }

  .progress-bar {
    width: 100%;
    height: 6px;
    background-color: #333;
    border-radius: 4px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--green));
    border-radius: 4px;
    transition: width 0.4s ease-out;
    box-shadow: 0 0 8px var(--green); /* Cyan-green glow */
  }

  /* Card Body (Stats List) */
  .card-body {
    display: flex;
    flex-direction: column;
    gap: 8px;
    font-size: 0.9em;
  }

  .stat-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .label {
    color: var(--muted, #888);
    font-size: 0.9em;
  }

  .value {
    font-weight: 500;
  }

  /* Text Utility Classes */
  .text-green {
    color: #22c55e;
  }
  .text-red {
    color: #ff565b;
  }
  .text-purple {
    color: #a855f7;
  }
  .text-muted {
    color: #888;
  }

  /* Specific Drawdown Badge */
  .badge-dd {
    background-color: rgba(255, 86, 91, 0.15);
    color: #ff565b;
    padding: 2px 6px;
    border-radius: 4px;
    font-weight: bold;
    font-size: 0.85em;
  }
</style>
