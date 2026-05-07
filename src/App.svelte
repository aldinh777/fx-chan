<script lang="ts">
  import { buildRanking, rate, type PricePoint } from "./lib/market";
  import { load, save } from "./lib/storage";

  import {
    fetchAll as fetchAllCrypto,
    fetchHyperliquidCoin,
  } from "./lib/fetchers/hyperliquid";

  import CryptoMarkets from "./components/CryptoMarkets.svelte";
  import RiskMetrix from "./components/RiskMetrix.svelte";
  import Watchlist from "./components/Watchlist.svelte";

  import { ensureVersionUpdate } from "./lib/version-util";
  import { watchlist } from "./lib/watchlist.svelte";

  ensureVersionUpdate();

  let cryptoData: PricePoint[] = $state(load("crypto", []));
  let base = $state("usdc");

  let activeTab = $state(load("activeTab", "dashboard"));

  $effect(() => {
    save("activeTab", activeTab);
  });

  $effect(() => {
    save("watchlist", watchlist.items);
  });

  let visibleCryptoData = $derived(
    cryptoData.filter((point) => {
      const watchItem = watchlist.items.find(
        (item) => item.symbol.toLowerCase() === point.coin.toLowerCase(),
      );
      return watchItem ? watchItem.visible : true;
    }),
  );

  let sorted = $derived(
    [...visibleCryptoData].sort((a, b) => rate(b.t1, b.t0) - rate(a.t1, a.t0)),
  );

  let ranking = $derived(buildRanking(visibleCryptoData));

  async function updateCrypto() {
    cryptoData = await fetchAllCrypto(watchlist.items, fetchHyperliquidCoin);
    save("crypto", cryptoData);
  }
</script>

<nav class="navbar">
  <button
    class="nav-item"
    class:active={activeTab === "dashboard"}
    onclick={() => (activeTab = "dashboard")}
  >
    DASHBOARD
  </button>

  <button
    class="nav-item"
    class:active={activeTab === "watchlist"}
    onclick={() => (activeTab = "watchlist")}
  >
    WATCHLIST
  </button>
</nav>

<main class="content-area">
  {#if activeTab === "dashboard"}
    <CryptoMarkets {sorted} {base} updateAll={updateCrypto} />
    <RiskMetrix {ranking} bind:base />
  {:else if activeTab === "watchlist"}
    <Watchlist />
  {/if}
</main>

<style>
  .navbar {
    display: flex;
    gap: 16px;
    margin-bottom: 20px;
    border-bottom: 1px solid var(--border);
    padding-bottom: 8px;
  }

  .nav-item {
    background: none;
    border: none;
    color: var(--muted);
    font-size: 1rem;
    font-weight: bold;
    cursor: pointer;
    padding: 8px 4px;
    position: relative;
    transition: color 0.2s ease;
  }

  .nav-item:hover {
    color: var(--text);
  }

  .nav-item.active {
    color: var(--text);
  }

  /* Animated underline for the active tab */
  .nav-item.active::after {
    content: "";
    position: absolute;
    bottom: -9px; /* Align with the navbar border */
    left: 0;
    width: 100%;
    height: 2px;
    background-color: var(--accent);
  }

  .content-area {
    display: flex;
    flex-direction: column;
    gap: 16px; /* Keeps your dashboard panels spaced nicely */
  }
</style>
