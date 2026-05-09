<script lang="ts">
  import type { WeightedPoint } from "./lib/market";

  import { load, save } from "./lib/storage";

  import { fetchAllCrypto } from "./lib/fetchers/hyperliquid";

  import CryptoMarkets from "./components/CryptoMarkets.svelte";
  import Navbar from "./components/Navbar.svelte";
  import RiskMetrix from "./components/RiskMetrix.svelte";
  import Watchlist from "./components/Watchlist.svelte";

  import TimeFrameBar from "./components/TimeFrameBar.svelte";
  import { weightPoints } from "./lib/market-utils";
  import { ensureVersionUpdate } from "./lib/version-util";

  ensureVersionUpdate();

  let base = $state("usdc");
  let cryptoData: WeightedPoint[] = $state(load("crypto", []));
  $effect(() => save("crypto", cryptoData));

  let activeTab = $state(load("activeTab", "dashboard"));
  $effect(() => save("activeTab", activeTab));

  let points: WeightedPoint[] = $derived(weightPoints(cryptoData));

  async function updateCrypto() {
    cryptoData = await fetchAllCrypto();
  }
</script>

<Navbar bind:activeTab />

{#if activeTab === "dashboard" || activeTab === "metrics"}
  <TimeFrameBar onupdate={updateCrypto} />
{/if}

<main class="content-area">
  {#if activeTab === "dashboard"}
    <CryptoMarkets {points} {base} />
  {:else if activeTab === "metrics"}
    <RiskMetrix {points} bind:base />
  {:else if activeTab === "watchlist"}
    <Watchlist />
  {/if}
</main>
