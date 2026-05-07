<script lang="ts">
  import { watchlist } from "../lib/watchlist.svelte";

  let newSymbol = $state("");

  let editingRows = $state<Record<string, boolean>>({});

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
    <button class="btn" onclick={handleAdd}>ADD ASSET</button>
  </div>

  <table class="table list-table">
    <thead>
      <tr>
        <th>ASSET</th>
        <th>WEIGHT</th>
        <th>CONFIDENCE</th>
        <th>STATUS</th>
        <th style="text-align: right;">ACTIONS</th>
      </tr>
    </thead>

    <tbody>
      {#if watchlist.items.length === 0}
        <tr>
          <td colspan="5" class="empty-state">No assets added yet.</td>
        </tr>
      {/if}

      {#each watchlist.items as crypto (crypto.id)}
        <tr class:hidden-row={!crypto.visible}>
          <td>
            <strong>{crypto.symbol}</strong>
          </td>

          <!-- Editable Weight -->
          <td>
            {#if editingRows[crypto.id]}
              <input
                type="number"
                class="input small-input"
                bind:value={crypto.weight}
                min="0"
                step="0.1"
              />
            {:else}
              {crypto.weight}
            {/if}
          </td>

          <!-- Editable Confidence -->
          <td>
            {#if editingRows[crypto.id]}
              <input
                type="number"
                class="input small-input"
                bind:value={crypto.confidence}
                min="0"
                step="0.1"
              />
            {:else}
              {crypto.confidence}
            {/if}
          </td>

          <td>
            <span
              class="badge"
              class:tracking={crypto.visible}
              class:ignored={!crypto.visible}
            >
              {crypto.visible ? "Tracking" : "Ignored"}
            </span>
          </td>

          <td>
            <div class="action-buttons">
              <!-- EDIT / SAVE Button -->
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
                class="btn btn-danger"
                onclick={() => watchlist.remove(crypto.id)}
              >
                DELETE
              </button>
            </div>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<style>
  .controls {
    display: flex;
    gap: 8px;
    margin-bottom: 16px;
  }

  .input {
    flex-grow: 1;
    padding: 8px 12px;
    border-radius: 4px;
    border: 1px solid var(--border-color, #ccc);
    background: var(--bg-color, transparent);
    color: inherit;
  }

  /* Added style for the table inputs so they don't stretch */
  .small-input {
    width: 60px;
    padding: 4px 8px;
    text-align: center;
  }

  .list-table {
    width: 100%;
    border-collapse: collapse;
  }

  .list-table td {
    padding: 8px;
    vertical-align: middle;
  }

  .hidden-row {
    opacity: 0.4;
  }

  .badge {
    font-size: 0.7em;
    color: white;
    padding: 2px 6px;
    border-radius: 4px;
    font-weight: bold;
  }

  .badge.tracking {
    background-color: #32756e;
  }

  .badge.ignored {
    background-color: #ff565b;
  }
  .action-buttons {
    display: flex;
    gap: 6px;
    justify-content: flex-end;
  }

  .btn-danger {
    background-color: #ff4d4d;
    color: white;
    border-color: #ff4d4d;
  }

  .btn-danger:hover {
    background-color: #ff3333;
  }

  .empty-state {
    text-align: center;
    opacity: 0.5;
    padding: 20px !important;
  }
</style>
