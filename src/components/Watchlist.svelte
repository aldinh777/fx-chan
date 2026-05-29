<script lang="ts">
  import { Pencil, Save, Eye, EyeOff, Trash2, Check, X } from "lucide-svelte";

  import { save } from "../lib/storage";
  import { wl } from "../stores/watchlist.svelte";
  import "./Watchlist.css";
  import RelationMatrix from "./RelationMatrix.svelte";

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

  <RelationMatrix />

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
