<script lang="ts">
  import "./Navbar.css";

  import { version } from "../lib/version-util";

  interface Props {
    activeTab: string;
  }
  let { activeTab = $bindable() }: Props = $props();
</script>

<nav class="navbar">
  <button
    class="nav-item"
    class:active={activeTab === "dashboard"}
    onclick={() => (activeTab = "dashboard")}
  >
    DASHBOARD
  </button>

  <button
    class="nav-item"
    class:active={activeTab === "watchlist"}
    onclick={() => (activeTab = "watchlist")}
  >
    WATCHLIST
  </button>

  <div class="version">{version}</div>
</nav>
