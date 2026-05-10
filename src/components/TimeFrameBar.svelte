<script lang="ts">
  import "./TimeFrameBar.css";
  import { save } from "../lib/storage";

  import { tf, type TimeFrame } from "../stores/timeframe.svelte";
  import { app } from "../stores/app.svelte";

  $effect(() => save("timeframe", tf.active));

  let isUpdating = $state(false);

  function handleTimeframeChange(tfi: TimeFrame) {
    tf.active = tfi;
    handleUpdate();
  }

  async function handleUpdate() {
    isUpdating = true;
    try {
      await app.updateCrypto();
    } finally {
      isUpdating = false;
    }
  }
</script>

<div class="toolbar">
  <div class="timeframe-selector">
    <span class="toolbar-label">Timeframe:</span>
    <div class="tf-buttons">
      {#each tf.timeframes as tfi}
        <button
          class="tf-btn"
          class:active={tf.active.label === tfi.label}
          onclick={() => handleTimeframeChange(tfi)}
        >
          {tfi.label}
        </button>
      {/each}
    </div>
  </div>
  <button class="btn update-btn" onclick={handleUpdate} disabled={isUpdating}>
    {isUpdating ? "UPDATING..." : "UPDATE"}
    {#if isUpdating}<div class="loading-bar"></div>{/if}
  </button>
</div>
