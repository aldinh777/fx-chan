<script lang="ts">
  import { onMount } from "svelte";
  import { Eye, Pencil, Trash2 } from "lucide-svelte";
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

  type ViewingEntry =
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

  const calculateExpression = (expression: string) => {
    const trimmed = expression.trim();

    if (!trimmed) {
      return "";
    }

    if (!/^[0-9+\-*/().\s]+$/.test(trimmed)) {
      return "Invalid";
    }

    try {
      const result = Function(`"use strict"; return (${trimmed});`)();

      if (typeof result !== "number" || !Number.isFinite(result)) {
        return "Invalid";
      }

      const formatted = Number.isInteger(result)
        ? String(result)
        : result.toFixed(12).replace(/\.?(0+)$/, "");

      return formatted.length > 12 ? formatted.slice(0, 12) : formatted;
    } catch {
      return "Invalid";
    }
  };

  let entryFormOpen = $state(false);

  const createTransferForm = (transaction?: BaseTransaction): TransferForm => {
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

  const coinOptions = $derived([
    ...new Set([
      ...wl.cryptos.map((crypto) => crypto.symbol.toUpperCase()),
      "USDC",
      "USDT",
    ]),
  ]);

  let transfers = $state<BaseTransaction[]>([]);

  let swaps = $state<SwapTransaction[]>([]);

  let entryMode = $state<"transfer" | "swap">("transfer");

  let transferForm = $state<TransferForm>(createTransferForm());

  let swapForm = $state<SwapForm>(createSwapForm());

  let calculatorExpression = $state("");
  let calculatorOpen = $state(false);

  let editingEntry = $state<EditingEntry | null>(null);
  let viewingEntry = $state<ViewingEntry | null>(null);
  let transactionsLoaded = $state(false);
  let importInput: HTMLInputElement | null = null;
  let persistMessage = $state("Loading saved transactions...");

  const summary = $derived({
    deposits: transfers.filter((transaction) => transaction.type === "deposit")
      .length,
    withdraws: transfers.filter(
      (transaction) => transaction.type === "withdraw",
    ).length,
    swaps: swaps.length,
  });

  function setEntryMode(mode: "transfer" | "swap") {
    entryMode = mode;
    editingEntry = null;
  }

  function closeViewModal() {
    viewingEntry = null;
  }

  function resetTransferForm() {
    transferForm = createTransferForm();
  }

  function resetSwapForm() {
    swapForm = createSwapForm();
  }

  const calculatorResult = $derived(calculateExpression(calculatorExpression));

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
      note: transferForm.note.trim(),
    };

    const editIndex =
      editingEntry?.kind === "transfer" ? editingEntry.index : null;

    if (editIndex !== null) {
      transfers = transfers.map((transaction, index) =>
        index === editIndex ? payload : transaction,
      );
    } else {
      transfers = [...transfers, payload];
    }

    editingEntry = null;
    resetTransferForm();
    entryFormOpen = false;
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
      note: swapForm.note.trim(),
    };

    const editIndex = editingEntry?.kind === "swap" ? editingEntry.index : null;

    if (editIndex !== null) {
      swaps = swaps.map((swap, index) =>
        index === editIndex ? payload : swap,
      );
    } else {
      swaps = [...swaps, payload];
    }

    editingEntry = null;
    resetSwapForm();
    entryFormOpen = false;
  }

  function startTransferEdit(index: number) {
    entryMode = "transfer";
    entryFormOpen = true;
    viewingEntry = null;
    editingEntry = { kind: "transfer", index };
    transferForm = createTransferForm(transfers[index]);
  }

  function startSwapEdit(index: number) {
    entryMode = "swap";
    entryFormOpen = true;
    viewingEntry = null;
    editingEntry = { kind: "swap", index };
    swapForm = createSwapForm(swaps[index]);
  }

  function deleteTransfer(index: number) {
    transfers = transfers.filter((_, currentIndex) => currentIndex !== index);

    if (viewingEntry?.kind === "transfer" && viewingEntry.index === index) {
      viewingEntry = null;
    }

    if (editingEntry?.kind === "transfer" && editingEntry.index === index) {
      editingEntry = null;
      resetTransferForm();
    }
  }

  function deleteSwap(index: number) {
    swaps = swaps.filter((_, currentIndex) => currentIndex !== index);

    if (viewingEntry?.kind === "swap" && viewingEntry.index === index) {
      viewingEntry = null;
    }

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

  function viewTransfer(index: number) {
    viewingEntry = { kind: "transfer", index };
  }

  function viewSwap(index: number) {
    viewingEntry = { kind: "swap", index };
  }

  function toggleEntryForm() {
    entryFormOpen = !entryFormOpen;
  }

  function closeEntryForm() {
    entryFormOpen = false;
    editingEntry = null;
  }

  function toggleCalculator() {
    calculatorOpen = !calculatorOpen;
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
    persistMessage =
      transfers.length || swaps.length
        ? "Transactions loaded from device."
        : "No saved transactions found.";
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
    if (
      swap.from.coin.toUpperCase() === "USDC" &&
      swap.to.coin.toUpperCase() !== "USDC"
    ) {
      return "swap-arrow buy-arrow";
    }

    if (
      swap.to.coin.toUpperCase() === "USDC" &&
      swap.from.coin.toUpperCase() !== "USDC"
    ) {
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
      <button class="btn" type="button" onclick={triggerImport}
        >Import JSON</button
      >
      <button class="btn" type="button" onclick={exportTransactions}
        >Export JSON</button
      >
    </div>
  </div>

  <section class="section-block entry-block">
    <div class="section-title-row">
      <div class="entry-actions">
        <button
          class="btn entry-toggle"
          type="button"
          onclick={toggleEntryForm}
        >
          {entryFormOpen ? "Hide Form" : "Add Transaction"}
        </button>
      </div>
    </div>

    {#if entryFormOpen}
      <div
        class="modal-backdrop"
        role="presentation"
        tabindex="-1"
        onclick={(event) => {
          if (event.target === event.currentTarget) {
            closeEntryForm();
          }
        }}
        onkeydown={(event) => {
          if (event.target === event.currentTarget && event.key === "Escape") {
            closeEntryForm();
          }
        }}
      >
        <div
          class="modal-shell"
          role="dialog"
          aria-modal="true"
          aria-label="Transaction entry form"
          tabindex="0"
        >
          <div class="modal-header">
            <div>
              <div class="eyebrow">TRANSACTION ENTRY</div>
              <h3>{editingEntry ? "Edit Entry" : "New Entry"}</h3>
            </div>
            <div class="entry-actions">
              <button
                class="btn secondary-btn"
                type="button"
                onclick={toggleCalculator}
              >
                {calculatorOpen ? "Hide Calculator" : "Show Calculator"}
              </button>
              <button
                class="btn modal-close"
                type="button"
                onclick={closeEntryForm}
              >
                Close
              </button>
            </div>
          </div>

          <div class="mode-tabs modal-tabs">
            <button
              class:active={entryMode === "transfer"}
              class="mode-btn"
              onclick={() => setEntryMode("transfer")}
            >
              Transfer
            </button>
            <button
              class:active={entryMode === "swap"}
              class="mode-btn"
              onclick={() => setEntryMode("swap")}
            >
              Swap
            </button>
          </div>

          {#if calculatorOpen}
            <div class="utility-panel calculator-panel">
              <div>
                <div class="utility-kicker">QUICK CALCULATOR</div>
                <p>Type an expression and use the result beside it.</p>
              </div>
              <div class="calculator-row standalone-calculator">
                <label class="calculator-input">
                  <span>Expression</span>
                  <input bind:value={calculatorExpression} placeholder="1 + 1" />
                </label>
                <div class="calculator-result">
                  <span>Result</span>
                  <strong>{calculatorResult || "-"}</strong>
                </div>
              </div>
            </div>
          {/if}

          {#if entryMode === "transfer"}
            <form
              class="entry-form modal-form"
              onsubmit={(event) => {
                event.preventDefault();
                submitTransfer();
              }}
            >
              <div class="form-heading-row">
                <span class="section-hint">
                  {editingEntry?.kind === "transfer"
                    ? "editing transfer"
                    : "new transfer"}
                </span>
                {#if editingEntry?.kind === "transfer"}
                  <button
                    class="btn secondary-btn"
                    type="button"
                    onclick={cancelEditing}
                  >
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
                  <input
                    type="number"
                    step="any"
                    bind:value={transferForm.amount}
                  />
                </label>
                <label>
                  <span>Price</span>
                  <input
                    type="number"
                    step="any"
                    bind:value={transferForm.price}
                  />
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
                  <input
                    type="number"
                    step="any"
                    bind:value={transferForm.fee}
                  />
                </label>
                <label>
                  <span>Vault</span>
                  <input bind:value={transferForm.vault} />
                </label>
                <label class="wide-field">
                  <span>Note</span>
                  <input
                    bind:value={transferForm.note}
                    placeholder="Optional note"
                  />
                </label>
              </div>

              <button class="btn form-submit" type="submit">
                {editingEntry?.kind === "transfer" ? "Save" : "Add Transaction"}
              </button>
            </form>
          {:else}
            <form
              class="entry-form modal-form"
              onsubmit={(event) => {
                event.preventDefault();
                submitSwap();
              }}
            >
              <div class="form-heading-row">
                <span class="section-hint">
                  {editingEntry?.kind === "swap" ? "editing swap" : "new swap"}
                </span>
                {#if editingEntry?.kind === "swap"}
                  <button
                    class="btn secondary-btn"
                    type="button"
                    onclick={cancelEditing}
                  >
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
                    <p class="swap-group-copy">
                      Date, time, protocol, rate, fee, cut, and note.
                    </p>
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
                      <input
                        type="number"
                        step="any"
                        bind:value={swapForm.rate}
                      />
                    </label>
                    <label>
                      <span>Fee</span>
                      <input
                        type="number"
                        step="any"
                        bind:value={swapForm.fee}
                      />
                    </label>
                    <label>
                      <span>Cut</span>
                      <input
                        type="number"
                        step="any"
                        bind:value={swapForm.cut}
                      />
                    </label>
                    <label class="wide-field">
                      <span>Note</span>
                      <input
                        bind:value={swapForm.note}
                        placeholder="Optional note"
                      />
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
                      <p class="swap-group-copy">
                        What leaves the wallet or vault.
                      </p>
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
                        <input
                          type="number"
                          step="any"
                          bind:value={swapForm.fromAmount}
                        />
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
                      <p class="swap-group-copy">
                        What enters the wallet or vault.
                      </p>
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
                        <input
                          type="number"
                          step="any"
                          bind:value={swapForm.toAmount}
                        />
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
                      <p class="swap-group-copy">
                        Gas currency, amount, and destination vault.
                      </p>
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
                        <input
                          type="number"
                          step="any"
                          bind:value={swapForm.gasAmount}
                        />
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
    </div>

    {#if transfers.length === 0}
      <div class="empty-state">No transfers saved yet.</div>
    {:else}
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
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {#each transfers as transaction, index}
              <tr>
                <td>
                  <span
                    class:deposit={transaction.type === "deposit"}
                    class:withdraw={transaction.type === "withdraw"}
                    class="pill"
                  >
                    {transaction.type}
                  </span>
                </td>
                <td>{transaction.coin}</td>
                <td>{formatNumber(transaction.amount)}</td>
                <td>${formatNumber(transaction.price, 2)}</td>
                <td class="text-muted"
                  >{splitDateTime(transaction.time).date}</td
                >
                <td class="text-muted"
                  >{splitDateTime(transaction.time).time}</td
                >
                <td>{formatNumber(transaction.fee, 6)}</td>
                <td>{transaction.vault}</td>
                <td>
                  <div class="row-actions">
                    <button
                      class="icon-btn"
                      type="button"
                      aria-label="View transaction"
                      title="View transaction"
                      onclick={() => viewTransfer(index)}
                    >
                      <Eye size={18} />
                    </button>
                    <button
                      class="icon-btn"
                      type="button"
                      aria-label="Edit transaction"
                      title="Edit transaction"
                      onclick={() => startTransferEdit(index)}
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      class="icon-btn danger"
                      type="button"
                      aria-label="Delete transaction"
                      title="Delete transaction"
                      onclick={() => deleteTransfer(index)}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </section>

  <section class="section-block">
    <div class="section-title-row">
      <h3>Swaps</h3>
    </div>

    {#if swaps.length === 0}
      <div class="empty-state">No swaps saved yet.</div>
    {:else}
      <div class="table-wrap" class:empty-table={swaps.length === 0}>
        <table class="table transaction-table">
          <thead>
            <tr>
              <th>FROM</th>
              <th>TO</th>
              <th>RATE</th>
              <th>DATE</th>
              <th>TIME</th>
              <th>PROTOCOL</th>
              <th>GAS</th>
              <th>FEE</th>
              <th>CUT</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {#each swaps as swap, index}
              <tr>
                <td>
                  <strong>{swap.from.coin}</strong>
                  <div class="swap-cell-meta">
                    {formatNumber(swap.from.amount)}
                    {swap.from.vault}
                  </div>
                </td>
                <td>
                  <strong>{swap.to.coin}</strong>
                  <div class="swap-cell-meta">
                    {formatNumber(swap.to.amount)}
                    {swap.to.vault}
                  </div>
                </td>
                <td>{formatNumber(swap.rate, 2)}</td>
                <td class="text-muted">{splitDateTime(swap.time).date}</td>
                <td class="text-muted">{splitDateTime(swap.time).time}</td>
                <td>{swap.protocol}</td>
                <td>
                  <strong>{swap.gas.coin}</strong>
                  <div class="swap-cell-meta">
                    {formatNumber(swap.gas.amount, 6)}
                    {swap.gas.vault}
                  </div>
                </td>
                <td>{formatNumber(swap.fee, 2)}</td>
                <td>{formatNumber(swap.cut, 2)}</td>
                <td>
                  <div class="row-actions">
                    <button
                      class="icon-btn"
                      type="button"
                      aria-label="View swap"
                      title="View swap"
                      onclick={() => viewSwap(index)}
                    >
                      <Eye size={18} />
                    </button>
                    <button
                      class="icon-btn"
                      type="button"
                      aria-label="Edit swap"
                      title="Edit swap"
                      onclick={() => startSwapEdit(index)}
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      class="icon-btn danger"
                      type="button"
                      aria-label="Delete swap"
                      title="Delete swap"
                      onclick={() => deleteSwap(index)}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </section>

  {#if viewingEntry}
    <div
      class="modal-backdrop"
      role="presentation"
      tabindex="-1"
      onclick={(event) => {
        if (event.target === event.currentTarget) {
          closeViewModal();
        }
      }}
      onkeydown={(event) => {
        if (
          event.key === "Escape" ||
          event.key === "Enter" ||
          event.key === " "
        ) {
          closeViewModal();
        }
      }}
    >
      <div
        class="modal-shell view-shell"
        role="dialog"
        aria-modal="true"
        aria-label="Transaction details"
        tabindex="0"
      >
        <div class="modal-header">
          <div>
            <div class="eyebrow">TRANSACTION DETAILS</div>
            <h3>{viewingEntry.kind === "transfer" ? "Transfer" : "Swap"}</h3>
          </div>
          <button
            class="btn modal-close"
            type="button"
            onclick={closeViewModal}
          >
            Close
          </button>
        </div>

        {#if viewingEntry.kind === "transfer"}
          {@const transfer = transfers[viewingEntry.index]}
          <div class="detail-grid">
            <div><span>TYPE</span><strong>{transfer.type}</strong></div>
            <div><span>COIN</span><strong>{transfer.coin}</strong></div>
            <div>
              <span>AMOUNT</span><strong>{formatNumber(transfer.amount)}</strong
              >
            </div>
            <div>
              <span>PRICE</span><strong
                >${formatNumber(transfer.price, 2)}</strong
              >
            </div>
            <div>
              <span>DATE</span><strong
                >{splitDateTime(transfer.time).date}</strong
              >
            </div>
            <div>
              <span>TIME</span><strong
                >{splitDateTime(transfer.time).time}</strong
              >
            </div>
            <div>
              <span>FEE</span><strong>{formatNumber(transfer.fee, 6)}</strong>
            </div>
            <div><span>VAULT</span><strong>{transfer.vault}</strong></div>
            <div class="detail-note">
              <span>NOTE</span>
              <p>{transfer.note || "-"}</p>
            </div>
          </div>
        {:else}
          {@const swap = swaps[viewingEntry.index]}
          <div class="detail-grid detail-grid-swap">
            <div><span>FROM COIN</span><strong>{swap.from.coin}</strong></div>
            <div>
              <span>FROM AMOUNT</span><strong
                >{formatNumber(swap.from.amount)}</strong
              >
            </div>
            <div><span>FROM VAULT</span><strong>{swap.from.vault}</strong></div>
            <div><span>TO COIN</span><strong>{swap.to.coin}</strong></div>
            <div>
              <span>TO AMOUNT</span><strong
                >{formatNumber(swap.to.amount)}</strong
              >
            </div>
            <div><span>TO VAULT</span><strong>{swap.to.vault}</strong></div>
            <div>
              <span>RATE</span><strong>{formatNumber(swap.rate, 2)}</strong>
            </div>
            <div>
              <span>DATE</span><strong>{splitDateTime(swap.time).date}</strong>
            </div>
            <div>
              <span>TIME</span><strong>{splitDateTime(swap.time).time}</strong>
            </div>
            <div><span>PROTOCOL</span><strong>{swap.protocol}</strong></div>
            <div>
              <span>GAS</span><strong
                >{swap.gas.coin} {formatNumber(swap.gas.amount, 6)}</strong
              >
            </div>
            <div><span>GAS VAULT</span><strong>{swap.gas.vault}</strong></div>
            <div>
              <span>FEE (FROM AMOUNT)</span><strong>{formatNumber(swap.fee, 2)}</strong>
            </div>
            <div>
              <span>CUT (TO AMOUNT)</span><strong>{formatNumber(swap.cut, 2)}</strong>
            </div>
            <div class="detail-note detail-note-full">
              <span>NOTE</span>
              <p>{swap.note || "-"}</p>
            </div>
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>
