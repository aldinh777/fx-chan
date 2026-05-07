<script lang="ts">
  import { watchlist } from "../lib/watchlist.svelte";

  let newSymbol = $state("");
  let editingRows = $state<Record<string, boolean>>({});
  let confirmDelete = $state<string | null>(null);

  function handleAdd() {
    const result = watchlist.add(newSymbol);
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
    watchlist.remove(id);
    confirmDelete = null;
  }
</script>

<div class="panel">
  <div class="header">
    <strong>MY WATCHLIST</strong>
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
    {#if watchlist.items.length === 0}
      <div class="empty-state">No assets added yet.</div>
    {/if}

    {#each watchlist.items as crypto (crypto.id)}
      <div class="card" class:hidden-card={!crypto.visible}>
        <!-- Card Header: Symbol and Status -->
        <div class="card-header">
          <strong class="asset-symbol">{crypto.symbol}</strong>
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
          <div class="metric">
            <span class="metric-label">WEIGHT</span>
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

          <div class="metric">
            <span class="metric-label">CONFIDENCE</span>
            {#if editingRows[crypto.id]}
              <input
                type="number"
                class="input small-input"
                bind:value={crypto.confidence}
                min="0"
                step="0.1"
              />
            {:else}
              <span class="metric-value">{crypto.confidence}</span>
            {/if}
          </div>
        </div>

        <!-- Card Actions -->
        <div class="card-actions">
          {#if confirmDelete === crypto.id}
            <!-- CONFIRMATION STATE -->
            <div class="confirm-mode">
              <span class="confirm-text">Delete <b>{crypto.symbol}</b>?</span>
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

            <button
              class="btn"
              onclick={() => watchlist.toggleVisibility(crypto.id)}
            >
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

<style>
  /* --- Panel & Controls --- */
  .controls {
    display: flex;
    gap: 8px;
    margin-bottom: 24px;
  }

  .input {
    flex-grow: 1;
    padding: 10px 12px;
    border-radius: 6px;
    border: 1px solid var(--border);
    background: var(--bg);
    color: inherit;
    font-size: 16px; /* Prevents auto-zoom on mobile */
  }

  /* --- Grid Layout --- */
  .card-grid {
    display: grid;
    /* Automatically creates columns based on available width. Fits mobile perfectly. */
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 16px;
  }

  .empty-state {
    grid-column: 1 / -1;
    text-align: center;
    opacity: 0.5;
    padding: 32px 0;
  }

  /* --- Card Design --- */
  .card {
    display: flex;
    flex-direction: column;
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 16px;
    background: rgba(255, 255, 255, 0.02); /* Slight contrast against panel */
    transition: opacity 0.2s ease;
    gap: 16px;
  }

  .hidden-card {
    opacity: 0.4;
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    padding-bottom: 12px;
  }

  .asset-symbol {
    font-size: 1.2rem;
  }

  .badge {
    font-size: 0.7em;
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    font-weight: bold;
    text-transform: uppercase;
  }

  .badge.tracking {
    background-color: #32756e;
  }
  .badge.ignored {
    background-color: var(--red);
  }

  /* --- Card Body Metrics --- */
  .card-body {
    display: flex;
    gap: 16px;
  }

  .metric {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .metric-label {
    font-size: 0.75rem;
    font-weight: bold;
    color: var(--muted);
  }

  .metric-value {
    font-size: 1rem;
    font-weight: 500;
  }

  .small-input {
    width: 100%;
    padding: 6px 8px;
    text-align: left;
  }

  /* --- Card Actions --- */
  .card-actions {
    display: flex;
    gap: 8px;
    margin-top: auto; /* Pushes buttons to the bottom if card heights vary */
  }

  .card-actions .btn {
    flex: 1; /* Makes buttons equal width */
    padding: 8px 0;
    font-size: 0.85rem;
  }

  /* --- Confirmation Flow --- */
  .confirm-mode {
    display: flex;
    flex-direction: column;
    width: 100%;
    gap: 8px;
  }

  .confirm-text {
    font-size: 0.9rem;
    color: var(--red);
    text-align: center;
  }

  .confirm-buttons {
    display: flex;
    width: 100%;
    gap: 8px;
  }

  .confirm-buttons .btn {
    flex: 1;
  }

  /* --- Button Styles --- */
  .btn-danger {
    background-color: var(--red);
    color: white;
    border: 1px solid var(--red);
  }

  .btn-cancel {
    background-color: transparent;
    border: 1px solid var(--border);
    color: inherit;
  }

  .btn-danger-outline {
    background: transparent;
    color: var(--red);
    border: 1px solid var(--red);
  }

  .btn-danger-outline:hover {
    background: var(--red);
    color: white;
  }
</style>
