<script lang="ts">
  import "./TimeFrameBar.css";
  import { save } from "../lib/storage";
  import {
    tf,
    type CryptoTimeframe,
    type FxTimeframe,
  } from "../stores/timeframe.svelte";

  let { mode = "crypto" } = $props<{
    mode?: "crypto" | "fx";
  }>();

  $effect(() => save("tfCrypto", tf.activeCrypto));
  $effect(() => save("tfFx", tf.activeFx));

  function setCrypto(tfi: CryptoTimeframe) {
    tf.activeCrypto = tfi;
  }

  function setFx(tfi: FxTimeframe) {
    tf.activeFx = tfi;
  }
</script>

{#if mode === "crypto"}
  <div class="timeframe-selector">
    <span class="toolbar-label">Time Range</span>

    <div class="tf-buttons">
      {#each tf.cryptoTimeframes as tfi}
        <button
          class="tf-btn"
          class:active={tf.activeCrypto.label === tfi.label}
          onclick={() => setCrypto(tfi)}
        >
          {tfi.label}
        </button>
      {/each}
    </div>
  </div>
{:else}
  <div class="timeframe-selector">
    <span class="toolbar-label">Time Range</span>

    <div class="tf-buttons">
      {#each tf.fxTimeframes as tfi}
        <button
          class="tf-btn"
          class:active={tf.activeFx.label === tfi.label}
          onclick={() => setFx(tfi)}
        >
          {tfi.label}
        </button>
      {/each}
    </div>
  </div>
{/if}
