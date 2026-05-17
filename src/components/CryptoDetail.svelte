<script lang="ts">
  import "./CryptoDetail.css";

  import { formatPrice, formatVolume } from "../lib/formatter";
  import { portfolioIndex, type WeightedCryptoPoint } from "../lib/market";
  import { app } from "../stores/app.svelte";

  const coin: WeightedCryptoPoint | undefined = $derived(
    app.cryptoData.find((c) => c.coin.symbol === app.coin),
  );

  let expand = $state(true);
  let pi = $derived(portfolioIndex(app.cryptoPoints));

  const phi = (1 + Math.sqrt(5)) / 2;
  const ret_phi = 1 / phi;

  function bullRetrace(rally_low: number, rally_high: number) {
    const r = rally_high - rally_low;
    return {
      // 0.618 pullback
      normal: rally_high - r * ret_phi,
      // 1.618 bearish extension
      extended: rally_high - r * phi,
    };
  }

  function bearRetrace(dd_high: number, dd_low: number) {
    const r = dd_high - dd_low;
    return {
      // 0.618 bounce
      normal: dd_low + r * ret_phi,
      // 1.618 bullish extension
      extended: dd_low + r * phi,
    };
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
        Info
      </button>
      <div class="card" class:text-accent={pi > 0} class:text-red={pi < 0}>
        <div class="v r">Portfolio Index {pi.toFixed(3)}</div>
      </div>
    </div>

    {#if expand}
      {@const bullFib = bullRetrace(coin.risk.rally_low, coin.risk.rally_high)}
      {@const bearFib = bearRetrace(coin.risk.dd_high, coin.risk.dd_low)}

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

      <!-- PRICE ACTION -->
      <div class="section">
        <div class="section-title">Price Action</div>
        <div class="grid">
          <div class="card">
            <div class="k">First / Last</div>
            <div class="v">
              {formatPrice(coin.price.t0)} / {formatPrice(coin.price.t1)}
            </div>
          </div>

          <div class="card">
            <div class="k">Average</div>
            <div class="v">{formatPrice(coin.price.avg)}</div>
          </div>
        </div>
      </div>

      <!-- RETRACEMENT -->
      <div class="section">
        <div class="section-title">Retracement</div>
        <div class="grid">
          <div class="card">
            <div class="k">Rally Range</div>
            <div class="v">
              {formatPrice(coin.risk.rally_low)} - {formatPrice(
                coin.risk.dd_high,
              )}
            </div>
          </div>

          <div class="card">
            <div class="k">&phi; : &phi;⁻¹ : current</div>
            <div class="v">
              <span class="text-red">
                {formatPrice(bullFib.extended)}
              </span>
              :
              <span class="text-green">
                {formatPrice(bullFib.normal)}
              </span>
              :
              <span
                class={coin.price.t1 < bullFib.extended
                  ? "text-red hail"
                  : coin.price.t1 < bullFib.normal
                    ? "text-green hail"
                    : "hail"}
              >
                {formatPrice(coin.price.t1)}
              </span>
            </div>
          </div>
        </div>
        <div class="grid">
          <div class="card">
            <div class="k">Drawdown Range</div>
            <div class="v">
              {formatPrice(coin.risk.dd_high)} - {formatPrice(coin.risk.dd_low)}
            </div>
          </div>

          <div class="card">
            <div class="k">&phi; : &phi;⁻¹ : current</div>
            <div class="v">
              <span class="text-red">
                {formatPrice(bearFib.extended)}
              </span>
              :
              <span class="text-green">
                {formatPrice(bearFib.normal)}
              </span>
              :
              <span
                class={coin.price.t1 > bearFib.extended
                  ? "text-red hail"
                  : coin.price.t1 > bearFib.normal
                    ? "text-green hail"
                    : "hail"}
              >
                {formatPrice(coin.price.t1)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- PERFORMANCE -->
      <div class="section">
        <div class="section-title">Performance</div>
        <div class="grid">
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
            <div class="v">
              {(coin.performance.growth_rate - pi).toFixed(3)}
            </div>
          </div>

          <div class="card highlight">
            <div class="k">Growth</div>
            <div
              class="v"
              class:positive={coin.performance.growth >= 0}
              class:negative={coin.performance.growth < 0}
            >
              {(coin.performance.growth * 100).toFixed(2)}%
            </div>
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
            <div class="v">{(coin.risk.volatility * 100).toFixed(2)}%</div>
          </div>

          <div class="card">
            <div class="k">Max Rally</div>
            <div class="v">
              <span class="text-green">
                {(coin.risk.max_rally * 100).toFixed(2)}%
              </span>
            </div>
          </div>

          <div class="card danger">
            <div class="k">Max Drawdown</div>
            <div class="v">
              <span class="text-red">
                {(coin.risk.max_dd * 100).toFixed(2)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    {/if}
  </div>
{/if}
