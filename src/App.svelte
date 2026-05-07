<script lang="ts">
  import Crypto from "./components/Crypto.svelte";

  import { load, save } from "./lib/storage";
  import { rate, buildRanking, type PricePoint } from "./lib/market";

  import {
    fetchHyperliquidCoin,
    fetchAll as fetchAllCrypto,
  } from "./lib/fetchers/hyperliquid";

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

  let cryptoSorted = $derived(
    [...cryptoData].sort((a, b) => rate(b.t1, b.t0) - rate(a.t1, a.t0)),
  );

  let cryptoRanking = $derived(buildRanking(cryptoData));

  async function updateCrypto() {
    cryptoData = await fetchAllCrypto(cryptoCoins, fetchHyperliquidCoin);
    save("crypto", cryptoData);
  }
</script>

<!-- VIEW -->
<Crypto
  sorted={cryptoSorted}
  ranking={cryptoRanking}
  updateAll={updateCrypto}
/>
