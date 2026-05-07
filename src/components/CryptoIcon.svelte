<script lang="ts">
  let { symbol = "BTC", size = 24 } = $props();
</script>

<img
  src="https://app.hyperliquid.xyz/coins/{symbol.toUpperCase()}.svg"
  alt="icon"
  width={size}
  height={size}
/>

<style>
  img {
    display: block;
    border-radius: 50%;

    background-color: lightgrey;
    padding: 1px;
  }
</style>
