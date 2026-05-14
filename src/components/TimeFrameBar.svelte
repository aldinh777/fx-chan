<script lang="ts">
  import "./TimeFrameBar.css";
  import { save } from "../lib/storage";

  import { tf, type TimeFrame } from "../stores/timeframe.svelte";

  $effect(() => save("timeframe", tf.active));

  function handleTimeframeChange(tfi: TimeFrame) {
    tf.active = tfi;
  }
</script>

<div class="timeframe-selector">
  <span class="toolbar-label">Time Range</span>
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
