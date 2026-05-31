<script lang="ts">
  import { save } from "./lib/storage";

  import CryptoMarkets from "./components/CryptoMarkets.svelte";
  import Navbar from "./components/Navbar.svelte";
  import Watchlist from "./components/Watchlist.svelte";

  import { ensureVersionUpdate } from "./lib/version-util";

  import { app } from "./stores/app.svelte";
  import TradingView from "./components/TradingView.svelte";
  import RelationMatrix from "./components/RelationMatrix.svelte";

  ensureVersionUpdate();

  $effect(() => save("base", app.base));
  $effect(() => save("coin", app.coin));
  $effect(() => save("crypto", app.cryptoData));
  $effect(() => save("fx", app.fxData));
  $effect(() => save("activeTab", app.activeTab));
  $effect(() => {
    app.updateCrypto();
    app.updateForex();
  });
</script>

<Navbar />

<main class="content-area">
  {#if app.activeTab === "dashboard"}
    <CryptoMarkets />
  {:else if app.activeTab === "metrics"}
    <TradingView />
  {:else if app.activeTab === "relation"}
    <RelationMatrix />
  {:else if app.activeTab === "watchlist"}
    <Watchlist />
  {/if}
</main>
