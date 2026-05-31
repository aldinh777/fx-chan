<script lang="ts">
  import { Network } from "vis-network/standalone";
  import { DataSet } from "vis-data";

  let networkEl: HTMLDivElement | undefined = $state();

  let minThreshold = $state(0.6);
  let maxThreshold = $state(1.0);

  let network: Network | null = null;
  let nodes: DataSet<any> | null = null;
  let edges: DataSet<any> | null = null;

  const step = 0.02;
  const roundStep = (v: number) => Math.round(v * 50) / 50;

  function buildNodes() {
    return Object.keys(corelationMatrix).map((coin) => ({
      id: coin,
      label: trimSymbolPrefix(coin),
      shape: "dot",
      size: 20,
      color: "#3b82f6",
      originalColor: "#3b82f6",
      font: {
        color: "#ffffff",
      },
    }));
  }

  function buildEdges() {
    const edges: any[] = [];
    const coins = Object.keys(corelationMatrix);
    for (let i = 0; i < coins.length; i++) {
      for (let j = i + 1; j < coins.length; j++) {
        const a = coins[i];
        const b = coins[j];
        const corr = corelationMatrix[a]?.[b];
        if (corr == null) continue;

        const strength = Math.abs(corr);
        if (strength < minThreshold) continue;
        if (strength > maxThreshold) continue;

        let color;
        if (corr > 0) {
          if (strength > 0.9) color = "#dc2626";
          else if (strength > 0.7) color = "#f97316";
          else color = "#fbbf24";
        } else {
          if (strength > 0.9) color = "#16a34a";
          else if (strength > 0.7) color = "#22c55e";
          else color = "#86efac";
        }

        edges.push({
          from: a,
          to: b,
          value: Math.abs(corr),
          width: 1 + Math.abs(corr) * 8,
          color,
          originalColor: color,
          title: `\n${trimSymbolPrefix(a)}\n↔\n${trimSymbolPrefix(b)}\n\nCorrelation: ${corr.toFixed(3)}`,
        });
      }
    }
    return edges;
  }
  const options = {
    autoResize: true,
    physics: {
      stabilization: true,
      barnesHut: {
        gravitationalConstant: -1200,
        springLength: 150,
        springConstant: 0.02,
      },
    },
    interaction: {
      hover: true,
      zoomView: true,
      dragView: true,
    },
    nodes: {
      shape: "dot",
      font: {
        color: "#ffffff",
        size: 14,
        strokeWidth: 3,
        strokeColor: "#000000",
      },
    },
    edges: {
      smooth: true,
    },
  };

  function initNetwork() {
    if (!networkEl) return;

    network?.destroy();

    nodes = new DataSet(buildNodes());
    edges = new DataSet(buildEdges());

    network = new Network(
      networkEl,
      {
        nodes: nodes,
        edges: edges,
      },
      options,
    );

    network.on("hoverNode", ({ node }) => {
      if (!network || !nodes || !edges) return;
      const connectedNodes = new Set([
        node,
        ...network.getConnectedNodes(node),
      ]);
      const connectedEdges = new Set(network.getConnectedEdges(node));
      nodes.update(
        nodes.get().map((n) => ({
          id: n.id,
          color: connectedNodes.has(n.id)
            ? n.originalColor
            : "rgba(180,180,180,0.2)",
        })),
      );
      edges.update(
        edges.get().map((e) => ({
          id: e.id,
          color: connectedEdges.has(e.id)
            ? e.originalColor
            : "rgba(180,180,180,0.05)",
        })),
      );
    });
    network.on("blurNode", () => {
      if (!network || !nodes || !edges) return;
      nodes.update(
        nodes.get().map((n) => ({
          id: n.id,
          color: n.originalColor,
        })),
      );
      edges.update(
        edges.get().map((e) => ({
          id: e.id,
          color: e.originalColor,
        })),
      );
    });
  }

  $effect(() => {
    if (networkEl && Object.keys(corelationMatrix).length > 0 && !network) {
      initNetwork();
    }
  });

  $effect(() => {
    minThreshold;
    maxThreshold;
    if (!edges) return;
    edges.clear();
    edges.add(buildEdges());
  });

  $effect(() => {
    if (!nodes) return;
    const currentNodes = buildNodes();
    nodes.clear();
    nodes.add(currentNodes);
  });

  import {
    _correlation,
    _index_factor,
    type CorelationMatrix,
    type IndexFactor,
  } from "../lib/quant";
  import TimeFrameBar from "./TimeFrameBar.svelte";

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

<TimeFrameBar />

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
  <div>
    <button
      class="btn"
      onclick={() =>
        (minThreshold = roundStep(Math.max(0, minThreshold - step)))}
    >
      -
    </button>
    <input type="range" min="0" max="1" {step} bind:value={minThreshold} />
    <button
      class="btn"
      onclick={() =>
        (minThreshold = roundStep(Math.min(1, minThreshold + step)))}
    >
      +
    </button>
    <span>MIN: {minThreshold.toFixed(2)}</span>
  </div>
  <div>
    <button
      class="btn"
      onclick={() =>
        (maxThreshold = roundStep(Math.max(0, maxThreshold - step)))}
    >
      -
    </button>
    <input type="range" min="0" max="1" {step} bind:value={maxThreshold} />
    <button
      class="btn"
      onclick={() =>
        (maxThreshold = roundStep(Math.min(1, maxThreshold + step)))}
    >
      +
    </button>
    <span>MAX: {maxThreshold.toFixed(2)}</span>
  </div>
  <div bind:this={networkEl} class="network"></div>
{/if}

<style>
  .heatmap th {
    cursor: pointer;
  }
  .network {
    width: 100%;
    height: 600px;
    border: 1px solid #ddd;
  }
</style>
