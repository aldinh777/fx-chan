<script lang="ts">
  import {
    _correlation,
    _index_factor,
    type CorelationMatrix,
    type IndexFactor,
  } from "../lib/quant";

  type Mode = "corelation" | "beta" | "alpha";

  const NEUTRAL = [243, 244, 246];
  const RED = [127, 29, 29];
  const GREEN = [21, 128, 61];

  let mode = $state<Mode>("corelation");
  let corelationMatrix: CorelationMatrix = $state({});
  let betaMatrix: CorelationMatrix = $state({});
  let alphaMatrix: CorelationMatrix = $state({});

  type SortKey = "coin" | "correlation" | "beta" | "alpha";
  let sortKey = $state<SortKey>("correlation");
  let sortDir = $state<1 | -1>(-1);

  const sortedFactors = $derived.by(() => {
    const arr = [...factors];

    const get = (f: any, key: SortKey) => {
      switch (key) {
        case "coin":
          return f.coin;
        case "correlation":
          return f.correlation;
        case "beta":
          return f.beta;
        case "alpha":
          return f.alpha;
      }
    };

    return arr.sort((a, b) => {
      const va = get(a, sortKey);
      const vb = get(b, sortKey);

      if (typeof va === "string") {
        return sortDir * va.localeCompare(vb);
      }

      return sortDir * ((va ?? 0) - (vb ?? 0));
    });
  });

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      sortDir = sortDir === 1 ? -1 : 1;
    } else {
      sortKey = key;
      sortDir = -1;
    }
  }
  const matrix = $derived.by(() => {
    switch (mode) {
      case "corelation":
        return corelationMatrix;

      case "beta":
        return betaMatrix;

      case "alpha":
        return alphaMatrix;
    }
  });

  const coins = $derived.by(() => {
    const keys = Object.keys(matrix);

    if (keys.length === 0) {
      return [];
    }

    const avg = (
      coin: string,
      source: CorelationMatrix,
      transform = (v: number) => v,
    ) => {
      let sum = 0;
      let n = 0;
      for (const other of keys) {
        if (coin === other) {
          continue;
        }
        const v = source[coin]?.[other];
        if (v == null || Number.isNaN(v)) {
          continue;
        }
        sum += transform(v);
        n++;
      }
      return n ? sum / n : 0;
    };

    switch (mode) {
      case "corelation":
        return [...keys].sort(
          (a, b) =>
            avg(b, corelationMatrix, Math.abs) -
            avg(a, corelationMatrix, Math.abs),
        );
      case "beta":
        return [...keys].sort(
          (a, b) => avg(b, betaMatrix) - avg(a, betaMatrix),
        );
      case "alpha":
        return [...keys].sort(
          (a, b) => avg(b, alphaMatrix) - avg(a, alphaMatrix),
        );
    }
  });

  const loading = $derived(coins.length === 0);
  const betaMax = $derived(maxAbsValue(betaMatrix));
  const alphaMax = $derived(maxAbsValue(alphaMatrix));

  let factors = $state<IndexFactor[]>([]);

  function trimSymbolPrefix(symbol: string) {
    const [prefix, coin] = symbol.split(":");
    return coin?.toUpperCase() ?? prefix.toUpperCase();
  }

  async function calculateCorelations() {
    const [c, b, a] = await _correlation();
    corelationMatrix = c;
    betaMatrix = b;
    alphaMatrix = a;

    factors = await _index_factor();
  }

  $effect(() => {
    calculateCorelations();
  });

  function factorColor(value: number, type: "correlation" | "beta" | "alpha") {
    switch (type) {
      case "correlation":
        return color(value);

      case "beta":
        return color(betaMax ? (value - 1) / betaMax : 0);

      case "alpha":
        return color(alphaMax ? value / alphaMax : 0);
    }
  }
  function clamp(x: number, min: number, max: number) {
    return Math.max(min, Math.min(max, x));
  }

  function maxAbsValue(matrix: CorelationMatrix) {
    let max = 0;
    for (const row of Object.values(matrix)) {
      for (const v of Object.values(row)) {
        if (v == null || Number.isNaN(v)) {
          continue;
        }
        max = Math.max(max, Math.abs(v));
      }
    }
    return max || 1;
  }

  function normalize(v: number) {
    switch (mode) {
      case "corelation":
        return clamp(v, -1, 1);
      case "beta":
        return clamp((v - 1) / betaMax, -1, 1);
      case "alpha":
        return clamp(v / alphaMax, -1, 1);
    }
  }

  function color(v: number) {
    if (v == null || Number.isNaN(v)) {
      return "#f3f4f6";
    }
    const x = normalize(v);
    const target = x >= 0 ? RED : GREEN;
    const t = Math.abs(x);
    const rgb = NEUTRAL.map((base, i) =>
      Math.round(base + (target[i] - base) * t),
    );
    return `rgb(${rgb.join(", ")})`;
  }

  function textColor(v: number) {
    const rgb = color(v);
    const values = rgb.match(/\d+/g)?.map(Number);
    if (!values) {
      return "#111827";
    }
    const [r, g, b] = values;
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return luminance > 140 ? "#111827" : "#ffffff";
  }

  function textColorFromRgb(rgb: string) {
    const values = rgb.match(/\d+/g)?.map(Number);
    if (!values || values.length < 3) return "#111827";

    const [r, g, b] = values;
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;

    return luminance > 150 ? "#111827" : "#ffffff";
  }

  function formatValue(v: number) {
    if (v == null || Number.isNaN(v)) {
      return "—";
    }
    switch (mode) {
      case "corelation":
        return v.toFixed(2);
      case "beta":
        return `${v.toFixed(2)}β`;
      case "alpha":
        return `${(v * 100).toFixed(2)}%`;
    }
  }

  function tooltip(row: string, col: string, v: number) {
    return [
      `${trimSymbolPrefix(row)} → ${trimSymbolPrefix(col)}`,
      `${mode}: ${formatValue(v)}`,
    ].join("\n");
  }
</script>

<div>
  <button class="btn" onclick={() => (mode = "corelation")}>
    corelation
  </button>

  <button class="btn" onclick={() => (mode = "beta")}> beta </button>

  <button class="btn" onclick={() => (mode = "alpha")}> alpha </button>
</div>

{#if loading}
  <div class="loading">Computing matrix...</div>
{:else}
  <div class="heatmap-wrap">
    <table class="heatmap">
      <thead>
        <tr>
          <th></th>

          {#each coins as coin}
            <th>
              {trimSymbolPrefix(coin)}
            </th>
          {/each}
        </tr>
      </thead>

      <tbody>
        {#each coins as row}
          <tr>
            <td class="row">
              {trimSymbolPrefix(row)}
            </td>

            {#each coins as col}
              {@const v = matrix[row]?.[col]}

              <td
                class="cell"
                style={`
                  background:${color(v)};
                  color:${textColor(v)};
                `}
                title={tooltip(row, col, v)}
              >
                {formatValue(v)}
              </td>
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
  <div class="factor-wrap">
    <table class="heatmap">
      <thead>
        <tr>
          <th onclick={() => toggleSort("coin")}>Coin</th>
          <th onclick={() => toggleSort("correlation")}>Corr Portfolio</th>
          <th onclick={() => toggleSort("beta")}>Beta Portfolio</th>
          <th onclick={() => toggleSort("alpha")}>Alpha Portfolio</th>
        </tr>
      </thead>

      <tbody>
        {#each sortedFactors as f}
          {@const bg_corr = factorColor(f.correlation, "correlation")}
          {@const bg_beta = factorColor(f.beta, "beta")}
          {@const bg_alpha = factorColor(f.alpha, "alpha")}
          <tr>
            <td class="row">
              {trimSymbolPrefix(f.coin)}
            </td>

            <td
              class="cell"
              style={`
              background:${bg_corr};
              color:${textColorFromRgb(bg_corr)};
            `}
            >
              {f.correlation.toFixed(2)}
            </td>

            <td
              class="cell"
              style={`
              background:${bg_beta};
              color:${textColorFromRgb(bg_beta)};
            `}
            >
              {f.beta.toFixed(2)}β
            </td>

            <td
              class="cell"
              style={`
              background:${bg_alpha};
              color:${textColorFromRgb(bg_alpha)};
            `}
            >
              {(f.alpha * 100).toFixed(2)}%
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}

<style>
  .heatmap th {
    cursor: pointer;
  }
</style>
