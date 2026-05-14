<script lang="ts">
  import "./RiskMetrix.css";

  import type { AssetRanking } from "../lib/market";

  import { buildRanking } from "../lib/market";
  import { tf } from "../stores/timeframe.svelte";

  import CryptoIcon from "./CryptoIcon.svelte";
  import { app } from "../stores/app.svelte";
  import { load, save } from "../lib/storage";
  import { formatPrice } from "../lib/formatter";

  let ranking: AssetRanking[] = $derived(buildRanking(app.points));

  type SortKey = "return" | "momentum" | "sharpe" | "volatility" | "drawdown";

  let sortBy = $state<SortKey>(load("sortBy", "return"));
  let sortDesc = $state(load("sortDesc", true));
  $effect(() => {
    save("sortBy", sortBy);
    save("sortDesc", sortDesc);
  });

  const sortOptions: { label: string; value: SortKey }[] = [
    { label: "Return", value: "return" },
    { label: "Momentum", value: "momentum" },
    { label: "Sharpe", value: "sharpe" },
    { label: "Volatility", value: "volatility" },
    { label: "Max DD", value: "drawdown" },
  ];

  let sortItem = $derived(sortOptions.find((s) => s.value === sortBy));

  function getSortValue(r: AssetRanking) {
    const p = r.point;
    switch (sortBy) {
      case "return":
        return p.performance.growth;

      case "momentum":
        return p.performance.momentum;

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

  <div class="metrics-list">
    {#each sortedRanking as r}
      {@const p = r.point}

      <button class="metric-row" onclick={() => app.updateCoin(p.coin.symbol)}>
        <div class="left">
          <CryptoIcon symbol={r.symbol} size={22} />

          <div class="asset-meta">
            <div class="symbol">{r.symbol}</div>

            <div class="price">
              ${formatPrice(r.current)}
            </div>
          </div>
        </div>

        <div class="right">
          <div class="metric-label">
            {sortItem?.label} ({tf.active.label})
          </div>

          {#if sortBy === "return"}
            <div
              class="metric-value {p.performance.growth >= 0
                ? 'text-green'
                : 'text-red'}"
            >
              {(p.performance.growth * 100).toFixed(2)}%
            </div>
          {:else if sortBy === "momentum"}
            <div
              class="metric-value {p.performance.momentum >= 0
                ? 'text-green'
                : 'text-red'}"
            >
              {p.performance.momentum.toFixed(2)}
            </div>
          {:else if sortBy === "sharpe"}
            <div
              class="metric-value {p.performance.sharpe > 1
                ? 'text-yellow'
                : 'text-muted'}"
            >
              {p.performance.sharpe.toFixed(2)}
            </div>
          {:else if sortBy === "volatility"}
            <div
              class="metric-value {p.risk.volatility >= 0.1
                ? 'text-purple'
                : 'text-muted'}"
            >
              {(p.risk.volatility * 100).toFixed(2)}%
            </div>
          {:else if sortBy === "drawdown"}
            <div
              class="metric-value {p.risk.max_dd > 0.1
                ? 'text-red'
                : 'text-muted'}"
            >
              -{(p.risk.max_dd * 100).toFixed(2)}%
            </div>
          {/if}
        </div>
      </button>
    {/each}
  </div>
</div>
