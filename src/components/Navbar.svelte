<script lang="ts">
  import "./Navbar.css";

  import { version } from "../lib/version-util";
  import { app } from "../stores/app.svelte";

  const tabs = [
    { id: "dashboard", label: "MARKET" },
    { id: "metrics", label: "METRICS" },
    { id: "watchlist", label: "WATCHLIST" },
  ];

  let tabElements: HTMLButtonElement[] = $state([]);

  let indicatorX = $state(0);
  let indicatorWidth = $state(0);

  $effect(() => {
    const index = tabs.findIndex((t) => t.id === app.activeTab);

    const el = tabElements[index];

    if (!el) return;

    const style = getComputedStyle(el);

    const paddingLeft = parseFloat(style.paddingLeft);
    const paddingRight = parseFloat(style.paddingRight);

    indicatorX = el.offsetLeft + paddingLeft;
    indicatorWidth = el.offsetWidth - paddingLeft - paddingRight;
  });
</script>

<nav class="navbar">
  <div class="nav-tabs">
    {#each tabs as tab, i}
      <button
        bind:this={tabElements[i]}
        class="nav-item"
        class:active={app.activeTab === tab.id}
        onclick={() => (app.activeTab = tab.id)}
      >
        {tab.label}
      </button>
    {/each}

    <div
      class="nav-indicator"
      style:transform={`translateX(${indicatorX}px)`}
      style:width={`${indicatorWidth}px`}
    ></div>
  </div>

  <div class="version">{version}</div>
</nav>
