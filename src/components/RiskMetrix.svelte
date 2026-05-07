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

  // Tooltip Action
  function tooltip(node: HTMLElement, text: string) {
    let tooltipEl: HTMLDivElement;

    function mouseOver() {
      tooltipEl = document.createElement("div");
      tooltipEl.textContent = text;
      tooltipEl.className = "tooltip-popup";
      document.body.appendChild(tooltipEl);

      const rect = node.getBoundingClientRect();
      tooltipEl.style.left = `${rect.left + rect.width / 2}px`;
      tooltipEl.style.top = `${rect.top - 10}px`;
    }

    function mouseOut() {
      if (tooltipEl) {
        tooltipEl.remove();
      }
    }

    node.addEventListener("mouseover", mouseOver);
    node.addEventListener("mouseout", mouseOut);

    return {
      destroy() {
        node.removeEventListener("mouseover", mouseOver);
        node.removeEventListener("mouseout", mouseOut);
      },
    };
  }
</script>

<div class="panel" style="margin-top: 10px;">
  <div class="header">
    <strong>RELATIVE INDEX &amp; RISK METRIX (30D)</strong>
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
            <span
              class="label help"
              use:tooltip={"Relative strength score vs market average"}
              >Strength Index</span
            >
            <span class="value {r.score >= 0 ? 'text-green' : 'text-red'}"
              >{r.score.toFixed(2)}</span
            >
          </div>

          <div class="stat-row">
            <span
              class="label help"
              use:tooltip={"Relative growth rate based vs market average"}
              >Growth Rate</span
            >
            <span class="value {r.rate >= 0 ? 'text-green' : 'text-red'}"
              >{r.rate > 0 ? "+" : ""}{r.rate.toFixed(2)}%</span
            >
          </div>

          <div class="stat-row">
            <span
              class="label help"
              use:tooltip={"Price if relative growth was zero"}>Base Price</span
            >
            <span class="value text-purple"
              >${formatPrice(r.stats.baseline)}</span
            >
          </div>

          <div class="stat-row">
            <span
              class="label help"
              use:tooltip={"Simple moving average of the last 30 daily closes"}
              >Average Price</span
            >
            <span class="value text-muted">${formatPrice(r.stats.avg)}</span>
          </div>

          <div class="stat-row">
            <span
              class="label help"
              use:tooltip={"Largest peak-to-trough drop in the last 30 days"}
              >Max Drawdown</span
            >
            <span class="value badge-dd"
              >-{(r.stats.max_drawdown * 100).toFixed(2)}%</span
            >
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
    background: var(--accent);
    border-radius: 4px;
    transition: width 0.4s ease-out;
    box-shadow: 0 0 8px var(--green);
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
    color: var(--green);
  }
  .text-red {
    color: var(--red);
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

  /* Style for labels that have help text */
  .help {
    cursor: help;
    text-decoration: underline dotted var(--muted);
    text-underline-offset: 3px;
  }

  /* Style for the actual floating popup */
  :global(.tooltip-popup) {
    position: fixed;
    padding: 6px 10px;
    background: var(--panel);
    border: 1px solid var(--accent);
    color: var(--text);
    font-size: 0.75rem;
    border-radius: 4px;
    pointer-events: none;
    transform: translate(-50%, -100%);
    white-space: nowrap;
    z-index: 1000;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
    /* Subtle glow to match neon theme */
    filter: drop-shadow(0 0 2px var(--accent));
  }
</style>
