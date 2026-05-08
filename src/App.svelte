<script lang="ts">
  import type { PricePoint } from "./lib/market";
  import type { AssetRanking, WeightedPoint } from "./lib/ranking";

  import { buildRanking } from "./lib/ranking";
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
  let cryptoData: PricePoint[] = $state(load("crypto", []));
  $effect(() => save("crypto", cryptoData));

  let activeTab = $state(load("activeTab", "dashboard"));
  $effect(() => save("activeTab", activeTab));

  let points: WeightedPoint[] = $derived(weightPoints(cryptoData));
  let ranking: AssetRanking[] = $derived(buildRanking(points));

  async function updateCrypto() {
    cryptoData = await fetchAllCrypto();
  }
</script>

<Navbar bind:activeTab />

{#if activeTab === "dashboard"}
  <TimeFrameBar onupdate={updateCrypto} />
{/if}

<main class="content-area">
  {#if activeTab === "dashboard"}
    <CryptoMarkets {points} {base} />
    <RiskMetrix {ranking} bind:base />
  {:else if activeTab === "watchlist"}
    <Watchlist />
  {/if}
</main>
