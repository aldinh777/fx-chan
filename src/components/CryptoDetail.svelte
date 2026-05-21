<script lang="ts">
  import "./CryptoDetail.css";

  import { formatPrice, formatVolume } from "../lib/formatter";
  import { portfolioIndex, type WeightedCryptoPoint } from "../lib/market";
  import { app } from "../stores/app.svelte";
  import { _correlation, type CorelationMatrix } from "../lib/quant";
  import { tf } from "../stores/timeframe.svelte";

  const coin: WeightedCryptoPoint | undefined = $derived(
    app.cryptoData.find((c) => c.coin.symbol === app.coin),
  );

  let tab = $state("info");
  let pi = $derived(portfolioIndex(app.cryptoPoints));

  const phi = (1 + Math.sqrt(5)) / 2;
  const ret_phi = 1 / phi;

  const fmt = new Intl.DateTimeFormat("id-ID", {
    month: "2-digit",
    day: "2-digit",
  });

  let timeOptions = $derived([
    { label: `Candle (${tf.crypto.interval})`, value: "candle" },
    {
      label: `Timeframe (${tf.crypto.label.toLowerCase()})`,
      value: "timeframe",
    },
    { label: "Annually (365d)", value: "annual" },
  ]);
  let time = $state("timeframe");

  function bullRetrace(trough: number, peak: number) {
    const r = peak - trough;
    return {
      // 0.618 pullback
      normal: peak - r * ret_phi,
      // 1.618 bearish extension
      extended: peak - r * phi,
    };
  }

  function bearRetrace(peak: number, trough: number) {
    const r = peak - trough;
    return {
      // 0.618 bounce
      normal: trough + r * ret_phi,
      // 1.618 bullish extension
      extended: trough + r * phi,
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
    matrix = await _correlation();
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
      <div class="card" class:text-accent={pi > 0} class:text-red={pi < 0}>
        <div class="v">Portfolio Index {pi.toFixed(3)}</div>
      </div>
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
    </div>

    <!-- SEPARATOR -->
    <div style="margin-top: 12px;"></div>

    {#if tab === "info"}
      {@const bullFib = bullRetrace(
        coin.risk.runup.trough,
        coin.risk.runup.peak,
      )}
      {@const bearFib = bearRetrace(
        coin.risk.drawdown.peak,
        coin.risk.drawdown.trough,
      )}
      {@const bullRatio =
        (coin.risk.runup.peak - coin.price.t1) /
        (coin.risk.runup.peak - coin.risk.runup.trough)}
      {@const bearRatio =
        (coin.price.t1 - coin.risk.drawdown.trough) /
        (coin.risk.drawdown.peak - coin.risk.drawdown.trough)}

      <!-- PRICE ACTION -->
      <div class="section">
        <div class="section-title">Price Action</div>
        <div class="range-container">
          <div class="progress-bar fib-bar">
            <!-- Main Fill -->
            <div
              class="progress-fill {coin.performance.simple_return < 0 &&
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
              class="price-marker current {coin.performance.simple_return > 0
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
              L: ${formatPrice(coin.price.low)}
            </span>

            <span class="text-muted text-small">
              AVG: ${formatPrice(coin.price.avg)}
            </span>

            <span class="text-muted text-small">
              ${formatPrice(coin.price.high)} :H
            </span>
          </div>

          <div class="range-labels">
            <span class="text-muted text-small">
              OLD: ${formatPrice(coin.price.t0)}
            </span>

            <span
              class=" text-small text-{coin.performance.simple_return > 0
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
          <div class="progress-bar fib-bar">
            <!-- Current price fill -->
            <div
              class="progress-fill gold"
              style="width: {getRangePercentage(
                coin.price.t1,
                bullFib.extended,
                coin.risk.runup.peak,
              )}%;"
            ></div>

            <!-- φ⁻¹ -->
            <div
              class="fib-marker fib-normal"
              style="left: {getRangePercentage(
                bullFib.normal,
                bullFib.extended,
                coin.risk.runup.peak,
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
                coin.risk.runup.peak,
              )}%"
            >
              <span>{bullRatio.toFixed(3)}</span>
            </div>
          </div>

          <div class="range-labels">
            <span class="text-muted text-small">
              Φ: ${formatPrice(bullFib.extended)}
            </span>

            <span class="text-muted text-small">
              Ratio: {bullRatio.toFixed(3)}
            </span>

            <span class="text-muted text-small">
              {fmt.format(new Date(coin.risk.runup.peak_time))} ${formatPrice(
                coin.risk.runup.peak,
              )} :P
            </span>
          </div>

          <div class="range-labels">
            <span class="text-muted text-small">
              &phi;⁻¹: ${formatPrice(bullFib.normal)}
            </span>

            <span class="text-muted text-small">
              {fmt.format(new Date(coin.risk.runup.trough_time))} ${formatPrice(
                coin.risk.runup.trough,
              )} :T
            </span>
          </div>
        </div>
      </div>

      <!-- DRAWDOWN RETRACEMENT -->
      <div class="section">
        <div class="section-title">Drawdown Retracement</div>

        <div class="range-container">
          <div class="progress-bar fib-bar">
            <!-- Current price fill -->
            <div
              class="progress-fill drawdown"
              style="width: {getRangePercentage(
                bearFib.extended - coin.price.t1,
                0,
                bearFib.extended - coin.risk.drawdown.trough,
              )}%;"
            ></div>

            <!-- φ⁻¹ -->
            <div
              class="fib-marker fib-normal"
              style="left: {getRangePercentage(
                bearFib.extended - bearFib.normal,
                0,
                bearFib.extended - coin.risk.drawdown.trough,
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
                bearFib.extended - coin.risk.drawdown.trough,
              )}%"
            >
              <span>{bearRatio.toFixed(3)}</span>
            </div>
          </div>

          <div class="range-labels">
            <span class="text-muted text-small">
              Φ: ${formatPrice(bearFib.extended)}
            </span>

            <span class="text-muted text-small">
              Ratio: {bearRatio.toFixed(3)}
            </span>

            <span class="text-muted text-small">
              {fmt.format(new Date(coin.risk.drawdown.trough_time))} ${formatPrice(
                coin.risk.drawdown.trough,
              )} :T
            </span>
          </div>

          <div class="range-labels">
            <span class="text-muted text-small">
              &phi;⁻¹: ${formatPrice(bearFib.normal)}
            </span>

            <span class="text-muted text-small">
              {fmt.format(new Date(coin.risk.drawdown.peak_time))} ${formatPrice(
                coin.risk.drawdown.peak,
              )} :P
            </span>
          </div>
        </div>
      </div>

      <div>
        <div class="timeframe-selector">
          <span class="toolbar-label">Display Data</span>
          <div class="tf-buttons">
            {#each timeOptions as opt}
              <button
                class="tf-btn"
                class:active={time === opt.value}
                onclick={() => (time = opt.value)}
              >
                {opt.label}
              </button>
            {/each}
          </div>
        </div>

        <!-- PERFORMANCE -->
        <div class="section">
          <div class="section-title">Performance</div>
          <div class="grid">
            <div class="card">
              <div class="k">Sharpe Ratio</div>
              <div class="v">
                {#if time === "candle"}
                  {coin.performance.sharpe.candle.toFixed(2)}
                {:else if time === "timeframe"}
                  {coin.performance.sharpe.timeframe.toFixed(2)}
                {:else}
                  {coin.performance.sharpe.annual.toFixed(2)}
                {/if}
              </div>
            </div>

            <div class="card">
              <div class="k">Sortino Ratio</div>
              <div class="v">
                {#if time === "candle"}
                  {coin.performance.sortino.candle.toFixed(2)}
                {:else if time === "timeframe"}
                  {coin.performance.sortino.timeframe.toFixed(2)}
                {:else}
                  {coin.performance.sortino.annual.toFixed(2)}
                {/if}
              </div>
            </div>

            <div class="card">
              <div class="k">Average Return</div>
              <div class="v">
                {#if time === "candle"}
                  {(coin.performance.avg_return.candle * 100).toFixed(3)}%
                {:else if time === "timeframe"}
                  {(coin.performance.avg_return.timeframe * 100).toFixed(2)}%
                {:else}
                  {(coin.performance.avg_return.annual * 100).toFixed(2)}%
                {/if}
              </div>
            </div>

            <div class="card highlight">
              <div class="k">Return</div>
              <div
                class="v"
                class:positive={coin.performance.simple_return >= 0}
                class:negative={coin.performance.simple_return < 0}
              >
                {(coin.performance.simple_return * 100).toFixed(2)}%
              </div>
            </div>
          </div>
        </div>

        <!-- RISK -->
        <div class="section">
          <div class="section-title">Risk Profile</div>
          <div class="grid">
            <div class="card">
              <div class="k">Volatility</div>
              <div class="v">
                {#if time === "candle"}
                  {(coin.risk.volatility.candle * 100).toFixed(2)}%
                {:else if time === "timeframe"}
                  {(coin.risk.volatility.timeframe * 100).toFixed(2)}%
                {:else}
                  {(coin.risk.volatility.annual * 100).toFixed(2)}%
                {/if}
              </div>
            </div>

            <div class="card">
              <div class="k">Down Volatility</div>
              <div class="v">
                {#if time === "candle"}
                  {(coin.risk.down_volatility.candle * 100).toFixed(2)}%
                {:else if time === "timeframe"}
                  {(coin.risk.down_volatility.timeframe * 100).toFixed(2)}%
                {:else}
                  {(coin.risk.down_volatility.annual * 100).toFixed(2)}%
                {/if}
              </div>
            </div>

            <div class="card">
              <div class="k">Max Runup</div>
              <div class="v">
                <span class="text-green">
                  {(coin.risk.runup.max * 100).toFixed(2)}%
                </span>
              </div>
            </div>

            <div class="card danger">
              <div class="k">Max Drawdown</div>
              <div class="v">
                <span class="text-red">
                  {(coin.risk.drawdown.max * 100).toFixed(2)}%
                </span>
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
              <div class="k">Median</div>
              <div class="v">{formatVolume(coin.volume.median)}</div>
            </div>

            <div class="card">
              <div class="k">Recent (12)</div>
              <div class="v">{formatVolume(coin.volume.s12)}</div>
            </div>

            <div class="card highlight">
              <div class="k">Intensity</div>
              <div class="v">{coin.volume.intensity.toFixed(3)}</div>
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
