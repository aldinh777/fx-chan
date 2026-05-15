<script lang="ts">
  import { formatPrice, formatVolume } from "../lib/formatter";
  import type { WeightedCryptoPoint } from "../lib/market";
  import { app } from "../stores/app.svelte";

  const coin: WeightedCryptoPoint | undefined = $derived(
    app.cryptoData.find((c) => c.coin.symbol === app.coin),
  );
</script>

{#if coin !== undefined}
  <div class="info-panel">
    <div class="info-title">Market Intelligence</div>

    <!-- PRICE BLOCK -->
    <div class="section">
      <div class="section-title">Price Structure</div>
      <div class="grid">
        <div class="card">
          <div class="k">Price</div>
          <div class="v">{formatPrice(coin.price.t1)}</div>
        </div>

        <div class="card">
          <div class="k">Avg</div>
          <div class="v">{formatPrice(coin.price.avg)}</div>
        </div>

        <div class="card">
          <div class="k">High</div>
          <div class="v">{formatPrice(coin.price.high)}</div>
        </div>

        <div class="card">
          <div class="k">Low</div>
          <div class="v">{formatPrice(coin.price.low)}</div>
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
          <div class="k">Momentum</div>
          <div class="v">{coin.performance.momentum.toFixed(3)}</div>
        </div>

        <div class="card">
          <div class="k">Sharpe</div>
          <div class="v">{coin.performance.sharpe.toFixed(3)}</div>
        </div>

        <div class="card">
          <div class="k">Growth Rate</div>
          <div class="v">{coin.performance.growth_rate.toFixed(3)}</div>
        </div>
      </div>
    </div>

    <!-- VOLUME -->
    <div class="section">
      <div class="section-title">Volume Flow</div>
      <div class="grid">
        <div class="card">
          <div class="k">Recent Volume</div>
          <div class="v">{formatVolume(coin.volume.v1)}</div>
        </div>

        <div class="card">
          <div class="k">Avg Vol</div>
          <div class="v">{formatVolume(coin.volume.avg)}</div>
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
  </div>
{/if}

<style>
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
    margin-bottom: 12px;
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
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }

  .card {
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
</style>
