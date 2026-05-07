<script lang="ts">
  import {
    buildRanking,
    type PricePoint,
    type WeightedPoint,
  } from "./lib/market";
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
    save("watchlist_mode", watchlist.mode);
  });

  let points: WeightedPoint[] = $derived(
    cryptoData.flatMap((point) => {
      const watchItem = watchlist.items.find(
        (item) => item.symbol.toLowerCase() === point.coin.toLowerCase(),
      );

      if (watchItem && !watchItem.visible) {
        return [];
      }

      const rawWeight = watchItem?.weight ?? 1;
      const positionQty = watchItem?.position ?? 0;
      const confidence = watchItem?.confidence ?? 1;

      const calculatedEffectiveWeight =
        watchlist.mode === "position_size"
          ? positionQty * point.t1 // Real USD Notional Value
          : rawWeight; // Simulated USD Value

      return [
        {
          ...point,
          weight: calculatedEffectiveWeight, // Overwrite with the final calculated weight
          confidence: confidence,
          position: positionQty, // Still pass this if your UI wants to display it
        },
      ];
    }),
  );

  let ranking = $derived(buildRanking(points));

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
    <CryptoMarkets {points} {base} updateAll={updateCrypto} />
    <RiskMetrix {ranking} bind:base />
  {:else if activeTab === "watchlist"}
    <Watchlist />
  {/if}
</main>
