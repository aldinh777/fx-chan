<script lang="ts">
  import "./RiskMetrix.css";

  import type { AssetRanking } from "../lib/market";

  import { buildRanking } from "../lib/market";
  import { tf } from "../stores/timeframe.svelte";

  import CryptoIcon from "./CryptoIcon.svelte";
  import { app } from "../stores/app.svelte";
  import { wl } from "../stores/watchlist.svelte";

  let ranking: AssetRanking[] = $derived(buildRanking(app.points));

  function formatPrice(val: number | undefined) {
    if (val === undefined) return "0.00";
    if (val < 0.01) return val.toFixed(6);
    if (val < 1) return val.toFixed(4);
    if (val < 10) return val.toFixed(3);
    if (val < 1000) return val.toFixed(2);
    if (val < 10000) return val.toFixed(1);
    if (val > 10000) return val.toFixed(0);
    return val.toFixed(2);
  }

  function formatBalance(val: number) {
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

  type SortKey = "strength" | "average" | "sharpe" | "volatility" | "drawdown";

  let sortBy = $state<SortKey>("strength");
  let sortDesc = $state(true);

  const sortOptions: { label: string; value: SortKey }[] = [
    { label: "Strength", value: "strength" },
    { label: "Average", value: "average" },
    { label: "Sharpe", value: "sharpe" },
    { label: "Volatility", value: "volatility" },
    { label: "Max DD", value: "drawdown" },
  ];

  function getSortValue(r: AssetRanking) {
    const p = r.point;
    switch (sortBy) {
      case "strength":
        return r.rate;

      case "average":
        return p.performance.avg_growth;

      case "sharpe":
        return p.performance.sharpe;

      case "volatility":
        return p.risk.volatility;

      case "drawdown":
        return p.risk.max_dd;

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

<div class="panel">
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
      {@const p = r.point}

      <div class="stat-card">
        <!-- Card Header: Primary Info -->
        <div class="card-header">
          <div class="asset-info">
            <button
              class="btn asset-btn"
              onclick={() => app.updateBaseAndMoveToMarket(p.coin.symbol)}
            >
              <CryptoIcon symbol={r.symbol} size={20} />
              {r.symbol}
            </button>

            {#if wl.mode === "position_size"}
              <div class="asset-balance">
                <div class="balance-amount">{p.coin.position}</div>
                <div class="balance-usd text-muted">
                  ${formatBalance(p.coin.position * r.current)}
                </div>
              </div>
            {/if}
          </div>

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
                  {formatPrice(p.price.avg)}
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
                  {formatPrice(r.base)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Progress Bar for L/H Range -->
        <div class="range-container">
          <div class="range-labels">
            <span class="text-muted text-small">
              L: ${formatPrice(p.price.low)}
            </span>

            <span class="text-muted text-small">
              ${formatPrice(p.price.high)} :H
            </span>
          </div>

          <div class="progress-bar">
            <div
              class="progress-fill {r.score < 0 && 'negative'}"
              style="width: {getRangePercentage(
                r.current,
                p.price.low,
                p.price.high,
              )}%;"
            ></div>
          </div>

          <div class="progress-bar">
            <div
              class="progress-fill average"
              style="width: {getRangePercentage(
                p.price.avg,
                p.price.low,
                p.price.high,
              )}%;"
            ></div>
          </div>

          <div class="progress-bar">
            <div
              class="progress-fill relative-zero"
              style="width: {getRangePercentage(
                r.base,
                p.price.low,
                p.price.high,
              )}%;"
            ></div>
          </div>
        </div>

        <div class="card-body">
          <div class="stats-grid">
            <div class="stat">
              <div
                class="label help"
                use:tooltip={"Performance compared to average market"}
              >
                Strength
              </div>

              <div class="value {r.rate >= 0 ? 'text-green' : 'text-red'}">
                {r.rate.toFixed(2)}%
              </div>
            </div>

            <div class="stat">
              <div
                class="label help"
                use:tooltip={`Average return over ${tf.active.label}`}
              >
                Average
              </div>

              <div
                class="value {p.performance.avg_growth >= 0
                  ? 'text-green'
                  : 'text-red'}"
              >
                {p.performance.avg_growth > 0 ? "+" : ""}{(
                  p.performance.avg_growth * 100
                ).toFixed(2)}%
              </div>
            </div>

            <div class="stat">
              <span
                class="label help"
                use:tooltip={`Total return over ${tf.active.label}`}
              >
                Return
              </span>

              <div
                class="value {p.performance.growth >= 0
                  ? 'text-green'
                  : 'text-red'}"
              >
                {p.performance.growth > 0 ? "+" : ""}{(
                  p.performance.growth * 100
                ).toFixed(2)}%
              </div>
            </div>

            <div class="stat">
              <span
                class="label help"
                use:tooltip={"Risk-Adjusted return ratio"}
              >
                Sharpe
              </span>

              <span
                class="value"
                style="color: {p.performance.sharpe > 1
                  ? '#fcee0a'
                  : 'var(--text)'}"
              >
                {p.performance.sharpe.toFixed(2)}
              </span>
            </div>

            <div class="stat">
              <span
                class="label help"
                use:tooltip={`Average true range volatility`}
              >
                Volatility
              </span>

              <span
                class="value {p.risk.volatility >= 0.1
                  ? 'text-purple'
                  : 'text-muted'}"
              >
                {(p.risk.volatility * 100).toFixed(2)}%
              </span>
            </div>

            <div class="stat">
              <span
                class="label help"
                use:tooltip={"Largest rate of price drop"}
              >
                Max DD
              </span>

              <span class="value badge-dd">
                -{(p.risk.max_dd * 100).toFixed(2)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    {/each}
  </div>
</div>
