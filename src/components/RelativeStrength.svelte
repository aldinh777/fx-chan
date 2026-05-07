<script lang="ts">
  export interface Props {
    ranking: { symbol: string; score: number; rate: number }[];
    base: string;
  }
  let { ranking, base = $bindable() }: Props = $props();
</script>

<div class="panel" style="margin-top:10px">
  <div class="header">
    <strong>RELATIVE STRENGTH</strong>
  </div>

  <table class="table strength-table" style="width: 100%;">
    <thead>
      <tr>
        <th>ASSET</th>
        <th>LOG</th>
        <th>RATE</th>
      </tr>
    </thead>
    <tbody>
      {#each ranking as r}
        <tr>
          <td>
            <button
              class="btn"
              style="width:100%"
              onclick={() => (base = r.symbol.toLowerCase())}
            >
              {r.symbol}
            </button>
          </td>
          <td class={r.score >= 0 ? "pos" : "neg"} style="text-align: center;">
            {r.score.toFixed(2)}
          </td>
          <td class={r.rate >= 0 ? "pos" : "neg"} style="text-align: right;">
            {r.rate.toFixed(2)}%
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
