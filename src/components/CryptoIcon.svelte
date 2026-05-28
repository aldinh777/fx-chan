<script lang="ts">
  let { symbol, size = 24 } = $props();
  const apiCoin = $derived.by(() => {
    const [prefix, coin] = symbol.split(":");
    return coin
      ? prefix.toLowerCase() + ":" + coin.toUpperCase()
      : prefix.toUpperCase();
  });
</script>

<img
  src="https://app.hyperliquid.xyz/coins/{apiCoin}.svg"
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
