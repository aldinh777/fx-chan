<script lang="ts">
  import "./CryptoDetail.css";

  import { formatPrice, formatVolume } from "../lib/formatter";
  import { portfolioIndex, type WeightedCryptoPoint } from "../lib/market";
  import { app } from "../stores/app.svelte";
  import { correlation, type CorelationMatrix } from "../lib/quant";

  const coin: WeightedCryptoPoint | undefined = $derived(
    app.cryptoData.find((c) => c.coin.symbol === app.coin),
  );

  let tab = $state("relational");
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

  let matrix: CorelationMatrix = $state({});
  let coins = $derived.by(() => {
    const keys = Object.keys(matrix);
    if (keys.length === 0) {
      return [];
    }
    function sumCorr(coin: string) {
      let sum = 0;
      let n = 0;
      for (const other of keys) {
        if (other === coin) {
          continue;
        }
        const v = matrix[coin]?.[other];
        if (v == null) {
          continue;
        }
        sum += Math.abs(v);
        n++;
      }
      return sum;
    }
    return keys.sort((a, b) => sumCorr(b) - sumCorr(a));
  });
  let loading = $derived(coins.length === 0);

  async function calculateCorelations() {
    matrix = await correlation();
  }

  $effect(() => {
    calculateCorelations();
  });

  function color(v: number) {
    if (v === undefined || v === null) return "#f3f4f6";

    const x = Math.max(-1, Math.min(1, v));

    const neutral = [243, 244, 246];
    const red = [127, 29, 29];
    const green = [21, 128, 61];

    let target;

    if (x > 0) target = red;
    else target = green;

    const t = Math.abs(x);

    const r = Math.round(neutral[0] + (target[0] - neutral[0]) * t);
    const g = Math.round(neutral[1] + (target[1] - neutral[1]) * t);
    const b = Math.round(neutral[2] + (target[2] - neutral[2]) * t);

    return `rgb(${r}, ${g}, ${b})`;
  }
  function textColor(v: number) {
    const rgb = color(v);
    const m = rgb.match(/\d+/g);
    if (!m) return "#111827";

    const [r, g, b] = m.map(Number);

    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;

    return luminance > 140 ? "#111827" : "#ffffff";
  }
</script>

{#if coin !== undefined}
  <div class="info-panel">
    <div class="row">
      <button
        class="btn info-title"
        onclick={() => {
          const tabname = "info";
          if (tab === tabname) {
            tab = "";
          } else {
            tab = tabname;
          }
        }}
      >
        Info
      </button>
      <button
        class="btn info-title"
        onclick={() => {
          const tabname = "relational";
          if (tab === tabname) {
            tab = "";
          } else {
            tab = tabname;
          }
        }}
      >
        Relation
      </button>
      <div class="card" class:text-accent={pi > 0} class:text-red={pi < 0}>
        <div class="v r">Portfolio Index {pi.toFixed(3)}</div>
      </div>
    </div>

    {#if tab === "info"}
      {@const bullFib = bullRetrace(coin.risk.rally_low, coin.risk.rally_high)}
      {@const bearFib = bearRetrace(coin.risk.dd_high, coin.risk.dd_low)}
      {@const bullRatio =
        (coin.risk.rally_high - coin.price.t1) /
        (coin.risk.rally_high - coin.risk.rally_low)}
      {@const bearRatio =
        (coin.price.t1 - coin.risk.dd_low) /
        (coin.risk.dd_high - coin.risk.dd_low)}

      <!-- SEPARATOR -->
      <div style="margin-top: 12px;">
        <!-- PRICE ACTION -->
        <div class="section">
          <div class="section-title">Price Action</div>
          <div class="range-container">
            <div class="range-labels">
              <span class="text-muted text-small">
                L: ${formatPrice(coin.price.low)}
              </span>

              <span class="text-muted text-small">
                ${formatPrice(coin.price.high)} :H
              </span>
            </div>

            <div class="progress-bar fib-bar">
              <!-- Main Fill -->
              <div
                class="progress-fill {coin.performance.growth < 0 &&
                  'negative'}"
                style="width: {getRangePercentage(
                  coin.price.t1,
                  coin.price.low,
                  coin.price.high,
                )}%;"
              ></div>

              <!-- Previous Price -->
              <div
                class="price-marker previous"
                style="left: {getRangePercentage(
                  coin.price.t0,
                  coin.price.low,
                  coin.price.high,
                )}%"
              >
                <span>OLD</span>
              </div>

              <!-- Average Price -->
              <div
                class="price-marker average"
                style="left: {getRangePercentage(
                  coin.price.avg,
                  coin.price.low,
                  coin.price.high,
                )}%"
              >
                <span>AVG</span>
              </div>

              <!-- Current Price -->
              <div
                class="price-marker current {coin.performance.growth > 0
                  ? ''
                  : 'negative'}"
                style="left: {getRangePercentage(
                  coin.price.t1,
                  coin.price.low,
                  coin.price.high,
                )}%"
              >
                <span>NOW</span>
              </div>
            </div>

            <div class="range-labels">
              <span class="text-muted text-small">
                OLD: ${formatPrice(coin.price.t0)}
              </span>

              <span class="text-muted text-small">
                AVG: ${formatPrice(coin.price.avg)}
              </span>

              <span
                class=" text-small text-{coin.performance.growth > 0
                  ? 'green'
                  : 'red'}"
              >
                ${formatPrice(coin.price.t1)} :NOW
              </span>
            </div>
          </div>
        </div>

        <!-- RALLY RETRACEMENT -->
        <div class="section">
          <div class="section-title">Rally Retracement</div>

          <div class="range-container">
            <div class="range-labels">
              <span class="text-muted text-small">
                Φ: ${formatPrice(bullFib.extended)}
              </span>

              <span class="text-muted text-small">
                ${formatPrice(coin.risk.rally_high)} :H
              </span>
            </div>

            <div class="progress-bar fib-bar">
              <!-- Current price fill -->
              <div
                class="progress-fill gold"
                style="width: {getRangePercentage(
                  coin.price.t1,
                  bullFib.extended,
                  coin.risk.rally_high,
                )}%;"
              ></div>

              <!-- φ⁻¹ -->
              <div
                class="fib-marker fib-normal"
                style="left: {getRangePercentage(
                  bullFib.normal,
                  bullFib.extended,
                  coin.risk.rally_high,
                )}%"
              >
                <span>&phi;⁻¹</span>
              </div>

              <!-- Current Price Ratio -->
              <div
                class="fib-marker fib-price"
                style="left: {getRangePercentage(
                  coin.price.t1,
                  bullFib.extended,
                  coin.risk.rally_high,
                )}%"
              >
                <span>{bullRatio.toFixed(3)}</span>
              </div>
            </div>

            <div class="range-labels">
              <span class="text-muted text-small">
                &phi;⁻¹: ${formatPrice(bullFib.normal)}
              </span>

              <span class="text-muted text-small">
                Ratio: {bullRatio.toFixed(3)}
              </span>

              <span class="text-muted text-small">
                ${formatPrice(coin.risk.rally_low)} :L
              </span>
            </div>
          </div>
        </div>

        <!-- DRAWDOWN RETRACEMENT -->
        <div class="section">
          <div class="section-title">Drawdown Retracement</div>

          <div class="range-container">
            <div class="range-labels">
              <span class="text-muted text-small">
                Φ: ${formatPrice(bearFib.extended)}
              </span>

              <span class="text-muted text-small">
                ${formatPrice(coin.risk.dd_low)} :L
              </span>
            </div>

            <div class="progress-bar fib-bar">
              <!-- Current price fill -->
              <div
                class="progress-fill drawdown"
                style="width: {getRangePercentage(
                  bearFib.extended - coin.price.t1,
                  0,
                  bearFib.extended - coin.risk.dd_low,
                )}%;"
              ></div>

              <!-- φ⁻¹ -->
              <div
                class="fib-marker fib-normal"
                style="left: {getRangePercentage(
                  bearFib.extended - bearFib.normal,
                  0,
                  bearFib.extended - coin.risk.dd_low,
                )}%"
              >
                <span>&phi;⁻¹</span>
              </div>

              <!-- Current Drawdown Ratio -->
              <div
                class="fib-marker fib-price negative"
                style="left: {getRangePercentage(
                  bearFib.extended - coin.price.t1,
                  0,
                  bearFib.extended - coin.risk.dd_low,
                )}%"
              >
                <span>{bearRatio.toFixed(3)}</span>
              </div>
            </div>

            <div class="range-labels">
              <span class="text-muted text-small">
                &phi;⁻¹: ${formatPrice(bearFib.normal)}
              </span>

              <span class="text-muted text-small">
                Ratio: {bearRatio.toFixed(3)}
              </span>

              <span class="text-muted text-small">
                ${formatPrice(coin.risk.dd_high)} :H
              </span>
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
                {(coin.performance.log_return - pi).toFixed(3)}
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
              <div class="k">Total</div>
              <div class="v">{formatVolume(coin.volume.vol)}</div>
            </div>

            <div class="card">
              <div class="k">Average</div>
              <div class="v">{formatVolume(coin.volume.avg)}</div>
            </div>

            <div class="card">
              <div class="k">Last</div>
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
      </div>
    {:else if tab === "relational"}
      {#if loading || coins.length === 0}
        <div class="loading">Computing correlation matrix...</div>
      {:else}
        <div class="heatmap-wrap">
          <table class="heatmap">
            <thead>
              <tr>
                <th></th>
                {#each coins as c}
                  <th>{c.toUpperCase()}</th>
                {/each}
              </tr>
            </thead>

            <tbody>
              {#each coins as row}
                <tr>
                  <td class="row">{row.toUpperCase()}</td>

                  {#each coins as col}
                    {@const v = matrix[row]?.[col]}
                    <td
                      class="cell"
                      style="background: {color(v)}; color: {textColor(v)}"
                    >
                      {v?.toFixed(2) ?? "—"}
                    </td>
                  {/each}
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    {/if}
  </div>
{/if}
