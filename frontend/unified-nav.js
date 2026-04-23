// Initialization moved to the end of the file to ensure const UnifiedNav is defined

// ─── ICON LIBRARY (Apple SF Symbol-style clean SVGs) ─────────────────────────
const ICONS = {
  // UI chrome icons
  menu: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`,
  close: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  // Nav icons — each wrapped in a semantic <i> tag for layout consistency
  nav: {
    overview: `<i class="nav-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg></i>`,
    players: `<i class="nav-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></i>`,
    teams: `<i class="nav-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></i>`,
    events: `<i class="nav-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></i>`,
    chat: `<i class="nav-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></i>`,
    approvals: `<i class="nav-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg></i>`,
    tactics: `<i class="nav-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg></i>`,
    forms: `<i class="nav-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/></svg></i>`,
    email: `<i class="nav-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg></i>`,
    trophy: `<i class="nav-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polyline points="8 21 12 17 16 21"/><line x1="12" y1="17" x2="12" y2="11"/><path d="M7 4H4a2 2 0 0 0-2 2v1c0 2.76 2.24 5 5 5h10a5 5 0 0 0 5-5V6a2 2 0 0 0-2-2h-3"/><rect x="7" y="2" width="10" height="6" rx="1"/></svg></i>`,
    training: `<i class="nav-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg></i>`,
    venue: `<i class="nav-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg></i>`,
    finance: `<i class="nav-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></i>`,
    shop: `<i class="nav-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg></i>`,
    settings: `<i class="nav-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></i>`,
    logout: `<i class="nav-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg></i>`,
  },
};

// --- GLOBAL LINK HANDLER ---
// Standardizes behavior across the entire platform
window.handleNavClick = function(e, page, section) {
    const isMobile = window.innerWidth < 992;
    const currentPath = window.location.pathname.toLowerCase();
    
    console.log(`🔗 NavClick: Target=${page} Section=${section} Current=${currentPath}`);

    // If target page is current page, try section switching for a smooth experience
    if (currentPath.includes(page.toLowerCase()) || 
        (page === 'admin-dashboard.html' && currentPath.includes('admin')) ||
        (page === 'player-dashboard.html' && currentPath.includes('player'))) {
        
        const showFn = window.showSection || window.showPlayerSection || window.showCoachSection || window.showScoutSection;
        if (typeof showFn === 'function' && section) {
            e.preventDefault();
            showFn(section);
            if (isMobile && window.UnifiedNav) window.UnifiedNav.toggleSidebar(false);
            
            // Update hash for deep linking
            window.location.hash = section;
            return false;
        }
    }
    
    // Otherwise, allow normal navigation to the href
    if (isMobile && window.UnifiedNav) window.UnifiedNav.toggleSidebar(false);
    return true; 
};
// Application phase flag - set on window or localStorage for quick toggling
const APP_PHASE =
  window.__CLUBHUB_PHASE ||
  parseInt(localStorage.getItem("clubhubPhase") || "1", 10);
// ─────────────────────────────────────────────────────────────────────────────

const UnifiedNav = {
  init() {
    console.log("🚀 UnifiedNav: Initializing standard navigation...");
    // Guard: make init idempotent to avoid duplicate header injection
    if (this._initialized) {
      console.log("♻️ UnifiedNav: already initialized; skipping.");
      return;
    }
    this._initialized = true;

    // Ensure every page has the basic shell before adding the unified header/sidebar
    if (typeof this.ensureLayoutShell === "function") {
      try {
        this.ensureLayoutShell();
      } catch (e) {
        console.warn("ensureLayoutShell failed", e);
      }
    }

    // Early cleanup of legacy artifacts that may introduce duplicate header elements
    if (typeof this.cleanupLegacyArtifacts === "function") {
      try {
        this.cleanupLegacyArtifacts();
      } catch (e) {
        console.warn("cleanupLegacyArtifacts failed", e);
      }
    }

    // Deduplicate header elements: keep the first .pro-header/header and remove others
    try {
      const headers = Array.from(
        document.querySelectorAll(
          "header.header, .pro-header, header.unified-header",
        ),
      );
      if (headers.length > 1) {
        console.log(
          `🧽 UnifiedNav: Found ${headers.length} header elements; deduplicating.`,
        );
        const primary =
          headers.find((h) => h.classList.contains("pro-header")) || headers[0];
        headers.forEach((h) => {
          if (h !== primary) {
            h.remove();
          }
        });
      }
    } catch (e) {
      console.warn("Header dedupe failed", e);
    }

    // Deduplicate bottom navs: keep the first .pro-bottom-nav and remove others to avoid stacking issues
    try {
      const bottoms = Array.from(document.querySelectorAll("nav.pro-bottom-nav, nav.unified-bottom-nav"));
      if (bottoms.length > 1) {
        console.log(`🧽 UnifiedNav: Found ${bottoms.length} bottom-nav elements; deduplicating.`);
        const primary = bottoms[0];
        bottoms.forEach((b) => {
          if (b !== primary) b.remove();
        });
      }
      // Ensure the primary has the content container
      const primaryNav = document.querySelector("nav.pro-bottom-nav, nav.unified-bottom-nav");
      if (primaryNav && !primaryNav.querySelector('#pro-bottom-nav-content')) {
        const inner = document.createElement('div');
        inner.id = 'pro-bottom-nav-content';
        inner.className = 'bottom-nav-container';
        primaryNav.appendChild(inner);
      }
    } catch (e) {
      console.warn('Bottom-nav dedupe failed', e);
    }

    // Auto-inject Group Switcher CSS
    if (!document.getElementById("group-switcher-css")) {
      const link = document.createElement("link");
      link.id = "group-switcher-css";
      link.rel = "stylesheet";
      link.href = "group-switcher.css";
      document.head.appendChild(link);
    }

    try {
      // Perform Mobile UX Sweep to fix layouts
      if (typeof this.performMobileUXSweep === "function") {
        this.performMobileUXSweep();
      }
    } catch (e) {
      console.warn("Sweep failed", e);
    }

    const isDesktop = window.matchMedia("(min-width: 992px)").matches;
    const path = window.location.pathname.toLowerCase();
    const isDashboard = path.includes("dashboard");
    const isLandingPage =
      (path.includes("index.html") ||
        path.endsWith("/") ||
        path === "" ||
        !path.includes("dashboard")) &&
      !path.includes("settings");

    const token = localStorage.getItem("authToken");
    const user = JSON.parse(localStorage.getItem("currentUser") || "null");
    const isLoggedIn = !!(token && user);

    console.log(
      `📍 Nav Info: Desktop=${isDesktop}, Dashboard=${isDashboard}, Landing=${isLandingPage}, LoggedIn=${isLoggedIn}`,
    );

    // Manage body classes for CSS scoping
    if (isDashboard) {
      document.body.classList.add("dashboard-view", "app-layout");
      document.body.classList.remove("landing-view");
    } else {
      document.body.classList.remove("dashboard-view", "app-layout");
      document.body.classList.add("landing-view");
    }

    // ── STAGE 1: Core Layout ───────────────────────────────────────────
    try {
      if (!isDesktop) {
        console.log("📱 Mobile View");
        if (isDashboard || (isLoggedIn && !isLandingPage)) {
          this.renderHeader();
          this.renderSidebar();
          this.renderBottomNav();
          this.renderMenu();
          this.renderMobileHeaderElements();
        } else if (isLandingPage) {
          this.ensureLandingHeader(isLoggedIn, user);
          this.toggleSidebar(false);
        }
      } else {
        console.log("💻 Desktop View");
        if (isDashboard) {
          if (!isLoggedIn) {
            console.warn(
              "🔒 Unauthenticated dashboard access. Redirecting to login...",
            );
            window.location.href = "login.html";
            return;
          }
          this.ensureDashboardHeader();
          this.renderSidebar();
          this.renderMenu();
        } else if (isLandingPage) {
          this.ensureLandingHeader(isLoggedIn, user);
          this.toggleSidebar(false);
          const sidebar = document.getElementById("pro-sidebar");
          if (sidebar) sidebar.remove();
        } else {
          this.ensureHeaderElements();
        }
      }
    } catch (err) {
      console.error("❌ Stage 1 (Core Layout) failed:", err);
    }

    // Sidebar: CLOSED (collapsed) by default on desktop unless user explicitly opened it
    if (isDesktop && isDashboard) {
      const sidebarPref = localStorage.getItem("sidebarCollapsed");
      // If never set OR set to true, default to collapsed
      if (sidebarPref === null || sidebarPref === "true") {
        document.body.classList.add("sidebar-collapsed");
        localStorage.setItem("sidebarCollapsed", "true");
      } else {
        document.body.classList.remove("sidebar-collapsed");
      }
    }

    // ── STAGE 2: Enhancements ──────────────────────────────────────────
    const enhancements = [
      {
        name: "ProfileDropdown",
        fn: () => isDashboard && isDesktop && this.renderProfileDropdown(),
      },
      {
        name: "SidebarToggle",
        fn: () => isDashboard && isDesktop && this.renderDesktopSidebarToggle(),
      },
      {
        name: "HeaderSwitcher",
        fn: () => isLoggedIn && !isLandingPage && this.renderHeaderSwitcher(),
      },
      {
        name: "StripeButton",
        fn: () => isDashboard && this.renderStripeHeaderButton(),
      },
      {
        name: "Notifications",
        fn: () => isDashboard && this.renderHeaderNotifications(),
      },
      { name: "PwaInstall", fn: () => this.renderPwaInstallButton() },
      { name: "EventBinding", fn: () => this.bindEvents() },
    ];

    enhancements.forEach((task) => {
      try {
        task.fn();
      } catch (err) {
        console.warn(`⚠️ Enhancement '${task.name}' failed:`, err);
      }
    });

    // ── STAGE 3: Data Sync ─────────────────────────────────────────────
    setTimeout(() => {
      try {
        console.log("🔄 Stage 3: Syncing User Data...");
        this.syncUserData();
        this.autoLabelTables();
        if (typeof this.performMobileUXSweep === "function")
          this.performMobileUXSweep();
        console.log("✅ UnifiedNav Init Complete.");
      } catch (err) {
        console.error("❌ Stage 3 (Data Sync) failed:", err);
      }
    }, 150);
  },

  /**
   * Ensure pages have the minimal shell elements so nav + footer render consistently
   */
  ensureLayoutShell() {
    // Header
    if (
      !document.querySelector(".pro-header") &&
      !document.querySelector("header.header")
    ) {
      const hdr = document.createElement("header");
      hdr.className = "pro-header unified-header";
      document.body.insertAdjacentElement("afterbegin", hdr);
    }

    // Sidebar placeholder
    if (!document.getElementById("pro-sidebar")) {
      // renderSidebar will create pro-sidebar when needed; create overlay container placeholders so CSS/layout works
      const overlay = document.createElement("div");
      overlay.id = "sidebar-overlay";
      overlay.className = "sidebar-overlay";
      document.body.appendChild(overlay);
      // create empty aside so code that queries it doesn't fail
      const aside = document.createElement("aside");
      aside.id = "pro-sidebar";
      aside.className = "pro-sidebar";
      // Do not set inline display:none here — rely on CSS and `.active` class to control visibility
      document.body.appendChild(aside);
    }

    // Bottom nav: ensure a container exists for mobile bottom nav
    if (!document.getElementById("pro-bottom-nav-content")) {
      const existing = document.querySelector(
        ".pro-bottom-nav, .unified-bottom-nav, .app-bottom-nav",
      );
      let container;
      if (existing) {
        container = existing.querySelector("#pro-bottom-nav-content");
        if (!container) {
          container = document.createElement("div");
          container.id = "pro-bottom-nav-content";
          existing.appendChild(container);
        }
      } else {
        const nav = document.createElement("nav");
        nav.className = "pro-bottom-nav mobile-only unified-bottom-nav";
        const inner = document.createElement("div");
        inner.className = "bottom-nav-container";
        inner.id = "pro-bottom-nav-content";
        nav.appendChild(inner);
        document.body.appendChild(nav);
      }
    }

    // Ensure there's a main/dashboard container for consistent padding/layout
    if (
      !document.querySelector("main") &&
      !document.querySelector(".dashboard-container")
    ) {
      const main = document.createElement("main");
      main.className = "dashboard-container";
      // Move existing body children (except header/nav/footer) into main
      const move = [];
      Array.from(document.body.children).forEach((c) => {
        if (
          c.tagName.toLowerCase() === "header" ||
          c.tagName.toLowerCase() === "nav" ||
          c.id === "pro-sidebar" ||
          c.id === "sidebar-overlay"
        )
          return;
        move.push(c);
      });
      move.forEach((c) => main.appendChild(c));
      document.body.appendChild(main);
    }
  },

  renderGroupSwitcher(container) {
    if (typeof GroupSwitcher !== "undefined") {
      GroupSwitcher.render(container);
    } else {
      const script = document.createElement("script");
      script.src = "group-switcher.js";
      script.onload = () => {
        if (typeof GroupSwitcher !== "undefined")
          GroupSwitcher.render(container);
      };
      document.head.appendChild(script);
    }
  },

  renderFamilySwitcher(container) {
    // Ported from player-dashboard.js logic
    const user = JSON.parse(localStorage.getItem("currentUser") || "{}");
    const firstName = user.firstName || user.first_name || "User";
    const family = JSON.parse(localStorage.getItem("userFamily") || "[]");
    const activeId = localStorage.getItem("activePlayerId");

    const activePlayer = family.find((f) => f.id == activeId);
    const displayName = activePlayer ? activePlayer.first_name : "Main Profile";
    const displayInitial = activePlayer
      ? activePlayer.first_name.charAt(0)
      : firstName.charAt(0);

    container.innerHTML = `
      <div class="profile-switcher" style="position: relative; margin-left: 1rem;">
        <button class="profile-switcher-trigger" id="profile-switcher-trigger" style="display: flex; align-items: center; gap: 0.75rem; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.2); color: white; border-radius: 10px; padding: 6px 14px; font-size: 0.85rem; cursor: pointer; transition: all 0.2s; min-width: 140px; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <div class="profile-avatar" style="width: 24px; height: 24px; border-radius: 50%; background: var(--primary); display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 700; flex-shrink: 0;">
              ${displayInitial}
            </div>
            <span style="font-weight: 600;">${displayName}</span>
          </div>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 4L6 8L10 4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        </button>
        
        <div class="profile-switcher-dropdown" id="profile-switcher-dropdown" style="position: absolute; top: calc(100% + 8px); left: 0; min-width: 240px; background: #1e1e1e; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.5); opacity: 0; visibility: hidden; transform: translateY(-10px); transition: all 0.25s; z-index: 1100; overflow: hidden; backdrop-filter: blur(10px);">
          <div style="padding: 0.6rem 1rem; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 0.7rem; font-weight: 700; text-transform: uppercase; color: rgba(255,255,255,0.4);">Switch Profile</div>
          <div class="profile-list" style="max-height: 300px; overflow-y: auto;">
            <button class="profile-item ${!activeId ? "active" : ""}" onclick="UnifiedNav.switchFamilyProfile(null)" style="width:100%; display:flex; align-items:center; gap:0.75rem; padding:0.75rem 1rem; background:none; border:none; color:white; cursor:pointer; text-align:left;">
               <div style="width:28px; height:28px; border-radius:50%; background:var(--primary); display:flex; align-items:center; justify-content:center; font-weight:700;">${firstName.charAt(0)}</div>
               <div>
                 <div style="font-weight:600; font-size:0.9rem;">${firstName} (Main)</div>
               </div>
            </button>
            ${family
              .map(
                (child) => `
              <button class="profile-item ${activeId == child.id ? "active" : ""}" onclick="UnifiedNav.switchFamilyProfile('${child.id}')" style="width:100%; display:flex; align-items:center; gap:0.75rem; padding:0.75rem 1rem; background:none; border:none; color:white; cursor:pointer; text-align:left;">
                 <div style="width:28px; height:28px; border-radius:50%; background:rgba(255,255,255,0.1); display:flex; align-items:center; justify-content:center; font-weight:700;">${child.first_name.charAt(0)}</div>
                 <div>
                   <div style="font-weight:600; font-size:0.9rem;">${child.first_name} ${child.last_name}</div>
                 </div>
              </button>
            `,
              )
              .join("")}
          </div>
        </div>
      </div>
    `;

    // Bind dropdown toggle
    const trigger = document.getElementById("profile-switcher-trigger");
    const dropdown = document.getElementById("profile-switcher-dropdown");
    if (trigger && dropdown) {
      trigger.onclick = (e) => {
        e.stopPropagation();
        const isOpen = dropdown.style.visibility === "visible";
        dropdown.style.opacity = isOpen ? "0" : "1";
        dropdown.style.visibility = isOpen ? "hidden" : "visible";
        dropdown.style.transform = isOpen
          ? "translateY(-10px)"
          : "translateY(0)";
      };
      document.addEventListener("click", () => {
        dropdown.style.opacity = "0";
        dropdown.style.visibility = "hidden";
        dropdown.style.transform = "translateY(-10px)";
      });
    }
  },

  switchFamilyProfile(id) {
    console.log("🔄 Switching family profile to:", id);
    if (id) {
      localStorage.setItem("activePlayerId", id);
    } else {
      localStorage.removeItem("activePlayerId");
    }
    window.location.reload();
  },

  renderHeaderNotifications(container) {
    // Use provided container or fallback to standard header areas
    const target =
      container ||
      document.getElementById("notif-header-btn-container") ||
      document.querySelector(".dash-header-right") ||
      document.querySelector(".nav-right");
    if (!target || target.querySelector(".notification-wrapper")) return;

    const bellHTML = `
      <div class="notification-wrapper" style="position: relative; margin-right: 0.5rem; display: flex; align-items: center;">
        <button class="notification-bell" onclick="UnifiedNav.toggleNotifications()" style="background: none; border: none; color: white; cursor: pointer; display: flex; align-items: center; opacity: 0.8; transition: opacity 0.2s; padding: 8px;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
          <span id="header-notif-badge" class="badge" style="display:none; position: absolute; top: 0px; right: 0px; background: var(--primary); color: white; border-radius: 50%; width: 14px; height: 14px; font-size: 9px; align-items: center; justify-content: center; font-weight: 800;">0</span>
        </button>
        <div id="notificationDropdown" class="notification-dropdown" style="position: absolute; top: calc(100% + 15px); right: 0; width: 320px; background: #0a0a0c; border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.6); padding: 1.25rem; z-index: 6000; display: none; transform-origin: top right; backdrop-filter: blur(20px);">
           <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
              <h3 style="margin: 0; font-size: 0.9rem; font-weight: 700;">Notifications</h3>
              <button onclick="UnifiedNav.markAllRead()" style="background: none; border: none; color: var(--primary); font-size: 0.7rem; cursor: pointer; font-weight: 600;">Mark all read</button>
           </div>
           <div id="notification-list" style="max-height: 400px; overflow-y: auto;">
              <div style="text-align: center; color: rgba(255,255,255,0.4); font-size: 0.8rem; padding: 2rem 0;">No new notifications</div>
           </div>
        </div>
      </div>
    `;

    if (container) {
      container.innerHTML = bellHTML;
    } else {
      target.insertAdjacentHTML("afterbegin", bellHTML);
    }
    this.loadNotifications();
  },

  toggleNotifications() {
    const dropdown = document.getElementById("notificationDropdown");
    if (!dropdown) return;
    const isOpen = dropdown.style.display === "block";
    dropdown.style.display = isOpen ? "none" : "block";
    if (!isOpen) {
      // Close profile dropdown if open
      this.toggleProfileDropdown(false);
    }
  },

  async loadNotifications() {
    const list = document.getElementById("notification-list");
    const badge = document.getElementById("header-notif-badge");
    if (!list) return;

    try {
      if (typeof apiService === "undefined") return;
      const res = await apiService.makeRequest("/notifications");
      const notifs = res || [];
      const unreadCount = notifs.filter((n) => !n.read).length;

      if (unreadCount > 0) {
        badge.textContent = unreadCount;
        badge.style.display = "flex";
      } else {
        badge.style.display = "none";
      }

      if (notifs.length > 0) {
        list.innerHTML = notifs
          .slice(0, 5)
          .map(
            (n) => `
             <div style="padding: 0.75rem; border-bottom: 1px solid rgba(255,255,255,0.05); cursor: pointer;" onclick="window.location.href='${n.link || "#"}'">
                <div style="font-weight: 600; font-size: 0.85rem; margin-bottom: 2px;">${n.title}</div>
                <div style="font-size: 0.75rem; color: rgba(255,255,255,0.5);">${n.message}</div>
             </div>
           `,
          )
          .join("");
      }
    } catch (e) {
      console.warn("Could not load notifications for header", e);
    }
  },

  markAllRead() {
    const badge = document.getElementById("header-notif-badge");
    if (badge) badge.style.display = "none";
    const list = document.getElementById("notification-list");
    if (list)
      list.innerHTML =
        '<div style="text-align: center; color: rgba(255,255,255,0.4); font-size: 0.8rem; padding: 2rem 0;">No new notifications</div>';
  },

  renderStripeHeaderButton(container) {
    const target =
      container ||
      document.getElementById("stripe-header-btn-container") ||
      document.querySelector(".dash-header-right") ||
      document.querySelector(".nav-right");
    if (!target || target.querySelector(".stripe-header-btn")) return;

    // Check if user is a group (groups manage payments/events via Stripe)
    const user = JSON.parse(localStorage.getItem("currentUser") || "{}");
    const userRole = this.getUserRole();
    const isGroup = userRole === "group";
    const isDashboard = window.location.pathname.includes("dashboard");

    // Check connection status from user object or localStorage
    const isConnected =
      user.stripe_connected ||
      user.is_stripe_connected ||
      localStorage.getItem("stripeConnected") === "true";

    if (isGroup && isDashboard) {
      const btnColor = isConnected ? "#22c55e" : "#635bff";
      const btnText = isConnected ? "Connected" : "Stripe";
      const btnIcon = isConnected
        ? "✅"
        : `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M13.962 10.935c0-1.212-1.046-1.309-1.973-1.309-1.353 0-2.321.31-2.321.31l-.22-1.552s.934-.367 2.592-.367c2.321 0 3.737 1.026 3.737 3.056 0 3.339-4.57 3.514-4.57 5.163 0 .726.65 1.045 1.636 1.045 1.418 0 2.503-.424 2.503-.424l.23 1.572s-1.162.53-2.88.53c-2.122 0-3.538-.986-3.538-2.936.01-3.6 4.804-3.66 4.804-5.088zM4.613 14.63c.18-1.52.92-2.14 1.94-2.14 1.34 0 2.3.26 2.3.26l.24-1.56s-1.25-.45-2.79-.45C4.213 10.74 3 12.18 3 14.73c0 3.03 2.1 3.54 4.13 3.54 1.7 0 3.1-.48 3.1-.48l.24-1.61s-1.45.66-3.1.66c-1.8 0-2.91-.71-2.757-2.21zm10.79 3.09h1.91v-6.85h-1.91v6.85zm0-8.54h1.91V7.27h-1.91v1.91zm2.34 8.54h1.91v-6.85h-1.91v6.85zm0-8.54h1.91V7.27h-1.91v1.91zm2.34 8.54h1.91v-3.7c0-2.02.8-3.15 2.14-3.15.22 0 .43.02.61.06v-1.74c-.17-.03-.38-.05-.61-.05-1.55 0-2.14.73-2.14.73V10.87h-1.91v6.85z"/>
            </svg>`;

      const stripeBtnHTML = `
        <div class="stripe-header-btn" style="margin-right: 0.5rem;">
          <button class="btn btn-small" onclick="typeof manageStripeAccount === 'function' ? manageStripeAccount() : console.log('💳 Stripe Dashboard')" style="background: ${btnColor}; color: white; border: none; padding: 6px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 0.4rem; transition: background 0.2s;">
            ${btnIcon}
            <span class="desktop-only">${btnText}</span>
          </button>
        </div>
      `;

      if (container) {
        container.innerHTML = stripeBtnHTML;
      } else {
        target.insertAdjacentHTML("afterbegin", stripeBtnHTML);
      }
    }
  },

  renderDesktopSidebarToggle() {
    // Insert toggle inside the sidebar header next to the logo
    const target = document.querySelector(".sidebar-header");
    if (!target || target.querySelector(".desktop-sidebar-toggle")) return;

    const toggleHTML = `
      <button class="desktop-sidebar-toggle desktop-only btn btn-small" onclick="window.UnifiedNav.toggleDesktopSidebar()" style="margin-right: 0.75rem; background: transparent; border: none; color: rgba(255,255,255,0.7); padding: 4px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: color 0.2s;">
        <i id="desktop-toggle-icon" style="font-style: normal;">☰</i>
      </button>
    `;

    // Insert at the beginning of sidebar header
    target.insertAdjacentHTML("afterbegin", toggleHTML);

    // Sync icon
    const isCollapsed = document.body.classList.contains("sidebar-collapsed");
    const icon = document.getElementById("desktop-toggle-icon");
    if (icon) icon.innerHTML = isCollapsed ? "☰" : "✕";
  },

  toggleDesktopSidebar() {
    const isCollapsed = document.body.classList.toggle("sidebar-collapsed");
    // Store 'false' when open (not default), 'true' when closed (default)
    localStorage.setItem("sidebarCollapsed", isCollapsed ? "true" : "false");
    const icon = document.getElementById("desktop-toggle-icon");
    if (icon) {
      icon.innerHTML = isCollapsed ? ICONS.menu : ICONS.close;
    }
  },

  renderPwaInstallButton() {
    // Don't inject PWA install wrapper on landing/home pages
    try {
      const path = window.location.pathname.toLowerCase();
      const isRootOrIndex =
        path === "/" || path.endsWith("/index.html") || path === "";
      const hasLandingHero = !!document.getElementById("landingHero");
      if (
        hasLandingHero ||
        isRootOrIndex ||
        document.body.classList.contains("landing-view")
      ) {
        // Skip injection on landing page to avoid layout glitches
        return;
      }
    } catch (e) {
      console.warn("PWA injection guard check failed", e);
    }

    // Look for various header sections
    const rightSide =
      document.querySelector(".dash-header-right") ||
      document.querySelector(".nav-right") ||
      document.querySelector(".header-actions") ||
      document.querySelector("header");

    if (!rightSide || rightSide.querySelector(".pwa-install-btn")) return;

    const pwaBtnHTML = `
      <div class="pwa-install-wrapper desktop-only" style="margin-right: 1rem; display: flex; align-items: center;">
        <button class="btn btn-secondary btn-small pwa-install-btn" onclick="typeof installPWA === 'function' ? installPWA() : console.log('📲 Install PWA')" style="display: none; align-items: center; gap: 0.5rem; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); color: white; padding: 6px 14px; border-radius: 8px; font-size: 0.8rem; font-weight: 700; cursor: pointer; transition: all 0.2s;">
          <img src="images/logo.png" alt="Install" style="width: 16px; height: 16px;">
          <span class="pwa-install-text">Install App</span>
        </button>
      </div>
    `;

    // For dashboards, we want to insert before profile or stripe
    const profile = rightSide.querySelector(".user-profile-trigger");
    if (profile) {
      profile.insertAdjacentHTML("beforebegin", pwaBtnHTML);
    } else {
      rightSide.insertAdjacentHTML("afterbegin", pwaBtnHTML);
    }
  },

  cleanupLegacyArtifacts() {
    console.log("🧹 UnifiedNav: Purging legacy artifacts...");

    // 1. Remove specific legacy IDs that might have been injected
    ["loggedInNav", "loggedOutNav", "scoutStatusBadge"].forEach((id) => {
      const el = document.getElementById(id);
      if (el && !el.closest(".pro-header")) {
        console.log(`🗑️ Removing rogue element: #${id}`);
        el.remove();
      }
    });

    // 2. Remove legacy welcome banners
    document.querySelectorAll(".welcome-banner, .user-info").forEach((el) => {
      if (
        !el.closest(".pro-header") &&
        !el.classList.contains("dash-header-left")
      ) {
        console.log("🗑️ Removing legacy welcome banner");
        el.remove();
      }
    });

    // 3. Absolute purge of any top-level text nodes containing "Hello,"
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      null,
      false,
    );
    const nodesToRemove = [];
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (
        node.textContent.includes("Hello,") &&
        !node.parentElement.closest(".pro-header") &&
        !node.parentElement.closest(".dashboard-container")
      ) {
        nodesToRemove.push(node);
      }
    }
    nodesToRemove.forEach((node) => {
      console.log("🗑️ Purging legacy text node:", node.textContent.trim());
      node.remove();
    });
  },

  /**
   * Ensure landing page headers are clean and appropriate
   */
  ensureLandingHeader(isLoggedIn, user) {
    let header = document.querySelector(".pro-header, header.header");
    if (!header) return;

    if (!isLoggedIn) {
      header.innerHTML = `
        <div class="nav-container nav container" style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
            <div class="logo" onclick="window.location.href='index.html'" style="display: flex; align-items: center; gap: 0.75rem; cursor: pointer;">
                <img src="images/logo.png" alt="ClubHub Logo" class="logo-image" style="height: 32px; width: 32px;">
                <span class="logo-text neon-text" style="font-weight: 800; font-size: 1.2rem;">ClubHub</span>
            </div>
            <div class="nav-buttons">
                <button class="btn btn-secondary" onclick="showModal('loginModal')">Login</button>
                <button class="btn btn-primary" onclick="showSignupOptions()">Sign Up</button>
            </div>
        </div>
      `;
    } else {
      const name =
        (user ? user.firstName || user.first_name : "User") || "User";
      header.innerHTML = `
        <div class="nav-container nav container" style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
            <div class="logo" onclick="window.location.href='index.html'" style="display: flex; align-items: center; gap: 0.75rem; cursor: pointer;">
                <img src="images/logo.png" alt="ClubHub Logo" class="logo-image" style="height: 32px; width: 32px;">
                <span class="logo-text neon-text" style="font-weight: 800; font-size: 1.2rem;">ClubHub</span>
            </div>
            <div class="dash-header-right" style="display: flex; align-items: center; gap: 1rem;">
                <span class="user-name desktop-only" style="color: white; font-weight: 600;">Hello, ${name}</span>
                <button class="btn btn-primary btn-small" onclick="UnifiedNav.goToDashboard()">Dashboard</button>
                <button class="btn btn-secondary btn-small" onclick="typeof handleLogout === 'function' ? handleLogout() : UnifiedNav.logout()">Logout</button>
            </div>
        </div>
      `;
    }
  },

  goToDashboard() {
    const user = JSON.parse(localStorage.getItem("currentUser") || "{}");
    const type =
      user.account_type || user.userType || localStorage.getItem("userType");

    if (type === "player") window.location.href = "player-dashboard.html";
    else if (type === "coach") window.location.href = "coach-dashboard.html";
    else if (type === "scout") window.location.href = "scout-dashboard.html";
    else if (type === "platform_admin")
      window.location.href = "super-admin-dashboard.html";
    else window.location.href = "admin-dashboard.html";
  },

  logout() {
    console.log("👋 Logging out...");
    localStorage.removeItem("authToken");
    localStorage.removeItem("currentUser");
    localStorage.removeItem("activePlayerId");
    sessionStorage.clear();
    window.location.href = "login.html";
  },

  /**
   * Ensure desktop headers include everything needed for a premium dashboard experience
   */
  ensureDashboardHeader() {
    let header = document.querySelector(".pro-header, header.header");
    if (!header) {
      header = document.createElement("header");
      header.className = "pro-header";
      document.body.prepend(header);
    }
    header.classList.add("unified-header");

    const user = JSON.parse(localStorage.getItem("currentUser") || "{}");
    const name = (
      user.firstName ||
      user.first_name ||
      user.name ||
      "User"
    ).split(" ")[0];
    const initial = name.charAt(0).toUpperCase();

    header.innerHTML = `
      <div class="nav-container nav container" style="display:flex; align-items:center; width:100%; gap:1.5rem;">

        <!-- MOBILE: hamburger + logo -->
        <div class="logo-area-wrapper mobile-only" style="display:flex; align-items:center; gap:0.75rem; flex-shrink:0;">
          <div class="side-menu-trigger" id="side-menu-trigger" onclick="UnifiedNav.toggleSidebar(true)" style="cursor:pointer; display:flex; align-items:center;">
            ${ICONS.menu}
          </div>
          <div class="logo" onclick="window.location.href='index.html'" style="display:flex; align-items:center; gap:0.5rem; cursor:pointer;">
            <img src="images/logo.png" alt="Logo" style="height:28px; width:28px; object-fit:contain;">
            <span style="font-family:'Outfit',sans-serif; font-weight:800; font-size:1.1rem; color:var(--primary);">ClubHub</span>
          </div>
        </div>

        <!-- DESKTOP LEFT: Logo + Group Switcher (Unified Context) -->
        <div class="dash-header-left desktop-only" style="display:flex; align-items:center; gap:1.5rem; flex-shrink:0;">
          <div class="logo" onclick="window.location.href='index.html'" style="display:flex; align-items:center; gap:0.5rem; cursor:pointer; text-decoration:none;">
            <img src="images/logo.png" alt="Logo" style="height:32px; width:32px; object-fit:contain;">
            <span style="font-family:'Outfit',sans-serif; font-weight:800; font-size:1.2rem; color:var(--primary);">ClubHub</span>
          </div>
          <div id="header-org-switcher" class="header-org-switcher-wrapper" style="display:flex; align-items:center;"></div>
        </div>

        <!-- CENTER: Mode Switcher (Groups vs Player) -->
        <div class="dash-header-center desktop-only" style="flex:1; display:flex; justify-content:center;">
          <div class="header-mode-toggle" id="header-mode-toggle" style="display:flex; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:4px;">
            <div class="mode-pill" id="header-mode-group-pill" onclick="UnifiedNav.switchMode('group')" 
                 style="padding:0.5rem 1rem; font-size:0.85rem; font-weight:600; border-radius:8px; cursor:pointer; transition:all 0.2s;">Groups Hub</div>
            <div class="mode-pill" id="header-mode-player-pill" onclick="UnifiedNav.switchMode('player')" 
                 style="padding:0.5rem 1rem; font-size:0.85rem; font-weight:600; border-radius:8px; cursor:pointer; transition:all 0.2s;">Player Pro</div>
          </div>
        </div>

        <!-- RIGHT: Actions -->
        <div class="dash-header-right" id="header-actions-right" style="display:flex; align-items:center; gap:0.75rem; flex-shrink:0;">
          <div id="stripe-header-btn-container" class="desktop-only"></div>
          <div id="notif-header-btn-container"></div>
          
          <div class="user-profile-trigger desktop-only" id="profileTrigger" onclick="UnifiedNav.toggleProfileDropdown(true)"
               style="display:flex; align-items:center; gap:0.5rem; cursor:pointer; padding:0.35rem 0.75rem; border-radius:999px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.08); transition:all 0.2s;">
            <span class="user-name" id="header-user-name" style="font-size:0.85rem; font-weight:600;">${name}</span>
            <div class="user-avatar-sm" id="header-user-avatar" style="width:30px; height:30px; border-radius:50%; background:var(--primary); display:flex; align-items:center; justify-content:center; font-weight:700; font-size:0.8rem; flex-shrink:0;">${initial}</div>
            <i class="fa fa-chevron-down" style="font-size:0.7rem; opacity:0.5;"></i>
          </div>

          <button class="btn btn-secondary btn-small desktop-only" onclick="UnifiedNav.logout()" style="white-space:nowrap; border-radius:8px;">Logout</button>
          
          <!-- mobile avatar only -->
          <div class="mobile-only" style="display:flex; align-items:center; gap:0.5rem;" onclick="UnifiedNav.toggleSidebar(true)">
            <div class="user-avatar-sm" style="width:32px; height:32px; border-radius:50%; background:var(--primary); display:flex; align-items:center; justify-content:center; font-weight:700; font-size:0.85rem;">${initial}</div>
          </div>
        </div>
      </div>
    `;

    // Inject Stripe button and notifications
    this.renderStripeHeaderButton(
      document.getElementById("stripe-header-btn-container"),
    );
    this.renderHeaderNotifications(
      document.getElementById("notif-header-btn-container"),
    );
    this.syncUserData();
    this.updateModeUI();

    // Inject Group Switcher (or Family Switcher for player page) into #header-org-switcher
    const switcherSlot = document.getElementById("header-org-switcher");
    if (switcherSlot && !switcherSlot.dataset.mounted) {
      switcherSlot.dataset.mounted = "1";
      const userRole = this.getUserRole();
      const isPlayerPage = window.location.href.includes(
        "player-dashboard.html",
      );

      if (isPlayerPage || userRole === "player") {
        this.renderFamilySwitcher(switcherSlot);
      } else {
        this.renderGroupSwitcher(switcherSlot);
      }
      // Ensure clicking the header switcher area toggles the group switcher dropdown
      try {
        switcherSlot.addEventListener("click", (e) => {
          e.stopPropagation();
          const inst = window.__groupSwitcherInstance;
          if (inst && typeof inst.toggleDropdown === "function") {
            inst.toggleDropdown();
          } else {
            // If instance not ready, render and toggle after a short delay
            UnifiedNav.renderGroupSwitcher(switcherSlot);
            setTimeout(() => {
              const i = window.__groupSwitcherInstance;
              if (i && typeof i.toggleDropdown === "function")
                i.toggleDropdown();
            }, 300);
          }
        });
      } catch (e) {
        console.warn("Failed to bind header switcher click", e);
      }
    }

    const isMobile = window.innerWidth < 992;
    if (!isMobile) {
      this.renderTopTabs();
    }
  },

  ensureHeaderElements() {
    this.ensureDashboardHeader();
  },

  renderSidebar() {
    try {
      const existingSidebar = document.getElementById("pro-sidebar");
      const existingOverlay = document.getElementById("sidebar-overlay");

      // If a fully populated sidebar is already present, skip.
      if (existingSidebar && existingSidebar.innerHTML.trim().length > 20) {
        console.log("♻️ Sidebar already exists and is populated; skipping recreation.");
        return;
      }

      console.log("🏗️ Rendering Sidebar (creating or populating placeholder)...");

      // Ensure overlay exists
      if (!existingOverlay) {
        const ov = document.createElement("div");
        ov.id = "sidebar-overlay";
        ov.className = "sidebar-overlay";
        document.body.appendChild(ov);
        try { ov.style.removeProperty('display'); } catch (e) {}
      }

      // Build inner HTML for aside (only the content inside <aside>) so we can populate existing placeholders
      const asideInner = `
                    <button class="sidebar-burger mobile-only" onclick="UnifiedNav.toggleSidebar(false)" style="position: absolute; top: 1.25rem; left: 50%; transform: translateX(-50%); background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: white; cursor: pointer; padding: 8px; display: flex; align-items: center; border-radius: 8px; z-index: 10;">
                        ${ICONS.menu}
                    </button>
                    
                    <div class="sidebar-header" style="display: flex; align-items: center; gap: 1rem; padding: 4.5rem 1.5rem 1.25rem; border-bottom: 1px solid rgba(255,255,255,0.05); margin-bottom: 0.5rem; position: relative;">
                        <div class="logo-area" style="display: flex; align-items: center; gap: 0.75rem;">
                            <img src="images/logo.png" alt="Logo" style="width: 28px; height: 28px;">
                            <span style="font-weight: 800; font-size: 1.25rem; letter-spacing: -0.5px;">ClubHub</span>
                        </div>
                        <div id="sidebar-switcher-target" style="margin-top: 1rem; width: 100%;"></div>
                    </div>

                    <div class="sidebar-nav-container" style="flex: 1; overflow-y: auto;">
                        <div id="sidebar-nav-content">
                            <div style="padding: 2rem; text-align: center; opacity: 0.5;">Loading menu...</div>
                        </div>
                    </div>

                    <div class="sidebar-footer" style="padding: 1.5rem; border-top: 1px solid rgba(255,255,255,0.05); background: rgba(0,0,0,0.2);">
                        <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                            <a href="player-settings.html" class="sidebar-link" style="margin-bottom: 0; padding: 0.75rem 1rem;">${ICONS.nav.settings} <span>Settings</span></a>
                            <a href="#" class="sidebar-link" onclick="UnifiedNav.logout(); return false;" style="color: #ef4444; margin-bottom: 0; padding: 0.75rem 1rem;">${ICONS.nav.logout} <span>Sign Out</span></a>
                        </div>
                    </div>
            `;

      if (existingSidebar) {
        existingSidebar.innerHTML = asideInner;
        // ensure any placeholder inline display does not block visibility when `.active` is toggled
        try { existingSidebar.style.removeProperty('display'); } catch (e) {}
      } else {
        const aside = document.createElement("aside");
        aside.className = "pro-sidebar";
        aside.id = "pro-sidebar";
        aside.innerHTML = asideInner;
        document.body.appendChild(aside);
      }

      this.initSidebarSwitcher();
    } catch (err) {
      console.error("❌ Error rendering sidebar:", err);
    }
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

  renderGroupSwitcher(container) {
    if (!container) return;
    if (typeof GroupSwitcher !== "undefined") {
      GroupSwitcher.render(container);
    } else {
      const script = document.createElement("script");
      script.src = "group-switcher.js";
      script.onload = () => {
        if (typeof GroupSwitcher !== "undefined")
          GroupSwitcher.render(container);
      };
      document.head.appendChild(script);
    }
  },

  renderFamilySwitcher(container) {
    if (!container) return;
    const user = JSON.parse(localStorage.getItem("currentUser") || "{}");
    const name = user.firstName || user.first_name || "Member";
    container.innerHTML = `
        <div class="family-switcher-placeholder" style="display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem 1rem; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; cursor: pointer;" onclick="showPlayerSection('family'); return false;">
            <div style="width: 24px; height: 24px; border-radius: 50%; background: var(--primary); display: flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: 800;">${name.charAt(0)}</div>
            <span style="font-size: 0.85rem; font-weight: 600;">${name}</span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 4L6 8L10 4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        </div>
    `;
  },

  renderHeaderSwitcher() {
    // Look for the dedicated group switcher container (both mobile and desktop)
    let headerContainer =
      document.getElementById("header-org-switcher") ||
      document.getElementById("header-group-switcher-container") ||
      document.querySelector(".header-org-switcher-wrapper") ||
      document.querySelector(".dash-header-left");
    
    if (!headerContainer) return;

    // Prevent double-rendering
    if (headerContainer.querySelector("select")) return;

    const userRole = this.getUserRole();
    const isPlayerMode = window.location.href.includes("player-dashboard.html");

    if (isPlayerMode || userRole === "player") {
      console.log("👨‍👩‍👧‍👦 Rendering Family Switcher in Header");
      this.renderFamilySwitcher(headerContainer);
    } else {
      console.log("🏢 Rendering Group Switcher in Header (role: " + userRole + ")");
      this.renderGroupSwitcher(headerContainer);
    }
  },

  /**
   * Adds essential mobile buttons (Hamburger) to any header
   */
  renderMobileHeaderElements() {
    const header = document.querySelector("header.header, .pro-header");
    if (!header) return;

    let nav = header.querySelector(".nav-container, .nav");
    if (!nav) return;

    // Add Hamburger if missing (Mobile only)
    if (
      !nav.querySelector("#side-menu-trigger") &&
      !nav.querySelector(".side-menu-trigger")
    ) {
      const trigger = document.createElement("div");
      trigger.className = "side-menu-trigger mobile-only";
      trigger.id = "side-menu-trigger";
      trigger.onclick = () => UnifiedNav.toggleSidebar(true);
      trigger.innerHTML = ICONS.menu;
      nav.insertBefore(trigger, nav.firstChild);
    }
  },

  /**
   * Unified Header
   * Transforms ANY existing header into the standardized ClubHub bar
   */
  renderHeader() {
    const header = document.querySelector("header.header, .pro-header");
    if (!header) return;

    header.classList.add("pro-header", "unified-header");

    const isMobile = window.innerWidth < 992;
    header.innerHTML = `
            <div class="nav-container">
                <button class="back-button mobile-only" onclick="window.history.back()" style="border:none; background:transparent; color:inherit; font-size:1.2rem; padding:0.5rem; margin-right:0.5rem; cursor:pointer;">
                    ←
                </button>
                <div class="side-menu-trigger mobile-only" id="side-menu-trigger" onclick="UnifiedNav.toggleSidebar(true)">
                    ${ICONS.menu}
                </div>

                <div class="dash-header-left" style="display: flex; align-items: center; gap: 1rem;">
                    <div class="logo-area" onclick="window.location.href='index.html'" style="cursor: pointer;">
                        <img src="images/logo.png" alt="Logo" class="logo-img">
                        <span class="logo-text">ClubHub</span>
                    </div>
                    <div id="header-group-switcher-container"></div>
                </div>

                <div class="mode-toggle-container desktop-only">
                    <div class="header-mode-toggle" id="header-mode-toggle">
                        <div class="mode-pill" id="header-mode-group-pill" onclick="UnifiedNav.switchMode('group')">Groups Hub</div>
                        <div class="mode-pill" id="header-mode-player-pill" onclick="UnifiedNav.switchMode('player')">Player Pro</div>
                    </div>
                </div>

                <div class="header-actions">
                    <div class="action-btn desktop-only" style="margin-right: 1rem;" onclick="typeof showPlayerSection !== 'undefined' ? showPlayerSection('notifications') : (typeof showSection !== 'undefined' ? showSection('notifications') : null); return false;">
                        <i class="fa fa-bell-o"></i>
                        <span class="badge" id="header-notif-badge" style="display:none">0</span>
                    </div>

                    <div class="user-profile-trigger" id="profileTrigger" onclick="UnifiedNav.toggleProfileDropdown(true)">
                        <span class="user-name desktop-only" id="header-user-name">Loading...</span>
                        <div class="user-avatar-sm" id="header-user-avatar">?</div>
                        <i class="fa fa-chevron-down desktop-only" style="font-size: 0.7rem; opacity: 0.5; margin-left: 4px;"></i>
                    </div>
                    <button class="btn btn-secondary btn-small desktop-only" onclick="UnifiedNav.logout()" style="margin-left: 0.5rem;">Logout</button>
                </div>
            </div>
        `;

    this.renderHeaderSwitcher();
    this.updateModeUI();
    if (!isMobile) {
      this.renderTopTabs();
    }
  },

  /**
   * Render Swipable Top Tabs (Headlines)
   * Inspired by Threads/Premium app UX
   */
  renderTopTabs() {
    const header = document.querySelector(".pro-header, header.header");
    if (!header) return;

    // Don't render on landing page
    if (
      window.location.pathname.includes("index.html") ||
      window.location.pathname === "/" ||
      window.location.pathname === ""
    )
      return;

    let existingTabs = document.getElementById("top-headline-tabs");
    if (existingTabs) return;

    const url = window.location.href;
    const userRole = localStorage.getItem("userType") || "";
    const isPlayer =
      url.includes("player-dashboard.html") || userRole === "player";
    const isCoach =
      url.includes("coach-dashboard.html") || userRole === "coach";
    const isScout =
      url.includes("scout-dashboard.html") || userRole === "scout";
    const isSuperAdmin =
      url.includes("super-admin-dashboard.html") ||
      userRole === "platform_admin";
    const isAdmin =
      url.includes("admin-dashboard.html") || userRole === "admin";

    let tabs = [];
    if (isPlayer) {
      tabs = [
        { id: "overview", label: "Overview", icon: "📊" },
        { id: "teams", label: "My Teams", icon: "⚽" },
        { id: "club-messenger", label: "Chat", icon: "💬" },
        { id: "notifications", label: "Activity", icon: "🔔" },
        { id: "my-clubs", label: "Groups", icon: "🏰" },
        { id: "my-venues", label: "My Venues", icon: "📍" },
        { id: "my-tournaments", label: "My Tournaments", icon: "🏆" },
        { id: "my-events", label: "My Events", icon: "📅" },
        { id: "payments", label: "Finance", icon: "💳" },
      ];
    } else if (isCoach) {
      tabs = [
        { id: "overview", label: "Dashboard", icon: "📊" },
        { id: "teams", label: "Teams", icon: "🛡️" },
        { id: "players", label: "Squad", icon: "👥" },
        { id: "tactical-board", label: "Tactical", icon: "📋" },
        { id: "messenger", label: "Messenger", icon: "💬" },
        { id: "scouting", label: "Scouting", icon: "🔍" },
        { id: "tournament-manager", label: "Events", icon: "🏆" },
      ];
    } else if (isScout) {
      tabs = [
        { id: "discovery", label: "Discover", icon: "🔍" },
        { id: "watchlist", label: "Watchlist", icon: "⭐" },
        { id: "messenger", label: "Chat", icon: "💬" },
        { id: "reports", label: "Reports", icon: "📝" },
      ];
    } else if (isAdmin) {
      tabs = [
        { id: "overview", label: "Overview", icon: "📊" },
        { id: "members", label: "Members", icon: "🏃" },
        { id: "teams", label: "Teams", icon: "🛡️" },
        { id: "events", label: "Events", icon: "📅" },
        { id: "finances", label: "Finance", icon: "💰" },
        { id: "staff", label: "Staff", icon: "👔" },
      ];
    } else if (isSuperAdmin) {
      tabs = [
        { id: "overview", label: "Console", icon: "📊" },
        { id: "groups", label: "Groups", icon: "🏢" },
        { id: "users", label: "Global Users", icon: "👥" },
        { id: "activity", label: "System Logs", icon: "📜" },
      ];
    }

    if (tabs.length === 0) return;

    const tabsHTML = `
      <div id="top-headline-tabs" class="top-headline-tabs">
        <div class="tabs-scroll-container">
          ${tabs
            .map(
              (tab) => `
            <button class="headline-tab ${tab.id === "overview" ? "active" : ""}" 
                    onclick="${isPlayer ? "showPlayerSection" : isCoach ? "showCoachSection" : isScout ? "showScoutSection" : "showSection"}('${tab.id}'); UnifiedNav.setActiveTab(this);">
              <span class="tab-icon">${tab.icon}</span>
              <span class="tab-label">${tab.label}</span>
            </button>
          `,
            )
            .join("")}
        </div>
      </div>
    `;

    header.insertAdjacentHTML("afterend", tabsHTML);
  },

  setActiveTab(btn) {
    document
      .querySelectorAll(".headline-tab")
      .forEach((t) => t.classList.remove("active"));
    btn.classList.add("active");
    btn.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  },

  renderBottomNav() {
    const bottomNavContainer = document.getElementById(
      "pro-bottom-nav-content",
    );
    if (!bottomNavContainer) return;

    const url = window.location.href;
    const userRole = localStorage.getItem("userType") || "";
    const isPlayer =
      url.includes("player-dashboard.html") || userRole === "player";
    const isSuperAdmin =
      url.includes("super-admin-dashboard.html") ||
      userRole === "platform_admin";
    const isCoach =
      url.includes("coach-dashboard.html") || userRole === "coach";
    const isScout =
      url.includes("scout-dashboard.html") ||
      url.includes("scouting.html") ||
      userRole === "scout";

    let navHtml = "";

    const userType = localStorage.getItem("userType");
    const isPlayerMode =
      url.includes("player-dashboard.html") || userType === "player";

    if (isPlayerMode || isPlayer) {
      navHtml = `
                <a href="player-dashboard.html" class="bottom-nav-link active" aria-label="Home" onclick="if(typeof showPlayerSection === 'function') { showPlayerSection('overview'); return false; }">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                    <span>Home</span>
                </a>
                <a href="player-dashboard.html" class="bottom-nav-link" aria-label="Teams" onclick="if(typeof showPlayerSection === 'function') { showPlayerSection('teams'); return false; }">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                    <span>Teams</span>
                </a>
                <a href="player-dashboard.html" class="bottom-nav-link" aria-label="Chat" onclick="if(typeof showPlayerSection === 'function') { showPlayerSection('club-messenger'); return false; }">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                    <span>Chat</span>
                </a>
                <a href="player-dashboard.html" class="bottom-nav-link" aria-label="Events" onclick="if(typeof showPlayerSection === 'function') { showPlayerSection('my-events'); return false; }">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                    <span>Events</span>
                </a>
                <a href="#" class="bottom-nav-link" aria-label="More" onclick="UnifiedNav.toggleSidebar(true); return false;">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
                    <span>More</span>
                </a>
            `;
    } else if (isCoach) {
      navHtml = `
                <a href="coach-dashboard.html" class="bottom-nav-link active" aria-label="Home" onclick="if(typeof showCoachSection === 'function') { showCoachSection('overview'); return false; }">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                    <span>Home</span>
                </a>
                <a href="coach-dashboard.html" class="bottom-nav-link" aria-label="Squad" onclick="if(typeof showCoachSection === 'function') { showCoachSection('players'); return false; }">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                    <span>Squad</span>
                </a>
                <a href="coach-dashboard.html" class="bottom-nav-link" aria-label="Chat" onclick="if(typeof showCoachSection === 'function') { showCoachSection('messenger'); return false; }">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                    <span>Chat</span>
                </a>
                <a href="coach-dashboard.html" class="bottom-nav-link" aria-label="Teams" onclick="if(typeof showCoachSection === 'function') { showCoachSection('teams'); return false; }">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                    <span>Teams</span>
                </a>
                <a href="#" class="bottom-nav-link" aria-label="More" onclick="UnifiedNav.toggleSidebar(true); return false;">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
                    <span>More</span>
                </a>
            `;
    } else if (isScout) {
      navHtml = `
                <a href="scout-dashboard.html" class="bottom-nav-link active" onclick="if(typeof showScoutSection === 'function') { showScoutSection('discovery'); return false; }">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                </a>
                <a href="scout-dashboard.html" class="bottom-nav-link" onclick="if(typeof showScoutSection === 'function') { showScoutSection('watchlist'); return false; }">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
                </a>
                <a href="scout-dashboard.html" class="bottom-nav-link" onclick="if(typeof showScoutSection === 'function') { showScoutSection('messenger'); return false; }">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                </a>
                <a href="scout-dashboard.html" class="bottom-nav-link" onclick="if(typeof showScoutSection === 'function') { showScoutSection('analytics'); return false; }">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                </a>
                <a href="#" class="bottom-nav-link" onclick="UnifiedNav.toggleSidebar(true); return false;">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
                </a>
            `;
    } else if (isSuperAdmin) {
      navHtml = `
                <a href="super-admin-dashboard.html" class="bottom-nav-link active" onclick="if(typeof showSection === 'function') { showSection('overview'); return false; }">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                </a>
                <a href="super-admin-dashboard.html" class="bottom-nav-link" onclick="if(typeof showSection === 'function') { showSection('groups'); return false; }">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"></path><path d="M3 7v1a3 3 0 0 0 6 0V7m0 1a3 3 0 0 0 6 0V7m0 1a3 3 0 0 0 6 0V7H3"></path><path d="M19 21V11"></path><path d="M5 21V11"></path></svg>
                </a>
                <a href="super-admin-dashboard.html" class="bottom-nav-link" onclick="if(typeof showSection === 'function') { showSection('users'); return false; }">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                </a>
                <a href="super-admin-dashboard.html" class="bottom-nav-link" onclick="if(typeof showSection === 'function') { showSection('activity'); return false; }">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
                </a>
                <a href="#" class="bottom-nav-link" onclick="UnifiedNav.toggleSidebar(true); return false;">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
                </a>
            `;
    } else {
      navHtml = `
                <a href="admin-dashboard.html" class="bottom-nav-link active" onclick="if(typeof showSection === 'function') { showSection('overview'); return false; }">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                </a>
                <a href="admin-dashboard.html" class="bottom-nav-link" onclick="if(typeof showSection === 'function') { showSection('members'); return false; }">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                </a>
                <a href="tournament-manager.html" class="bottom-nav-link">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                </a>
                <a href="admin-dashboard.html" class="bottom-nav-link" onclick="if(typeof showSection === 'function') { showSection('finances'); return false; }">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                </a>
                <a href="#" class="bottom-nav-link" onclick="UnifiedNav.toggleSidebar(true); return false;">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
                </a>
            `;
    }

    bottomNavContainer.innerHTML = navHtml;
    this.stripHashLinks(bottomNavContainer);
  },

  stripHashLinks(root) {
    if (!root || !root.querySelectorAll) return;
    root.querySelectorAll('a[href*="#"]').forEach((link) => {
      const href = link.getAttribute("href") || "";
      const path = href.split("#")[0];
      link.setAttribute("href", path.length ? path : "#");
    });
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
                    <a href="player-settings.html" class="dropdown-link">${ICONS.nav.settings} Account Settings</a>
                    <a href="#" class="dropdown-link" style="color: #ef4444;" onclick="typeof handleLogout === 'function' ? handleLogout() : UnifiedNav.logout(); return false;">${ICONS.nav.logout} Sign Out</a>
                </div>
            </div>
        `;
    // Try to attach to a header container if possible, otherwise body
    const container = document.querySelector(
      ".pro-header .nav-container, header.header .nav, header.header .nav-container",
    );
    if (container) {
      container.insertAdjacentHTML("beforeend", dropdownHTML);
    } else {
      document.body.insertAdjacentHTML("beforeend", dropdownHTML);
    }
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
    const sidebar = document.getElementById("pro-sidebar");
    const overlay = document.getElementById("sidebar-overlay");
    if (!sidebar || !overlay) return;

    // Standardize breakpoints: 992px+ is desktop
    const isDesktop = typeof window !== "undefined" && window.innerWidth >= 992;

    if (isDesktop && show) {
      // On desktop, we can use the trigger for profile if sidebar is already persistent
      this.toggleProfileDropdown(true);
      return;
    }

    if (show) {
      sidebar.classList.add("active");
      overlay.classList.add("active");
      // Ensure inline display is set so CSS cascade doesn't accidentally keep it hidden
      try { sidebar.style.setProperty('display','flex','important'); } catch (e) {}
      try { overlay.style.setProperty('display','block','important'); } catch (e) {}
      this.syncUserData();
    } else {
      sidebar.classList.remove("active");
      overlay.classList.remove("active");
      try { sidebar.style.removeProperty('display'); } catch (e) {}
      try { overlay.style.removeProperty('display'); } catch (e) {}
    }

    if (show) {
      const notifDropdown = document.getElementById("notificationDropdown");
      if (notifDropdown) notifDropdown.style.display = "none";
      this.toggleProfileDropdown(false);
    }
  },

  getUserRole() {
    const user = JSON.parse(localStorage.getItem("currentUser") || "{}");
    return (
      user.account_type ||
      user.userType ||
      localStorage.getItem("userType") ||
      "member"
    );
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
    const userRole = localStorage.getItem("userType") || "";
    const isPlayer =
      url.includes("player-dashboard.html") || userRole === "player";
    const isSuperAdmin =
      url.includes("super-admin-dashboard.html") ||
      userRole === "platform_admin";
    const isCoach =
      url.includes("coach-dashboard.html") || userRole === "coach";
    const isScout =
      url.includes("scout-dashboard.html") ||
      url.includes("scouting.html") ||
      userRole === "scout";

    const nav = document.getElementById("sidebar-nav-content");
    if (!nav) return;

    let menuHtml = "";
    const p = window.location.pathname;
    const isActive = (f) => p.includes(f) ? "active" : "";

    if (isPlayer) {
      menuHtml = `
                    <div class="nav-group-title">Main Hub</div>
                    <a href="player-dashboard.html" class="sidebar-link ${isActive('player-dashboard.html') && !isActive('player-schedule.html') && !isActive('player-performance.html') && !isActive('player-finances.html') && !isActive('player-chat.html') && !isActive('player-shop.html') ? 'active' : ''}">${ICONS.nav.overview}<span>Overview</span></a>
                    <a href="player-schedule.html" class="sidebar-link ${isActive('player-schedule.html')}">${ICONS.nav.training}<span>My Schedule</span></a>
                    <a href="player-performance.html" class="sidebar-link ${isActive('player-performance.html')}">${ICONS.nav.players}<span>Performance</span></a>
                    <a href="player-finances.html" class="sidebar-link ${isActive('player-finances.html')}">${ICONS.nav.finance}<span>My Finances</span></a>
                    
                    <div class="nav-group-title">Club Services</div>
                    <a href="player-chat.html" class="sidebar-link ${isActive('player-chat.html')}">${ICONS.nav.chat}<span>Messenger</span></a>
                    <a href="player-shop.html" class="sidebar-link ${isActive('player-shop.html')}">${ICONS.nav.shop}<span>Club Shop</span></a>
                    <a href="venue-booking.html" class="sidebar-link ${isActive('venue-booking.html')}">${ICONS.nav.venue}<span>Book Venue</span></a>
                    
                    <div class="nav-group-title">Finder</div>
                    <a href="team-finder.html" class="sidebar-link ${isActive('team-finder.html')}">${ICONS.nav.teams}<span>Team Finder</span></a>
                    <a href="tournament-finder.html" class="sidebar-link ${isActive('tournament-finder.html')}">${ICONS.nav.trophy}<span>Tournament Finder</span></a>
        `;
    } else if (isSuperAdmin) {
      menuHtml = `
                <div class="nav-group-title">Platform</div>
                <a href="super-admin-dashboard.html" class="sidebar-link ${isActive('super-admin-dashboard.html')}">${ICONS.nav.overview}<span>Admin Console</span></a>
                
                <div class="nav-group-title">Operations</div>
                <a href="scouting.html" class="sidebar-link ${isActive('scouting.html')}">${ICONS.nav.approvals}<span>Scouting Hub</span></a>
                <a href="venue-booking.html" class="sidebar-link ${isActive('venue-booking.html')}">${ICONS.nav.venue}<span>Venue Booking</span></a>
            `;
    } else if (isCoach) {
      menuHtml = `
                <div class="nav-group-title">Coaching</div>
                <a href="coach-dashboard.html" class="sidebar-link ${isActive('coach-dashboard.html') && !isActive('coach-players.html') && !isActive('coach-teams.html') && !isActive('coach-chat.html') && !isActive('coach-events.html') && !isActive('coach-tactical-board.html') && !isActive('coach-tournament-manager.html') ? 'active' : ''}">${ICONS.nav.overview}<span>Dashboard</span></a>
                <a href="coach-chat.html" class="sidebar-link ${isActive('coach-chat.html')}">${ICONS.nav.chat}<span>Messenger</span></a>
                
                <div class="nav-group-title">Squad</div>
                <a href="coach-teams.html" class="sidebar-link ${isActive('coach-teams.html')}">${ICONS.nav.teams}<span>My Teams</span></a>
                <a href="coach-players.html" class="sidebar-link ${isActive('coach-players.html')}">${ICONS.nav.players}<span>My Players</span></a>
                
                <div class="nav-group-title">Career</div>
                <a href="scouting.html" class="sidebar-link ${isActive('scouting.html')}">${ICONS.nav.training}<span>Scouting Hub</span></a>
                <a href="coach-tournament-manager.html" class="sidebar-link ${isActive('coach-tournament-manager.html')}">${ICONS.nav.trophy}<span>Tournaments</span></a>
                <a href="coach-tactical-board.html" class="sidebar-link ${isActive('coach-tactical-board.html')}">${ICONS.nav.tactics}<span>Tactical Board</span></a>
            `;
    } else if (isScout) {
      menuHtml = `
                <div class="nav-group-title">Talent Pool</div>
                <a href="scout-dashboard.html" class="sidebar-link ${isActive('scout-dashboard.html')}">${ICONS.nav.training}<span>Discover</span></a>
                
                <div class="nav-group-title">Analysis</div>
                <a href="scouting.html" class="sidebar-link ${isActive('scouting.html')}">${ICONS.nav.forms}<span>Scout Reports</span></a>
            `;
    } else {
      menuHtml = `
        <div class="nav-group-title"><span>Core Management</span></div>
        <a href="admin-dashboard.html" class="sidebar-link ${isActive('admin-dashboard.html') && !isActive('admin-members.html') && !isActive('admin-teams.html') && !isActive('admin-chat.html') && !isActive('admin-staff.html') && !isActive('admin-scout-approvals.html') && !isActive('admin-shop.html') ? 'active' : ''}" data-tooltip="Overview">${ICONS.nav.overview}<span>Overview</span></a>
        <a href="admin-members.html" class="sidebar-link ${isActive('admin-members.html')}" data-tooltip="Player List">${ICONS.nav.players}<span>Player List</span></a>
        <a href="admin-teams.html" class="sidebar-link ${isActive('admin-teams.html')}" data-tooltip="Squads & Teams">${ICONS.nav.teams}<span>Squads & Teams</span></a>
        <a href="tournament-manager.html" class="sidebar-link ${isActive('tournament-manager.html')}" data-tooltip="Event Manager">${ICONS.nav.events}<span>Event Manager</span></a>
        <a href="admin-chat.html" class="sidebar-link ${isActive('admin-chat.html')}" data-tooltip="Admin Chat">${ICONS.nav.chat}<span>Admin Chat</span></a>
        <a href="admin-staff.html" class="sidebar-link ${isActive('admin-staff.html')}" data-tooltip="Staff">${ICONS.nav.players}<span>Staff</span></a>

        <div class="nav-group-title"><span>Advanced Operations</span></div>
        <a href="admin-scout-approvals.html" class="sidebar-link ${isActive('admin-scout-approvals.html')}" data-tooltip="Scout Approvals">${ICONS.nav.approvals}<span>Scout Approvals</span></a>
        <a href="training-manager.html" class="sidebar-link ${isActive('training-manager.html')}" data-tooltip="Training Hub">${ICONS.nav.training}<span>Training Hub</span></a>
        <a href="venue-booking.html" class="sidebar-link ${isActive('venue-booking.html')}" data-tooltip="Venue Portal">${ICONS.nav.venue}<span>Venue Portal</span></a>
        <a href="league-management.html" class="sidebar-link ${isActive('league-management.html')}" data-tooltip="League Management">${ICONS.nav.trophy}<span>Leagues</span></a>
        
        <div class="nav-group-title"><span>Business & Shop</span></div>
        <a href="admin-finances.html" class="sidebar-link ${isActive('admin-finances.html')}" data-tooltip="Financials">${ICONS.nav.finance}<span>Financials</span></a>
        <a href="admin-shop.html" class="sidebar-link ${isActive('admin-shop.html')}" data-tooltip="Club Shop">${ICONS.nav.shop}<span>Club Shop</span></a>
        <a href="form-builder.html" class="sidebar-link ${isActive('form-builder.html')}" data-tooltip="Form Builder">${ICONS.nav.forms}<span>Form Builder</span></a>
        <a href="email-campaigns.html" class="sidebar-link ${isActive('email-campaigns.html')}" data-tooltip="Marketing Hub">${ICONS.nav.marketing}<span>Marketing Hub</span></a>
      `;
    }

    nav.innerHTML = menuHtml;
    this.stripHashLinks(nav);

    // Feature gating: hide Scouting until phase-2 is enabled
    const phase2Enabled =
      localStorage.getItem("feature_phase") === "phase-2" ||
      localStorage.getItem("phase2") === "true" ||
      window.FEATURE_PHASE === "phase-2";

    if (!phase2Enabled) {
      // Remove any scouting links injected above
      try {
        Array.from(nav.querySelectorAll('a[href*="scouting"]')).forEach((el) =>
          el.remove(),
        );
        Array.from(nav.querySelectorAll("a")).forEach((el) => {
          if ((el.textContent || "").toLowerCase().includes("scouting"))
            el.remove();
        });
      } catch (e) {
        console.warn("UnifiedNav: failed to remove scouting links", e);
      }
    }

    // Add a Finder section (team, tournament, event, venue) and quick 'My' links
    try {
      const finderHtml = `
        <div class="nav-group-title">Finder</div>
        <a href="club-finder.html" class="sidebar-link">${ICONS.nav.teams}<span>Team / Club Finder</span></a>
        <a href="tournament-manager.html" class="sidebar-link">${ICONS.nav.trophy}<span>Tournament Finder</span></a>
        <a href="player-dashboard.html" class="sidebar-link">${ICONS.nav.events}<span>Event Finder</span></a>
        <a href="venue-booking.html" class="sidebar-link">${ICONS.nav.venue}<span>Venue Finder</span></a>
      `;

      const myHtml = `
        <div class="nav-group-title">My</div>
        <a href="venue-booking.html" class="sidebar-link">${ICONS.nav.venue}<span>My Venues</span></a>
        <a href="tournament-manager.html" class="sidebar-link">${ICONS.nav.trophy}<span>My Tournaments</span></a>
        <a href="player-dashboard.html" class="sidebar-link">${ICONS.nav.events}<span>My Events</span></a>
      `;

      // Append finder and my sections to the end of current menu
      nav.insertAdjacentHTML("beforeend", finderHtml + myHtml);
    } catch (e) {
      console.warn("UnifiedNav: failed to append Finder/My sections", e);
    }

    // Build collapsible nav groups: group title toggles the following links
    try {
      const titles = Array.from(nav.querySelectorAll(".nav-group-title"));
      titles.forEach((title) => {
        // Add a visual toggle if missing
        if (!title.querySelector(".group-toggle")) {
          const span = document.createElement("span");
          span.className = "group-toggle";
          span.textContent = "▾";
          title.appendChild(span);
        }

        // Collect following sibling links until next title
        let next = title.nextElementSibling;
        const container = document.createElement("div");
        container.className = "nav-group";
        while (next && !next.classList.contains("nav-group-title")) {
          const sibling = next;
          next = next.nextElementSibling;
          container.appendChild(sibling);
        }
        // Insert container after the title
        title.parentNode.insertBefore(container, title.nextSibling);

        // Collapse by default when sidebar is collapsed
        const isCollapsed =
          document.body.classList.contains("sidebar-collapsed");
        container.style.display = isCollapsed ? "none" : "";

        title.addEventListener("click", () => {
          const open = container.style.display !== "none";
          container.style.display = open ? "none" : "";
          const toggle = title.querySelector(".group-toggle");
          if (toggle) toggle.textContent = open ? "▸" : "▾";
        });
      });
    } catch (e) {
      console.warn("Failed to init collapsible nav groups", e);
    }

    // Ensure header mode group pill opens the group switcher when clicked
    try {
      const groupPill = document.getElementById("header-mode-group-pill");
      if (groupPill) {
        groupPill.addEventListener("click", (e) => {
          const inst = window.__groupSwitcherInstance;
          if (inst && typeof inst.toggleDropdown === "function") {
            inst.toggleDropdown();
          } else {
            // Try to render into header slot and toggle after render
            const slot =
              document.getElementById("header-org-switcher") ||
              document.getElementById("sidebar-switcher-target");
            if (slot) {
              UnifiedNav.renderGroupSwitcher(slot);
              setTimeout(() => {
                const i = window.__groupSwitcherInstance;
                if (i && typeof i.toggleDropdown === "function")
                  i.toggleDropdown();
              }, 300);
            }
          }
        });
      }
    } catch (e) {
      console.warn("Failed to bind group pill", e);
    }

    // Show/Hide profile switcher based on mode
    const profileArea = document.getElementById("sidebar-profile-switcher");
    if (profileArea) {
      profileArea.style.display = isPlayer ? "block" : "none";
      if (isPlayer) this.renderProfileSwitcher();
    }
  },

  renderProfileSwitcher() {
    const target = document.getElementById("profile-switcher-target");
    if (!target) return;

    const user = JSON.parse(localStorage.getItem("currentUser") || "{}");
    const activePlayerId = localStorage.getItem("activePlayerId");
    const family = JSON.parse(localStorage.getItem("userFamily") || "[]");

    if (family.length === 0 && !activePlayerId) {
      target.innerHTML = `<div style="padding: 0.5rem; color: rgba(255,255,255,0.4); font-size: 0.8rem;">Single Profile Mode</div>`;
      return;
    }

    const firstName = user.firstName || user.first_name || "User";
    const initials = firstName.charAt(0).toUpperCase();

    let switcherHtml = `
        <div class="mini-profile-list" style="display: flex; flex-direction: column; gap: 4px;">
            <div class="profile-pill ${!activePlayerId ? "active" : ""}" onclick="if(typeof switchProfile !== 'undefined') switchProfile(null); else location.reload();" style="display: flex; align-items: center; gap: 0.75rem; padding: 8px 12px; border-radius: 10px; cursor: pointer; transition: all 0.2s; ${!activePlayerId ? "background: rgba(220,38,38,0.15); border: 1px solid rgba(220,38,38,0.3);" : "background: rgba(255,255,255,0.03); border: 1px solid transparent;"}">
                <div style="width: 24px; height: 24px; border-radius: 50%; background: var(--primary); display: flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: 800; color: white;">${initials}</div>
                <div style="flex: 1; font-size: 0.85rem; font-weight: 600; color: ${!activePlayerId ? "white" : "rgba(255,255,255,0.6)"}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Main Profile</div>
            </div>
    `;

    family.forEach((member) => {
      const isActive = activePlayerId == member.id;
      const mInitials = (member.first_name || "F").charAt(0).toUpperCase();
      switcherHtml += `
            <div class="profile-pill ${isActive ? "active" : ""}" onclick="if(typeof switchToChildProfile !== 'undefined') switchToChildProfile('${member.id}', '${member.club_id || ""}'); else location.reload();" style="display: flex; align-items: center; gap: 0.75rem; padding: 8px 12px; border-radius: 10px; cursor: pointer; transition: all 0.2s; ${isActive ? "background: rgba(220,38,38,0.15); border: 1px solid rgba(220,38,38,0.3);" : "background: rgba(255,255,255,0.03); border: 1px solid transparent;"}">
                <div style="width: 24px; height: 24px; border-radius: 50%; background: ${member.club_id ? "linear-gradient(135deg, #667eea, #764ba2)" : "rgba(255,255,255,0.1)"}; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: 800; color: white;">${mInitials}</div>
                <div style="flex: 1; font-size: 0.85rem; font-weight: 600; color: ${isActive ? "white" : "rgba(255,255,255,0.6)"}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${member.first_name}</div>
            </div>
        `;
    });

    switcherHtml += `</div>`;
    target.innerHTML = switcherHtml;
  },

  /**
   * Automatically fixes common mobile UX issues like missing table labels
   */
  performMobileUXSweep() {
    const isMobile = window.innerWidth <= 991;
    if (!isMobile) return;

    // 1. Process all tables to ensure card-mode works
    this.autoLabelTables();

    // 2. Add padding to main content for mobile bottom nav if it exists
    const main = document.querySelector("main, .dashboard-container");
    if (main) {
      if (
        !main.style.paddingBottom ||
        parseInt(main.style.paddingBottom) < 100
      ) {
        main.style.paddingBottom = "100px";
      }
      main.classList.add("dashboard-main");
    }

    // 3. Fix full-screen height issues on iOS
    document.documentElement.style.setProperty(
      "--vh",
      `${window.innerHeight * 0.01}px`,
    );
    window.addEventListener("resize", () => {
      document.documentElement.style.setProperty(
        "--vh",
        `${window.innerHeight * 0.01}px`,
      );
    });
  },

  updateHeaderState() {
    // 1. Synchronize the mode toggle checkbox
    const modeToggle = document.getElementById("mode-toggle");
    if (modeToggle) {
      modeToggle.checked = window.location.href.includes(
        "player-dashboard.html",
      );
      const groupLabel = document.getElementById("group-label");
      const playerLabel = document.getElementById("player-label");
      if (groupLabel && playerLabel) {
        groupLabel.classList.toggle("active", !modeToggle.checked);
        playerLabel.classList.toggle("active", modeToggle.checked);
      }
    }

    // 2. Add scroll listener for aesthetic changes
    window.addEventListener("scroll", () => {
      const header = document.querySelector(".pro-header, header.header");
      if (!header) return;

      const isDesktop =
        typeof window !== "undefined" && window.innerWidth >= 992;
      if (isDesktop) {
        if (window.scrollY > 50) {
          header.style.background = "rgba(10, 10, 12, 0.95)";
          header.style.backdropFilter = "blur(15px)";
          header.style.boxShadow = "0 4px 30px rgba(0, 0, 0, 0.3)";
        } else {
          header.style.background = "rgba(10, 10, 12, 0.8)";
          header.style.backdropFilter = "blur(10px)";
          header.style.boxShadow = "none";
        }
        return;
      }

      if (window.scrollY > 30) {
        header.style.height = "72px";
        header.style.background = "rgba(10, 10, 12, 0.98)";
      } else {
        header.style.height = "80px";
        header.style.background = "rgba(10, 10, 12, 0.8)";
      }
    });

    // 3. Ensure dynamic elements are rendered
    // Disabled redundant header switcher as it is now in the sidebar
    // this.renderHeaderSwitcher();
    this.renderHeaderNotifications();
    this.renderStripeHeaderButton();
  },
};

// Initialize on load
if (typeof window !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => UnifiedNav.init(), 100);
  });
  window.UnifiedNav = UnifiedNav; // Global access
}

/**
 * Global Notification Helper (The "Alert UI")
 * Standardizes notifications across all user types and dashboards
 */
window.showNotification = function (message, type = "info") {
  const existingNotifications = document.querySelectorAll(".notification");
  existingNotifications.forEach((n) => n.remove());

  const notification = document.createElement("div");
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-icon">
                ${type === "success" ? "✅" : type === "error" ? "❌" : "ℹ️"}
            </span>
            <span class="notification-message">${message}</span>
        </div>
        <button class="notification-close" onclick="this.parentElement.remove()">&times;</button>
    `;

  // Inject styles if missing (Premium version)
  if (!document.querySelector("#notification-styles")) {
    const styles = document.createElement("style");
    styles.id = "notification-styles";
    styles.textContent = `
            .notification {
                position: fixed;
                top: 24px;
                right: 24px;
                min-width: 320px;
                padding: 1.25rem;
                border-radius: 12px;
                color: white;
                font-weight: 500;
                z-index: 99999;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 1.5rem;
                animation: navNotificationSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
                backdrop-filter: blur(15px);
                -webkit-backdrop-filter: blur(15px);
                border: 1px solid rgba(255,255,255,0.15);
                font-family: 'Outfit', sans-serif;
            }
            .notification-content { display: flex; align-items: center; gap: 1rem; }
            .notification-icon { font-size: 1.2rem; filter: drop-shadow(0 0 5px rgba(255,255,255,0.3)); }
            .notification-message { line-height: 1.4; font-size: 0.95rem; }
            .notification-success { background: rgba(34, 197, 94, 0.95); }
            .notification-error { background: rgba(239, 68, 68, 0.95); }
            .notification-info { background: rgba(59, 130, 246, 0.95); }
            .notification-close {
                background: none; border: none; color: white; font-size: 1.5rem; cursor: pointer;
                opacity: 0.6; transition: opacity 0.2s; padding: 4px; display: flex; align-items: center; justify-content: center;
            }
            .notification-close:hover { opacity: 1; }
            @keyframes navNotificationSlideIn {
                from { transform: translateX(120%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
    document.head.appendChild(styles);
  }

  document.body.appendChild(notification);

  // Auto-dismiss after 5 seconds
  setTimeout(() => {
    if (notification && notification.parentElement) {
      notification.style.transform = "translateX(120%)";
      notification.style.opacity = "0";
      notification.style.transition = "all 0.4s ease";
      setTimeout(() => {
        if (notification && notification.parentElement) notification.remove();
      }, 400);
    }
  }, 5000);
};

// Also expose as a static method for convenience
UnifiedNav.showNotification = window.showNotification;

// 🛡️ Override native alert to use our premium UI
window.alert = function (msg) {
  if (typeof window.showNotification === "function") {
    window.showNotification(msg, "info");
  } else {
    console.warn("showNotification not available, using console:", msg);
  }
};

// 🏗️ Auto-initialize Unified Navigation System
// Initialize by default on any page that includes this script,
// unless a page explicitly sets window.UNIFIED_NAV_ENABLED = false.
if (window.UNIFIED_NAV_ENABLED !== false) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      console.log("🚀 UnifiedNav Auto-Init (DOMContentLoaded)");
      UnifiedNav.init();
    });
  } else {
    console.log("🚀 UnifiedNav Auto-Init (Immediate)");
    UnifiedNav.init();
  }
}
