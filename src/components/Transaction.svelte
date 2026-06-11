<script lang="ts">
  import { onMount } from "svelte";
  import { wl } from "../stores/watchlist.svelte";
  import "./Transaction.css";
  import {
    loadTransactionData,
    normalizeTransactionData,
    readTransactionJson,
    saveTransactionData,
    serializeTransactionJson,
    type BaseTransaction,
    type SwapTransaction,
    type TransactionData,
  } from "../lib/transaction-data";

  type TransferForm = {
    type: BaseTransaction["type"];
    coin: string;
    amount: string;
    price: string;
    date: string;
    time: string;
    fee: string;
    vault: string;
    note: string;
  };

  type SwapForm = {
    fromCoin: string;
    fromAmount: string;
    fromVault: string;
    toCoin: string;
    toAmount: string;
    toVault: string;
    rate: string;
    date: string;
    time: string;
    protocol: string;
    gasCoin: string;
    gasAmount: string;
    gasVault: string;
    fee: string;
    cut: string;
    note: string;
  };

  type EditingEntry =
    | { kind: "transfer"; index: number }
    | { kind: "swap"; index: number };

  const splitDateTime = (value: string) => {
    const [date = "", time = ""] = value.split(" ");

    return { date, time };
  };

  const combineDateTime = (date: string, time: string) => {
    if (!date && !time) {
      return "";
    }

    return `${date} ${time}`.trim();
  };

  let entryFormOpen = $state(false);

  const createTransferForm = (transaction?: BaseTransaction): TransferForm => {
    entryFormOpen = false;
    const dateTime = splitDateTime(transaction?.time ?? "");

    return {
      type: transaction?.type ?? "deposit",
      coin: transaction?.coin ?? "",
      amount: transaction ? String(transaction.amount) : "",
      price: transaction ? String(transaction.price) : "",
      date: dateTime.date,
      time: dateTime.time,
      fee: transaction ? String(transaction.fee) : "",
      vault: transaction?.vault ?? "",
      note: transaction?.note ?? "",
    };
  };

  const createSwapForm = (swap?: SwapTransaction): SwapForm => {
    entryFormOpen = false;
    const dateTime = splitDateTime(swap?.time ?? "");

    return {
      fromCoin: swap?.from.coin ?? "",
      fromAmount: swap ? String(swap.from.amount) : "",
      fromVault: swap?.from.vault ?? "",
      toCoin: swap?.to.coin ?? "",
      toAmount: swap ? String(swap.to.amount) : "",
      toVault: swap?.to.vault ?? "",
      rate: swap ? String(swap.rate) : "",
      date: dateTime.date,
      time: dateTime.time,
      protocol: swap?.protocol ?? "",
      gasCoin: swap?.gas.coin ?? "",
      gasAmount: swap ? String(swap.gas.amount) : "",
      gasVault: swap?.gas.vault ?? "",
      fee: swap ? String(swap.fee) : "",
      cut: swap ? String(swap.cut) : "",
      note: swap?.note ?? "",
    };
  };

  const coinOptions = $derived(
    [...new Set([...wl.cryptos.map((crypto) => crypto.symbol.toUpperCase()), "USDC", "USDT"])],
  );

  let transfers = $state<BaseTransaction[]>([]);

  let swaps = $state<SwapTransaction[]>([]);

  let entryMode = $state<"transfer" | "swap">("transfer");

  let transferForm = $state<TransferForm>(createTransferForm());

  let swapForm = $state<SwapForm>(createSwapForm());

  let editingEntry = $state<EditingEntry | null>(null);
  let transactionsLoaded = $state(false);
  let importInput: HTMLInputElement | null = null;
  let persistMessage = $state("Loading saved transactions...");

  const summary = $derived({
    deposits: transfers.filter((transaction) => transaction.type === "deposit")
      .length,
    withdraws: transfers.filter((transaction) => transaction.type === "withdraw")
      .length,
    swaps: swaps.length,
  });

  function setEntryMode(mode: "transfer" | "swap") {
    entryMode = mode;
    editingEntry = null;
  }

  function resetTransferForm() {
    transferForm = createTransferForm();
  }

  function resetSwapForm() {
    swapForm = createSwapForm();
  }

  function snapshotTransactions(): TransactionData {
    return normalizeTransactionData({ transfers, swaps });
  }

  function submitTransfer() {
    const payload: BaseTransaction = {
      type: transferForm.type,
      coin: transferForm.coin.trim(),
      amount: Number(transferForm.amount || 0),
      price: Number(transferForm.price || 0),
      time: combineDateTime(transferForm.date, transferForm.time),
      fee: Number(transferForm.fee || 0),
      vault: transferForm.vault.trim(),
      note: transferForm.note.trim() || "Manual transfer entry.",
    };

    const editIndex = editingEntry?.kind === "transfer" ? editingEntry.index : null;

    if (editIndex !== null) {
      transfers = transfers.map((transaction, index) =>
        index === editIndex ? payload : transaction,
      );
    } else {
      transfers = [...transfers, payload];
    }

    editingEntry = null;
    resetTransferForm();
  }

  function submitSwap() {
    const payload: SwapTransaction = {
      from: {
        coin: swapForm.fromCoin.trim(),
        amount: Number(swapForm.fromAmount || 0),
        vault: swapForm.fromVault.trim(),
      },
      to: {
        coin: swapForm.toCoin.trim(),
        amount: Number(swapForm.toAmount || 0),
        vault: swapForm.toVault.trim(),
      },
      rate: Number(swapForm.rate || 0),
      time: combineDateTime(swapForm.date, swapForm.time),
      protocol: swapForm.protocol.trim(),
      gas: {
        coin: swapForm.gasCoin.trim(),
        amount: Number(swapForm.gasAmount || 0),
        vault: swapForm.gasVault.trim(),
      },
      fee: Number(swapForm.fee || 0),
      cut: Number(swapForm.cut || 0),
      note: swapForm.note.trim() || "Manual swap entry.",
    };

    const editIndex = editingEntry?.kind === "swap" ? editingEntry.index : null;

    if (editIndex !== null) {
      swaps = swaps.map((swap, index) => (index === editIndex ? payload : swap));
    } else {
      swaps = [...swaps, payload];
    }

    editingEntry = null;
    resetSwapForm();
  }

  function startTransferEdit(index: number) {
    entryMode = "transfer";
    entryFormOpen = true;
    editingEntry = { kind: "transfer", index };
    transferForm = createTransferForm(transfers[index]);
  }

  function startSwapEdit(index: number) {
    entryMode = "swap";
    entryFormOpen = true;
    editingEntry = { kind: "swap", index };
    swapForm = createSwapForm(swaps[index]);
  }

  function deleteTransfer(index: number) {
    transfers = transfers.filter((_, currentIndex) => currentIndex !== index);

    if (editingEntry?.kind === "transfer" && editingEntry.index === index) {
      editingEntry = null;
      resetTransferForm();
    }
  }

  function deleteSwap(index: number) {
    swaps = swaps.filter((_, currentIndex) => currentIndex !== index);

    if (editingEntry?.kind === "swap" && editingEntry.index === index) {
      editingEntry = null;
      resetSwapForm();
    }
  }

  function cancelEditing() {
    editingEntry = null;
    resetTransferForm();
    resetSwapForm();
  }

  function toggleEntryForm() {
    entryFormOpen = !entryFormOpen;
  }

  function closeEntryForm() {
    entryFormOpen = false;
    editingEntry = null;
  }

  function exportTransactions() {
    const blob = new Blob([serializeTransactionJson(snapshotTransactions())], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = `fx-chan-transactions-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function handleImportFile(file: File) {
    const imported = await readTransactionJson(file);

    transfers = imported.transfers;
    swaps = imported.swaps;
    transactionsLoaded = true;
    persistMessage = "Transactions imported.";
    await saveTransactionData(snapshotTransactions());
  }

  async function handleImportChange(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    try {
      await handleImportFile(file);
    } finally {
      input.value = "";
    }
  }

  function triggerImport() {
    importInput?.click();
  }

  onMount(async () => {
    const stored = await loadTransactionData();

    transfers = stored.transfers;
    swaps = stored.swaps;
    transactionsLoaded = true;
    persistMessage = transfers.length || swaps.length ? "Transactions loaded from device." : "No saved transactions found.";
  });

  $effect(() => {
    if (!transactionsLoaded) {
      return;
    }

    void saveTransactionData(snapshotTransactions());
  });

  const formatNumber = (value: number, digits = 4) =>
    new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: digits,
    }).format(value);

  const getSwapArrowClass = (swap: SwapTransaction) => {
    if (swap.from.coin.toUpperCase() === "USDC" && swap.to.coin.toUpperCase() !== "USDC") {
      return "swap-arrow buy-arrow";
    }

    if (swap.to.coin.toUpperCase() === "USDC" && swap.from.coin.toUpperCase() !== "USDC") {
      return "swap-arrow sell-arrow";
    }

    return "swap-arrow neutral-arrow";
  };
</script>

<div class="panel transaction-panel">
  <input
    bind:this={importInput}
    class="file-input"
    type="file"
    accept="application/json,.json"
    onchange={handleImportChange}
  />

  <div class="transaction-toolbar">
    <div>
      <div class="eyebrow">TRANSACTION LOG</div>
      <h3>Deposits, withdrawals, and swaps</h3>
      <p class="text-muted">{persistMessage}</p>
    </div>

    <div class="transaction-actions">
      <button class="btn" type="button" onclick={triggerImport}>Import JSON</button>
      <button class="btn" type="button" onclick={exportTransactions}>Export JSON</button>
    </div>
  </div>

  <section class="section-block entry-block">
      <div class="section-title-row">
        <div class="entry-actions">
          <button class="btn entry-toggle" type="button" onclick={toggleEntryForm}>
            {entryFormOpen ? "Hide Form" : "Add Transaction"}
          </button>
        </div>
      </div>

      {#if entryFormOpen}
        <div class="modal-backdrop" role="presentation" tabindex="-1" onclick={(event) => {
          if (event.target === event.currentTarget) {
            closeEntryForm();
          }
        }} onkeydown={(event) => {
          if (event.key === "Escape" || event.key === "Enter" || event.key === " ") {
            closeEntryForm();
          }
        }}>
          <div class="modal-shell" role="dialog" aria-modal="true" aria-label="Transaction entry form" tabindex="0">
            <div class="modal-header">
              <div>
                <div class="eyebrow">TRANSACTION ENTRY</div>
                <h3>{editingEntry ? "Edit Entry" : "New Entry"}</h3>
              </div>
              <button class="btn modal-close" type="button" onclick={closeEntryForm}>
                Close
              </button>
            </div>

            <div class="mode-tabs modal-tabs">
              <button class:active={entryMode === "transfer"} class="mode-btn" onclick={() => setEntryMode("transfer")}>
                Transfer
              </button>
              <button class:active={entryMode === "swap"} class="mode-btn" onclick={() => setEntryMode("swap")}>
                Swap
              </button>
            </div>

            {#if entryMode === "transfer"}
              <form class="entry-form modal-form" onsubmit={(event) => {
                event.preventDefault();
                submitTransfer();
              }}>
                <div class="form-heading-row">
                  <span class="section-hint">
                    {editingEntry?.kind === "transfer" ? "editing transfer" : "new transfer"}
                  </span>
                  {#if editingEntry?.kind === "transfer"}
                    <button class="btn secondary-btn" type="button" onclick={cancelEditing}>
                      Cancel Edit
                    </button>
                  {/if}
                </div>
                <div class="form-grid transfer-grid">
                  <label>
                    <span>Type</span>
                    <select bind:value={transferForm.type}>
                      <option value="deposit">Deposit</option>
                      <option value="withdraw">Withdraw</option>
                    </select>
                  </label>
                  <label>
                    <span>Coin</span>
                    <select bind:value={transferForm.coin}>
                      <option value="">Select coin</option>
                      {#each coinOptions as coin}
                        <option value={coin}>{coin}</option>
                      {/each}
                    </select>
                  </label>
                  <label>
                    <span>Amount</span>
                    <input type="number" step="any" bind:value={transferForm.amount} />
                  </label>
                  <label>
                    <span>Price</span>
                    <input type="number" step="any" bind:value={transferForm.price} />
                  </label>
                  <label>
                    <span>Date</span>
                    <input type="date" bind:value={transferForm.date} />
                  </label>
                  <label>
                    <span>Time</span>
                    <input type="time" step="60" bind:value={transferForm.time} />
                  </label>
                  <label>
                    <span>Fee</span>
                    <input type="number" step="any" bind:value={transferForm.fee} />
                  </label>
                  <label>
                    <span>Vault</span>
                    <input bind:value={transferForm.vault} />
                  </label>
                  <label class="wide-field">
                    <span>Note</span>
                    <input bind:value={transferForm.note} placeholder="Optional note" />
                  </label>
                </div>

                <button class="btn form-submit" type="submit">
                  {editingEntry?.kind === "transfer" ? "Save" : "Add Transaction"}
                </button>
              </form>
            {:else}
              <form class="entry-form modal-form" onsubmit={(event) => {
                event.preventDefault();
                submitSwap();
              }}>
                <div class="form-heading-row">
                  <span class="section-hint">
                    {editingEntry?.kind === "swap" ? "editing swap" : "new swap"}
                  </span>
                  {#if editingEntry?.kind === "swap"}
                    <button class="btn secondary-btn" type="button" onclick={cancelEditing}>
                      Cancel Edit
                    </button>
                  {/if}
                </div>

                <div class="swap-form-layout">
                  <section class="swap-group swap-general-group">
                    <div class="swap-group-header">
                      <div>
                        <span class="swap-group-kicker">GENERAL</span>
                        <h4>Swap transaction data</h4>
                      </div>
                      <p class="swap-group-copy">Date, time, protocol, rate, fee, cut, and note.</p>
                    </div>

                    <div class="form-grid swap-general-grid">
                      <label>
                        <span>Protocol</span>
                        <input bind:value={swapForm.protocol} />
                      </label>
                      <label>
                        <span>Date</span>
                        <input type="date" bind:value={swapForm.date} />
                      </label>
                      <label>
                        <span>Time</span>
                        <input type="time" step="60" bind:value={swapForm.time} />
                      </label>
                      <label>
                        <span>Rate</span>
                        <input type="number" step="any" bind:value={swapForm.rate} />
                      </label>
                      <label>
                        <span>Fee</span>
                        <input type="number" step="any" bind:value={swapForm.fee} />
                      </label>
                      <label>
                        <span>Cut</span>
                        <input type="number" step="any" bind:value={swapForm.cut} />
                      </label>
                      <label class="wide-field">
                        <span>Note</span>
                        <input bind:value={swapForm.note} placeholder="Optional note" />
                      </label>
                    </div>
                  </section>

                  <div class="swap-legs">
                    <section class="swap-group swap-leg-card">
                      <div class="swap-group-header">
                        <div>
                          <span class="swap-group-kicker">FROM</span>
                          <h4>Source asset</h4>
                        </div>
                        <p class="swap-group-copy">What leaves the wallet or vault.</p>
                      </div>

                      <div class="form-grid swap-leg-grid">
                        <label>
                          <span>From coin</span>
                          <select bind:value={swapForm.fromCoin}>
                            <option value="">Select coin</option>
                            {#each coinOptions as coin}
                              <option value={coin}>{coin}</option>
                            {/each}
                          </select>
                        </label>
                        <label>
                          <span>From amount</span>
                          <input type="number" step="any" bind:value={swapForm.fromAmount} />
                        </label>
                        <label>
                          <span>From vault</span>
                          <input bind:value={swapForm.fromVault} />
                        </label>
                      </div>
                    </section>

                    <section class="swap-group swap-leg-card">
                      <div class="swap-group-header">
                        <div>
                          <span class="swap-group-kicker">TO</span>
                          <h4>Destination asset</h4>
                        </div>
                        <p class="swap-group-copy">What enters the wallet or vault.</p>
                      </div>

                      <div class="form-grid swap-leg-grid">
                        <label>
                          <span>To coin</span>
                          <select bind:value={swapForm.toCoin}>
                            <option value="">Select coin</option>
                            {#each coinOptions as coin}
                              <option value={coin}>{coin}</option>
                            {/each}
                          </select>
                        </label>
                        <label>
                          <span>To amount</span>
                          <input type="number" step="any" bind:value={swapForm.toAmount} />
                        </label>
                        <label>
                          <span>To vault</span>
                          <input bind:value={swapForm.toVault} />
                        </label>
                      </div>
                    </section>

                    <section class="swap-group swap-gas-card">
                      <div class="swap-group-header">
                        <div>
                          <span class="swap-group-kicker">GAS COIN</span>
                          <h4>Execution cost</h4>
                        </div>
                        <p class="swap-group-copy">Gas currency, amount, and destination vault.</p>
                      </div>

                      <div class="form-grid swap-leg-grid">
                        <label>
                          <span>Gas coin</span>
                          <select bind:value={swapForm.gasCoin}>
                            <option value="">Select coin</option>
                            {#each coinOptions as coin}
                              <option value={coin}>{coin}</option>
                            {/each}
                          </select>
                        </label>
                        <label>
                          <span>Gas amount</span>
                          <input type="number" step="any" bind:value={swapForm.gasAmount} />
                        </label>
                        <label>
                          <span>Gas vault</span>
                          <input bind:value={swapForm.gasVault} />
                        </label>
                      </div>
                    </section>
                  </div>
                </div>

                <button class="btn form-submit" type="submit">
                  {editingEntry?.kind === "swap" ? "Save" : "Add Transaction"}
                </button>
              </form>
            {/if}
          </div>
        </div>
      {/if}
  </section>

  <section class="section-block">
    <div class="section-title-row">
      <h3>Transfers</h3>
      <span class="section-hint">type, coin, amount, price, date, time, fee, vault, note, actions</span>
    </div>

    {#if transfers.length === 0}
      <div class="empty-state">No transfers saved yet.</div>
    {/if}

    <div class="table-wrap" class:empty-table={transfers.length === 0}>
      <table class="table transaction-table">
        <thead>
          <tr>
            <th>TYPE</th>
            <th>COIN</th>
            <th>AMOUNT</th>
            <th>PRICE</th>
            <th>DATE</th>
            <th>TIME</th>
            <th>FEE</th>
            <th>VAULT</th>
            <th>NOTE</th>
            <th>ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          {#each transfers as transaction, index}
            <tr>
              <td>
                <span class:deposit={transaction.type === "deposit"} class:withdraw={transaction.type === "withdraw"} class="pill">
                  {transaction.type}
                </span>
              </td>
              <td>{transaction.coin}</td>
              <td>{formatNumber(transaction.amount)}</td>
              <td>${formatNumber(transaction.price, 2)}</td>
              <td class="text-muted">{splitDateTime(transaction.time).date}</td>
              <td class="text-muted">{splitDateTime(transaction.time).time}</td>
              <td>{formatNumber(transaction.fee, 6)}</td>
              <td>{transaction.vault}</td>
              <td class="note-cell">{transaction.note}</td>
              <td>
                <div class="row-actions">
                  <button class="table-action-btn" type="button" onclick={() => startTransferEdit(index)}>
                    Edit
                  </button>
                  <button class="table-action-btn danger-action" type="button" onclick={() => deleteTransfer(index)}>
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </section>

  <section class="section-block">
    <div class="section-title-row">
      <h3>Swaps</h3>
      <span class="section-hint">from, to, rate, date, time, protocol, gas, fee, cut, note, actions</span>
    </div>

    {#if swaps.length === 0}
      <div class="empty-state">No swaps saved yet.</div>
    {/if}

    <div class="swap-list" class:empty-table={swaps.length === 0}>
      {#each swaps as swap, index}
        <article class="swap-card">
          <div class="swap-card-actions">
            <button class="table-action-btn" type="button" onclick={() => startSwapEdit(index)}>
              Edit
            </button>
            <button class="table-action-btn danger-action" type="button" onclick={() => deleteSwap(index)}>
              Delete
            </button>
          </div>
          <div class="swap-topline">
            <div>
              <div class="swap-label">FROM</div>
              <strong>
                {swap.from.coin} {formatNumber(swap.from.amount)}
              </strong>
              <div class="swap-meta">{swap.from.vault}</div>
            </div>

            <div class={getSwapArrowClass(swap)}>→</div>

            <div>
              <div class="swap-label">TO</div>
              <strong>
                {swap.to.coin} {formatNumber(swap.to.amount)}
              </strong>
              <div class="swap-meta">{swap.to.vault}</div>
            </div>
          </div>

          <div class="swap-grid">
            <div><span>RATE</span><strong>{formatNumber(swap.rate, 2)}</strong></div>
            <div><span>DATE</span><strong>{splitDateTime(swap.time).date}</strong></div>
            <div><span>TIME</span><strong>{splitDateTime(swap.time).time}</strong></div>
            <div><span>PROTOCOL</span><strong>{swap.protocol}</strong></div>
            <div>
              <span>GAS</span>
              <strong>
                {swap.gas.coin} {formatNumber(swap.gas.amount, 6)}
              </strong>
              <div class="swap-meta">{swap.gas.vault}</div>
            </div>
            <div><span>FEE</span><strong>{formatNumber(swap.fee, 2)}</strong></div>
            <div><span>CUT</span><strong>{formatNumber(swap.cut, 2)}</strong></div>
          </div>

          <p class="swap-note">{swap.note}</p>
        </article>
      {/each}
    </div>
  </section>
</div>