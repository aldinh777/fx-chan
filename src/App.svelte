<script lang="ts">
  import {
    buildRanking,
    type PricePoint,
    type WeightedPoint,
  } from "./lib/market";
  import { load, save } from "./lib/storage";

  import { fetchAllCrypto } from "./lib/fetchers/hyperliquid";

  import CryptoMarkets from "./components/CryptoMarkets.svelte";
  import RiskMetrix from "./components/RiskMetrix.svelte";
  import Watchlist from "./components/Watchlist.svelte";

  import { ensureVersionUpdate } from "./lib/version-util";
  import { watchlist } from "./lib/watchlist.svelte";
  import CryptoIcon from "./components/CryptoIcon.svelte";

  ensureVersionUpdate();

  const timeframes = [
    { label: "1D", days: 1, interval: "15m" },
    { label: "7D", days: 7, interval: "1h" },
    { label: "30D", days: 30, interval: "4h" },
    { label: "90D", days: 90, interval: "12h" },
    { label: "360D", days: 360, interval: "1d" },
  ];

  let selectedTimeframe = $state(load("timeframe", timeframes[2]));

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

  $effect(() => {
    save("timeframe", selectedTimeframe);
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
          weight: calculatedEffectiveWeight,
          confidence: confidence,
          position: positionQty,
        },
      ];
    }),
  );

  let ranking = $derived(buildRanking(points));

  async function updateCrypto() {
    cryptoData = await fetchAllCrypto(
      watchlist.items,
      selectedTimeframe.days,
      selectedTimeframe.interval,
    );
    save("crypto", cryptoData);
  }

  function handleTimeframeChange(tf: (typeof timeframes)[0]) {
    selectedTimeframe = tf;
    handleUpdate();
  }

  let isUpdating = $state(false);
  async function handleUpdate() {
    isUpdating = true;
    try {
      await updateCrypto();
    } finally {
      isUpdating = false;
    }
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

{#if activeTab === "dashboard"}
  <div class="toolbar">
    <div class="timeframe-selector">
      <span class="toolbar-label">Timeframe:</span>
      <div class="tf-buttons">
        {#each timeframes as tf}
          <button
            class="tf-btn"
            class:active={selectedTimeframe.label === tf.label}
            onclick={() => handleTimeframeChange(tf)}
          >
            {tf.label}
          </button>
        {/each}
      </div>
    </div>
    <button class="btn update-btn" onclick={handleUpdate} disabled={isUpdating}>
      {isUpdating ? "UPDATING..." : "UPDATE"}
      {#if isUpdating}<div class="loading-bar"></div>{/if}
    </button>
  </div>
{/if}

<main class="content-area">
  {#if activeTab === "dashboard"}
    <CryptoMarkets {points} {base} />
    <RiskMetrix {ranking} bind:base timeframe={selectedTimeframe} />
  {:else if activeTab === "watchlist"}
    <Watchlist />
  {/if}
</main>

<style>
  /* 
    Toolbar wrapped to look like your global .panel class 
    but styled specifically for inline sub-navigation 
  */
  .toolbar {
    padding: 12px;
    background-color: var(--panel);
    border: 1px solid var(--border);
    border-radius: 6px;
    margin-bottom: 16px;
    display: flex;
    justify-content: space-between; /* Changed: Pushes items to opposite edges */
    align-items: center; /* NEW: Keeps them vertically centered */
  }

  .timeframe-selector {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .toolbar-label {
    font-size: 13px;
    color: var(--muted);
    font-weight: 600;
  }

  /* 
    Segmented Control Group 
    Uses the deepest background color to create an inset look
  */
  .tf-buttons {
    display: flex;
    background: var(--bg);
    border-radius: 6px;
    border: 1px solid var(--border);
    overflow: hidden;
  }

  .tf-btn {
    background: transparent;
    border: none;
    border-right: 1px solid var(--border);
    color: var(--muted);
    padding: 6px 14px;
    font-size: 12px;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.2s ease-in-out;
  }

  /* Remove the border from the very last button so it doesn't double up */
  .tf-btn:last-child {
    border-right: none;
  }

  /* Soft hover effect indicating it's clickable */
  .tf-btn:hover:not(.active) {
    background: rgba(31, 199, 212, 0.05); /* very faint cyan */
    color: var(--accent);
  }

  /* 
    ACTIVE STATE
    Mirrors your global .btn:hover / .btn:active neon effects 
  */
  .tf-btn.active {
    background: rgba(31, 199, 212, 0.05); /* very faint cyan */
    color: var(--accent);
  }

  /* Mobile Responsive Adjustment */
  @media (max-width: 600px) {
    .toolbar {
      padding: 8px;
      flex-direction: column; /* Stacks the timeframe and update button */
      align-items: stretch; /* Makes children fill the width */
      gap: 12px;
    }
    .timeframe-selector {
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;
      width: 100%;
    }
    .tf-buttons {
      width: 100%;
    }
    .tf-btn {
      flex: 1; /* Makes all buttons equal width on mobile */
      padding: 8px 4px;
    }
    .update-btn {
      width: 100%; /* Full width easy-tap button on mobile */
    }
  }
</style>
