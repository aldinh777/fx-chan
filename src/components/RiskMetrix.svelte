<script lang="ts">
  import "./RiskMetrix.css";

  import type { AssetRanking } from "../lib/ranking";
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

  function getRangePercentage(current: number, low: number, high: number) {
    if (high <= low) return 100;
    const percentage = ((current - low) / (high - low)) * 100;
    return Math.max(0, Math.min(100, percentage));
  }

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

  type SortKey = "score" | "sharpe" | "volatility" | "drawdown";

  let sortBy = $state<SortKey>("score");
  let sortDesc = $state(true);

  const sortOptions = [
    { label: "Score", value: "score" },
    { label: "Sharpe", value: "sharpe" },
    { label: "Volatility", value: "volatility" },
    { label: "Max DD", value: "drawdown" },
  ] satisfies { label: string; value: SortKey }[];

  function getSortValue(r: AssetRanking) {
    switch (sortBy) {
      case "score":
        return r.score;

      case "sharpe":
        return r.stats.sharpe;

      case "volatility":
        return r.stats.volatility;

      case "drawdown":
        return r.stats.max_drawdown;

      default:
        return 0;
    }
  }

  let sortedRanking = $derived.by(() => {
    return [...ranking].sort((a, b) => {
      const av = getSortValue(a);
      const bv = getSortValue(b);

      return sortDesc ? bv - av : av - bv;
    });
  });
</script>

<div class="panel" style="margin-top: 10px;">
  <div class="header toolbar">
    <strong>COOL STATISTICS ({tf.active.label})</strong>

    <div class="timeframe-selector">
      <span class="toolbar-label">Sort:</span>

      <div class="tf-buttons">
        {#each sortOptions as opt}
          <button
            class="tf-btn"
            class:active={sortBy === opt.value}
            onclick={() => (sortBy = opt.value)}
          >
            {opt.label}
          </button>
        {/each}
      </div>
      <button class="btn update-btn" onclick={() => (sortDesc = !sortDesc)}>
        {sortDesc ? "DESC" : "ASC"}
      </button>
    </div>
  </div>

  <div class="metrics-grid">
    {#each sortedRanking as r}
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

          <div class="primary-price">
            <div
              class="current-price {r.rate >= 0 ? 'text-green' : 'text-red'}"
            >
              ${formatPrice(r.current)}
            </div>

            <div class="price-details">
              <div class="detail-item text-muted">
                <span class="detail-label help" use:tooltip={"Average Price"}>
                  avg
                </span>

                <span class="detail-value">
                  {formatPrice(r.stats.avg)}
                </span>
              </div>

              <div class="detail-item text-purple">
                <span
                  class="detail-label help"
                  use:tooltip={"Relative Zero : Price at total market average"}
                >
                  base
                </span>

                <span class="detail-value">
                  {formatPrice(r.stats.base_price)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Progress Bar for L/H Range -->
        <div class="range-container">
          <div class="range-labels">
            <span class="text-muted text-small">
              L: ${formatPrice(r.stats.low)}
            </span>

            <span class="text-muted text-small">
              ${formatPrice(r.stats.high)} :H
            </span>
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

          <div class="progress-bar">
            <div
              class="progress-fill average"
              style="width: {getRangePercentage(
                r.stats.avg,
                r.stats.low,
                r.stats.high,
              )}%;"
            ></div>
          </div>

          <div class="progress-bar">
            <div
              class="progress-fill relative-zero"
              style="width: {getRangePercentage(
                r.stats.base_price || 0,
                r.stats.low,
                r.stats.high,
              )}%;"
            ></div>
          </div>
        </div>

        <div class="card-body">
          <div class="stats-grid">
            <div class="stat">
              <div
                class="label help"
                use:tooltip={"Relative Performance Score : Asset performance rank vs market average"}
              >
                Score
              </div>

              <div class="value {r.score >= 0 ? 'text-green' : 'text-red'}">
                {r.score.toFixed(2)}
              </div>
            </div>

            <div class="stat">
              <div
                class="label help"
                use:tooltip={"Relative %: Asset performance compared to the total market average"}
              >
                Rate
              </div>

              <div class="value {r.rate >= 0 ? 'text-green' : 'text-red'}">
                {r.rate > 0 ? "+" : ""}{r.rate.toFixed(2)}%
              </div>
            </div>

            <div class="stat">
              <span
                class="label help"
                use:tooltip={`Total return over ${tf.active.label}`}
              >
                Return
              </span>

              <div class="value {r.stats.absolute_growth >= 0 ? 'text-green' : 'text-red'}">
                {(r.stats.absolute_growth * 100).toFixed(2)}%
              </div>
            </div>

            <div class="stat">
              <span
                class="label help"
                use:tooltip={"Risk-Adjusted Return. Higher means a smoother, safer uptrend."}
              >
                Sharpe
              </span>

              <span
                class="value"
                style="color: {r.stats.sharpe > 1 ? '#fcee0a' : 'var(--text)'}"
              >
                {r.stats.sharpe.toFixed(2)}
              </span>
            </div>

            <div class="stat">
              <span
                class="label help"
                use:tooltip={`Realized Volatility: Average price swing (High-to-Low) over the ${tf.active.label} period`}
              >
                Volatility
              </span>

              <span
                class="value {r.stats.volatility >= 0.06
                  ? 'text-purple'
                  : 'text-muted'}"
              >
                {(r.stats.volatility * 100).toFixed(2)}%
              </span>
            </div>

            <div class="stat">
              <span
                class="label help"
                use:tooltip={"Largest peak-to-trough price drop"}
              >
                Max DD
              </span>

              <span class="value badge-dd">
                -{(r.stats.max_drawdown * 100).toFixed(2)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    {/each}
  </div>
</div>
