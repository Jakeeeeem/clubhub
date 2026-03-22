/**
 * Unified Pro Navigation Controller
 */
const UnifiedNav = {
  init() {
    console.log("🚀 Unified Nav Initializing...");
    // Detect desktop vs mobile. On desktop we should NOT inject mobile sidebar/bottom-nav
    const isDesktop =
      typeof window !== "undefined" && window.innerWidth >= 1025;

    if (!isDesktop) {
      this.renderSidebar();
      this.renderBottomNav();
      this.renderMenu();
    } else {
      // Ensure the existing desktop header contains the switcher/profile UI
      this.ensureHeaderElements();
    }

    // Profile dropdown and other safe addons are ok to render on all sizes (they attach to header if present)
    this.renderProfileDropdown();
    this.bindEvents();
    this.updateHeaderState();
    this.syncUserData();
    this.autoLabelTables();

    // Ensure sidebar is closed initially if present
    this.toggleSidebar(false);
  },

  /**
   * Ensure desktop headers include the logo, mode switcher and profile targets
   * without overwriting the entire header markup.
   */
  ensureHeaderElements() {
    const header = document.querySelector("header.header, .pro-header");
    if (!header) return;

    // Create a nav container if missing
    let nav = header.querySelector(".nav-container, .nav");
    if (!nav) {
      nav = document.createElement("div");
      nav.className = "nav-container";
      // move existing header content into nav if there is content
      while (header.firstChild) nav.appendChild(header.firstChild);
      header.appendChild(nav);
    }

    // Logo area
    if (!nav.querySelector(".logo-area") && !nav.querySelector(".logo")) {
      const logo = document.createElement("div");
      logo.className = "logo-area";
      logo.setAttribute("onclick", "window.location.href='index.html'");
      logo.innerHTML = `<img src="images/logo.png" alt="Logo" class="logo-img"><span class="logo-text">ClubHub</span>`;
      nav.insertBefore(logo, nav.firstChild);
    }

    // Mode toggle (desktop only)
    if (!nav.querySelector("#header-mode-toggle")) {
      const center = document.createElement("div");
      center.className = "header-center desktop-only";
      center.innerHTML = `
                <div class="header-mode-toggle" id="header-mode-toggle">
                    <div class="mode-pill" id="header-mode-group-pill" onclick="UnifiedNav.switchMode('group')">Group Hub</div>
                    <div class="mode-pill" id="header-mode-player-pill" onclick="UnifiedNav.switchMode('player')">Player Pro</div>
                </div>`;
      // insert after logo if present
      const logo = nav.querySelector(".logo-area, .logo");
      if (logo && logo.nextSibling) nav.insertBefore(center, logo.nextSibling);
      else nav.appendChild(center);
    }

    // Header actions / profile target
    if (
      !nav.querySelector("#profileTrigger") &&
      !nav.querySelector("#profile-switcher-trigger")
    ) {
      const actions = document.createElement("div");
      actions.className = "header-actions";
      actions.style.display = "flex";
      actions.style.alignItems = "center";
      actions.style.gap = "1rem";
      actions.innerHTML = `
                <div class="action-btn desktop-only" onclick="showPlayerSection ? showPlayerSection('notifications') : showSection('notifications')">
                    <i class="fa fa-bell-o"></i>
                    <span class="badge" id="header-notif-badge" style="display:none">0</span>
                </div>
                <div class="user-profile-trigger" id="profileTrigger" onclick="UnifiedNav.toggleProfileDropdown(true)">
                    <span class="user-name desktop-only" id="header-user-name">Loading...</span>
                    <div class="user-avatar-sm" id="header-user-avatar">?</div>
                    <i class="fa fa-chevron-down desktop-only" style="font-size: 0.7rem; opacity: 0.5; margin-left: 4px;"></i>
                </div>`;
      nav.appendChild(actions);
    }
  },

  renderSidebar() {
    if (document.getElementById("pro-sidebar")) return;

    const sidebarHTML = `
            <div class="sidebar-overlay" id="sidebar-overlay"></div>
            <aside class="pro-sidebar" id="pro-sidebar">
                <div class="sidebar-header" style="display: flex; align-items: center; justify-content: space-between; padding: 1.25rem 1.5rem; border-bottom: 1px solid rgba(255,255,255,0.05); margin-bottom: 0.5rem;">
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <img src="images/logo.png" style="height: 24px; width: 24px;">
                        <span style="font-weight: 900; font-size: 1.1rem; letter-spacing: -0.5px; opacity: 0.9;">CLUBHUB</span>
                    </div>
                    <button onclick="UnifiedNav.toggleSidebar(false)" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: white; cursor: pointer; font-size: 1.2rem; line-height: 1; padding: 4px 8px;">&times;</button>
                </div>

                <div class="sidebar-group-switcher-area" id="sidebar-group-switcher" style="padding: 0 1rem 1rem 1rem; border-bottom: 1px solid rgba(255,255,255,0.05);">
                    <div style="font-size: 0.7rem; font-weight: 800; color: rgba(255,255,255,0.3); text-transform: uppercase; margin-bottom: 0.5rem; margin-left: 0.5rem;">Switch Group</div>
                    <div id="sidebar-switcher-target"></div>
                </div>

                <nav class="sidebar-nav" id="sidebar-nav-content">
                    <!-- Dynamic rendering by renderMenu() -->
                </nav>

                <div class="sidebar-footer" style="padding: 1.25rem; border-top: 1px solid rgba(255,255,255,0.05); background: rgba(0,0,0,0.2);">
                    <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                        <a href="player-settings.html" class="sidebar-link" style="margin-bottom: 0; padding: 0.6rem 0.75rem;"><i>⚙️</i> Settings</a>
                        <a href="#" class="sidebar-link" onclick="handleAuthError(); return false;" style="color: #ef4444; margin-bottom: 0; padding: 0.6rem 0.75rem;"><i>🚪</i> Sign Out</a>
                    </div>
                </div>
            </aside>
        `;
    document.body.insertAdjacentHTML("beforeend", sidebarHTML);
    this.initSidebarSwitcher();
  },

  initSidebarSwitcher() {
    const target = document.getElementById("sidebar-switcher-target");
    if (!target) return;

    const checkSwitcher = () => {
      if (typeof GroupSwitcher !== "undefined") {
        GroupSwitcher.render(target);
      } else {
        const script = document.createElement("script");
        script.src = "group-switcher.js";
        script.onload = () => {
          if (typeof GroupSwitcher !== "undefined")
            GroupSwitcher.render(target);
        };
        document.head.appendChild(script);
      }
    };
    checkSwitcher();
  },

  /**
   * Unified Header
   * Transforms ANY existing header into the standardized ClubHub bar
   */
  renderHeader() {
    const header = document.querySelector("header.header, .pro-header");
    if (!header) return;

    header.classList.add("pro-header", "unified-header");

    header.innerHTML = `
            <div class="nav-container">
                <div class="side-menu-trigger mobile-only" id="side-menu-trigger" onclick="UnifiedNav.toggleSidebar(true)">
                    <i class="fa fa-bars"></i>
                </div>

                <div class="logo-area" onclick="window.location.href='index.html'">
                    <img src="images/logo.png" alt="Logo" class="logo-img">
                    <span class="logo-text">ClubHub</span>
                </div>

                <div class="header-center desktop-only">
                    <div class="header-mode-toggle" id="header-mode-toggle">
                        <div class="mode-pill" id="header-mode-group-pill" onclick="UnifiedNav.switchMode('group')">Group Hub</div>
                        <div class="mode-pill" id="header-mode-player-pill" onclick="UnifiedNav.switchMode('player')">Player Pro</div>
                    </div>
                </div>

                <div class="header-actions">
                    <div class="action-btn desktop-only" onclick="showPlayerSection ? showPlayerSection('notifications') : showSection('notifications')">
                        <i class="fa fa-bell-o"></i>
                        <span class="badge" id="header-notif-badge" style="display:none">0</span>
                    </div>

                    <div class="user-profile-trigger" id="profileTrigger" onclick="UnifiedNav.toggleSidebar(true)">
                        <span class="user-name desktop-only" id="header-user-name">Loading...</span>
                        <div class="user-avatar-sm" id="header-user-avatar">?</div>
                        <i class="fa fa-chevron-down desktop-only" style="font-size: 0.7rem; opacity: 0.5; margin-left: 4px;"></i>
                    </div>
                </div>
            </div>
        `;

    this.updateModeUI();
  },

  renderBottomNav() {
    const bottomNavContainer = document.getElementById(
      "pro-bottom-nav-content",
    );
    if (!bottomNavContainer) return;

    const url = window.location.href;
    const isPlayer = url.includes("player-dashboard.html");
    const isSuperAdmin = url.includes("super-admin-dashboard.html");
    const isCoach = url.includes("coach-dashboard.html");
    const isScout =
      url.includes("scout-dashboard.html") || url.includes("scouting.html");

    let navHtml = "";

    if (isPlayer) {
      navHtml = `
                <a href="#" class="bottom-nav-link active" onclick="showPlayerSection('overview'); return false;"><i>🏠</i><span>Home</span></a>
                <a href="#" class="bottom-nav-link" onclick="showPlayerSection('teams'); return false;"><i>🛡️</i><span>Teams</span></a>
                <a href="#" class="bottom-nav-link" onclick="showPlayerSection('club-messenger'); return false;"><i>💬</i><span>Chat</span></a>
                <a href="scouting.html" class="bottom-nav-link"><i>🌟</i><span>Talent</span></a>
                <a href="#" class="bottom-nav-link" onclick="UnifiedNav.toggleSidebar(true); return false;"><i>🍔</i><span>More</span></a>
            `;
    } else if (isCoach) {
      navHtml = `
                <a href="#" class="bottom-nav-link active" onclick="showCoachSection('overview'); return false;"><i>🏠</i><span>Home</span></a>
                <a href="#" class="bottom-nav-link" onclick="showCoachSection('players'); return false;"><i>👥</i><span>Squad</span></a>
                <a href="#" class="bottom-nav-link" onclick="showCoachSection('messenger'); return false;"><i>💬</i><span>Chat</span></a>
                <a href="#" class="bottom-nav-link" onclick="showCoachSection('tournament-manager'); return false;"><i>🏆</i><span>Events</span></a>
                <a href="#" class="bottom-nav-link" onclick="UnifiedNav.toggleSidebar(true); return false;"><i>🍔</i><span>More</span></a>
            `;
    } else if (isScout) {
      navHtml = `
                <a href="#" class="bottom-nav-link active" onclick="showScoutSection('discovery'); return false;"><i>🔍</i><span>Discover</span></a>
                <a href="#" class="bottom-nav-link" onclick="showScoutSection('watchlist'); return false;"><i>⭐</i><span>Watch</span></a>
                <a href="#" class="bottom-nav-link" onclick="showScoutSection('messenger'); return false;"><i>💬</i><span>Chat</span></a>
                <a href="#" class="bottom-nav-link" onclick="showScoutSection('reports'); return false;"><i>📝</i><span>Reports</span></a>
                <a href="#" class="bottom-nav-link" onclick="UnifiedNav.toggleSidebar(true); return false;"><i>🍔</i><span>More</span></a>
            `;
    } else if (isSuperAdmin) {
      navHtml = `
                <a href="#" class="bottom-nav-link active" onclick="showSection('overview'); return false;"><i>🏠</i><span>Panel</span></a>
                <a href="#" class="bottom-nav-link" onclick="showSection('groups'); return false;"><i>🏢</i><span>Groups</span></a>
                <a href="#" class="bottom-nav-link" onclick="showSection('users'); return false;"><i>👥</i><span>Users</span></a>
                <a href="#" class="bottom-nav-link" onclick="showSection('activity'); return false;"><i>📜</i><span>Logs</span></a>
                <a href="#" class="bottom-nav-link" onclick="UnifiedNav.toggleSidebar(true); return false;"><i>🍔</i><span>More</span></a>
            `;
    } else {
      // General Group Admin
      navHtml = `
                <a href="#" class="bottom-nav-link active" onclick="showSection('overview'); return false;"><i>🏠</i><span>Home</span></a>
                <a href="#" class="bottom-nav-link" onclick="showSection('players'); return false;"><i>🏃</i><span>Players</span></a>
                <a href="#" class="bottom-nav-link" onclick="showSection('events'); return false;"><i>📅</i><span>Events</span></a>
                <a href="#" class="bottom-nav-link" onclick="showSection('finances'); return false;"><i>💰</i><span>Finance</span></a>
                <a href="#" class="bottom-nav-link" onclick="UnifiedNav.toggleSidebar(true); return false;"><i>🍔</i><span>More</span></a>
            `;
    }

    bottomNavContainer.innerHTML = navHtml;
  },

  renderHeaderAddons() {
    // Obsolete: Replaced by renderHeader
  },

  renderProfileDropdown() {
    if (document.getElementById("pro-dropdown")) return;
    const dropdownHTML = `
            <div class="pro-dropdown" id="pro-dropdown">
                <div class="dropdown-user-info">
                    <div class="dropdown-avatar" id="dropdown-avatar">?</div>
                    <div class="dropdown-meta">
                        <div class="dropdown-name" id="dropdown-name">User Name</div>
                        <div class="dropdown-role" id="dropdown-role">Member</div>
                    </div>
                </div>
                
                <div class="dropdown-divider"></div>
                
                <div class="dropdown-mode-switcher mobile-only">
                    <div class="dropdown-mode-pill active" id="drop-mode-group" onclick="UnifiedNav.switchMode('group')">Group Hub</div>
                    <div class="dropdown-mode-pill" id="drop-mode-player" onclick="UnifiedNav.switchMode('player')">Player Pro</div>
                </div>
                
                <div class="dropdown-links" style="margin-top: 1rem;">
                    <a href="player-settings.html" class="dropdown-link"><i>⚙️</i> Account Settings</a>
                    <a href="#" class="dropdown-link" style="color: #ef4444;" onclick="handleAuthError(); return false;"><i>🚪</i> Sign Out</a>
                </div>
            </div>
        `;
    const header = document.querySelector(".pro-header .nav-container");
    if (header) header.insertAdjacentHTML("beforeend", dropdownHTML);
  },

  toggleProfileDropdown(show) {
    const dropdown = document.getElementById("pro-dropdown");
    if (!dropdown) return;

    if (show === false) {
      dropdown.classList.remove("active");
    } else {
      const isActive = dropdown.classList.contains("active");
      // Close others if opening
      if (!isActive) {
        dropdown.classList.add("active");
        this.syncUserData();
      } else {
        dropdown.classList.remove("active");
      }
    }
  },

  autoLabelTables() {
    document.querySelectorAll("table").forEach((table) => {
      const headers = Array.from(table.querySelectorAll("thead th")).map((th) =>
        th.textContent.trim(),
      );
      if (headers.length === 0) return;
      table.querySelectorAll("tbody tr").forEach((row) => {
        row.querySelectorAll("td").forEach((td, index) => {
          if (headers[index] && !td.getAttribute("data-label")) {
            td.setAttribute("data-label", headers[index]);
          }
        });
      });
    });
    console.log("📋 Tables auto-labeled for mobile view");
  },

  bindEvents() {
    const overlay = document.getElementById("sidebar-overlay");
    if (overlay) {
      overlay.addEventListener("click", () => this.toggleSidebar(false));
    }

    // Close dropdown on click outside
    document.addEventListener("click", () => this.toggleProfileDropdown(false));
  },

  toggleSidebar(show) {
    // Do not open/close the mobile sidebar on desktop viewports
    const isDesktop =
      typeof window !== "undefined" && window.innerWidth >= 1025;
    if (isDesktop) {
      // On desktop, don't open the mobile sidebar. If caller requested `show`,
      // surface the profile dropdown instead (common desktop behavior).
      if (show) {
        this.toggleProfileDropdown(true);
      } else {
        const sidebarEl = document.getElementById("pro-sidebar");
        const overlayEl = document.getElementById("sidebar-overlay");
        if (sidebarEl) sidebarEl.classList.remove("active");
        if (overlayEl) overlayEl.classList.remove("active");
      }
      return;
    }

    const sidebar = document.getElementById("pro-sidebar");
    const overlay = document.getElementById("sidebar-overlay");
    if (!sidebar || !overlay) return;

    if (show) {
      sidebar.classList.add("active");
      overlay.classList.add("active");
      this.syncUserData();
    } else {
      sidebar.classList.remove("active");
      overlay.classList.remove("active");
    }
  },

  syncUserData() {
    const user = JSON.parse(localStorage.getItem("currentUser") || "{}");
    const firstName = user.firstName || user.first_name || "";
    const lastName = user.lastName || user.last_name || "";
    const name = `${firstName} ${lastName}`.trim() || "User";
    const initial = (firstName || "U").charAt(0).toUpperCase();

    let role = "Member";
    const type = user.account_type || localStorage.getItem("userType");
    if (type === "platform_admin") role = "Super Admin";
    else if (type === "coach") role = "Technical Coach";
    else if (type === "scout") role = "Talent Scout";
    else if (type === "admin") role = "Group Admin";
    else if (type === "player") role = "Pro Player";

    // Targets to update across header/sidebar/dropdown
    const targets = {
      "header-user-name": name,
      "header-user-avatar": initial,
      "dropdown-name": name,
      "dropdown-avatar": initial,
      "dropdown-role": role,
    };

    for (const [id, val] of Object.entries(targets)) {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    }

    this.updateModeUI();
  },

  updateModeUI(mode) {
    if (!mode) {
      mode = window.location.href.includes("player-dashboard.html")
        ? "player"
        : "group";
    }

    // 1. Header Pills
    const gPill = document.getElementById("header-mode-group-pill");
    const pPill = document.getElementById("header-mode-player-pill");
    if (gPill && pPill) {
      gPill.classList.toggle("active", mode === "group");
      pPill.classList.toggle("active", mode === "player");
    }

    // 2. Dropdown Pills
    const dgPill = document.getElementById("drop-mode-group");
    const dpPill = document.getElementById("drop-mode-player");
    if (dgPill && dpPill) {
      dgPill.classList.toggle("active", mode === "group");
      dpPill.classList.toggle("active", mode === "player");
    }
  },

  switchMode(mode) {
    if (mode === "player") {
      window.location.href = "player-dashboard.html";
    } else {
      const user = JSON.parse(localStorage.getItem("currentUser") || "{}");
      const type = user.account_type || localStorage.getItem("userType");

      if (
        type === "platform_admin" ||
        window.location.href.includes("super-admin")
      ) {
        window.location.href = "super-admin-dashboard.html";
      } else if (
        type === "coach" ||
        window.location.href.includes("coach-dashboard")
      ) {
        window.location.href = "coach-dashboard.html";
      } else if (
        type === "scout" ||
        window.location.href.includes("scout-dashboard")
      ) {
        window.location.href = "scout-dashboard.html";
      } else {
        window.location.href = "admin-dashboard.html";
      }
    }
    this.toggleSidebar(false);
  },

  renderMenu() {
    const url = window.location.href;
    const isPlayer = url.includes("player-dashboard.html");
    const isSuperAdmin = url.includes("super-admin-dashboard.html");
    const isCoach = url.includes("coach-dashboard.html");
    const isScout =
      url.includes("scout-dashboard.html") || url.includes("scouting.html");

    const nav = document.getElementById("sidebar-nav-content");
    if (!nav) return;

    let menuHtml = "";

    if (isPlayer) {
      menuHtml = `
                <div class="nav-group-title">Main</div>
                <a href="#" class="sidebar-link active" onclick="showPlayerSection('overview'); UnifiedNav.toggleSidebar(false); return false;"><i>📊</i> Dashboard</a>
                <a href="#" class="sidebar-link" onclick="showPlayerSection('club-messenger'); UnifiedNav.toggleSidebar(false); return false;"><i>💬</i> Messenger</a>
                
                <div class="nav-group-title">Career</div>
                <a href="#" class="sidebar-link" onclick="showPlayerSection('teams'); UnifiedNav.toggleSidebar(false); return false;"><i>🛡️</i> My Teams</a>
                <a href="#" class="sidebar-link" onclick="showPlayerSection('my-clubs'); UnifiedNav.toggleSidebar(false); return false;"><i>🏰</i> My Groups</a>
                <a href="scouting.html" class="sidebar-link"><i>🔍</i> Scouting</a>
                
                <div class="nav-group-title">Finance</div>
                <a href="#" class="sidebar-link" onclick="showPlayerSection('payments'); UnifiedNav.toggleSidebar(false); return false;"><i>💳</i> Payments</a>
                <a href="#" class="sidebar-link" onclick="showPlayerSection('item-shop'); UnifiedNav.toggleSidebar(false); return false;"><i>🎁</i> Shop</a>
            `;
    } else if (isSuperAdmin) {
      menuHtml = `
                <div class="nav-group-title">Platform</div>
                <a href="#" class="sidebar-link active" onclick="showSection('overview'); UnifiedNav.toggleSidebar(false); return false;"><i>📊</i> Admin Console</a>
                <a href="#" class="sidebar-link" onclick="showSection('groups'); UnifiedNav.toggleSidebar(false); return false;"><i>🏢</i> Groups</a>
                <a href="#" class="sidebar-link" onclick="showSection('users'); UnifiedNav.toggleSidebar(false); return false;"><i>👥</i> Global Users</a>
                
                <div class="nav-group-title">Operations</div>
                <a href="#" class="sidebar-link" onclick="showSection('verifications'); UnifiedNav.toggleSidebar(false); return false;"><i>🛡️</i> ID Verificaton</a>
                <a href="#" class="sidebar-link" onclick="showSection('activity'); UnifiedNav.toggleSidebar(false); return false;"><i>📜</i> System Logs</a>
                
                <div class="nav-group-title">System</div>
                <a href="#" class="sidebar-link" onclick="showSection('stripe'); UnifiedNav.toggleSidebar(false); return false;"><i>💰</i> Stripe Hub</a>
            `;
    } else if (isCoach) {
      menuHtml = `
                <div class="nav-group-title">Coaching</div>
                <a href="#" class="sidebar-link active" onclick="showCoachSection('overview'); UnifiedNav.toggleSidebar(false); return false;"><i>📊</i> Dashboard</a>
                <a href="#" class="sidebar-link" onclick="showCoachSection('messenger'); UnifiedNav.toggleSidebar(false); return false;"><i>💬</i> Messenger</a>
                
                <div class="nav-group-title">Squad</div>
                <a href="#" class="sidebar-link" onclick="showCoachSection('teams'); UnifiedNav.toggleSidebar(false); return false;"><i>🛡️</i> My Teams</a>
                <a href="#" class="sidebar-link" onclick="showCoachSection('players'); UnifiedNav.toggleSidebar(false); return false;"><i>👥</i> My Players</a>
                
                <div class="nav-group-title">Career</div>
                <a href="#" class="sidebar-link" onclick="showCoachSection('scouting'); UnifiedNav.toggleSidebar(false); return false;"><i>🔍</i> Scouting Hub</a>
                <a href="#" class="sidebar-link" onclick="showCoachSection('tournament-manager'); UnifiedNav.toggleSidebar(false); return false;"><i>🏆</i> Tournaments</a>
            `;
    } else if (isScout) {
      menuHtml = `
                <div class="nav-group-title">Talent Pool</div>
                <a href="#" class="sidebar-link active" onclick="showScoutSection('discovery'); UnifiedNav.toggleSidebar(false); return false;"><i>🔍</i> Discover</a>
                <a href="#" class="sidebar-link" onclick="showScoutSection('watchlist'); UnifiedNav.toggleSidebar(false); return false;"><i>⭐</i> Watchlist</a>
                
                <div class="nav-group-title">Analysis</div>
                <a href="#" class="sidebar-link" onclick="showScoutSection('reports'); UnifiedNav.toggleSidebar(false); return false;"><i>📝</i> Scout Reports</a>
                <a href="#" class="sidebar-link" onclick="showScoutSection('analytics'); UnifiedNav.toggleSidebar(false); return false;"><i>📊</i> Market Stats</a>
                
                <div class="nav-group-title">Network</div>
                <a href="#" class="sidebar-link" onclick="showScoutSection('messenger'); UnifiedNav.toggleSidebar(false); return false;"><i>💬</i> Messenger</a>
            `;
    } else {
      menuHtml = `
                <div class="nav-group-title">Management</div>
                <a href="#" class="sidebar-link active" onclick="showSection('overview'); UnifiedNav.toggleSidebar(false); return false;"><i>📊</i> Dashboard</a>
                <a href="#" class="sidebar-link" onclick="showSection('players'); UnifiedNav.toggleSidebar(false); return false;"><i>🏃</i> Players</a>
                <a href="#" class="sidebar-link" onclick="showSection('teams'); UnifiedNav.toggleSidebar(false); return false;"><i>🛡️</i> Teams</a>
                
                <div class="nav-group-title">Operations</div>
                <a href="#" class="sidebar-link" onclick="showSection('events'); UnifiedNav.toggleSidebar(false); return false;"><i>📅</i> Events</a>
                <a href="#" class="sidebar-link" onclick="showSection('tournaments'); UnifiedNav.toggleSidebar(false); return false;"><i>🏆</i> Tournaments</a>
                
                <div class="nav-group-title">Recruitment</div>
                <a href="scouting.html" class="sidebar-link"><i>🔍</i> Scout Hub</a>
                
                <div class="nav-group-title">Finance</div>
                <a href="#" class="sidebar-link" onclick="showSection('finances'); UnifiedNav.toggleSidebar(false); return false;"><i>💰</i> Finances</a>
            `;
    }

    // Add Logout/Settings at the bottom of the list too for desktop
    menuHtml += `
            <div class="nav-group-title">Settings</div>
            <a href="player-settings.html" class="sidebar-link"><i>⚙️</i> Account Settings</a>
        `;

    nav.innerHTML = menuHtml;
  },

  updateHeaderState() {
    window.addEventListener("scroll", () => {
      const header = document.querySelector(".pro-header, header.header");
      if (!header) return;
      // Only apply compacting styles on small viewports where header is fixed
      const isDesktop =
        typeof window !== "undefined" && window.innerWidth >= 1025;
      if (isDesktop) return; // desktop headers remain static

      if (window.scrollY > 30) {
        header.style.height = "68px";
        header.style.background = "rgba(10, 10, 12, 0.95)";
        header.style.borderBottomColor = "rgba(255, 255, 255, 0.15)";
      } else {
        header.style.height = "80px";
        header.style.background = "rgba(10, 10, 12, 0.7)";
        header.style.borderBottomColor = "rgba(255, 255, 255, 0.08)";
      }
    });
  },
};

// Initialize on load
document.addEventListener("DOMContentLoaded", () => UnifiedNav.init());
window.UnifiedNav = UnifiedNav; // Global access
