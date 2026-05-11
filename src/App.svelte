<script lang="ts">
  import { save } from "./lib/storage";

  import CryptoMarkets from "./components/CryptoMarkets.svelte";
  import Navbar from "./components/Navbar.svelte";
  import RiskMetrix from "./components/RiskMetrix.svelte";
  import TimeFrameBar from "./components/TimeFrameBar.svelte";
  import Watchlist from "./components/Watchlist.svelte";

  import { ensureVersionUpdate } from "./lib/version-util";

  import { app } from "./stores/app.svelte";
  import { onMount } from "svelte";
  import TradingView from "./components/TradingView.svelte";

  ensureVersionUpdate();

  $effect(() => {
    save("base", app.base);
    save("coin", app.coin);
  });
  $effect(() => save("crypto", app.cryptoData));
  $effect(() => save("activeTab", app.activeTab));

  onMount(() => {
    app.updateCrypto();
  });
</script>

<Navbar />

<main class="content-area">
  {#if app.activeTab === "dashboard" || app.activeTab === "metrics"}
    <TimeFrameBar />
    <TradingView />
  {/if}

  {#if app.activeTab === "dashboard"}
    <CryptoMarkets />
  {:else if app.activeTab === "metrics"}
    <RiskMetrix />
  {:else if app.activeTab === "watchlist"}
    <Watchlist />
  {/if}
</main>
