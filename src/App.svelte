<script lang="ts">
  import Crypto from "./this/crypto.svelte";
  import Fx from "./this/fx.svelte";

  let isfx = $state(true);
</script>

<button onclick={() => (isfx = true)}>fx here</button>
<button onclick={() => (isfx = false)}>crypto here</button>

{#if isfx}
  <Fx></Fx>
{:else}
  <Crypto></Crypto>
{/if}
