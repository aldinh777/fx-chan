<script lang="ts">
  import { Pencil, Save, Eye, EyeOff, Trash2, Check, X } from "lucide-svelte";

  import { save } from "../lib/storage";
  import { wl } from "../stores/watchlist.svelte";
  import "./Watchlist.css";
  import { type CorelationMatrix, _correlation } from "../lib/quant";

  $effect(() => {
    save("wlFxs", wl.fxs);
    save("wlCryptos", wl.cryptos);
    save("wlMode", wl.mode);
  });

  let newSymbol = $state("");
  let editingRows = $state<Record<string, boolean>>({});
  let confirmDelete = $state<string | null>(null);

  function handleAdd() {
    const result = wl.add(newSymbol);
    if (result.success) {
      newSymbol = "";
    } else if (result.message) {
      alert(result.message);
    }
  }

  function toggleEdit(id: string) {
    editingRows[id] = !editingRows[id];
  }

  function requestDelete(id: string) {
    confirmDelete = id;
  }

  function cancelDelete() {
    confirmDelete = null;
  }

  function executeDelete(id: string) {
    wl.remove(id);
    confirmDelete = null;
  }

  function toggleMode() {
    wl.toggleMode();
  }

  let coins = $derived.by(() => {
    const keys = Object.keys(matrix);

    if (keys.length === 0) {
      return [];
    }

    function avgAbsCorr(coin: string) {
      let sum = 0;
      let n = 0;

      for (const other of keys) {
        if (other === coin) continue;
        const v = corelationMatrix[coin]?.[other];
        if (v == null || Number.isNaN(v)) continue;
        sum += Math.abs(v);
        n++;
      }
      return n ? sum / n : 0;
    }

    function avgBeta(coin: string) {
      let sum = 0;
      let n = 0;
      for (const other of keys) {
        if (other === coin) continue;
        const v = betaMatrix[coin]?.[other];
        if (v == null || Number.isNaN(v)) continue;
        sum += v;
        n++;
      }
      return n ? sum / n : 0;
    }

    function avgAlpha(coin: string) {
      let sum = 0;
      let n = 0;
      for (const other of keys) {
        if (other === coin) continue;
        const v = alphaMatrix[coin]?.[other];
        if (v == null || Number.isNaN(v)) continue;
        sum += v;
        n++;
      }
      return n ? sum / n : 0;
    }

    switch (mode) {
      case "corelation":
        return [...keys].sort((a, b) => avgAbsCorr(b) - avgAbsCorr(a));
      case "beta":
        return [...keys].sort((a, b) => avgBeta(b) - avgBeta(a));
      case "alpha":
        return [...keys].sort((a, b) => avgAlpha(b) - avgAlpha(a));

      default:
        return keys;
    }
  });
  let loading = $derived(coins.length === 0);

  function trimSymbolPrefix(symbol: string) {
    const [prefix, coin] = symbol.split(":");
    return coin ? coin.toUpperCase() : prefix.toUpperCase();
  }

  let mode = $state("corelation");
  let corelationMatrix: CorelationMatrix = $state({});
  let betaMatrix: CorelationMatrix = $state({});
  let alphaMatrix: CorelationMatrix = $state({});

  let matrix = $derived.by(() => {
    switch (mode) {
      case "corelation":
        return corelationMatrix;
      case "beta":
        return betaMatrix;
      case "alpha":
        return alphaMatrix;
      default:
        return {};
    }
  });

  async function calculateCorelations() {
    const [c, b, a] = await _correlation();
    corelationMatrix = c;
    betaMatrix = b;
    alphaMatrix = a;
  }

  $effect(() => {
    calculateCorelations();
  });

  function clamp(x: number, min: number, max: number) {
    return Math.max(min, Math.min(max, x));
  }

  function maxAbsValue(m: CorelationMatrix) {
    let max = 0;

    for (const row of Object.values(m)) {
      for (const v of Object.values(row)) {
        if (v == null || Number.isNaN(v)) continue;
        max = Math.max(max, Math.abs(v));
      }
    }

    return max || 1;
  }

  let betaMax = $derived(maxAbsValue(betaMatrix));
  let alphaMax = $derived(maxAbsValue(alphaMatrix));

  function color(v: number) {
    if (v === undefined || v === null || Number.isNaN(v)) {
      return "#f3f4f6";
    }

    let x = 0;

    switch (mode) {
      case "corelation":
        x = clamp(v, -1, 1);
        break;

      case "beta":
        // beta centered around 1
        // beta 1 = neutral
        // below 1 green
        // above 1 red
        x = clamp((v - 1) / betaMax, -1, 1);
        break;

      case "alpha":
        // alpha centered around 0
        x = clamp(v / alphaMax, -1, 1);
        break;

      default:
        x = 0;
    }

    const neutral = [243, 244, 246];
    const red = [127, 29, 29];
    const green = [21, 128, 61];
    const target = x >= 0 ? red : green;

    const t = Math.abs(x);
    const r = Math.round(neutral[0] + (target[0] - neutral[0]) * t);
    const g = Math.round(neutral[1] + (target[1] - neutral[1]) * t);
    const b = Math.round(neutral[2] + (target[2] - neutral[2]) * t);
    return `rgb(${r}, ${g}, ${b})`;
  }

  function textColor(v: number) {
    const rgb = color(v);
    const m = rgb.match(/\d+/g);
    if (!m) return "#111827";

    const [r, g, b] = m.map(Number);

    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;

    return luminance > 140 ? "#111827" : "#ffffff";
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

      default:
        return v.toFixed(2);
    }
  }
</script>

<div class="panel">
  <div class="mode-toggle-bar">
    <span>
      <strong
        >CURRENT MODE : {wl.mode === "target_weight"
          ? "WEIGHTED"
          : "PORTFOLIO"}</strong
      >
    </span>
    <button class="btn" onclick={toggleMode}>SWITCH MODE</button>
  </div>

  <div class="controls-p">
    <input
      type="text"
      class="input"
      placeholder="e.g. DOGE"
      bind:value={newSymbol}
      onkeydown={(e) => e.key === "Enter" && handleAdd()}
    />
    <button class="btn add-btn" onclick={handleAdd}>ADD ASSET</button>
  </div>

  <div>
    <button class="btn" onclick={() => (mode = "corelation")}>corelation</button
    >
    <button class="btn" onclick={() => (mode = "beta")}>beta</button>
    <button class="btn" onclick={() => (mode = "alpha")}>alpha</button>
  </div>

  {#if loading || coins.length === 0}
    <div class="loading">Computing correlation matrix...</div>
  {:else}
    <div class="heatmap-wrap">
      <table class="heatmap">
        <thead>
          <tr>
            <th></th>
            {#each coins as c}
              <th>{trimSymbolPrefix(c)}</th>
            {/each}
          </tr>
        </thead>

        <tbody>
          {#each coins as row}
            <tr>
              <td class="row">{trimSymbolPrefix(row)}</td>

              {#each coins as col}
                {@const v = matrix[row]?.[col]}
                <td
                  class="cell"
                  style="background: {color(v)}; color: {textColor(v)}"
                  title={`${trimSymbolPrefix(row)} => ${trimSymbolPrefix(col)}\nValue: ${formatValue(v)}`}
                >
                  {formatValue(v)}
                </td>
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
  <div class="card-grid">
    {#if wl.cryptos.length === 0}
      <div class="empty-state">No assets added yet.</div>
    {/if}

    {#each wl.cryptos as crypto (crypto.id)}
      <!-- Card Header: Symbol and Status -->
      <div class="card-wl" class:hidden-card={!crypto.visible}>
        <div class="card-header-wl">
          <strong class="asset-symbol">{crypto.symbol.toUpperCase()}</strong>
          <span
            class="badge"
            class:tracking={crypto.visible}
            class:ignored={!crypto.visible}
          >
            {crypto.visible ? "Tracking" : "Ignored"}
          </span>
        </div>

        <!-- Card Body: Editable Metrics -->
        <div class="card-body">
          {#if wl.mode === "target_weight"}
            <div class="metric-p">
              <span class="metric-label-p">TARGET WEIGHT</span>
              {#if editingRows[crypto.id]}
                <input
                  type="number"
                  class="input small-input"
                  bind:value={crypto.weight}
                  min="0"
                  step="0.1"
                />
              {:else}
                <span class="metric-value-p">{crypto.weight}</span>
              {/if}
            </div>
          {:else}
            <div class="metric-p">
              <span class="metric-label-p">HOLDINGS (QTY)</span>
              {#if editingRows[crypto.id]}
                <!-- Note: Step is much smaller here to accommodate token fractions -->
                <input
                  type="number"
                  class="input small-input"
                  bind:value={crypto.position}
                  min="0"
                  step="0.0001"
                />
              {:else}
                <span class="metric-value-p">{crypto.position || 0}</span>
              {/if}
            </div>
          {/if}
        </div>

        <!-- Card Actions -->
        <div class="card-actions">
          {#if confirmDelete === crypto.id}
            <div class="confirm-mode">
              <button
                class="icon-btn danger"
                onclick={() => executeDelete(crypto.id)}
              >
                <Check size={18} />
              </button>

              <button class="icon-btn" onclick={cancelDelete}>
                <X size={18} />
              </button>
            </div>
          {:else}
            <button class="icon-btn" onclick={() => toggleEdit(crypto.id)}>
              {#if editingRows[crypto.id]}
                <Save size={18} />
              {:else}
                <Pencil size={18} />
              {/if}
            </button>

            <button
              class="icon-btn"
              onclick={() => wl.toggleVisibility(crypto.id)}
            >
              {#if crypto.visible}
                <EyeOff size={18} />
              {:else}
                <Eye size={18} />
              {/if}
            </button>

            <button
              class="icon-btn danger"
              onclick={() => requestDelete(crypto.id)}
            >
              <Trash2 size={18} />
            </button>
          {/if}
        </div>
      </div>
    {/each}
  </div>
</div>
