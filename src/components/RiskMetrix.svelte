<script lang="ts">
  import "./RiskMetrix.css";
  import { ArrowDown, ArrowUp } from "lucide-svelte";

  import { wl } from "../stores/watchlist.svelte";

  import CryptoIcon from "./CryptoIcon.svelte";
  import { app } from "../stores/app.svelte";
  import { load, save } from "../lib/storage";
  import { formatBalance, formatPrice } from "../lib/formatter";
  import type { WeightedCryptoPoint } from "../lib/market";

  let ranking: WeightedCryptoPoint[] = $derived(app.cryptoPoints);

  type SortKey = "return" | "volatility" | "sharpe" | "drawdown";

  let sortBy = $state<SortKey>(load("sortBy", "return"));
  let sortDesc = $state(load("sortDesc", true));
  $effect(() => {
    save("sortBy", sortBy);
    save("sortDesc", sortDesc);
  });

  const sortOptions: { label: string; value: SortKey }[] = [
    { label: "Return", value: "return" },
    { label: "Volatility", value: "volatility" },
    { label: "Sharpe", value: "sharpe" },
    { label: "Drawdown", value: "drawdown" },
  ];

  function trimSymbolPrefix(symbol: string) {
    const [prefix, coin] = symbol.split(":");
    return coin?.toUpperCase() ?? prefix.toUpperCase();
  }

  function getSortValue(p: WeightedCryptoPoint) {
    switch (sortBy) {
      case "return":
        return p.performance.simple_return;
      case "volatility":
        return p.risk.volatility.timeframe;
      case "sharpe":
        return p.performance.sharpe.timeframe;
      case "drawdown":
        return p.risk.drawdown.max;
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

<div style="margin-bottom: 4px;">
  <div class="sort-selector">
    <span class="toolbar-label">Sort</span>

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
    <button class="sort-direction-btn" onclick={() => (sortDesc = !sortDesc)}>
      {#if sortDesc}
        <ArrowDown size={16} />
      {:else}
        <ArrowUp size={16} />
      {/if}
    </button>
  </div>

  <div class="metrics-scroll">
    <div class="metrics-row">
      {#each sortedRanking as p}
        <button
          class="metric-card"
          onclick={() => app.updateCoin(p.coin.symbol)}
        >
          <div class="card-top">
            <CryptoIcon symbol={p.coin.symbol} size={24} />

            <div class="asset-meta">
              <div class="symbol">
                {trimSymbolPrefix(p.coin.symbol)}
              </div>

              <div class="price">
                ${formatPrice(p.price.t1)}
              </div>
            </div>
          </div>

          <div class="card-metric">
            {#if sortBy === "return"}
              <div
                class="metric-value {p.performance.simple_return >= 0
                  ? 'text-green'
                  : 'text-red'}"
              >
                {(p.performance.simple_return * 100).toFixed(2)}%
              </div>
            {:else if sortBy === "volatility"}
              <div
                class="metric-value {p.risk.volatility.timeframe >= 0.1
                  ? 'text-purple'
                  : 'text-muted'}"
              >
                {(p.risk.volatility.timeframe * 100).toFixed(2)}%
              </div>
            {:else if sortBy === "sharpe"}
              <div
                class="metric-value {p.performance.sharpe.timeframe > 1
                  ? 'text-yellow'
                  : 'text-muted'}"
              >
                {p.performance.sharpe.timeframe.toFixed(2)}
              </div>
            {:else if sortBy === "drawdown"}
              <div
                class="metric-value {p.risk.drawdown.max > 0.1
                  ? 'text-red'
                  : 'text-muted'}"
              >
                -{(p.risk.drawdown.max * 100).toFixed(2)}%
              </div>
            {/if}
          </div>

          {#if wl.mode === "position_size"}
            <div class="card-bottom">
              <div class="holding-usd">
                ${formatBalance(p.coin.position * p.price.t1)}
              </div>

              <div class="holding-qty">
                {p.coin.position}
              </div>
            </div>
          {/if}
        </button>
      {/each}
    </div>
  </div>
</div>
