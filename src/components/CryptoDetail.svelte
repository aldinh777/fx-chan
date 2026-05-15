<script lang="ts">
  import { formatPrice, formatVolume } from "../lib/formatter";
  import { portfolioIndex, type WeightedCryptoPoint } from "../lib/market";
  import { app } from "../stores/app.svelte";

  const coin: WeightedCryptoPoint | undefined = $derived(
    app.cryptoData.find((c) => c.coin.symbol === app.coin),
  );

  let expand = $state(true);
  let pi = $derived(portfolioIndex(app.cryptoPoints));

  function fibr(low: number, high: number) {
    const r = high - low;
    return { up: high - 0.618 * r, down: high - 0.382 * r };
  }

  function getRangePercentage(current: number, low: number, high: number) {
    if (high <= low) return 100;
    const percentage = ((current - low) / (high - low)) * 100;
    return Math.max(0, Math.min(100, percentage));
  }
</script>

{#if coin !== undefined}
  <div class="info-panel">
    <div class="row">
      <button class="btn info-title" onclick={() => (expand = !expand)}>
        Market Intelligence
      </button>
      <span
        class="text-small"
        class:text-accent={pi > 0}
        class:text-red={pi < 0}>Portfolio Growth Rate: {pi.toFixed(3)}</span
      >
    </div>

    {#if expand}
      {@const fibo = fibr(coin.price.low, coin.price.high)}
      <div class="section">
        <div class="range-container">
          <div class="range-labels">
            <span class="text-muted text-small">
              L: ${formatPrice(coin.price.low)}
            </span>

            <span class="text-muted text-small">
              ${formatPrice(coin.price.high)} :H
            </span>
          </div>

          <div class="progress-bar">
            <div
              class="progress-fill {coin.performance.growth < 0 && 'negative'}"
              style="width: {getRangePercentage(
                coin.price.t1,
                coin.price.low,
                coin.price.high,
              )}%;"
            ></div>
          </div>
        </div>
      </div>

      <!-- Price Action -->
      <div class="section">
        <div class="section-title">Price Action</div>
        <div class="grid">
          <div class="card">
            <div class="k">Current</div>
            <div class="v">{formatPrice(coin.price.t1)}</div>
          </div>

          <div class="card">
            <div class="k">Previous</div>
            <div class="v">{formatPrice(coin.price.t0)}</div>
          </div>

          <div class="card">
            <div class="k">Average</div>
            <div class="v">{formatPrice(coin.price.avg)}</div>
          </div>

          <div class="card">
            <div class="k">Fibonacci</div>
            <div class="v">
              <span class="text-green">{formatPrice(fibo.up)}</span>/<span
                class="text-red">{formatPrice(fibo.down)}</span
              >
            </div>
          </div>
        </div>
      </div>

      <!-- PERFORMANCE -->
      <div class="section">
        <div class="section-title">Performance</div>
        <div class="grid">
          <div class="card highlight">
            <div
              class="k"
              class:positive={coin.performance.growth >= 0}
              class:negative={coin.performance.growth < 0}
            >
              Growth
            </div>
            <div class="v">{(coin.performance.growth * 100).toFixed(2)}%</div>
          </div>

          <div class="card">
            <div class="k">Growth Rate</div>
            <div class="v">
              {(coin.performance.growth_rate - pi).toFixed(3)}
            </div>
          </div>

          <div class="card">
            <div class="k">Momentum</div>
            <div class="v">{coin.performance.momentum.toFixed(3)}</div>
          </div>

          <div class="card">
            <div class="k">Sharpe</div>
            <div class="v">{coin.performance.sharpe.toFixed(3)}</div>
          </div>
        </div>
      </div>

      <!-- VOLUME -->
      <div class="section">
        <div class="section-title">Volume</div>
        <div class="grid">
          <div class="card">
            <div class="k">Total Volume</div>
            <div class="v">{formatVolume(coin.volume.vol)}</div>
          </div>

          <div class="card">
            <div class="k">Avg Vol</div>
            <div class="v">{formatVolume(coin.volume.avg)}</div>
          </div>

          <div class="card">
            <div class="k">Recent Volume</div>
            <div class="v">{formatVolume(coin.volume.v1)}</div>
          </div>

          <div class="card highlight">
            <div class="k">Intensity</div>
            <div class="v">{coin.volume.intensity.toFixed(3)}</div>
          </div>
        </div>
      </div>

      <!-- RISK -->
      <div class="section">
        <div class="section-title">Risk Profile</div>
        <div class="grid">
          <div class="card">
            <div class="k">Volatility</div>
            <div class="v">{coin.risk.volatility.toFixed(3)}</div>
          </div>

          <div class="card danger">
            <div class="k">Max DD</div>
            <div class="v">{(coin.risk.max_dd * 100).toFixed(2)}%</div>
          </div>
        </div>
      </div>
    {/if}
  </div>
{/if}

<style>
  .row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .info-panel {
    margin-top: 12px;
    padding: 14px;
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
  }

  .info-title {
    font-size: 12px;
    opacity: 0.65;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .section {
    margin-bottom: 12px;
  }

  .section-title {
    font-size: 11px;
    opacity: 0.5;
    margin-bottom: 8px;
  }

  .grid {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .card {
    flex: 1;
    padding: 10px;
    border-radius: 10px;
    background: rgba(0, 0, 0, 0.25);
    border: 1px solid rgba(255, 255, 255, 0.06);
  }

  .card .k {
    font-size: 10px;
    opacity: 0.5;
    margin-bottom: 4px;
  }

  .card .v {
    font-size: 12px;
    font-weight: 500;
  }

  .highlight {
    border-color: rgba(120, 180, 255, 0.25);
    background: rgba(120, 180, 255, 0.06);
  }

  .danger {
    border-color: rgba(255, 80, 80, 0.25);
    background: rgba(255, 80, 80, 0.06);
  }

  /* Range Bar Styles */
  .range-container {
    display: flex;
    flex-direction: column;
    gap: 3px;
    margin-top: 4px;
    margin-bottom: 4px;
  }

  .range-labels {
    display: flex;
    justify-content: space-between;
    font-size: 0.85em;
    margin-bottom: 4px;
  }

  .text-small {
    font-size: 0.85em;
  }

  .progress-bar {
    width: 100%;
    height: 4px;
    background-color: #303030;
    border-radius: 4px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: var(--accent);
    opacity: 0.64;
    border-radius: 4px;
    transition: width 0.4s ease-out;
    box-shadow: 0 0 8px var(--green);
  }

  .progress-fill.negative {
    background: var(--red);
  }
</style>
