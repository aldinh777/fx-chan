<script lang="ts">
  import Crypto from "./components/Crypto.svelte";
  import Fx from "./components/Forex.svelte";

  import { load, save } from "./lib/storage";
  import { rate, buildRanking, type PricePoint } from "./lib/market";

  import {
    fetchHyperliquidCoin,
    fetchAll as fetchAllCrypto,
  } from "./lib/fetchers/hyperliquid";

  import { fetchForexPair, fetchAllForex } from "./lib/fetchers/forex";

  // --- page state ---
  const PAGE_KEY = "page";

  function loadPage(): "fx" | "crypto" {
    const v = localStorage.getItem(PAGE_KEY);
    return v === "crypto" ? "crypto" : "fx";
  }

  function savePage(v: "fx" | "crypto") {
    localStorage.setItem(PAGE_KEY, v);
  }

  let page: "fx" | "crypto" = $state(loadPage());

  function setPage(p: "fx" | "crypto") {
    page = p;
    savePage(p);
  }

  // --- crypto state ---
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

  let cryptoRanking = $derived(buildRanking(cryptoData, cryptoCoins));

  async function updateCrypto() {
    cryptoData = await fetchAllCrypto(cryptoCoins, fetchHyperliquidCoin);
    save("crypto", cryptoData);
  }

  function removeCrypto(item: PricePoint) {
    cryptoData = cryptoData.filter((d) => d !== item);
    save("crypto", cryptoData);
  }

  // --- forex state ---
  const base = "usd";
  const fxCurrencies = ["idr", "eur", "sgd", "aud", "jpy"];

  let fxData: PricePoint[] = $state(load("fx"));

  let fxSorted = $derived(
    [...fxData].sort((a, b) => rate(b.t1, b.t0) - rate(a.t1, a.t0)),
  );

  let fxRanking = $derived(buildRanking(fxData, fxCurrencies));

  async function updateFx() {
    fxData = await fetchAllForex(base, fxCurrencies, fetchForexPair);
    save("fx", fxData);
  }

  function removeFx(item: PricePoint) {
    fxData = fxData.filter((d) => d !== item);
    save("fx", fxData);
  }
</script>

<!-- NAV -->
<div class="nav">
  <button class:active={page === "fx"} onclick={() => setPage("fx")}>
    FX
  </button>

  <button class:active={page === "crypto"} onclick={() => setPage("crypto")}>
    CRYPTO
  </button>
</div>

<!-- VIEW -->
{#if page === "fx"}
  <Fx
    sorted={fxSorted}
    ranking={fxRanking}
    updateAll={updateFx}
    remove={removeFx}
  />
{:else}
  <Crypto
    sorted={cryptoSorted}
    ranking={cryptoRanking}
    updateAll={updateCrypto}
    remove={removeCrypto}
  />
{/if}
