<script lang="ts">
  import { rate } from "../lib/market";
  export let sorted;
  export let ranking;
  export let updateAll;
  export let remove;
</script>

<div class="panel">
  <div class="header">
    <strong>CRYPTO MARKETS</strong>
    <button class="btn" onclick={updateAll}>UPDATE</button>
  </div>

  <table class="table">
    <thead>
      <tr>
        <th>PAIR</th>
        <th>PRICE</th>
        <th>30D</th>
        <th></th>
      </tr>
    </thead>
    <tbody>
      {#each sorted as row}
        <tr>
          <td>{row.coin.toUpperCase()}/USDT</td>
          <td>{row.t1.toFixed(4)}</td>
          <td class={rate(row.t1, row.t0) >= 0 ? "pos" : "neg"}>
            {rate(row.t1, row.t0).toFixed(2)}%
          </td>
          <td>
            <button class="btn" onclick={() => remove(row)}>x</button>
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
          <td>{r.symbol}</td>
          <td class={r.score >= 0 ? "pos" : "neg"}>
            {r.score.toFixed(2)}%
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
