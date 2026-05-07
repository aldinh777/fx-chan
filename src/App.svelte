<script lang="ts">
  import { load, save } from "./lib/storage";
  import { rate, buildRanking, type PricePoint } from "./lib/market";

  import {
    fetchHyperliquidCoin,
    fetchAll as fetchAllCrypto,
  } from "./lib/fetchers/hyperliquid";
  import CryptoMarkets from "./components/CryptoMarkets.svelte";
  import RelativeStrength from "./components/RelativeStrength.svelte";

  const cryptoCoins = [
    "btc",
    "eth",
    "sol",
    "xrp",
    "bnb",
    "hype",
    "mon",
    "zec",
    "xmr",
    "sui",
    "trx",
    "ada",
  ];

  let cryptoData: PricePoint[] = $state(load("crypto"));

  let sorted = $derived(
    [...cryptoData].sort((a, b) => rate(b.t1, b.t0) - rate(a.t1, a.t0)),
  );

  let base = $state("usdc");
  let ranking = $derived(buildRanking(cryptoData));

  async function updateCrypto() {
    cryptoData = await fetchAllCrypto(cryptoCoins, fetchHyperliquidCoin);
    save("crypto", cryptoData);
  }
</script>

<CryptoMarkets {sorted} {base} updateAll={updateCrypto} />

<RelativeStrength {ranking} bind:base />
