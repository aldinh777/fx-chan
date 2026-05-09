<script lang="ts">
  import "./Navbar.css";

  import { version } from "../lib/version-util";
  import { app } from "../stores/app.svelte";
</script>

<nav class="navbar">
  <button
    class="nav-item"
    class:active={app.activeTab === "dashboard"}
    onclick={() => (app.activeTab = "dashboard")}
  >
    MARKET
  </button>

  <button
    class="nav-item"
    class:active={app.activeTab === "metrics"}
    onclick={() => (app.activeTab = "metrics")}
  >
    RANKING
  </button>

  <button
    class="nav-item"
    class:active={app.activeTab === "watchlist"}
    onclick={() => (app.activeTab = "watchlist")}
  >
    WATCHLIST
  </button>

  <div class="version">{version}</div>
</nav>
