<script lang="ts">
  type BaseTransaction = {
    type: "deposit" | "withdraw";
    coin: string;
    amount: number;
    price: number;
    time: string;
    fee: number;
    vault: string;
    note: string;
  };

  type SwapTransaction = {
    from: { coin: string; amount: number; vault: string };
    to: { coin: string; amount: number; vault: string };
    rate: number;
    time: string;
    protocol: string;
    gas: { coin: string; amount: number; vault: string };
    fee: number;
    cut: number;
    note: string;
  };

  let transfers = $state<BaseTransaction[]>([
    {
      type: "deposit",
      coin: "USDC",
      amount: 12500,
      price: 1,
      time: "2026-06-11 09:12",
      fee: 0,
      vault: "Main vault",
      note: "Funding transfer from treasury wallet.",
    },
    {
      type: "withdraw",
      coin: "BTC",
      amount: 0.08,
      price: 67420.1,
      time: "2026-06-11 10:03",
      fee: 0.0002,
      vault: "Cold vault",
      note: "Rebalancing out to offline storage.",
    },
    {
      type: "deposit",
      coin: "ETH",
      amount: 4.5,
      price: 3412.88,
      time: "2026-06-11 10:41",
      fee: 0.003,
      vault: "Yield vault",
      note: "Incoming settlement from strategy account.",
    },
  ]);

  let swaps = $state<SwapTransaction[]>([
    {
      from: { coin: "USDC", amount: 7500, vault: "Main vault" },
      to: { coin: "SOL", amount: 50.5856, vault: "Growth vault" },
      rate: 148.25,
      time: "2026-06-11 11:08",
      protocol: "Jupiter",
      gas: { coin: "SOL", amount: 0.0021, vault: "Growth vault" },
      fee: 12.5,
      cut: 4.2,
      note: "Converted idle stable balance into higher beta exposure.",
    },
    {
      from: { coin: "ETH", amount: 2.4, vault: "Yield vault" },
      to: { coin: "USDC", amount: 8190.91, vault: "Main vault" },
      rate: 3412.88,
      time: "2026-06-11 12:19",
      protocol: "Uniswap",
      gas: { coin: "ETH", amount: 0.0048, vault: "Yield vault" },
      fee: 18.75,
      cut: 7.5,
      note: "Reduced ETH exposure after local rally.",
    },
  ]);

  let entryMode = $state<"transfer" | "swap">("transfer");

  let transferForm = $state({
    type: "deposit" as BaseTransaction["type"],
    coin: "USDC",
    amount: 0,
    price: 1,
    time: "2026-06-11 13:00",
    fee: 0,
    vault: "Main vault",
    note: "",
  });

  let swapForm = $state({
    fromCoin: "USDC",
    fromAmount: 0,
    fromVault: "Main vault",
    toCoin: "BTC",
    toAmount: 0,
    toVault: "Cold vault",
    rate: 0,
    time: "2026-06-11 13:00",
    protocol: "Jupiter",
    gasCoin: "SOL",
    gasAmount: 0,
    gasVault: "Main vault",
    fee: 0,
    cut: 0,
    note: "",
  });

  let entryFormOpen = $state(false);

  const summary = $derived({
    deposits: transfers.filter((transaction) => transaction.type === "deposit")
      .length,
    withdraws: transfers.filter((transaction) => transaction.type === "withdraw")
      .length,
    swaps: swaps.length,
  });

  function addTransfer() {
    transfers = [
      ...transfers,
      {
        ...transferForm,
        amount: Number(transferForm.amount),
        price: Number(transferForm.price),
        fee: Number(transferForm.fee),
        note: transferForm.note.trim() || "Manual transfer entry.",
      },
    ];

    transferForm = {
      ...transferForm,
      amount: 0,
      price: 1,
      fee: 0,
      note: "",
    };
  }

  function addSwap() {
    swaps = [
      ...swaps,
      {
        from: {
          coin: swapForm.fromCoin,
          amount: Number(swapForm.fromAmount),
          vault: swapForm.fromVault,
        },
        to: {
          coin: swapForm.toCoin,
          amount: Number(swapForm.toAmount),
          vault: swapForm.toVault,
        },
        rate: Number(swapForm.rate),
        time: swapForm.time,
        protocol: swapForm.protocol,
        gas: {
          coin: swapForm.gasCoin,
          amount: Number(swapForm.gasAmount),
          vault: swapForm.gasVault,
        },
        fee: Number(swapForm.fee),
        cut: Number(swapForm.cut),
        note: swapForm.note.trim() || "Manual swap entry.",
      },
    ];

    swapForm = {
      ...swapForm,
      fromAmount: 0,
      toAmount: 0,
      rate: 0,
      gasAmount: 0,
      fee: 0,
      cut: 0,
      note: "",
    };
  }

  function toggleEntryForm() {
    entryFormOpen = !entryFormOpen;
  }

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
  <div class="header transaction-header">
    <div>
      <div class="eyebrow">TRANSACTION LOG</div>
      <h2>Deposits, withdrawals, and swaps</h2>
      <p class="text-muted">
        Dummy data shaped like the real transaction model. This page is ready to
        be replaced with live vault and swap history later.
      </p>
    </div>

    <div class="summary-grid">
      <div class="summary-card">
        <span class="summary-label">DEPOSITS</span>
        <strong>{summary.deposits}</strong>
      </div>
      <div class="summary-card">
        <span class="summary-label">WITHDRAWS</span>
        <strong>{summary.withdraws}</strong>
      </div>
      <div class="summary-card">
        <span class="summary-label">SWAPS</span>
        <strong>{summary.swaps}</strong>
      </div>
    </div>
  </div>

  <section class="section-block entry-block">
    <div class="section-title-row">
      <h3>Add Entry</h3>
      <div class="entry-actions">
        <span class="section-hint">{entryFormOpen ? "open" : "closed"}</span>
        <button class="btn entry-toggle" type="button" onclick={toggleEntryForm}>
          {entryFormOpen ? "Hide Form" : "Add Entry"}
        </button>
      </div>
    </div>

    {#if entryFormOpen}
      <div class="mode-tabs">
        <button class:active={entryMode === "transfer"} class="mode-btn" onclick={() => (entryMode = "transfer")}>
          Transfer
        </button>
        <button class:active={entryMode === "swap"} class="mode-btn" onclick={() => (entryMode = "swap")}>
          Swap
        </button>
      </div>

      {#if entryMode === "transfer"}
        <form class="entry-form" onsubmit={(event) => {
          event.preventDefault();
          addTransfer();
        }}>
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
              <input bind:value={transferForm.coin} />
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
              <span>Time</span>
              <input bind:value={transferForm.time} placeholder="YYYY-MM-DD HH:MM" />
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

          <button class="btn form-submit" type="submit">Add Transfer</button>
        </form>
      {:else}
        <form class="entry-form" onsubmit={(event) => {
          event.preventDefault();
          addSwap();
        }}>
          <div class="form-grid swap-form-grid">
            <label>
              <span>From coin</span>
              <input bind:value={swapForm.fromCoin} />
            </label>
            <label>
              <span>From amount</span>
              <input type="number" step="any" bind:value={swapForm.fromAmount} />
            </label>
            <label>
              <span>From vault</span>
              <input bind:value={swapForm.fromVault} />
            </label>
            <label>
              <span>To coin</span>
              <input bind:value={swapForm.toCoin} />
            </label>
            <label>
              <span>To amount</span>
              <input type="number" step="any" bind:value={swapForm.toAmount} />
            </label>
            <label>
              <span>To vault</span>
              <input bind:value={swapForm.toVault} />
            </label>
            <label>
              <span>Rate</span>
              <input type="number" step="any" bind:value={swapForm.rate} />
            </label>
            <label>
              <span>Time</span>
              <input bind:value={swapForm.time} placeholder="YYYY-MM-DD HH:MM" />
            </label>
            <label>
              <span>Protocol</span>
              <input bind:value={swapForm.protocol} />
            </label>
            <label>
              <span>Gas coin</span>
              <input bind:value={swapForm.gasCoin} />
            </label>
            <label>
              <span>Gas amount</span>
              <input type="number" step="any" bind:value={swapForm.gasAmount} />
            </label>
            <label>
              <span>Gas vault</span>
              <input bind:value={swapForm.gasVault} />
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

          <button class="btn form-submit" type="submit">Add Swap</button>
        </form>
      {/if}
    {/if}
  </section>

  <section class="section-block">
    <div class="section-title-row">
      <h3>Transfers</h3>
      <span class="section-hint">type, coin, amount, price, time, fee, vault, note</span>
    </div>

    <div class="table-wrap">
      <table class="table transaction-table">
        <thead>
          <tr>
            <th>TYPE</th>
            <th>COIN</th>
            <th>AMOUNT</th>
            <th>PRICE</th>
            <th>TIME</th>
            <th>FEE</th>
            <th>VAULT</th>
            <th>NOTE</th>
          </tr>
        </thead>
        <tbody>
          {#each transfers as transaction}
            <tr>
              <td>
                <span class:deposit={transaction.type === "deposit"} class:withdraw={transaction.type === "withdraw"} class="pill">
                  {transaction.type}
                </span>
              </td>
              <td>{transaction.coin}</td>
              <td>{formatNumber(transaction.amount)}</td>
              <td>${formatNumber(transaction.price, 2)}</td>
              <td class="text-muted">{transaction.time}</td>
              <td>{formatNumber(transaction.fee, 6)}</td>
              <td>{transaction.vault}</td>
              <td class="note-cell">{transaction.note}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </section>

  <section class="section-block">
    <div class="section-title-row">
      <h3>Swaps</h3>
      <span class="section-hint">from, to, rate, time, protocol, gas, fee, cut, note</span>
    </div>

    <div class="swap-list">
      {#each swaps as swap}
        <article class="swap-card">
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
            <div><span>TIME</span><strong>{swap.time}</strong></div>
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

<style>
  .transaction-panel {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .transaction-header {
    gap: 16px;
    align-items: flex-start;
  }

  .eyebrow {
    color: var(--accent);
    font-size: 11px;
    letter-spacing: 0.18em;
    margin-bottom: 8px;
  }

  h2,
  h3 {
    margin: 0;
  }

  h2 {
    font-size: 22px;
    margin-bottom: 6px;
  }

  h3 {
    font-size: 16px;
  }

  p {
    margin: 0;
    max-width: 68ch;
    line-height: 1.5;
  }

  .summary-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(90px, 1fr));
    gap: 10px;
    min-width: min(100%, 300px);
  }

  .summary-card {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 10px 12px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .summary-label {
    color: var(--muted);
    font-size: 11px;
    letter-spacing: 0.12em;
  }

  .summary-card strong {
    font-size: 20px;
  }

  .section-block {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .entry-block {
    gap: 12px;
  }

  .entry-actions {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .section-title-row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }

  .section-hint {
    color: var(--muted);
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .table-wrap {
    overflow-x: auto;
  }

  .mode-tabs {
    display: inline-flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .entry-toggle {
    min-height: 32px;
    padding: 6px 12px;
    border-radius: 999px;
  }

  .mode-btn {
    background: transparent;
    border: 1px solid var(--border);
    color: var(--muted);
    padding: 8px 12px;
    border-radius: 999px;
    cursor: pointer;
    font: inherit;
  }

  .mode-btn.active {
    color: var(--text);
    border-color: var(--accent);
    box-shadow: 0 0 0 1px rgba(31, 199, 212, 0.15) inset;
  }

  .entry-form {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 12px;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.02);
  }

  .form-grid {
    display: grid;
    gap: 10px;
  }

  .transfer-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .swap-form-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  label {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  label span {
    color: var(--muted);
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  input,
  select {
    background: #07181d;
    border: 1px solid var(--border);
    color: var(--text);
    border-radius: 8px;
    padding: 9px 10px;
    font: inherit;
  }

  .wide-field {
    grid-column: 1 / -1;
  }

  .form-submit {
    align-self: flex-start;
  }

  .transaction-table {
    min-width: 980px;
  }

  .pill {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 76px;
    padding: 4px 10px;
    border-radius: 999px;
    border: 1px solid var(--border);
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .deposit {
    color: var(--green);
    background: rgba(0, 209, 178, 0.08);
  }

  .withdraw {
    color: var(--red);
    background: rgba(255, 92, 92, 0.08);
  }

  .note-cell {
    max-width: 260px;
    white-space: normal;
  }

  .swap-list {
    display: grid;
    gap: 12px;
  }

  .swap-card {
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 14px;
    background: rgba(255, 255, 255, 0.02);
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .swap-topline {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    gap: 12px;
    align-items: center;
  }

  .swap-arrow {
    font-size: 24px;
    line-height: 1;
    padding: 0 6px;
  }

  .buy-arrow {
    color: var(--green);
  }

  .sell-arrow {
    color: var(--red);
  }

  .neutral-arrow {
    color: var(--yellow);
  }

  .swap-label,
  .swap-meta,
  .swap-grid span {
    color: var(--muted);
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .swap-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
  }

  .swap-grid > div {
    background: rgba(6, 18, 23, 0.45);
    border: 1px solid rgba(34, 58, 74, 0.8);
    border-radius: 8px;
    padding: 10px 12px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .swap-grid strong {
    font-size: 13px;
    font-weight: 600;
  }

  .swap-note {
    color: var(--text);
    line-height: 1.55;
  }

  @media (max-width: 760px) {
    .transaction-header {
      flex-direction: column;
    }

    .summary-grid {
      width: 100%;
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .swap-topline {
      grid-template-columns: 1fr;
    }

    .swap-arrow {
      justify-self: start;
      transform: rotate(90deg);
      padding: 0;
    }

    .swap-grid {
      grid-template-columns: 1fr;
    }

    .transfer-grid,
    .swap-form-grid {
      grid-template-columns: 1fr;
    }
  }
</style>