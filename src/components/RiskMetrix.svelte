<script lang="ts">
  import "./RiskMetrix.css";

  import { tf } from "../stores/timeframe.svelte";
  import { wl } from "../stores/watchlist.svelte";

  import CryptoIcon from "./CryptoIcon.svelte";
  import { app } from "../stores/app.svelte";
  import { load, save } from "../lib/storage";
  import { formatBalance, formatPrice } from "../lib/formatter";
  import type { WeightedCryptoPoint } from "../lib/market";

  let ranking: WeightedCryptoPoint[] = $derived(app.cryptoPoints);
  let totalPortfolioUsd = $derived(
    ranking.reduce((sum, r) => {
      return sum + r.coin.position * r.price.t1;
    }, 0),
  );

  type SortKey = "return" | "momentum" | "volatility" | "drawdown" | "holding";

  let sortBy = $state<SortKey>(load("sortBy", "return"));
  let sortDesc = $state(load("sortDesc", true));
  $effect(() => {
    save("sortBy", sortBy);
    save("sortDesc", sortDesc);
  });

  const sortOptions: { label: string; value: SortKey }[] = [
    { label: "Return", value: "return" },
    { label: "Momentum", value: "momentum" },
    { label: "Volatility", value: "volatility" },
    { label: "Max DD", value: "drawdown" },
    { label: "Holding", value: "holding" },
  ];

  let sortItem = $derived(sortOptions.find((s) => s.value === sortBy));

  function getSortValue(p: WeightedCryptoPoint) {
    switch (sortBy) {
      case "return":
        return p.performance.growth;
      case "momentum":
        return p.performance.momentum;
      case "volatility":
        return p.risk.volatility;
      case "drawdown":
        return p.risk.max_dd;
      case "holding":
        return p.coin.position * p.price.t1;
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
  <strong>Asset Ranking ({tf.activeCrypto.label})</strong>

  <div class="timeframe-selector">
    <span class="toolbar-label">Sort By:</span>

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

  <div class="metrics-list">
    {#each sortedRanking as p}
      {@const holdingUsd = p.coin.position * p.price.t1}
      {@const portfolioPct =
        totalPortfolioUsd > 0 ? (holdingUsd / totalPortfolioUsd) * 100 : 0}

      <button class="metric-row" onclick={() => app.updateCoin(p.coin.symbol)}>
        <div class="left">
          <CryptoIcon symbol={p.coin.symbol} size={22} />

          <div class="asset-meta">
            <div class="symbol">{p.coin.symbol.toUpperCase()}</div>

            <div class="price">
              ${formatPrice(p.price.t1)}
            </div>
          </div>
        </div>

        {#if wl.mode === "position_size"}
          <div class="middle">
            <div class="holding-value">
              {p.coin.position}
            </div>

            <div class="holding-usd">
              ${formatBalance(p.coin.position * p.price.t1)}
            </div>
          </div>
        {/if}

        <div class="right">
          <div class="metric-label">
            {sortItem?.label} ({tf.activeCrypto.label})
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
              class="metric-value {p.performance.momentum > 1
                ? 'text-yellow'
                : 'text-muted'}"
            >
              {p.performance.momentum.toFixed(2)}
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
          {:else if sortBy === "holding"}
            <div class="metric-value text-muted">
              {portfolioPct.toFixed(2)}%
            </div>

            <div class="holding-bar">
              <div
                class="holding-bar-fill"
                style={`width:${portfolioPct}%`}
              ></div>
            </div>
          {/if}
        </div>
      </button>
    {/each}
  </div>
</div>
