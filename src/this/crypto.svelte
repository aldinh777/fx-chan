<script lang="ts">
  async function bum(coin: string) {
    const res = await fetch("https://api.hyperliquid.xyz/info", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "candleSnapshot",
        req: {
          coin: coin.toUpperCase(),
          interval: "1d",
          startTime: Date.now() - 30 * 24 * 60 * 60 * 1000,
          endTime: Date.now(),
        },
      }),
    });

    const data = await res.json();
    const firstDay = Number(data[0].o);
    const today = Number(data[data.length - 1].c);

    p.push({ x: "usdt", y: coin, t1: today, t0: firstDay });
  }

  const coins = [
    "btc",
    "eth",
    "sol",
    "xrp",
    "bnb",
    "hype",
    "zec",
    "mon",
    "xmr",
    "sui",
    "trx",
    "ada",
  ];

  interface P {
    x: string;
    y: string;
    t0: number;
    t1: number;
  }

  let p: P[] = $state(loadP());
  let ps = $derived(p.toSorted((a, b) => rate(b.t1, b.t0) - rate(a.t1, a.t0)));
  const rate = (t1: number, t0: number) => (t1 / t0) * 100 - 100;

  async function updateRate() {
    p = [];
    await feusd();
    saveP();
  }

  const bambam = (bam: string) =>
    p.map((p, __i, xxx) => {
      if (p.y === bam) {
        return rate(1 / p.t1, 1 / p.t0);
      } else {
        const babababam = xxx.find((p) => p.y === bam);
        if (!babababam) return 0;
        const t1bam = babababam.t1 / p.t1;
        const t0bam = babababam.t0 / p.t0;
        const ponco = rate(t1bam, t0bam);
        return ponco;
      }
    });
  const lent = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const pupm = () => p.map((p) => rate(p.t1, p.t0));

  let lou: { fx: string; pang: number }[] = $derived(
    coins
      .map((u) => ({
        fx: u.toUpperCase(),
        pang: lent(bambam(u)),
      }))
      .concat({ fx: "usdt".toUpperCase(), pang: lent(pupm()) })
      .toSorted((a, b) => b.pang - a.pang),
  );

  async function feusd(skipcheck: boolean = false) {
    const pd = p.map((vp) => vp.y);
    for (const uu of coins) {
      if (skipcheck || !pd.includes(uu)) {
        await bum(uu);
      }
    }
    saveP();
  }

  function saveP() {
    localStorage.setItem("q", JSON.stringify(p));
  }

  function loadP() {
    const p = localStorage.getItem("q") || "[]";
    return JSON.parse(p);
  }

  function delp(pp: P) {
    const i = p.findIndex((px) => px == pp);
    p.splice(i, 1);
    saveP();
  }
</script>

<table border="1">
  <thead>
    <tr>
      <th>X</th>
      <th>Y</th>
      <th>t1</th>
      <th>t0</th>
      <th>Rate</th>
    </tr>
  </thead>
  <tbody>
    {#each ps as q}
      <tr>
        <td>{q.y.toUpperCase()}</td>
        <td>{q.x.toUpperCase()}</td>
        <td>{q.t1}</td>
        <td>{q.t0}</td>
        <td>{rate(q.t1, q.t0).toFixed(5)}</td>
        <td> <button onclick={() => delp(q)}>DELETE</button></td>
      </tr>
    {/each}
  </tbody>
</table>

<table border="1">
  <thead>
    <tr>
      <th>the thing</th>
      <th>rate</th>
    </tr>
  </thead>

  <tbody>
    {#each lou as fx}
      <tr>
        <td> <button>{fx.fx}</button></td>
        <td> {fx.pang.toFixed(5)}</td>
      </tr>
    {/each}
  </tbody>
</table>
<button onclick={updateRate}>UPDATE CRYPTO</button>
