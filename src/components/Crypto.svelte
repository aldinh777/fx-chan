<script lang="ts">
  import { rate, type PricePoint } from "../lib/market";

  const {
    sorted,
    ranking,
    updateAll,
    remove,
  }: {
    sorted: PricePoint[];
    ranking: { symbol: string; score: number }[];
    updateAll: () => void;
    remove: (p: PricePoint) => void;
  } = $props();

  let base = $state("usd");
  let inverted = $state(false);

  function setBase(b: string) {
    base = b.toLowerCase();
    inverted = false;
  }

  function toggleInvert() {
    inverted = !inverted;
  }

  function findBaseRow() {
    return sorted.find((r) => r.coin === base);
  }

  function convert(row: PricePoint) {
    const baseRow = findBaseRow();

    if (!baseRow || base === "usd") {
      return {
        t0: inverted ? 1 / row.t0 : row.t0,
        t1: inverted ? 1 / row.t1 : row.t1,
        pair: inverted
          ? `${base.toUpperCase()}/${row.coin.toUpperCase()}`
          : `${row.coin.toUpperCase()}/${base.toUpperCase()}`,
      };
    }

    const t0 = row.t0 / baseRow.t0;
    const t1 = row.t1 / baseRow.t1;

    return {
      t0: inverted ? 1 / t0 : t0,
      t1: inverted ? 1 / t1 : t1,
      pair: inverted
        ? `${base.toUpperCase()}/${row.coin.toUpperCase()}`
        : `${row.coin.toUpperCase()}/${base.toUpperCase()}`,
    };
  }

  let computed = $derived.by(() => {
    // explicit dependencies
    base;
    inverted;
    sorted;

    return sorted.map((row) => ({
      row,
      c: convert(row),
    }));
  });
</script>

<div class="panel">
  <div class="header">
    <strong>CRYPTO MARKETS</strong>

    <div style="display:flex; gap:6px;">
      <button class="btn" onclick={toggleInvert}>
        {inverted ? "NORMAL" : "INVERT"}
      </button>
      <button class="btn" onclick={updateAll}>UPDATE</button>
    </div>
  </div>

  <table class="table">
    <thead>
      <tr>
        <th>PAIR</th>
        <th>NOW</th>
        <th>OLD</th>
        <th>30D</th>
        <th></th>
      </tr>
    </thead>

    <tbody>
      {#each computed as item}
        <tr>
          <td>{item.c.pair}</td>

          <td>{item.c.t1.toFixed(6)}</td>
          <td>{item.c.t0.toFixed(6)}</td>

          <td class={rate(item.c.t1, item.c.t0) >= 0 ? "pos" : "neg"}>
            {rate(item.c.t1, item.c.t0).toFixed(2)}%
          </td>

          <td>
            <button class="btn" onclick={() => remove(item.row)}>x</button>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<div class="panel" style="margin-top:10px">
  <div class="header">
    <strong>RELATIVE STRENGTH</strong>
  </div>

  <table class="table">
    <thead>
      <tr>
        <th>ASSET</th>
        <th>SCORE</th>
      </tr>
    </thead>

    <tbody>
      {#each ranking as r}
        <tr>
          <td>
            <button class="btn" onclick={() => setBase(r.symbol)}>
              {r.symbol}
            </button>
          </td>

          <td class={r.score >= 0 ? "pos" : "neg"}>
            {r.score.toFixed(2)}%
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
