<script lang="ts">
  import { save } from "../lib/storage";
  import { wl } from "../stores/watchlist.svelte";
  import "./Watchlist.css";

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
  <div class="header">
    <strong>MY WATCHLIST</strong>
  </div>

  <div
    class="mode-toggle-bar"
    style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; padding: 0.5rem; background: rgba(0,0,0,0.05); border-radius: 8px;"
  >
    <span>
      <strong
        >CURRENT MODE : {wl.mode === "target_weight"
          ? "WEIGHTED"
          : "PORTFOLIO"}</strong
      >
    </span>
    <button class="btn" onclick={toggleMode}>SWITCH MODE </button>
  </div>

  <div class="controls">
    <input
      type="text"
      class="input"
      placeholder="e.g. DOGE"
      bind:value={newSymbol}
      onkeydown={(e) => e.key === "Enter" && handleAdd()}
    />
    <button class="btn add-btn" onclick={handleAdd}>ADD ASSET</button>
  </div>

  <div class="card-grid">
    {#if wl.cryptos.length === 0}
      <div class="empty-state">No assets added yet.</div>
    {/if}

    {#each wl.cryptos as crypto (crypto.id)}
      <div class="card" class:hidden-card={!crypto.visible}>
        <!-- Card Header: Symbol and Status -->
        <div class="card-header">
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
            <div class="metric">
              <span class="metric-label">TARGET WEIGHT</span>
              {#if editingRows[crypto.id]}
                <input
                  type="number"
                  class="input small-input"
                  bind:value={crypto.weight}
                  min="0"
                  step="0.1"
                />
              {:else}
                <span class="metric-value">{crypto.weight}</span>
              {/if}
            </div>
          {:else}
            <div class="metric">
              <span class="metric-label">HOLDINGS (QTY)</span>
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
                <span class="metric-value">{crypto.position || 0}</span>
              {/if}
            </div>
          {/if}
        </div>

        <!-- Card Actions -->
        <div class="card-actions">
          {#if confirmDelete === crypto.id}
            <!-- CONFIRMATION STATE -->
            <div class="confirm-mode">
              <span class="confirm-text"
                >Delete <b>{crypto.symbol.toUpperCase()}</b>?</span
              >
              <div class="confirm-buttons">
                <button
                  class="btn btn-danger btn-confirm"
                  onclick={() => executeDelete(crypto.id)}
                >
                  YES
                </button>
                <button class="btn btn-cancel" onclick={cancelDelete}>
                  NO
                </button>
              </div>
            </div>
          {:else}
            <!-- REGULAR STATE -->
            <button class="btn" onclick={() => toggleEdit(crypto.id)}>
              {editingRows[crypto.id] ? "SAVE" : "EDIT"}
            </button>

            <button class="btn" onclick={() => wl.toggleVisibility(crypto.id)}>
              {crypto.visible ? "HIDE" : "SHOW"}
            </button>

            <button
              class="btn btn-danger-outline"
              onclick={() => requestDelete(crypto.id)}
            >
              DELETE
            </button>
          {/if}
        </div>
      </div>
    {/each}
  </div>
</div>
