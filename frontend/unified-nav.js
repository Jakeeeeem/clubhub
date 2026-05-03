// Initialization moved to the end of the file to ensure const UnifiedNav is defined

// ─── ICON LIBRARY (Apple SF Symbol-style clean SVGs) ─────────────────────────
const ICONS = {
  // UI chrome icons
  menu: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`,
  close: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
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
    finance: `<i class="nav-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M18 7c0-5.333-8-5.333-8 0"/><path d="M10 7v14"/><path d="M7 21h11"/><path d="M6 13h7"/></svg></i>`,
    shop: `<i class="nav-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg></i>`,
    settings: `<i class="nav-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></i>`,
    logout: `<i class="nav-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg></i>`,
    bibs: `<i class="nav-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M20.38 3.46L16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.62 1.96V10a8 8 0 0 0 16 0V5.42a2 2 0 0 0-1.62-1.96z"/></svg></i>`,
    academy: `<i class="nav-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/><polygon points="10 8 15 10 10 12 10 8"/></svg></i>`,
  },

  /**
   * Per-page mobile fallback conversions for tables that need custom handling
   */
  performPerPageFallbacks() {
    const file = window.location.pathname.split('/').pop() || '';

    const convertSelector = (sel) => {
      try {
        const el = document.querySelector(sel);
        if (!el) return false;
        const table = el.tagName.toLowerCase() === 'table' ? el : el.querySelector('table');
        if (!table) return false;
        // reuse earlier generic conversion logic
        const headers = Array.from((table.querySelector('thead') || table).querySelectorAll('th')).map(h => h.textContent.trim());
        const rows = Array.from((table.querySelector('tbody') || table).querySelectorAll('tr'));
        if (rows.length === 0) return false;
        const list = document.createElement('div'); list.className = 'mobile-card-list';
        rows.forEach(row => {
          const tds = Array.from(row.querySelectorAll('td'));
          if (tds.length === 0) return;
          const card = document.createElement('div'); card.className = 'mobile-card';
          tds.forEach((td, i) => {
            const label = td.getAttribute('data-label') || headers[i] || `Column ${i+1}`;
            const item = document.createElement('div'); item.className = 'row-item';
            const l = document.createElement('div'); l.className='row-label'; l.textContent = label;
            const v = document.createElement('div'); v.className='row-value'; v.innerHTML = td.innerHTML.trim();
            item.appendChild(l); item.appendChild(v); card.appendChild(item);
          });
          list.appendChild(card);
        });
        try { table.parentElement.replaceChild(list, table); return true; } catch (e) { console.warn('per-page replace failed', e); return false; }
      } catch (e) { return false; }
    };

    // Admin Scout Approvals: convert the main approvals table
    if (file.includes('admin-scout-approvals')) {
      convertSelector('#scoutApprovalsList table') || convertSelector('table');
    }

    // League management: standings & fixtures
    if (file.includes('league-management')) {
      convertSelector('.standings-table') || convertSelector('table.standings-table');
      convertSelector('.fixtures-table') || convertSelector('table.fixtures-table');
    }

    // Training manager: registrants table
    if (file.includes('training-manager')) {
      convertSelector('.registrants-table') || convertSelector('table.registrants-table');
    }

    // Admin teams & coach teams: convert team lists
    if (file.includes('admin-teams') || file.includes('coach-teams')) {
      convertSelector('#teamsList table') || convertSelector('table');
    }

    // Fallback: pages that explicitly opt-in with data-mobile-cards attribute
    try {
      document.querySelectorAll('[data-mobile-cards]').forEach(el => {
        if (el.tagName.toLowerCase() === 'table') convertSelector(el);
        else convertSelector(el);
      });
    } catch (e) { /* ignore */ }
  },
  back: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>`,
};

// --- GLOBAL LINK HANDLER ---
// Standardizes behavior across the entire platform
window.handleNavClick = function (e, page, section) {
  const isMobile = window.innerWidth < 992;
  const currentPath = window.location.pathname.toLowerCase();

  console.log(`🔗 NavClick: Target=${page} Section=${section} Current=${currentPath}`);

  // Get current filename
  const currentFile = currentPath.split('/').pop() || 'index.html';
  const targetFile = page.toLowerCase();

  // Only intercept if we are already on the target page
  if (currentFile === targetFile) {
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

// --- GLOBAL MODAL HELPERS ---
window.openModal = function (id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }
};

window.closeModal = function (id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.style.display = 'none';
    document.body.style.overflow = '';
  }
};

// Close modal when clicking outside content
window.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal')) {
    e.target.style.display = 'none';
    document.body.style.overflow = '';
  }
});
// Application phase flag - set on window or localStorage for quick toggling
const APP_PHASE =
  window.__CLUBHUB_PHASE ||
  parseInt(localStorage.getItem("clubhubPhase") || "1", 10);
// ─────────────────────────────────────────────────────────────────────────────

const UnifiedNav = {
  init() {
    // Guard: make init idempotent to avoid duplicate header injection
    if (this._initialized) {
      console.log("♻️ UnifiedNav: already initialized; skipping.");
      return;
    }
    this._initialized = true;
    console.log("🚀 UnifiedNav: Initializing standard navigation (v20260501_v2)...");

    // 🛡️ Fallback mock data injection for demo stability
    // ONLY runs if we are in demo mode AND no real data is present.
    if (localStorage.getItem('isDemoSession') === 'true' && localStorage.getItem('forceLiveData') !== 'true') {
      const existingFamily = localStorage.getItem('userFamily');
      if (!existingFamily || existingFamily === '[]') {
        const mockFamily = [
          { id: 'f1', first_name: 'Leo', last_name: 'Junior', club_id: 'demo-club-id' },
          { id: 'f2', first_name: 'Mia', last_name: 'Junior', club_id: 'demo-club-id' }
        ];
        localStorage.setItem("userFamily", JSON.stringify(mockFamily));
        console.log("🛡️ UnifiedNav: Injected mock family data for demo fallback.");
      }
    }

    // Check if we are returning from a Stripe connection in a new window
    if (window.opener && location.search.includes('stripe_return=true')) {
      console.log("✅ Stripe return detected. Refreshing parent and closing window...");
      try {
        window.opener.location.reload();
        window.close();
        return; // Stop further init in this child window
      } catch (e) {
        console.warn("Could not reload opener/close window:", e);
      }
    }
    // Guard: make init idempotent to avoid duplicate header injection
    this._initialized = true;

    // ⚡ SYSTEM RESET & SYNC: check for ?reset=system to clear all state
    const CURRENT_VERSION = "2.1.3";
    const storedVersion = localStorage.getItem("CH_UI_VERSION");
    const urlParams = new URLSearchParams(window.location.search);

    if (urlParams.get('reset') === 'system' || (storedVersion && storedVersion !== CURRENT_VERSION)) {
      console.warn("⚡ System Sync: Clearing legacy cache for version " + CURRENT_VERSION);

      // Save critical flags before clearing
      const isDemo = localStorage.getItem('isDemoSession');
      const token = localStorage.getItem('authToken');
      const user = localStorage.getItem('currentUser');

      localStorage.clear();

      // Restore session to prevent forced logout unless it's a manual reset
      if (urlParams.get('reset') !== 'system') {
        if (isDemo) localStorage.setItem('isDemoSession', isDemo);
        if (token) localStorage.setItem('authToken', token);
        if (user) localStorage.setItem('currentUser', user);
      }

      localStorage.setItem("CH_UI_VERSION", CURRENT_VERSION);

      if (urlParams.get('reset') === 'system' || (storedVersion && storedVersion !== CURRENT_VERSION)) {
        console.log("♻️ Version mismatch or manual reset, reloading...");
        window.location.href = window.location.origin + window.location.pathname;
        return;
      }
    } else if (!storedVersion) {
      localStorage.setItem("CH_UI_VERSION", CURRENT_VERSION);
    }

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

    // Auto-inject Group Switcher CSS (Merged into unified-nav.css)
    // if (!document.getElementById("group-switcher-css")) {
    //   const link = document.createElement("link");
    //   link.id = "group-switcher-css";
    //   link.rel = "stylesheet";
    //   link.href = "group-switcher.css";
    //   document.head.appendChild(link);
    // }


    try {
      // Perform Mobile UX Sweep to fix layouts
      if (typeof this.performMobileUXSweep === "function") {
        this.performMobileUXSweep();
      }
    } catch (e) {
      console.warn("Sweep failed", e);
    }

    // 0. AUTH PROTECTION: Immediate redirect if on backend but not logged in
    const token = localStorage.getItem("authToken");
    const userJson = localStorage.getItem("currentUser");
    const isDemo = localStorage.getItem("isDemoSession") === "true";
    let user = null;
    try {
      if (userJson && userJson !== "undefined" && userJson !== "null") user = JSON.parse(userJson);
    } catch (e) { }

    const path = window.location.pathname.toLowerCase();
    const fileName = path.split('/').pop() || 'index.html';
    const fullUrl = window.location.href.toLowerCase();

    const isLoggedIn = !!(token && user);
    const isDashboardPath = /dashboard|members|teams|events|finances|shop|schedule|scout|finder|finder-/.test(path) || /finder/.test(fullUrl);
    const isLanding = (fileName === "index.html" || fileName === "index" || fileName === "" || path === "/" || path === "/index.html");

    if (isDashboardPath && !isLoggedIn && !isDemo) {
      console.warn("🔒 Unauthorized access to dashboard. Redirecting...");
      document.body.style.display = "none";
      window.location.href = "login.html";
      return;
    }

    const isDesktop = window.matchMedia("(min-width: 992px)").matches;
    const dashboardMarkers = ["dashboard", "admin-", "coach-", "player-", "super-admin-", "scout-", "finder", "booking", "messenger", "finances", "schedule", "chat", "shop"];
    const hasDashboardPattern = dashboardMarkers.some(marker => fullUrl.includes(marker));
    const hasDashboardClass = document.body.classList.contains("dashboard-view") || document.body.classList.contains("app-layout");
    const hasDashboardMarker = !!(document.querySelector('.dashboard-main') || document.querySelector('.finder-container') || document.querySelector('.dashboard-container'));

    const isLandingPage = isLanding;

    // isDashboard should only be true if it matches dashboard patterns AND is NOT the landing page
    const isDashboard = !isLandingPage && (hasDashboardPattern || hasDashboardClass || hasDashboardMarker || window.UNIFIED_NAV_ENABLED === true);

    console.log("📍 UnifiedNav Detection:", {
      isDesktop,
      isDashboard,
      isLandingPage,
      isLoggedIn,
      path,
      fileName,
      hasPattern: hasDashboardPattern,
      hasClass: hasDashboardClass,
      hasMarker: hasDashboardMarker
    });

    if (localStorage.getItem('sidebarCollapsed') === 'true') {
      document.body.classList.add('sidebar-collapsed');
    }

    // Manage body classes for CSS scoping
    if (isDashboard) {
      document.body.classList.add("dashboard-view", "app-layout");
      document.body.classList.remove("landing-view");
    } else {
      document.body.classList.remove("dashboard-view", "app-layout");
      document.body.classList.add("landing-view");
    }
    // 🛡️ Context Sync: Ensure we have latest roles and family data for switcher
    if (typeof apiService !== 'undefined' && typeof apiService.getContext === 'function') {
      try {
        apiService.getContext()
          .then(context => {
            if (context && context.family) {
              localStorage.setItem("userFamily", JSON.stringify(context.family));
              this.renderFamilySwitcher();
            }
          })
          .catch(e => {
            console.warn("⚠️ UnifiedNav: Context sync failed (expected if non-admin)", e);
          });
      } catch (e) {
        console.warn("⚠️ UnifiedNav: Context sync execution failed", e);
      }
    }

    // ── STAGE 1: Core Layout ───────────────────────────────────────────
    try {
      if (!isDesktop) {
        console.log("📱 Mobile View");
        if (isDashboard) {
          if (!isLoggedIn && localStorage.getItem("isDemoSession") !== "true") {
            console.warn("🔒 Unauthenticated mobile dashboard access. Redirecting to home...");
            window.location.href = "index.html";
            return;
          }
          this.renderHeader();
          this.renderSidebar();
          this.renderBottomNav();
          // Render mobile FAB for quick actions and generic bottom sheet support
          if (typeof this.renderFAB === 'function') this.renderFAB();
          this.renderMenu();
          this.renderTopTabs();
        } else if (isLandingPage) {
          this.renderHeader(); // Unified simple header for landing too
          this.toggleSidebar(false);
        } else {
          this.renderHeader();
        }
      } else {
        console.log("💻 Desktop View");
        if (isDashboard) {
          if (!isLoggedIn && localStorage.getItem("isDemoSession") !== "true") {
            console.warn(
              "🔒 Unauthenticated dashboard access. Redirecting to home...",
            );
            window.location.href = "index.html";
            return;
          }
          this.ensureDashboardHeader();
          this.renderSidebar();
          this.renderMenu();
          this.renderTopTabs();
        } else if (isLandingPage) {
          this.ensureLandingHeader(isLoggedIn, user);
          this.toggleSidebar(false);
          const sidebar = document.getElementById("pro-sidebar");
          if (sidebar) sidebar.remove();
        } else {
          this.ensureHeaderElements();
        }
      }

      // 🚨 EMERGENCY VISIBILITY FALLBACK
      // If we are on a dashboard and after 2.5s no section is visible, force 'overview'
      if (isDashboard) {
        setTimeout(() => {
          const visibleSections = Array.from(document.querySelectorAll('.dashboard-section, .section')).filter(s => s.style.display !== 'none');
          if (visibleSections.length === 0) {
            // Quietly handle fallback to avoid console clutter
            const overview = document.getElementById('player-overview') || document.getElementById('overview') || document.querySelector('.dashboard-section');
            if (overview) overview.style.display = 'block';
            document.body.classList.remove('loading');
          }
        }, 2500);
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
      {
        name: "FamilySwitcher",
        fn: () => isLoggedIn && !isLandingPage && this.renderFamilySwitcher(),
      },
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

  /* Render a floating action button (FAB) on mobile dashboards */
  renderFAB() {
    try {
      if (document.getElementById('__ch-fab')) return;
      const isMobile = window.innerWidth <= 991;
      if (!isMobile) return;

      const fab = document.createElement('button');
      fab.id = '__ch-fab';
      fab.className = 'ch-fab mobile-only';
      fab.setAttribute('aria-label', 'Quick actions');
      fab.style.cssText = 'position:fixed;right:16px;bottom:84px;z-index:10050;display:flex;align-items:center;justify-content:center;width:56px;height:56px;border-radius:16px;background:linear-gradient(135deg,var(--primary),#b91c1c);color:#fff;border:none;box-shadow:0 12px 30px rgba(0,0,0,0.5);cursor:pointer;font-size:22px;';
      fab.innerHTML = '+';

      fab.onclick = (e) => {
        e.stopPropagation();
        if (typeof this.openPrimaryAction === 'function') {
          this.openPrimaryAction();
          return;
        }
        this.toggleSidebar(true);
      };

      document.body.appendChild(fab);
    } catch (e) {
      console.warn('renderFAB failed', e);
    }
  },

  /* Generic bottom sheet helper: content HTML string -> shown panel */
  openBottomSheet({ title = '', html = '' } = {}) {
    try {
      // Remove existing
      document.getElementById('__ch-bottom-sheet')?.remove();

      const sheet = document.createElement('div');
      sheet.id = '__ch-bottom-sheet';
      sheet.className = 'ch-bottom-sheet';
      sheet.style.cssText = 'position:fixed;inset:0;display:flex;align-items:flex-end;justify-content:center;z-index:100100;pointer-events:auto;';

      sheet.innerHTML = `
        <div class="ch-bottom-backdrop" style="position:absolute;inset:0;background:rgba(0,0,0,0.5);"></div>
        <div class="ch-bottom-panel" style="width:100%;max-width:900px;background:linear-gradient(180deg,#0f0f10,#121214);border-top-left-radius:16px;border-top-right-radius:16px;padding:1rem;box-shadow:0 -20px 60px rgba(0,0,0,0.6);">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <div style="font-weight:800;color:#fff;font-size:1rem;">${title}</div>
            <button aria-label="Close" style="background:none;border:none;color:rgba(255,255,255,0.75);font-size:20px;padding:6px;" onclick="document.getElementById('__ch-bottom-sheet')?.remove()">&times;</button>
          </div>
          <div class="ch-bottom-content" style="max-height:65vh;overflow:auto;">${html}</div>
        </div>
      `;

      document.body.appendChild(sheet);
      sheet.querySelector('.ch-bottom-backdrop').addEventListener('click', () => sheet.remove());
    } catch (e) {
      console.warn('openBottomSheet failed', e);
    }
  },

  /* Primary FAB action: show quick actions sheet */
  openPrimaryAction() {
    const html = `
      <div style="display:flex;flex-direction:column;gap:10px;">
        <button class="btn btn-primary" onclick="UnifiedNav.openCreateMemberSheet();">+ Create Member</button>
        <button class="btn btn-primary" onclick="UnifiedNav.openCreateTeamSheet();">+ Create Team</button>
        <button class="btn btn-secondary" onclick="UnifiedNav.toggleSidebar(true);">Open Menu</button>
      </div>
    `;
    this.openBottomSheet({ title: 'Quick Actions', html });
  },

  openCreateMemberSheet() {
    const html = `
      <div style="display:flex;flex-direction:column;gap:10px;">
        <label style="font-weight:700;font-size:0.85rem;color:rgba(255,255,255,0.9);">First name</label>
        <input id="__ch_new_member_first" type="text" style="padding:10px;border-radius:10px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.04);color:#fff;">
        <label style="font-weight:700;font-size:0.85rem;color:rgba(255,255,255,0.9);">Last name</label>
        <input id="__ch_new_member_last" type="text" style="padding:10px;border-radius:10px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.04);color:#fff;">
        <label style="font-weight:700;font-size:0.85rem;color:rgba(255,255,255,0.9);">Email</label>
        <input id="__ch_new_member_email" type="email" style="padding:10px;border-radius:10px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.04);color:#fff;">
        <div style="display:flex;gap:8px;margin-top:6px;">
          <button class="btn btn-secondary" onclick="document.getElementById('__ch-bottom-sheet')?.remove()">Cancel</button>
          <button class="btn btn-primary" id="__ch_create_member_btn">Create Member</button>
        </div>
      </div>
    `;

    this.openBottomSheet({ title: 'Create Member', html });

    setTimeout(() => {
      const btn = document.getElementById('__ch_create_member_btn');
      if (!btn) return;
      btn.onclick = async () => {
        const first = document.getElementById('__ch_new_member_first')?.value || '';
        const last = document.getElementById('__ch_new_member_last')?.value || '';
        const email = document.getElementById('__ch_new_member_email')?.value || '';

        // Prefer platform modal if available
        if (typeof openModal === 'function' && document.getElementById('addMemberModal')) {
          document.getElementById('__ch-bottom-sheet')?.remove();
          openModal('addMemberModal');
          return;
        }

        try {
          if (window.apiService && typeof apiService.post === 'function') {
            await apiService.post('/api/members', { first_name: first, last_name: last, email });
          }
        } catch (e) {
          console.warn('Failed to create member via API', e);
        }

        if (typeof showNotification === 'function') showNotification('Member created', 'success');
        else alert('Member created');
        document.getElementById('__ch-bottom-sheet')?.remove();
      };
    }, 60);
  },

  openCreateTeamSheet() {
    const html = `
      <div style="display:flex;flex-direction:column;gap:10px;">
        <label style="font-weight:700;font-size:0.85rem;color:rgba(255,255,255,0.9);">Team name</label>
        <input id="__ch_new_team_name" type="text" style="padding:10px;border-radius:10px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.04);color:#fff;">
        <label style="font-weight:700;font-size:0.85rem;color:rgba(255,255,255,0.9);">Age group / Notes</label>
        <input id="__ch_new_team_notes" type="text" style="padding:10px;border-radius:10px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.04);color:#fff;">
        <div style="display:flex;gap:8px;margin-top:6px;">
          <button class="btn btn-secondary" onclick="document.getElementById('__ch-bottom-sheet')?.remove()">Cancel</button>
          <button class="btn btn-primary" id="__ch_create_team_btn">Create Team</button>
        </div>
      </div>
    `;

    this.openBottomSheet({ title: 'Create Team', html });

    setTimeout(() => {
      const btn = document.getElementById('__ch_create_team_btn');
      if (!btn) return;
      btn.onclick = async () => {
        const name = document.getElementById('__ch_new_team_name')?.value || '';
        const notes = document.getElementById('__ch_new_team_notes')?.value || '';

        // Prefer platform modal if available
        if (typeof openModal === 'function' && document.getElementById('createTeamModal')) {
          document.getElementById('__ch-bottom-sheet')?.remove();
          openModal('createTeamModal');
          return;
        }

        try {
          if (window.apiService && typeof apiService.post === 'function') {
            await apiService.post('/api/teams', { name, notes });
          }
        } catch (e) {
          console.warn('Failed to create team via API', e);
        }

        if (typeof showNotification === 'function') showNotification('Team created', 'success');
        else alert('Team created');
        document.getElementById('__ch-bottom-sheet')?.remove();
      };
    }, 60);
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
          container.id = 'pro-bottom-nav-content';
          existing.appendChild(container);
        }
      } else {
        const nav = document.createElement("nav");
        nav.className = "pro-bottom-nav mobile-only unified-bottom-nav";
        const inner = document.createElement("div");
        inner.className = "bottom-nav-container";
        inner.id = 'pro-bottom-nav-content';
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

  switchFamilyProfile(id) {
    console.log("🔄 UnifiedNav: Switching family profile to:", id);
    if (!id) {
      localStorage.removeItem("activePlayerId");
    } else {
      localStorage.setItem("activePlayerId", id);
    }
    window.location.reload();
  },

  renderHeaderNotifications(container) {
    // Use provided container or fallback to standard header areas
    const target =
      container ||
      document.getElementById("notif-header-btn-container-mobile") ||
      document.getElementById("header-notifications-container") ||
      document.getElementById("notif-header-btn-container") ||
      document.querySelector(".dash-header-right") ||
      document.querySelector(".nav-right");
    if (!target) return;
    
    // Prevent duplicate injection
    if (target.querySelector(".notification-wrapper")) return;

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

      // Handle both array and object response formats
      let notifs = [];
      if (Array.isArray(res)) {
        notifs = res;
      } else if (res && Array.isArray(res.notifications)) {
        notifs = res.notifications;
      } else if (res && res.activity && Array.isArray(res.activity)) {
        notifs = res.activity;
      }

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
      document.getElementById("stripe-finance-btn-container") ||
      document.querySelector(".dash-header-right") ||
      document.querySelector(".nav-right");
    if (!target || target.querySelector(".stripe-header-btn")) return;

    // Check if user is a group (groups manage payments/events via Stripe)
    const user = JSON.parse(localStorage.getItem("currentUser") || "{}");
    const userRole = (this.getUserRole() || "").toLowerCase();
    const isAdmin = userRole === "admin" || userRole === "platform_admin" || userRole === "organization";
    // More robust dashboard check
    const isDashboard = !document.body.classList.contains("landing-view") || window.location.pathname.includes("dashboard") || window.location.pathname.includes("finder");

    // Check connection status from user object or localStorage

    // Check connection status from user object or localStorage
    const isConnected =
      user.stripe_connected ||
      user.is_stripe_connected ||
      localStorage.getItem("stripeConnected") === "true";

    // Only show Stripe for admin roles, never for players
    const isPlayerMode = (this.getCurrentMode() === 'player') || (userRole === 'player') || (userRole === 'parent');
    if (isAdmin && isDashboard && !isPlayerMode) {
      console.log("💳 renderStripeHeaderButton: Rendering for Admin on Dashboard", { isConnected, target });
      const btnColor = isConnected ? "#22c55e" : "#635bff";
      const btnText = isConnected ? "Connected" : "Stripe";
      const btnIcon = isConnected
        ? "✅"
        : `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M13.962 10.935c0-1.212-1.046-1.309-1.973-1.309-1.353 0-2.321.31-2.321.31l-.22-1.552s.934-.367 2.592-.367c2.321 0 3.737 1.026 3.737 3.056 0 3.339-4.57 3.514-4.57 5.163 0 .726.65 1.045 1.636 1.045 1.418 0 2.503-.424 2.503-.424l.23 1.572s-1.162.53-2.88.53c-2.122 0-3.538-.986-3.538-2.936.01-3.6 4.804-3.66 4.804-5.088zM4.613 14.63c.18-1.52.92-2.14 1.94-2.14 1.34 0 2.3.26 2.3.26l.24-1.56s-1.25-.45-2.79-.45C4.213 10.74 3 12.18 3 14.73c0 3.03 2.1 3.54 4.13 3.54 1.7 0 3.1-.48 3.1-.48l.24-1.61s-1.45.66-3.1.66c-1.8 0-2.91-.71-2.757-2.21zm10.79 3.09h1.91v-6.85h-1.91v6.85zm0-8.54h1.91V7.27h-1.91v1.91zm2.34 8.54h1.91v-6.85h-1.91v6.85zm0-8.54h1.91V7.27h-1.91v1.91zm2.34 8.54h1.91v-3.7c0-2.02.8-3.15 2.14-3.15.22 0 .43.02.61.06v-1.74c-.17-.03-.38-.05-.61-.05-1.55 0-2.14.73-2.14.73V10.87h-1.91v6.85z"/>
            </svg>`;

      const stripeBtnHTML = `
        <div class="stripe-header-btn" style="margin-right: 0.5rem;">
          <button class="btn btn-small" onclick="UnifiedNav.manageStripeAccount()" style="background: ${btnColor}; color: white; border: none; padding: 6px 12px; border-radius: 8px; font-size: 0.75rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; transition: all 0.2s; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
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
      <button class="desktop-sidebar-toggle desktop-only" onclick="window.UnifiedNav.toggleDesktopSidebar()" style="
        background: rgba(255,255,255,0.06); 
        border: 1px solid rgba(255,255,255,0.12); 
        color: white; 
        width: 38px; 
        height: 38px; 
        border-radius: 50%; 
        display: flex; 
        align-items: center; 
        justify-content: center; 
        cursor: pointer; 
        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        z-index: 100;
        flex-shrink: 0;
      " onmouseover="this.style.background='rgba(255,255,255,0.12)'; this.style.transform='scale(1.05)';" onmouseout="this.style.background='rgba(255,255,255,0.06)'; this.style.transform='scale(1)';" id="desktop-toggle-btn">
        <span id="desktop-toggle-icon" style="display: flex; align-items: center; justify-content: center;">${ICONS.menu}</span>
      </button>
    `;

    // Insert at the beginning of sidebar header
    target.insertAdjacentHTML("afterbegin", toggleHTML);

    // Sync icon
    const isCollapsed = document.body.classList.contains("sidebar-collapsed");
    const icon = document.getElementById("desktop-toggle-icon");
    if (icon) icon.innerHTML = isCollapsed ? ICONS.menu : ICONS.close;
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
    document.body.classList.add("dashboard-view");

    // FORCE RE-RENDER if header structure is old
    const hasNewStructure = header.querySelector('.mobile-header-active');
    if (header.innerHTML.trim() !== "" && hasNewStructure) {
      this.renderHeaderSwitcher();
      this.renderFamilySwitcher();
      this.renderHeaderNotifications();
      return;
    }

    const user = JSON.parse(localStorage.getItem("currentUser") || "{}");
    const name = (user.firstName || user.first_name || user.name || "User").split(" ")[0];
    const initial = name.charAt(0).toUpperCase();
    const userRole = this.getUserRole();

    header.innerHTML = `
      <div class="nav-container">
        <!-- 📱 Mobile Header: Back | Centered Logo | Notifications + Burger -->
        <div class="mobile-header-active mobile-only" style="display: flex; width: 100%; align-items: center; justify-content: space-between; height: 100%; position: relative;">
          <div class="header-section" style="width: 50px; display: flex; align-items: center; flex-shrink: 0;">
            <button class="back-button" onclick="window.history.back()" style="border:1px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.05); color:white; width:38px; height:38px; border-radius:10px; display:flex; align-items:center; justify-content:center; cursor:pointer;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            </button>
          </div>
          
          <div class="header-section" style="position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); display: flex; align-items: center; justify-content: center; gap: 0.5rem; cursor: pointer;" onclick="window.location.href='index.html'">
            <img src="images/logo.png" alt="ClubHub" style="height: 26px; filter: drop-shadow(0 0 8px rgba(220,67,67,0.4)); flex-shrink:0;" onerror="this.style.display='none'">
            <span style="font-weight: 800; font-size: 1rem; color: white; letter-spacing: -0.4px; white-space: nowrap;">ClubHub</span>
          </div>

          <div class="header-section" style="display: flex; align-items: center; gap: 0.6rem; flex-shrink: 0;">
            <div id="notif-header-btn-container-mobile"></div>
            <div class="side-menu-trigger" onclick="UnifiedNav.toggleSidebar(true)" style="width: 42px; height: 42px; display: flex; align-items: center; justify-content: center; background: rgba(220, 38, 38, 0.15); border-radius: 12px; border: 1px solid rgba(220, 38, 38, 0.25); cursor: pointer; color: white;">
                ${ICONS.menu}
            </div>
          </div>
        </div>

        <!-- 💻 Desktop Header: Logo + Group Switcher | Actions | Profile -->
        <div class="desktop-header-active desktop-only" style="display: flex; width: 100%; align-items: center; justify-content: space-between; height: 100%;">
          <div class="dash-header-left" style="display: flex; align-items: center; gap: 2rem;">
            <div class="logo-area" style="display: flex; align-items: center; gap: 0.75rem; cursor: pointer;" onclick="window.location.href='dashboard-new.html'">
                <img src="images/logo.png" alt="ClubHub" style="height: 32px;" onerror="this.style.display='none'">
                <span class="logo-text" style="font-weight: 800; font-size: 1.25rem; color: white;">ClubHub</span>
            </div>
            <div id="header-group-switcher-container" class="header-org-switcher-wrapper" style="display:flex; align-items:center;"></div>
          </div>

          <div class="dash-header-right" style="display:flex; align-items:center; gap:1.25rem;">
            <div class="mode-toggle-container">
                <div class="header-mode-toggle" style="display:flex; background:rgba(255,255,255,0.05); padding:4px; border-radius:999px; border:1px solid rgba(255,255,255,0.08);">
                    <div class="mode-pill ${this.getCurrentMode() === 'group' ? 'active' : ''}" onclick="UnifiedNav.switchMode('group')" style="padding:0.4rem 1rem; border-radius:999px; font-size:0.75rem; font-weight:700; cursor:pointer;">Groups Hub</div>
                    <div class="mode-pill ${this.getCurrentMode() === 'player' ? 'active' : ''}" onclick="UnifiedNav.switchMode('player')" style="padding:0.4rem 1rem; border-radius:999px; font-size:0.75rem; font-weight:700; cursor:pointer;">Player Pro</div>
                </div>
            </div>

            ${userRole === 'platform_admin' ? `
              <a href="super-admin-dashboard.html" style="color:var(--primary); text-decoration:none; font-size:0.8rem; font-weight:700; display:flex; align-items:center; gap:0.4rem; padding:0.4rem 0.8rem; background:rgba(220,38,38,0.1); border-radius:8px; border:1px solid rgba(220,38,38,0.2);">
                <span>Console</span>
              </a>
            ` : ''}
            
            <div id="stripe-header-btn-container" style="display:flex;"></div>
            <div id="notif-header-btn-container" style="display:flex;"></div>
            
            <div class="user-action-group" style="display:flex; align-items:center; gap:0.5rem; background:rgba(255,255,255,0.03); padding:4px; border-radius:999px; border:1px solid rgba(255,255,255,0.06);">
                <div id="header-family-switcher-container" style="display:${(this.getCurrentMode() === 'player' || userRole === 'player' || userRole === 'parent') ? 'flex' : 'none'}; align-items:center;"></div>
                
                <div class="user-profile-trigger" id="profileTrigger" onclick="UnifiedNav.toggleProfileDropdown(true)"
                    style="display:${(this.getCurrentMode() === 'player' || userRole === 'player' || userRole === 'parent') ? 'none' : 'flex'}; align-items:center; gap:0.65rem; cursor:pointer; transition:all 0.2s; padding: 0 0.75rem 0 0.75rem;">
                    <div class="user-avatar-sm" style="width:30px; height:30px; border-radius:50%; background:var(--primary); display:flex; align-items:center; justify-content:center; font-weight:700; font-size:0.8rem; flex-shrink:0; border:1.5px solid rgba(255,255,255,0.2);">${initial}</div>
                    <span class="user-name-text" style="font-size:0.8rem; font-weight:700; color:white;">${name}</span>
                    <svg class="group-switcher-arrow" width="8" height="8" viewBox="0 0 12 12" fill="none" style="opacity: 0.5;"><path d="M2 4L6 8L10 4" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
                </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Sidebar must render BEFORE switcher components on mobile so containers exist
    this.renderSidebar();

    // Call renderers immediately after HTML injection to ensure switchers appear in their targets
    this.renderHeaderSwitcher();
    this.renderFamilySwitcher();
    this.updateModeUI();

    // Inject Stripe button and notifications into their containers
    const stripeContainer = document.getElementById("stripe-header-btn-container");
    if (stripeContainer) this.renderStripeHeaderButton(stripeContainer);

    const notifContainer = document.getElementById("notif-header-btn-container");
    if (notifContainer) this.renderHeaderNotifications(notifContainer);

    const mobileNotifContainer = document.getElementById("notif-header-btn-container-mobile");
    if (mobileNotifContainer) this.renderHeaderNotifications(mobileNotifContainer);

    this.syncUserData();
    this.renderTopTabs();
  },

  ensureHeaderElements() {
    this.ensureDashboardHeader();
  },

  renderSidebar() {
    try {
      const existingOverlay = document.getElementById("sidebar-overlay");

      console.log("🏗️ Rendering Sidebar...");

      // Ensure overlay exists
      if (!existingOverlay) {
        const ov = document.createElement("div");
        ov.id = "sidebar-overlay";
        ov.className = "sidebar-overlay";
        document.body.appendChild(ov);
        try { ov.style.removeProperty('display'); } catch (e) { }
      }

      const url = window.location.href;
      let user = {};
      try {
        const userData = localStorage.getItem("currentUser");
        if (userData && userData !== "undefined" && userData !== "null") {
          user = JSON.parse(userData);
        }
      } catch (e) { }

      const userRole = localStorage.getItem("userType") || "";
      const isPlayer = url.includes("player-dashboard.html") || userRole === "player";

      // Build inner HTML for aside
      const asideInner = `
                <!-- Slim header: logo + close -->
                <div class="sidebar-header" style="padding: 0.85rem 1.25rem; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; flex-direction: column; gap: 0.85rem; flex-shrink: 0;">
                    <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.6rem;">
                        <div style="display: flex; align-items: center; gap: 0.6rem; cursor: pointer;" onclick="window.location.href='index.html'">
                            <img src="images/logo.png" alt="ClubHub" style="height: 24px; filter: drop-shadow(0 0 8px rgba(220,67,67,0.3));" onerror="this.style.display='none'">
                            <span class="logo-text" style="font-weight: 800; font-size: 1.05rem; color: white; letter-spacing: -0.4px;">ClubHub</span>
                        </div>
                        ${window.innerWidth < 992 ? `
                        <button onclick="UnifiedNav.toggleSidebar(false)" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: white; width: 32px; height: 32px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; flex-shrink: 0;">&times;</button>
                        ` : ''}
                    </div>
                </div>

                <!-- Single scrollable area: nav + logout -->
                <div class="sidebar-scroll-area" style="flex: 1; overflow-y: auto; overflow-x: hidden; display: flex; flex-direction: column; -webkit-overflow-scrolling: touch;">

                    ${window.innerWidth < 992 ? `
                    <div style="display: flex; flex-direction: column; gap: 0.75rem; padding: 0.85rem 1.25rem; border-bottom: 1px solid rgba(255,255,255,0.05);">
                        <div class="mode-pills" style="display: flex; background: rgba(255,255,255,0.05); padding: 4px; border-radius: 100px; border: 1px solid rgba(255,255,255,0.08);">
                            <button onclick="UnifiedNav.switchMode('group')" class="mode-pill ${this.getCurrentMode() === 'group' ? 'active' : ''}" style="flex: 1; border: none; background: ${this.getCurrentMode() === 'group' ? '#fff' : 'transparent'}; color: ${this.getCurrentMode() === 'group' ? '#000' : '#fff'}; font-size: 0.65rem; font-weight: 800; padding: 8px; border-radius: 100px; cursor: pointer; transition: all 0.2s; text-transform: uppercase;">Groups Hub</button>
                            <button onclick="UnifiedNav.switchMode('player')" class="mode-pill ${this.getCurrentMode() === 'player' ? 'active' : ''}" style="flex: 1; border: none; background: ${this.getCurrentMode() === 'player' ? '#fff' : 'transparent'}; color: ${this.getCurrentMode() === 'player' ? '#000' : '#fff'}; font-size: 0.65rem; font-weight: 800; padding: 8px; border-radius: 100px; cursor: pointer; transition: all 0.2s; text-transform: uppercase;">Player Pro</button>
                        </div>
                        <div style="display: grid; gap: 0.75rem;">
                            <div id="sidebar-switcher-target" style="width: 100%;"></div>
                            <div id="sidebar-family-switcher-container" class="mobile-only" style="width: 100%;"></div>
                        </div>
                    </div>
                    ` : ''}

                    <!-- Nav Links -->
                    <div id="sidebar-nav-content" class="sidebar-nav" style="padding: 0.5rem; flex: 1;">
                        <!-- Populated by renderMenu() -->
                    </div>

                    <!-- Logout at the bottom of the scroll area (not sticky) -->
                    <div style="padding: 1rem 1.25rem 2rem; margin-top: auto; border-top: 1px solid rgba(255,255,255,0.05);">
                        <a href="#" class="sidebar-link" onclick="UnifiedNav.logout(); return false;" style="margin:0; justify-content: center; padding: 0.75rem; background: rgba(239, 68, 68, 0.05); border: 1px solid rgba(239, 68, 68, 0.15); border-radius: 8px; color: #ef4444; font-size: 0.85rem; font-weight: 600;">
                            <div style="width:16px; height:16px; display:flex; align-items:center;">${ICONS.nav.logout}</div> <span style="font-size: 0.85rem; margin-left: 0.5rem;">Logout</span>
                        </a>
                    </div>
                </div>
            `;

      const existingSidebar = document.getElementById("pro-sidebar") || document.querySelector(".pro-sidebar");

      if (existingSidebar) {
        if (!existingSidebar.id) existingSidebar.id = "pro-sidebar";
        existingSidebar.innerHTML = asideInner;
        // ensure any placeholder inline display does not block visibility when `.active` is toggled
        try { existingSidebar.style.removeProperty('display'); } catch (e) { }
      } else {
        const aside = document.createElement("aside");
        aside.className = "pro-sidebar";
        aside.id = "pro-sidebar";
        aside.innerHTML = asideInner;
        document.body.appendChild(aside);
      }

      this.initSidebarSwitcher();
      this.renderMenu();
    } catch (err) {
      console.error("❌ Error rendering sidebar:", err);
    }
  },

  initSidebarSwitcher() {
    const groupTarget = document.getElementById("sidebar-switcher-target");
    const familyTarget = document.getElementById("sidebar-family-switcher-container");

    if (groupTarget) {
      if (typeof GroupSwitcher !== "undefined") {
        GroupSwitcher.render(groupTarget);
      } else {
        const script = document.createElement("script");
        script.src = "group-switcher.js";
        script.onload = () => {
          if (typeof GroupSwitcher !== "undefined")
            GroupSwitcher.render(groupTarget);
        };
        document.head.appendChild(script);
      }
    }

    if (familyTarget) {
      this.renderFamilySwitcher(familyTarget);
    }
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

  renderFamilySwitcher(targetContainer) {
    const isMobile = window.innerWidth < 992;

    // Logic: If we are on desktop, only render in the header. 
    // If we are on mobile, only render in the sidebar (unless a targetContainer is explicitly provided).
    const container = targetContainer ||
      (isMobile ? document.getElementById("sidebar-family-switcher-container") : document.getElementById("header-family-switcher-container")) ||
      document.getElementById("family-switcher-target");

    if (!container) {
      console.warn("⚠️ Family Switcher: No target container found (header/sidebar/manual).");
      return;
    }

    // Prevent rendering in sidebar on desktop
    if (!isMobile && container.id === "sidebar-family-switcher-container") {
      container.style.display = "none";
      return;
    }

    const user = JSON.parse(localStorage.getItem("currentUser") || "{}");
    const modeNow = this.getCurrentMode();
    const roleNow = (this.getUserRole() || '').toLowerCase();
    const isPlayerView = modeNow === 'player' || roleNow === 'player' || roleNow === 'parent';
    const family = JSON.parse(localStorage.getItem("userFamily") || "[]");
    const isDemo = localStorage.getItem('isDemoSession') === 'true';

    console.log(`🔍 Family Switcher Check: mode=${modeNow}, role=${roleNow}, isPlayerView=${isPlayerView}, familyCount=${family.length}`);

    // In Player mode, we should ALWAYS show the switcher to indicate context
    if (!isPlayerView) {
      container.innerHTML = "";
      container.style.display = "none";
      return;
    }

    container.style.display = "flex";
    const activePlayerId = localStorage.getItem("activePlayerId");

    const currentName = activePlayerId
      ? (family.find(f => f.id == activePlayerId)?.first_name || "Profile")
      : (user.firstName || user.first_name || "Main");

    const triggerStyles = isMobile
      ? "display: flex; align-items: center; justify-content: space-between; width: 100%; gap: 0.75rem; padding: 0.6rem 0.85rem; background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; cursor: pointer; color: white; transition: all 0.2s; font-family: 'Inter', sans-serif;"
      : "display: flex; align-items: center; gap: 0.6rem; padding: 0.35rem 0.75rem; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255,255,255,0.15); border-radius: 999px; cursor: pointer; color: white; transition: all 0.2s; font-family: 'Inter', sans-serif;";

    const dropdownPos = isMobile
      ? "bottom: calc(100% + 12px); left: 0; right: 0; border-radius: 12px;"
      : "top: calc(100% + 12px); right: 0; width: 220px; border-radius: 12px;";

    container.innerHTML = `
        <div class="family-switcher" style="position: relative; ${isMobile ? 'width: 100%;' : ''}" id="familySwitcher">
            <button class="family-trigger" onclick="event.stopPropagation(); document.getElementById('familyDropdown').classList.toggle('open')" style="${triggerStyles}">
                <div style="display: flex; align-items: center; gap: ${isMobile ? '0.75rem' : '0.6rem'};">
                    <div style="width: 24px; height: 24px; border-radius: 50%; background: #4f46e5; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 800; border: 1px solid rgba(255,255,255,0.2);">
                        ${activePlayerId ? (family.find(f => f.id == activePlayerId)?.first_name?.charAt(0) || "P") : (user.firstName?.charAt(0) || "U")}
                    </div>
                    <div style="display: flex; flex-direction: column; align-items: flex-start;">
                        ${isMobile ? '<span style="font-size: 0.65rem; color: rgba(255,255,255,0.4); text-transform: uppercase; font-weight: 800; letter-spacing: 0.5px;">Switch Profile</span>' : ''}
                        <span class="switcher-label" style="font-size: 0.85rem; font-weight: 600; color: #fff; letter-spacing: -0.1px;">${currentName}</span>
                    </div>
                </div>
                <svg class="group-switcher-arrow" width="10" height="10" viewBox="0 0 12 12" fill="none" style="opacity: 0.5; transition: transform 0.3s; margin-left: ${isMobile ? '0' : '4px'};"><path d="M2 4L6 8L10 4" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
            </button>
            <div class="family-dropdown" id="familyDropdown" style="position: absolute; ${dropdownPos} background: #111; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 20px 40px rgba(0,0,0,0.7); z-index: 1100; display: none; padding: 0.75rem; backdrop-filter: blur(30px);">
                <div style="font-size: 0.65rem; color: rgba(255,255,255,0.3); padding: 0.25rem 0.5rem; text-transform: uppercase; letter-spacing: 1.2px; font-weight: 800; margin-bottom: 0.5rem;">Switch Profile</div>
                <div class="family-item ${!activePlayerId ? 'active' : ''}" onclick="UnifiedNav.switchProfile(null)" style="padding: 0.65rem; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 0.75rem; margin-top: 0.25rem; font-size: 0.85rem; transition: all 0.2s;">
                    <div style="width: 24px; height: 24px; border-radius: 50%; background: var(--primary); display: flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: 700;">${(user.firstName || 'U').charAt(0)}</div>
                    <span style="font-weight: 500;">Main Profile</span>
                </div>
                ${family.map(f => `
                    <div class="family-item ${activePlayerId == f.id ? 'active' : ''}" onclick="UnifiedNav.switchToChildProfile('${f.id}', '${f.club_id || ""}')" style="padding: 0.65rem; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 0.75rem; margin-top: 0.25rem; font-size: 0.85rem; transition: all 0.2s;">
                        <div style="width: 24px; height: 24px; border-radius: 50%; background: #4f46e5; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: 700;">${(f.first_name || 'F').charAt(0)}</div>
                        <span style="font-weight: 500;">${f.first_name}</span>
                    </div>
                `).join('')}
                <div style="border-top:1px solid rgba(255,255,255,0.08);margin-top:0.5rem;padding-top:0.5rem; display: flex; flex-direction: column; gap: 0.25rem;">
                    <div onclick="document.getElementById('familyDropdown')?.classList.remove('open'); if(typeof openAddChildModal==='function'){openAddChildModal();}else{window.location.href='player-dashboard.html#family';}" style="padding:0.65rem;border-radius:8px;cursor:pointer;display:flex;align-items:center;gap:0.75rem;font-size:0.82rem;color:var(--primary);border:1px dashed rgba(220,38,38,0.2); transition:all 0.2s;">
                        <div style="width:24px;height:24px;border-radius:50%;background:rgba(220,38,38,0.1);display:flex;align-items:center;justify-content:center;font-size:0.9rem;font-weight:800;">+</div>
                        <span style="font-weight: 600;">Add Family Member</span>
                    </div>
                </div>
            </div>
        </div>
        <style>
            .family-dropdown.open { display: block !important; animation: ${isMobile ? 'slideUp' : 'slideDown'} 0.2s ease-out; }
            .family-item:hover { background: rgba(255,255,255,0.06) !important; transform: translateX(2px); }
            .family-item.active { background: rgba(220,38,38,0.1) !important; border: 1px solid rgba(220,38,38,0.2) !important; }
            .family-trigger:hover { background: rgba(255,255,255,0.08) !important; border-color: rgba(255,255,255,0.2) !important; }
            .family-trigger:hover .group-switcher-arrow { transform: translateY(2px); opacity: 1 !important; }
            
            @keyframes slideUp {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            @keyframes slideDown {
                from { opacity: 0; transform: translateY(-10px); }
                to { opacity: 1; transform: translateY(0); }
            }
        </style>
    `;

    // Add outside click listener
    if (!this._familyClickBound) {
      document.addEventListener('click', (e) => {
        const dropdown = document.getElementById('familyDropdown');
        const trigger = document.querySelector('.family-trigger');
        if (dropdown && dropdown.classList.contains('open') && !dropdown.contains(e.target) && !trigger.contains(e.target)) {
          dropdown.classList.remove('open');
        }
      });
      this._familyClickBound = true;
    }
  },

  async switchProfile(id) {
    console.log("🔄 UnifiedNav: Switching profile to:", id);
    const user = JSON.parse(localStorage.getItem("currentUser") || "{}");
    if (!id) {
      localStorage.removeItem("activePlayerId");
      delete user.activePlayerId;
    } else {
      localStorage.setItem("activePlayerId", id);
      user.activePlayerId = id;
    }
    localStorage.setItem("currentUser", JSON.stringify(user));

    // If on player dashboard, use its native switcher if available
    if (typeof window.switchProfile === 'function') {
      return window.switchProfile(id);
    }

    // Otherwise reload or redirect
    if (window.location.href.includes('player-dashboard.html')) {
      window.location.reload();
    } else {
      window.location.href = 'player-dashboard.html';
    }
  },

  async switchToChildProfile(childId, childClubId) {
    console.log(`🔄 UnifiedNav: Switching to child: ${childId}, club: ${childClubId}`);

    const user = JSON.parse(localStorage.getItem("currentUser") || "{}");
    const currentGroupId = user.groupId || user.currentGroupId;

    if (childClubId && currentGroupId !== childClubId) {
      console.log(`🔄 UnifiedNav: Child is in diff group (${childClubId}). Switching group...`);
      try {
        if (typeof apiService !== 'undefined') {
          const res = await apiService.makeRequest("/auth/switch-group", {
            method: "POST",
            body: JSON.stringify({ organizationId: childClubId })
          });

          if (res.success) {
            if (res.token) localStorage.setItem("authToken", res.token);
            const updatedUser = { ...user, groupId: childClubId, activePlayerId: childId };
            if (res.user) Object.assign(updatedUser, res.user, { activePlayerId: childId });
            localStorage.setItem("currentUser", JSON.stringify(updatedUser));
          }
        }
      } catch (err) {
        console.error("Failed to switch to child's group:", err);
        // Fallback to local change
        user.activePlayerId = childId;
        localStorage.setItem("activePlayerId", childId);
        localStorage.setItem("currentUser", JSON.stringify(user));
      }
    } else {
      user.activePlayerId = childId;
      localStorage.setItem("activePlayerId", childId);
      localStorage.setItem("currentUser", JSON.stringify(user));
    }

    // If on player dashboard, use its native switcher if available
    if (typeof window.switchToChildProfile === 'function') {
      return window.switchToChildProfile(childId, childClubId);
    }

    // Otherwise redirect to player dashboard with context
    window.location.href = 'player-dashboard.html';
  },

  renderHeaderSwitcher() {
    const isMobile = window.innerWidth < 992;
    
    // 1. Desktop Header Switcher (Left side) - ONLY on desktop
    if (!isMobile) {
      const hContainer = document.getElementById("header-group-switcher-container") ||
        document.getElementById("header-org-switcher");

      if (hContainer && !hContainer.__groupSwitcherInstance) {
        this.renderGroupSwitcher(hContainer);
      }
    }

    // 2. Mobile Sidebar Switcher - ALWAYS on mobile
    const sContainer = document.getElementById("sidebar-switcher-target");
    if (sContainer && !sContainer.__groupSwitcherInstance) {
      this.renderGroupSwitcher(sContainer);
    }
  },


  /**
   * Adds essential mobile buttons (Hamburger) to any header
   */
  renderMobileHeaderElements() {
    const header = document.querySelector("header.header, .pro-header");
    if (!header) return;

    // Mobile Menu Button (Hamburger)
    if (!document.getElementById('side-menu-trigger')) {
      const trigger = document.createElement('div');
      trigger.id = "side-menu-trigger";
      trigger.className = "side-menu-trigger mobile-only";
      trigger.innerHTML = ICONS.menu;
      trigger.onclick = () => UnifiedNav.toggleSidebar(true);

      // Insert at the beginning of the header logo area or before nav-buttons
      const header = document.querySelector('.pro-header, .header');
      if (header) {
        const navButtons = header.querySelector('.nav-buttons');
        if (navButtons) {
          header.insertBefore(trigger, navButtons.previousSibling || navButtons);
        } else {
          header.prepend(trigger);
        }
      }
    }
  },

  /**
   * Unified Header
   * Transforms ANY existing header into the standardized ClubHub bar
   */
  renderHeader() {
    const header = document.querySelector("header.header, .pro-header");
    if (!header) return;

    const token = localStorage.getItem("authToken");
    const user = JSON.parse(localStorage.getItem("currentUser") || "{}");
    const isLoggedIn = !!(token && user.id);

    header.classList.add("pro-header", "unified-header");

    const isMobile = window.innerWidth < 992;
    if (isMobile) {
        // Strict Mobile Layout
        header.innerHTML = `
            <div class="nav-container header-content-unified" style="display:flex; align-items:center; justify-content:space-between; width:100%; height:100%; position:relative; gap:0.75rem;">
                <div class="header-section section-left" style="display:flex; align-items:center; gap:0.5rem;">
                    <button class="back-button" onclick="window.history.back()" style="border:none; background:rgba(255,255,255,0.05); color:white; width:40px; height:40px; border-radius:12px; display:flex; align-items:center; justify-content:center; cursor:pointer; border:1px solid rgba(255,255,255,0.12);">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                    </button>
                    <div id="backend-header-button-container" style="display:flex; align-items:center; gap:0.4rem;"></div>
                </div>

                <div class="header-section section-center" onclick="window.location.href='index.html'" style="position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); display:flex; align-items:center; justify-content:center; gap:0.45rem; cursor:pointer; pointer-events:auto; min-width:0; max-width:calc(100% - 160px);">
                    <img src="images/logo.png" alt="ClubHub" style="height:24px; filter:drop-shadow(0 0 6px rgba(220,67,67,0.35));" onerror="this.style.display='none'">
                    <span style="font-weight:800; font-size:1rem; color:white; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:160px; display:inline-block;">ClubHub</span>
                </div>

                <div class="header-section section-right" style="display:flex; align-items:center; gap:0.65rem;">
                  <div id="notif-header-btn-container-mobile" style="display:flex; align-items:center;"></div>
                  <button class="side-menu-trigger" onclick="UnifiedNav.toggleSidebar(true)" style="width:44px; height:44px; display:flex; align-items:center; justify-content:center; background:rgba(220,38,38,0.12); border-radius:12px; border:1px solid rgba(220,38,38,0.22); cursor:pointer; color:white;">
                    ${ICONS.menu}
                  </button>
                </div>
            </div>
        `;
    } else {
        // Strict Desktop Layout
        header.innerHTML = `
            <div class="nav-container" style="display: flex; align-items: center; justify-content: space-between; width: 100%; padding: 0 1rem; height: 100%;">
                <div class="dash-header-left" style="display: flex; align-items: center; gap: 2rem;">
                    <div class="logo-area" style="display: flex; align-items: center; gap: 0.75rem; cursor: pointer;" onclick="window.location.href='index.html'">
                        <img src="images/logo.png" alt="ClubHub" style="height: 32px;" onerror="this.style.display='none'">
                        <span class="logo-text" style="font-weight: 800; font-size: 1.25rem; color: white;">ClubHub</span>
                    </div>
                    <div id="header-group-switcher-container" class="header-org-switcher-wrapper" style="display:flex; align-items:center;"></div>
                </div>

                <div class="header-right" style="display: flex; align-items: center; justify-content: flex-end; gap: 1.25rem;">
                  <!-- Backwards-compatible notification/action containers -->
                  <div id="header-notifications-container" style="display:flex;"></div>
                  <div id="notif-header-btn-container" style="display:flex;"></div>
                  <div id="header-family-switcher-container"></div>
                    
                    ${!isLoggedIn ? `
                        <a href="login.html" class="btn btn-secondary btn-small">Login</a>
                    ` : `
                        <div class="user-profile-trigger" id="profileTrigger" onclick="UnifiedNav.toggleProfileDropdown(true)" style="display: flex; align-items: center; cursor: pointer; gap: 0.75rem;">
                            <div class="user-details" style="text-align: right;">
                                <span class="user-name" style="display: block; font-weight: 700; font-size: 0.85rem; color: white;">${user ? user.first_name : 'User'}</span>
                            </div>
                            <div class="user-avatar-sm" style="width: 34px; height: 34px; border: 1px solid rgba(255,255,255,0.15); font-size: 0.85rem; background: var(--primary); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700;">${user ? (user.first_name ? user.first_name[0] : '?') : '?'}</div>
                        </div>
                    `}
                </div>
            </div>
        `;
    }

    // Deferred rendering for switchers to ensure DOM is ready
    requestAnimationFrame(() => {
        this.renderHeaderSwitcher();
        this.renderFamilySwitcher();
        this.renderHeaderNotifications();
        this.updateModeUI();
        this.renderTopTabs();
        this.checkStripeStatus();
    });
  },

  /**
   * Render Swipable Top Tabs (Headlines)
   * Inspired by Threads/Premium app UX
   */
  renderTopTabs() {
    return; // Disabled: we are using sidebar links instead of top tabs.
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
    const isDashboard = url.includes("dashboard") || url.includes("finder") || url.includes("chat");

    if (!isDashboard) return;

    let tabs = [];
    if (isPlayer) {
      tabs = [
        { id: "overview", label: "Overview", icon: "📊" },
        { id: "teams", label: "My Teams", icon: "⚽" },
        { id: "club-messenger", label: "Chat", icon: "💬" },
        { id: "notifications", label: "Activity", icon: "🔔" },
        { id: "my-clubs", label: "Groups", icon: "🏰" },
        { id: "venue-booking", label: "My Venues", icon: "📍" },
        { id: "league-management", label: "My Tournaments", icon: "🏆" },
        { id: "event-finder", label: "My Events", icon: "📅" },
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
        { id: "messenger", label: "Messenger", icon: "💬" },
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
      <div id="top-headline-tabs" class="top-headline-tabs mobile-only">
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
    document.body.classList.add("has-top-tabs");

    // Ensure horizontal scrolling is enabled and active tab is visible
    setTimeout(() => {
      const activeTab = document.querySelector('.headline-tab.active');
      if (activeTab) {
        activeTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }, 100);
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

  async manageStripeAccount() {
    try {
      if (typeof apiService !== 'undefined') {
        showLoading(true);
        const status = await apiService.getStripeConnectStatus();

        let resp;
        if (status && status.is_connected) {
          // Get the branded management login link
          resp = await apiService.getStripeManageLink();
        } else {
          // Get the branded ClubHub connection link
          resp = await apiService.getStripeOnboardLink();
        }

        if (resp && resp.url) {
          console.log("🚀 Opening Live Branded Stripe Portal in new window:", resp.url);

          // Open in new window/tab
          window.open(resp.url, '_blank');

          // Optional: Provide visual feedback that a window was opened
          showNotification("Stripe onboarding opened in new tab.", "info");
          return;
        }
      }
      showNotification("Stripe service is not responding. Please try again later.", "error");
    } catch (err) {
      console.error("Stripe Error:", err);
      showNotification("Connection to Stripe failed. Please ensure you are logged in.", "error");
    } finally {
      showLoading(false);
    }
  },

  async checkStripeStatus() {
    const btn = document.getElementById("stripe-connect-btn") || document.querySelector(".stripe-header-btn button");
    if (!btn || typeof apiService === "undefined") return;

    try {
      const status = await apiService.getStripeConnectStatus();
      if (status && status.is_connected) {
        btn.style.backgroundColor = "#22c55e"; // Success Green
        btn.style.color = "white";
        btn.style.borderColor = "rgba(34, 197, 94, 0.4)";
        btn.innerHTML = '<i class="fa fa-check-circle" style="margin-right: 6px;"></i> Connected';
        localStorage.setItem("stripeConnected", "true");
      } else {
        localStorage.setItem("stripeConnected", "false");
      }
    } catch (err) {
      console.warn("Stripe status check failed:", err);
    }
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
                    <span>Discover</span>
                </a>
                <a href="scout-dashboard.html" class="bottom-nav-link" onclick="if(typeof showScoutSection === 'function') { showScoutSection('watchlist'); return false; }">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
                    <span>Watchlist</span>
                </a>
                <a href="scout-dashboard.html" class="bottom-nav-link" onclick="if(typeof showScoutSection === 'function') { showScoutSection('messenger'); return false; }">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                    <span>Chat</span>
                </a>
                <a href="scout-dashboard.html" class="bottom-nav-link" onclick="if(typeof showScoutSection === 'function') { showScoutSection('analytics'); return false; }">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
                    <span>Market</span>
                </a>
                <a href="#" class="bottom-nav-link" onclick="UnifiedNav.toggleSidebar(true); return false;">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
                    <span>More</span>
                </a>
            `;
    } else if (isSuperAdmin) {
      navHtml = `
                <a href="super-admin-dashboard.html" class="bottom-nav-link active" onclick="if(typeof showSection === 'function') { showSection('overview'); return false; }">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                    <span>Console</span>
                </a>
                <a href="super-admin-dashboard.html" class="bottom-nav-link" onclick="if(typeof showSection === 'function') { showSection('groups'); return false; }">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"></path><path d="M3 7v1a3 3 0 0 0 6 0V7m0 1a3 3 0 0 0 6 0V7m0 1a3 3 0 0 0 6 0V7H3"></path><path d="M19 21V11"></path><path d="M5 21V11"></path></svg>
                    <span>Groups</span>
                </a>
                <a href="super-admin-dashboard.html" class="bottom-nav-link" onclick="if(typeof showSection === 'function') { showSection('users'); return false; }">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                    <span>Users</span>
                </a>
                <a href="super-admin-dashboard.html" class="bottom-nav-link" onclick="if(typeof showSection === 'function') { showSection('activity'); return false; }">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
                    <span>Logs</span>
                </a>
                <a href="#" class="bottom-nav-link" onclick="UnifiedNav.toggleSidebar(true); return false;">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
                    <span>More</span>
                </a>
            `;
    } else {
      navHtml = `
                <a href="admin-dashboard.html" class="bottom-nav-link active" onclick="if(typeof showSection === 'function') { showSection('overview'); return false; }">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                    <span>Home</span>
                </a>
                <a href="admin-dashboard.html" class="bottom-nav-link" onclick="if(typeof showSection === 'function') { showSection('members'); return false; }">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                    <span>Members</span>
                </a>
                <a href="tournament-manager.html" class="bottom-nav-link">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                    <span>Events</span>
                </a>
                <a href="admin-dashboard.html" class="bottom-nav-link" onclick="if(typeof showSection === 'function') { showSection('finances'); return false; }">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                    <span>Finance</span>
                </a>
                <a href="#" class="bottom-nav-link" onclick="UnifiedNav.toggleSidebar(true); return false;">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
                    <span>More</span>
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
    const isPlayer = this.getUserRole() === "player";
    const dropdownHTML = `
            <div class="pro-dropdown" id="pro-dropdown">
                <div class="dropdown-user-info" style="padding: 1.25rem; border-bottom: 1px solid rgba(255,255,255,0.08);">
                    <div class="dropdown-avatar" id="dropdown-avatar" style="width: 40px; height: 40px; border-radius: 50%; background: var(--primary); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.1rem;">?</div>
                    <div class="dropdown-meta" style="margin-left: 0.75rem;">
                        <div class="dropdown-name" id="dropdown-name" style="font-weight: 700; font-size: 0.95rem;">User Name</div>
                        <div class="dropdown-email" id="dropdown-email" style="font-size: 0.7rem; opacity: 0.5;">...</div>
                        <div class="dropdown-role" id="dropdown-role" style="font-size: 0.7rem; opacity: 0.6; text-transform: uppercase; letter-spacing: 0.5px;">Member</div>
                    </div>
                </div>
                
                <div class="dropdown-links" style="padding: 0.5rem;">
                    <div style="font-size: 0.65rem; color: var(--text-muted); padding: 0.5rem 0.75rem; text-transform: uppercase; letter-spacing: 1px; font-weight: 700;">Account</div>
                    <a href="${isPlayer ? 'player-dashboard.html' : 'admin-dashboard.html'}" onclick="return handleNavClick(event, '${isPlayer ? 'player-dashboard.html' : 'admin-dashboard.html'}', 'profile')" class="dropdown-link" style="display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem; border-radius: 8px; transition: background 0.2s;">
                        <span style="font-size: 1.1rem;">👤</span>
                        <div style="display: flex; flex-direction: column;">
                            <span style="font-size: 0.85rem; font-weight: 600;">View Profile</span>
                            <span style="font-size: 0.65rem; opacity: 0.5;">Personal details & settings</span>
                        </div>
                    </a>
                    </a>
                    
                    <div class="dropdown-divider" style="height: 1px; background: rgba(255,255,255,0.08); margin: 0.5rem 0;"></div>
                    
                    <a href="?reset=system" class="dropdown-link" style="display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem; border-radius: 8px;">
                        <span style="font-size: 1.1rem;">🧹</span>
                        <span style="font-size: 0.85rem; font-weight: 600;">Clear Cache & Reset</span>
                    </a>

                    <a href="#" class="dropdown-link" style="color: #ef4444; display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem; border-radius: 8px;" onclick="UnifiedNav.logout(); return false;">
                        <span style="font-size: 1.1rem;">🚪</span>
                        <span style="font-size: 0.85rem; font-weight: 600;">Sign Out</span>
                    </a>
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
    const injectActionButtons = (table) => {
      if (table.dataset.actionsInjected) return;
      const theadRow = table.querySelector("thead tr");
      if (!theadRow) return;

      let actionsIndex = -1;
      Array.from(theadRow.querySelectorAll("th")).forEach((th, idx) => {
        if (th.textContent.trim().toLowerCase() === "actions") {
          actionsIndex = idx;
        }
      });

      if (actionsIndex === -1) {
        // Add Actions header if it doesn't exist
        const th = document.createElement("th");
        th.textContent = "Actions";
        th.style.cssText = "text-align:center; min-width:120px;";
        theadRow.appendChild(th);
      }

      const isPlayerTable = table.id?.toLowerCase().includes("player") ||
        table.id?.toLowerCase().includes("member") ||
        table.id?.toLowerCase().includes("staff") ||
        table.className?.toLowerCase().includes("members-table") ||
        Array.from(theadRow.querySelectorAll("th")).some(th => ["role", "squad", "team"].includes(th.textContent.trim().toLowerCase()));

      const assignPlanBtn = isPlayerTable ? `
        <button onclick="event.stopPropagation(); UnifiedNav.handleAssignPlan(this)" style="
          background:rgba(168,85,247,0.15); border:1px solid rgba(168,85,247,0.4);
          color:#c084fc; border-radius:8px; padding:0.3rem 0.65rem; font-size:0.75rem;
          font-weight:700; cursor:pointer; margin-right:0.4rem; transition:all 0.15s;
        " onmouseover="this.style.background='rgba(168,85,247,0.3)'" onmouseout="this.style.background='rgba(168,85,247,0.15)'">💳 Assign Plan</button>
      ` : "";

      const buttonsHtml = `
        <button onclick="event.stopPropagation(); UnifiedNav.handleTableEdit(this)" style="
          background:rgba(59,130,246,0.15); border:1px solid rgba(59,130,246,0.4);
          color:#60a5fa; border-radius:8px; padding:0.3rem 0.65rem; font-size:0.75rem;
          font-weight:700; cursor:pointer; margin-right:0.4rem; transition:all 0.15s;
        " onmouseover="this.style.background='rgba(59,130,246,0.3)'" onmouseout="this.style.background='rgba(59,130,246,0.15)'>✏️ Edit</button>
        ${assignPlanBtn}
        <button onclick="event.stopPropagation(); UnifiedNav.handleTableDelete(this)" style="
          background:rgba(220,38,38,0.12); border:1px solid rgba(220,38,38,0.35);
          color:#f87171; border-radius:8px; padding:0.3rem 0.65rem; font-size:0.75rem;
          font-weight:700; cursor:pointer; transition:all 0.15s;
        " onmouseover="this.style.background='rgba(220,38,38,0.28)'" onmouseout="this.style.background='rgba(220,38,38,0.12)'>🗑️ Delete</button>
      `;

      // On narrow screens, replace inline buttons with a single overflow action that opens a bottom sheet
      const isMobileTable = typeof window !== 'undefined' && window.innerWidth <= 991;
      const overflowButtonHtml = `
        <button class="table-action-more" aria-label="More actions" onclick="event.stopPropagation(); UnifiedNav.openRowActions(this)" style="background:transparent;border:none;padding:8px;border-radius:10px;min-width:44px;min-height:44px;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;color:inherit;">
          <svg width=20 height=20 viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
        </button>
      `;

      // Add or replace action buttons in each body row
      table.querySelectorAll("tbody tr").forEach((row) => {
        // Skip rows that are clearly for loading or empty states (usually have a single cell with colspan)
        if (row.cells.length === 1 && row.cells[0].hasAttribute("colspan")) return;

        const buildButton = (text, clickHandler, opts = {}) => {
          const b = document.createElement('button');
          b.type = 'button';
          b.textContent = text;
          b.addEventListener('click', (e) => { e.stopPropagation(); clickHandler(b); });
          // apply inline styles from templates
          Object.assign(b.style, {
            background: opts.background || 'transparent',
            border: opts.border || 'none',
            color: opts.color || 'inherit',
            borderRadius: opts.borderRadius || '8px',
            padding: opts.padding || '0.3rem 0.65rem',
            fontSize: opts.fontSize || '0.75rem',
            fontWeight: opts.fontWeight || '700',
            cursor: 'pointer',
            marginRight: opts.marginRight || '0.4rem'
          });
          return b;
        };

        const attachActionsToCell = (td) => {
          td.style.cssText = isMobileTable ? 'text-align:right; white-space:nowrap;' : 'text-align:right; white-space:nowrap;';
          // clear existing
          td.innerHTML = '';
          if (isMobileTable) {
            // overflow button
            const overflow = document.createElement('button');
            overflow.className = 'table-action-more';
            overflow.setAttribute('aria-label', 'More actions');
            overflow.style.cssText = 'background:transparent;border:none;padding:8px;border-radius:10px;min-width:44px;min-height:44px;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;color:inherit;';
            overflow.innerHTML = '<svg width=20 height=20 viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>';
            overflow.addEventListener('click', (e) => { e.stopPropagation(); UnifiedNav.openRowActions(overflow); });

            const hidden = document.createElement('div');
            hidden.className = 'hidden-actions';
            hidden.style.display = 'none';

            // add buttons into hidden container
            hidden.appendChild(buildButton('✏️ Edit', (b) => UnifiedNav.handleTableEdit(b), { background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.4)', color: '#60a5fa' }));
            if (isPlayerTable) {
              hidden.appendChild(buildButton('💳 Assign Plan', (b) => UnifiedNav.handleAssignPlan(b), { background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.4)', color: '#c084fc', marginRight: '0.4rem' }));
            }
            hidden.appendChild(buildButton('🗑️ Delete', (b) => UnifiedNav.handleTableDelete(b), { background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.35)', color: '#f87171', marginRight: '0' }));

            td.appendChild(overflow);
            td.appendChild(hidden);
          } else {
            // desktop: inline buttons
            td.appendChild(buildButton('✏️ Edit', (b) => UnifiedNav.handleTableEdit(b), { background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.4)', color: '#60a5fa' }));
            if (isPlayerTable) {
              td.appendChild(buildButton('💳 Assign Plan', (b) => UnifiedNav.handleAssignPlan(b), { background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.4)', color: '#c084fc' }));
            }
            td.appendChild(buildButton('🗑️ Delete', (b) => UnifiedNav.handleTableDelete(b), { background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.35)', color: '#f87171', marginRight: '0' }));
          }
        };

        if (actionsIndex !== -1 && row.children.length > actionsIndex) {
          const td = row.children[actionsIndex];
          td.setAttribute('data-label', 'Actions');
          attachActionsToCell(td);
        } else {
          const td = document.createElement('td');
          td.setAttribute('data-label', 'Actions');
          td.style.cssText = 'text-align:center; white-space:nowrap;';
          attachActionsToCell(td);
          row.appendChild(td);
        }
      });

      table.dataset.actionsInjected = "1";
    };

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
      injectActionButtons(table);
    });

    // Watch for dynamically added tables and rows
    if (!window.__tableObserver) {
      window.__tableObserver = new MutationObserver((mutations) => {
        let needsUpdate = false;
        mutations.forEach(m => {
          if (m.type === 'childList' && m.addedNodes.length > 0) {
            let target = m.target;
            if (target.tagName === 'TBODY' || target.tagName === 'TR') {
              const table = target.closest('table');
              if (table) {
                table.removeAttribute('data-actions-injected');
                needsUpdate = true;
              }
            } else if (target.tagName === 'TABLE') {
              needsUpdate = true;
            } else if (target.querySelector && target.querySelector('table')) {
              needsUpdate = true;
            }
          }
        });

        if (needsUpdate || document.querySelector("table:not([data-actions-injected])")) {
          document.querySelectorAll("table").forEach((table) => {
            if (table.dataset.actionsInjected) return;

            const headers = Array.from(table.querySelectorAll("thead th")).map((th) => th.textContent.trim());
            if (headers.length > 0) {
              table.querySelectorAll("tbody tr").forEach((row) => {
                row.querySelectorAll("td").forEach((td, index) => {
                  if (headers[index] && !td.getAttribute("data-label")) {
                    td.setAttribute("data-label", headers[index]);
                  }
                });
              });
            }
            injectActionButtons(table);
          });
        }
      });
      window.__tableObserver.observe(document.body, { childList: true, subtree: true });
    }

    console.log("📋 Tables auto-labeled + action buttons injected");
  },

  handleTableEdit(btn) {
    const row = btn.closest("tr");
    if (!row) return;

    // Check for specialized handler
    if (typeof window.openEditMemberModal === 'function') {
      const name = row.querySelector("td")?.textContent.trim() || "";
      const roleCell = Array.from(row.querySelectorAll("td")).find(td => td.getAttribute('data-label') === 'Role');
      const role = roleCell ? roleCell.textContent.trim() : "";
      const emailCell = row.querySelector("td div[style*='font-size:0.75rem']");
      const email = emailCell ? emailCell.textContent.trim() : "";

      const [first, ...lastParts] = name.split(" ");
      const last = lastParts.join(" ");

      // Find ID from delete button or similar if available, or use row index
      const memberId = btn.closest('tr').dataset.id || 'temp-id';

      window.openEditMemberModal(memberId, first, last, email, role);
      return;
    }

    const cells = Array.from(row.querySelectorAll("td:not(:last-child)"));
    const headers = Array.from(row.closest("table").querySelectorAll("thead th:not(:last-child)")).map(th => th.textContent.trim());

    document.getElementById("__ch-edit-modal")?.remove();
    const modal = document.createElement("div");
    modal.id = "__ch-edit-modal";
    modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.7);backdrop-filter:blur(6px);z-index:99999;display:flex;align-items:center;justify-content:center;animation:fadeIn 0.15s ease;";

    let fieldsHtml = cells.map((td, idx) => `
        <div style="margin-bottom:1rem;">
            <label style="display:block;font-size:0.75rem;color:rgba(255,255,255,0.4);margin-bottom:0.4rem;text-transform:uppercase;letter-spacing:1px;font-weight:700;">${headers[idx] || 'Field ' + (idx + 1)}</label>
            <input type="text" value="${td.textContent.trim().split('\n')[0]}" style="width:100%;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:0.75rem;color:#fff;outline:none;font-size:0.9rem;" onfocus="this.style.borderColor='rgba(220,38,38,0.5)'" onblur="this.style.borderColor='rgba(255,255,255,0.1)'">
        </div>
    `).join('');

    modal.innerHTML = `
      <div style="background:#1a1a1c;border:1px solid rgba(255,255,255,0.1);border-radius:24px;padding:2rem;max-width:480px;width:94%;box-shadow:0 30px 70px rgba(0,0,0,0.7);animation:slideUp 0.2s ease;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;">
            <h3 style="margin:0;font-size:1.25rem;font-weight:800;color:#fff;">Edit Entry</h3>
            <div onclick="document.getElementById('__ch-edit-modal').remove()" style="cursor:pointer;opacity:0.5;font-size:1.5rem;">&times;</div>
        </div>
        <div style="max-height:60vh;overflow-y:auto;padding-right:0.5rem;">
            ${fieldsHtml}
        </div>
        <div style="display:flex;gap:0.75rem;margin-top:2rem;">
          <button onclick="document.getElementById('__ch-edit-modal').remove()" style="flex:1;padding:0.75rem;background:rgba(255,255,255,0.06);border:none;border-radius:12px;color:#fff;font-weight:600;cursor:pointer;">Cancel</button>
          <button onclick="showNotification('Changes saved successfully!', 'success'); document.getElementById('__ch-edit-modal').remove()" style="flex:1;padding:0.75rem;background:linear-gradient(135deg, #dc2626 0%, #991b1b 100%);border:none;border-radius:12px;color:#fff;font-weight:700;cursor:pointer;box-shadow:0 8px 20px rgba(220,38,38,0.25);">Save Changes</button>
        </div>
      </div>
      <style>@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes slideUp{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}</style>
    `;

    document.body.appendChild(modal);
    modal.addEventListener("click", (e) => { if (e.target === modal) modal.remove(); });
  },

  handleTableDelete(btn) {
    const row = btn.closest("tr");
    if (!row) return;
    const first = row.querySelector("td")?.textContent.trim() || "this item";

    // Remove any existing modal
    document.getElementById("__ch-delete-modal")?.remove();

    const modal = document.createElement("div");
    modal.id = "__ch-delete-modal";
    modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.7);backdrop-filter:blur(4px);z-index:99999;display:flex;align-items:center;justify-content:center;animation:fadeIn 0.15s ease;";
    modal.innerHTML = `
      <div style="background:#1a1a1c;border:1px solid rgba(220,38,38,0.3);border-radius:20px;padding:2rem;max-width:400px;width:90%;box-shadow:0 25px 60px rgba(0,0,0,0.6);animation:slideUp 0.2s ease;">
        <div style="width:56px;height:56px;border-radius:16px;background:rgba(220,38,38,0.15);border:1px solid rgba(220,38,38,0.3);display:flex;align-items:center;justify-content:center;font-size:1.5rem;margin-bottom:1.25rem;">🗑️</div>
        <h3 style="margin:0 0 0.5rem;font-size:1.15rem;font-weight:800;color:#fff;">Delete Item</h3>
        <p style="margin:0 0 1.5rem;color:rgba(255,255,255,0.55);font-size:0.88rem;line-height:1.5;">Are you sure you want to delete "<strong style="color:#f1f5f9;">${first.slice(0, 40)}</strong>"? This action cannot be undone.</p>
        <div style="display:flex;gap:0.75rem;">
          <button onclick="document.getElementById('__ch-delete-modal').remove()" style="flex:1;padding:0.65rem;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:10px;color:#fff;font-size:0.88rem;font-weight:600;cursor:pointer;">Cancel</button>
          <button id="__ch-confirm-delete" style="flex:1;padding:0.65rem;background:rgba(220,38,38,0.85);border:none;border-radius:10px;color:#fff;font-size:0.88rem;font-weight:700;cursor:pointer;box-shadow:0 4px 15px rgba(220,38,38,0.3);">Delete</button>
        </div>
      </div>
      <style>@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes slideUp{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}</style>
    `;

    document.body.appendChild(modal);

    // Close on backdrop click
    modal.addEventListener("click", (e) => { if (e.target === modal) modal.remove(); });

    // Confirm action
    document.getElementById("__ch-confirm-delete").onclick = () => {
      modal.remove();
      row.style.transition = "opacity 0.3s, transform 0.3s";
      row.style.opacity = "0";
      row.style.transform = "translateX(30px)";
      setTimeout(() => row.remove(), 320);
    };
  },

  handleAssignPlan(btn) {
    const row = btn.closest("tr");
    if (!row) return;
    const name = row.querySelector("td")?.textContent.trim().split('\n')[0] || "this member";

    // Check for specialized handler
    if (typeof window.openAssignPlanModal === 'function') {
      const memberId = row.dataset.id || 'temp-id';
      window.openAssignPlanModal(memberId, name);
      return;
    }

    document.getElementById("__ch-assign-modal")?.remove();

    const modal = document.createElement("div");
    modal.id = "__ch-assign-modal";
    modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.75);backdrop-filter:blur(6px);z-index:99999;display:flex;align-items:center;justify-content:center;animation:fadeIn 0.15s ease;";
    modal.innerHTML = `
      <div style="background:#1a1a1c;border:1px solid rgba(168,85,247,0.3);border-radius:24px;padding:2.25rem;max-width:440px;width:92%;box-shadow:0 30px 70px rgba(0,0,0,0.7);animation:slideUp 0.2s ease;">
        <div style="width:56px;height:56px;border-radius:16px;background:rgba(168,85,247,0.15);border:1px solid rgba(168,85,247,0.3);display:flex;align-items:center;justify-content:center;font-size:1.5rem;margin-bottom:1.5rem;">💳</div>
        <h3 style="margin:0 0 0.5rem;font-size:1.2rem;font-weight:800;color:#fff;">Assign Payment Plan</h3>
        <p style="margin:0 0 1.5rem;color:rgba(255,255,255,0.5);font-size:0.9rem;line-height:1.5;">Select a Stripe subscription plan to assign to <strong style="color:#fff;">${name}</strong>.</p>
        
        <div style="margin-bottom:1.5rem;">
            <select id="__ch-plan-select" style="width:100%;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:1rem;color:#fff;outline:none;font-size:0.95rem;">
                <option value="">-- Loading Plans... --</option>
            </select>
        </div>
        
        <div style="display:flex;gap:0.75rem;">
          <button onclick="document.getElementById('__ch-assign-modal').remove()" style="flex:1;padding:0.8rem;background:rgba(255,255,255,0.06);border:none;border-radius:12px;color:#fff;font-weight:600;cursor:pointer;">Cancel</button>
          <button id="__ch-confirm-assign" style="flex:1;padding:0.8rem;background:linear-gradient(135deg, #a855f7 0%, #7e22ce 100%);border:none;border-radius:12px;color:#fff;font-weight:700;cursor:pointer;box-shadow:0 8px 20px rgba(168,85,247,0.25);">Assign Plan</button>
        </div>
      </div>
      <style>@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes slideUp{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}</style>
    `;

    document.body.appendChild(modal);
    modal.addEventListener("click", (e) => { if (e.target === modal) modal.remove(); });

    // Load real plans if apiService exists
    if (window.apiService) {
      apiService.getSubscriptionPlans().then(plans => {
        const select = document.getElementById('__ch-plan-select');
        if (plans && plans.length > 0) {
          select.innerHTML = '<option value="">-- Select a Plan --</option>' +
            plans.map(p => `<option value="${p.id}">${p.name} - £${p.amount}/${p.interval}</option>`).join('');
        } else {
          select.innerHTML = '<option value="">No plans found</option>';
        }
      }).catch(() => {
        document.getElementById('__ch-plan-select').innerHTML = '<option value="">Error loading plans</option>';
      });
    }

    document.getElementById("__ch-confirm-assign").onclick = async () => {
      const planId = document.getElementById("__ch-plan-select").value;
      if (!planId) return;

      try {
        if (window.apiService) {
          const memberId = row.dataset.id || 'temp-id';
          await apiService.post('/api/payments/assign-plan', { memberId, planId });
          showNotification("Plan assigned successfully!", "success");
        }
        modal.remove();
      } catch (err) {
        showNotification("Failed to assign plan", "error");
      }
    };
  },

  openRowActions(trigger) {
    try {
      // Find the hidden actions HTML nearby
      const td = trigger.closest('td');
      if (!td) return;
      const hidden = td.querySelector('.hidden-actions');
      const actionsHtml = hidden ? hidden.innerHTML : '';

      // Remove existing sheet if any
      document.getElementById('__ch-action-sheet')?.remove();

      const sheet = document.createElement('div');
      sheet.id = '__ch-action-sheet';
      sheet.className = 'ch-action-sheet';
      sheet.style.cssText = 'position:fixed;inset:0;display:flex;align-items:flex-end;justify-content:center;z-index:100000;pointer-events:auto;';

      sheet.innerHTML = `
        <div class="ch-action-sheet-backdrop" style="position:absolute;inset:0;background:rgba(0,0,0,0.45);backdrop-filter:blur(4px);"></div>
        <div class="ch-action-sheet-panel" style="width:100%;max-width:760px;background:linear-gradient(180deg,#0f0f10,#121214);border-top-left-radius:16px;border-top-right-radius:16px;padding:1rem;box-shadow:0 -20px 60px rgba(0,0,0,0.6);">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;">
            <div style="font-weight:800;color:#fff;font-size:1rem;">Actions</div>
            <button onclick="document.getElementById('__ch-action-sheet')?.remove()" style="background:none;border:none;color:rgba(255,255,255,0.6);font-size:1.2rem;padding:6px;">&times;</button>
          </div>
          <div class="ch-action-sheet-content" style="display:flex;flex-direction:column;gap:0.5rem;">
            ${actionsHtml}
          </div>
        </div>
      `;

      document.body.appendChild(sheet);

      // Close handlers
      sheet.querySelector('.ch-action-sheet-backdrop').addEventListener('click', () => sheet.remove());

      // Ensure action buttons inside sheet behave normally (remove stopPropagation on calls)
      sheet.querySelectorAll('button').forEach(b => b.addEventListener('click', (e) => {
        // Let existing handlers run; then close sheet for destructive actions
        setTimeout(() => {
          if (b.textContent.trim().toLowerCase().includes('delete') || b.textContent.trim().toLowerCase().includes('assign') || b.textContent.trim().toLowerCase().includes('save')) {
            sheet.remove();
          }
        }, 10);
      }));
    } catch (e) {
      console.warn('openRowActions failed', e);
    }
  },

  _confirmAssignPlan(name) {
    const plan = document.getElementById("__ch-plan-select")?.value;
    if (!plan) { alert("Please select a plan"); return; }
    document.getElementById("__ch-assign-modal").remove();

    const toast = document.createElement("div");
    toast.style.cssText = "position:fixed;bottom:100px;left:50%;transform:translateX(-50%);background:rgba(22,163,74,0.95);color:#fff;padding:0.75rem 1.5rem;border-radius:12px;font-weight:700;font-size:0.88rem;z-index:999999;box-shadow:0 8px 25px rgba(0,0,0,0.4);animation:slideUp 0.3s ease;";
    toast.textContent = "✅ Plan assigned successfully to " + name.slice(0, 30);
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
  },


  showEventRegisterModal(title, type) {
    document.getElementById("__ch-event-modal")?.remove();
    const isEvent = (type || "event").toLowerCase();
    const modal = document.createElement("div");
    modal.id = "__ch-event-modal";
    modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.75);backdrop-filter:blur(6px);z-index:99999;display:flex;align-items:center;justify-content:center;animation:fadeIn 0.15s ease;";
    modal.innerHTML = `
      <div style="background:#1a1a1c;border:1px solid rgba(220,38,38,0.25);border-radius:20px;padding:2rem;max-width:440px;width:92%;box-shadow:0 25px 60px rgba(0,0,0,0.6);animation:slideUp 0.2s ease;">
        <div style="width:56px;height:56px;border-radius:16px;background:rgba(220,38,38,0.15);border:1px solid rgba(220,38,38,0.25);display:flex;align-items:center;justify-content:center;font-size:1.5rem;margin-bottom:1.25rem;">🏆</div>
        <h3 style="margin:0 0 0.35rem;font-size:1.15rem;font-weight:800;color:#fff;">Register Interest</h3>
        <p style="margin:0 0 1.25rem;color:rgba(255,255,255,0.55);font-size:0.88rem;line-height:1.5;">You're registering interest for <strong style="color:#f1f5f9;">${(title || '').slice(0, 50)}</strong>. A coach or admin will confirm your place.</p>
        <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:1rem;margin-bottom:1.25rem;">
          <label style="font-size:0.75rem;font-weight:700;color:rgba(255,255,255,0.45);text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:0.5rem;">Note for Coach (optional)</label>
          <textarea id="__ch-event-note" placeholder="e.g. I'll need transport, dietary requirements..." style="width:100%;background:transparent;border:none;color:#fff;font-size:0.88rem;resize:none;outline:none;height:64px;line-height:1.5;"></textarea>
        </div>
        <div style="display:flex;gap:0.75rem;">
          <button onclick="document.getElementById('__ch-event-modal').remove()" style="flex:1;padding:0.65rem;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:10px;color:#fff;font-size:0.88rem;font-weight:600;cursor:pointer;">Cancel</button>
          <button onclick="UnifiedNav._confirmEventRegister('${(title || '').replace(/'/g, '&apos;')}'); document.getElementById('__ch-event-modal').remove();" style="flex:1;padding:0.65rem;background:rgba(220,38,38,0.85);border:none;border-radius:10px;color:#fff;font-size:0.88rem;font-weight:700;cursor:pointer;box-shadow:0 4px 15px rgba(220,38,38,0.3);">Register →</button>
        </div>
      </div>
      <style>@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes slideUp{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}</style>
    `;
    document.body.appendChild(modal);
    modal.addEventListener("click", (e) => { if (e.target === modal) modal.remove(); });
  },

  _confirmEventRegister(title) {
    const note = document.getElementById("__ch-event-note")?.value || "";
    // Show success toast
    const toast = document.createElement("div");
    toast.style.cssText = "position:fixed;bottom:100px;left:50%;transform:translateX(-50%);background:rgba(22,163,74,0.95);color:#fff;padding:0.75rem 1.5rem;border-radius:12px;font-weight:700;font-size:0.88rem;z-index:999999;box-shadow:0 8px 25px rgba(0,0,0,0.4);animation:slideUp 0.3s ease;";
    toast.textContent = "✅ Interest registered for " + title.slice(0, 30) + (title.length > 30 ? "..." : "");
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
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
      document.body.classList.add("sidebar-open");

      // Ensure specific display properties for cross-browser reliability
      try {
        sidebar.style.setProperty('display', 'flex', 'important');
        overlay.style.setProperty('display', 'block', 'important');
      } catch (e) { }

      this.syncUserData();
    } else {
      sidebar.classList.remove("active");
      overlay.classList.remove("active");
      document.body.classList.remove("sidebar-open");

      try {
        sidebar.style.removeProperty('display');
        overlay.style.removeProperty('display');
      } catch (e) { }

      // Also close any open dropdowns inside sidebar
      const switchers = sidebar.querySelectorAll('.group-switcher-dropdown.open');
      switchers.forEach(s => s.classList.remove('open'));
    }

    // Initialize swipe gestures if not already done
    if (!this._swipeInitialized) {
      this.initSwipeGestures();
    }

    if (show) {
      const notifDropdown = document.getElementById("notificationDropdown");
      if (notifDropdown) notifDropdown.style.display = "none";
      this.toggleProfileDropdown(false);
    }
  },

  /**
   * Add premium swipe gestures for sidebar
   */
  initSwipeGestures() {
    let startX = 0;
    let currentX = 0;
    const swipeThreshold = 70;
    const sidebar = document.getElementById("pro-sidebar");

    if (!sidebar) return;

    document.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
      currentX = e.touches[0].clientX;
    }, { passive: true });

    document.addEventListener('touchend', () => {
      const diff = currentX - startX;
      const isMobile = window.innerWidth <= 991;

      if (!isMobile) return;

      // Swipe right from edge (open)
      if (startX < 50 && diff > swipeThreshold) {
        this.toggleSidebar(true);
      }
      // Swipe left (close)
      if (sidebar.classList.contains('active') && diff < -swipeThreshold) {
        this.toggleSidebar(false);
      }

      startX = 0;
      currentX = 0;
    });

    this._swipeInitialized = true;
    console.log("📲 Swipe gestures initialized for sidebar");
  },

  getCurrentMode() {
    const storedMode = localStorage.getItem("dashboardMode");
    if (storedMode) return storedMode;

    const url = window.location.href;
    const user = JSON.parse(localStorage.getItem("currentUser") || "{}");
    const userRole = (user.account_type || user.userType || localStorage.getItem("userType") || "").toLowerCase();

    // Explicit player path check — only treat explicit player pages as player mode.
    // Do NOT treat generic 'chat' or 'messenger' pages as player mode to avoid accidental context switches.
    if (/player-|player-dashboard|player-dashboard.html/.test(url)) return "player";

    // Fallback to role-based default
    if (userRole === "player" || userRole === "parent") return "player";
    return "group";
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
    const email = user.email || "";

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
      "dropdown-email": email,
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
    const nav = document.getElementById("sidebar-nav-content");
    if (!nav) {
      console.warn("⚠️ UnifiedNav: #sidebar-nav-content not found! Retrying in 100ms...");
      setTimeout(() => this.renderMenu(), 100);
      return;
    }

    console.log("🚀 UnifiedNav: renderMenu() executing...");

    const url = window.location.href;
    let user = {};
    try {
      const userData = localStorage.getItem("currentUser");
      if (userData && userData !== "undefined" && userData !== "null") {
        user = JSON.parse(userData);
      }
    } catch (e) { }

    const userRole = (user.account_type || user.userType || localStorage.getItem("userType") || "").toLowerCase();

    const isPlayer = /player-|schedule|finances|shop|chat/.test(url) || userRole === "player" || userRole === "parent";
    const isSuperAdmin = userRole === "platform_admin" || userRole === "superadmin" || url.includes("super-admin");
    const isCoach = userRole === "coach" || userRole === "staff" || url.includes("coach-");
    const isScout = userRole === "scout" || url.includes("scout-") || url.includes("scouting");

    // Admin detection (Group/Org admin)
    const isAdmin = userRole === "admin" || userRole === "organization" || userRole === "owner" || /admin-|members|teams|events/.test(url);

    // Player detection
    const dashboardMode = localStorage.getItem("dashboardMode") || "group";
    const isPlayerRole = userRole === "player" || userRole === "parent" || !!localStorage.getItem("activePlayerId") || dashboardMode === "player";
    const isPlayerUrl = /player-|schedule|finances|shop|chat/.test(url);

    // Final logic: Explicit role first, then URL fallback
    let finalRole = (userRole || "player").toLowerCase();
    const p = window.location.pathname.toLowerCase();

    // URL-based overrides (if user is navigating to a specific dash)
    if (p.includes("super-admin")) finalRole = "superadmin";
    else if (p.includes("admin") || p.includes("members") || p.includes("teams") || p.includes("form-builder")) finalRole = "admin";
    else if (p.includes("scout") || p.includes("scouting")) finalRole = "scout";
    else if (p.includes("coach")) finalRole = "coach";
    else if (p.includes("player-") || p.includes("schedule")) finalRole = "player";
    else if (dashboardMode === "player") finalRole = "player";

    // Safety check: if user is admin but on a coach page, stay admin
    if (userRole === "admin" && finalRole === "coach") {
      finalRole = "admin";
    }

    const finalIsSuperAdmin = finalRole === "superadmin";
    const finalIsAdmin = finalRole === "admin";
    const finalIsCoach = finalRole === "coach";
    const finalIsScout = finalRole === "scout";
    const finalIsPlayer = finalRole === "player";

    let menuHtml = "";
    const isActive = (f) => window.location.pathname.includes(f) ? "active" : "";

    if (finalIsSuperAdmin) {
      menuHtml = `
                <div class="nav-group-title">Platform</div>
                <a href="super-admin-dashboard.html" onclick="return UnifiedNav.handleNavClick(event, 'super-admin-dashboard.html', 'overview')" class="sidebar-link ${isActive('super-admin-dashboard.html')}">${ICONS.nav.overview}<span>Admin Console</span></a>
                
                <div class="nav-group-title">Operations</div>
                <a href="venue-booking.html" class="sidebar-link ${isActive('venue-booking.html')}">${ICONS.nav.venue}<span>Venue Booking</span></a>

                <div class="nav-group-title">Discovery</div>
                <a href="club-finder.html" class="sidebar-link ${isActive('club-finder.html')}">${ICONS.nav.teams}<span>Club Finder</span></a>
                <a href="event-finder.html" class="sidebar-link ${isActive('event-finder.html')}">${ICONS.nav.events}<span>Event Finder</span></a>
            `;
    } else if (finalIsAdmin) {
      menuHtml = `
        <div class="nav-group-title"><span>Management</span></div>
        <a href="admin-dashboard.html" onclick="return UnifiedNav.handleNavClick(event, 'admin-dashboard.html', 'overview')" class="sidebar-link ${isActive('admin-dashboard.html') && !p.includes('#') ? 'active' : ''}">${ICONS.nav.overview}<span>Dashboard</span></a>
        <a href="admin-members.html" onclick="return UnifiedNav.handleNavClick(event, 'admin-members.html', 'members')" class="sidebar-link ${isActive('admin-members.html')}">${ICONS.nav.players}<span>Members</span></a>
        <a href="admin-teams.html" onclick="return UnifiedNav.handleNavClick(event, 'admin-teams.html', 'teams')" class="sidebar-link ${isActive('admin-teams.html')}">${ICONS.nav.teams}<span>Teams</span></a>
        <a href="admin-events.html" onclick="return UnifiedNav.handleNavClick(event, 'admin-events.html', 'events')" class="sidebar-link ${isActive('admin-events.html')}">${ICONS.nav.events}<span>Event Manager</span></a>
        <a href="admin-venues.html" onclick="return UnifiedNav.handleNavClick(event, 'admin-venues.html', 'venues')" class="sidebar-link ${isActive('admin-venues.html')}">${ICONS.nav.venue}<span>Venue Management</span></a>
        <a href="admin-tournament-manager.html" onclick="return UnifiedNav.handleNavClick(event, 'admin-tournament-manager.html', 'tournament-manager')" class="sidebar-link sidebar-sublink ${isActive('admin-tournament-manager.html')}" style="padding-left: 2.5rem; opacity: 0.85; font-size: 0.85rem;">${ICONS.nav.trophy}<span>Competition Management</span></a>
        <a href="admin-chat.html" onclick="return UnifiedNav.handleNavClick(event, 'admin-chat.html', 'messenger')" class="sidebar-link ${isActive('admin-chat.html')}">${ICONS.nav.chat}<span>Messenger</span></a>
        <a href="admin-academy-tv.html" onclick="return UnifiedNav.handleNavClick(event, 'admin-academy-tv.html', 'academy-tv')" class="sidebar-link ${isActive('admin-academy-tv.html')}">${ICONS.nav.academy}<span>Academy TV</span></a>
        <a href="admin-email-test.html" class="sidebar-link ${isActive('admin-email-test.html')}">📧 <span>Email Tester</span></a>

        <div class="nav-group-title"><span>Operations</span></div>
        <a href="admin-finances.html" onclick="return UnifiedNav.handleNavClick(event, 'admin-finances.html', 'finances')" class="sidebar-link ${isActive('admin-finances.html')}">${ICONS.nav.finance}<span>Finances</span></a>
        <a href="admin-shop.html" onclick="return UnifiedNav.handleNavClick(event, 'admin-shop.html', 'shop')" class="sidebar-link ${isActive('admin-shop.html')}">${ICONS.nav.shop}<span>Club Shop</span></a>
        <a href="admin-bibs.html" class="sidebar-link ${isActive('admin-bibs.html')}">${ICONS.nav.bibs}<span>Bib Management</span></a>
        <a href="form-builder.html" class="sidebar-link ${isActive('form-builder.html')}">${ICONS.nav.forms}<span>Form Builder</span></a>
        <a href="tactical-board.html" onclick="return UnifiedNav.handleNavClick(event, 'tactical-board.html', 'tactical-board')" class="sidebar-link ${isActive('tactical-board.html')}">${ICONS.nav.tactics}<span>Tactical Board</span></a>

        <div class="nav-group-title"><span>Discovery</span></div>
        <a href="club-finder.html" class="sidebar-link ${isActive('club-finder.html')}">${ICONS.nav.teams}<span>Club Finder</span></a>
        <a href="team-finder.html" class="sidebar-link ${isActive('team-finder.html')}">${ICONS.nav.players}<span>Team Finder</span></a>
        <a href="event-finder.html" class="sidebar-link ${isActive('event-finder.html')}">${ICONS.nav.events}<span>Event Finder</span></a>
        <a href="tournament-finder.html" class="sidebar-link ${isActive('tournament-finder.html')}">${ICONS.nav.trophy}<span>Tournament Finder</span></a>
        <a href="venue-finder.html" class="sidebar-link ${isActive('venue-finder.html')}">${ICONS.nav.venue}<span>Venue Finder</span></a>
      `;
    } else if (finalIsCoach) {
      menuHtml = `
        <div class="nav-group-title"><span>Coaching Hub</span></div>
        <a href="coach-dashboard.html" onclick="return UnifiedNav.handleNavClick(event, 'coach-dashboard.html', 'overview')" class="sidebar-link ${isActive('coach-dashboard.html') && !p.includes('#') ? 'active' : ''}">${ICONS.nav.overview}<span>Overview</span></a>
        <a href="admin-members.html" onclick="return UnifiedNav.handleNavClick(event, 'admin-members.html', 'members')" class="sidebar-link ${isActive('admin-members.html')}">${ICONS.nav.players}<span>Squad Manager</span></a>
        <a href="admin-teams.html" onclick="return UnifiedNav.handleNavClick(event, 'admin-teams.html', 'teams')" class="sidebar-link ${isActive('admin-teams.html')}">${ICONS.nav.teams}<span>Squads & Teams</span></a>
        <a href="admin-events.html" onclick="return UnifiedNav.handleNavClick(event, 'admin-events.html', 'events')" class="sidebar-link ${isActive('admin-events.html')}">${ICONS.nav.events}<span>Event Manager</span></a>
        <a href="admin-venues.html" onclick="return UnifiedNav.handleNavClick(event, 'admin-venues.html', 'venues')" class="sidebar-link ${isActive('admin-venues.html')}">${ICONS.nav.venue}<span>My Venues</span></a>
        <a href="coach-tournament-manager.html" onclick="return UnifiedNav.handleNavClick(event, 'coach-tournament-manager.html', 'tournament-manager')" class="sidebar-link ${isActive('coach-tournament-manager.html')}">${ICONS.nav.trophy}<span>Tournament Hub</span></a>
        <a href="admin-academy-tv.html" onclick="return UnifiedNav.handleNavClick(event, 'admin-academy-tv.html', 'academy-tv')" class="sidebar-link ${isActive('admin-academy-tv.html')}">${ICONS.nav.academy}<span>Academy TV</span></a>
        
        <div class="nav-group-title"><span>Tools</span></div>
        <a href="coach-dashboard.html#coach-messenger" onclick="return UnifiedNav.handleNavClick(event, 'coach-dashboard.html', 'messenger')" class="sidebar-link ${p.includes('messenger') ? 'active' : ''}">${ICONS.nav.chat}<span>Squad Messenger</span></a>
        <a href="tactical-board.html" onclick="return UnifiedNav.handleNavClick(event, 'tactical-board.html', 'tactical-board')" class="sidebar-link ${isActive('tactical-board.html')}">${ICONS.nav.tactics}<span>Tactical Board Pro</span></a>
        <a href="admin-bibs.html" class="sidebar-link ${isActive('admin-bibs.html')}">${ICONS.nav.bibs}<span>Bib Assignment</span></a>

        <div class="nav-group-title"><span>Discovery</span></div>
        <a href="club-finder.html" class="sidebar-link ${isActive('club-finder.html')}">${ICONS.nav.teams}<span>Club Finder</span></a>
        <a href="event-finder.html" class="sidebar-link ${isActive('event-finder.html')}">${ICONS.nav.events}<span>Event Finder</span></a>
      `;
    } else if (finalIsScout) {
      menuHtml = `
        <div class="nav-group-title"><span>Scouting Hub</span></div>
        <a href="scouting.html" onclick="return UnifiedNav.handleNavClick(event, 'scouting.html', 'overview')" class="sidebar-link ${isActive('scouting.html')}">${ICONS.nav.overview}<span>Talent Search</span></a>
        <a href="scouting.html#my-reports" class="sidebar-link">${ICONS.nav.approvals}<span>Player Reports</span></a>
        <a href="scouting.html#watchlist" class="sidebar-link">${ICONS.nav.players}<span>Watchlist</span></a>
        
        <div class="nav-group-title"><span>Discovery</span></div>
        <a href="club-finder.html" class="sidebar-link ${isActive('club-finder.html')}">${ICONS.nav.teams}<span>Club Finder</span></a>
        <a href="event-finder.html" class="sidebar-link ${isActive('event-finder.html')}">${ICONS.nav.events}<span>Event Finder</span></a>
      `;
    } else {
      menuHtml = `
                    <div class="nav-group-title">Main Hub</div>
                    <div id="sidebar-family-switcher-container" class="mobile-only" style="padding: 0.25rem 0.75rem 0.75rem 0.75rem; border-bottom: 1px solid rgba(255,255,255,0.03); margin-bottom: 0.5rem;"></div>
                    <a href="player-dashboard.html" onclick="return UnifiedNav.handleNavClick(event, 'player-dashboard.html', 'overview')" class="sidebar-link ${isActive('player-dashboard.html') && !p.includes('#') ? 'active' : ''}">${ICONS.nav.overview}<span>Overview</span></a>
                    <a href="player-dashboard.html#family" onclick="return UnifiedNav.handleNavClick(event, 'player-dashboard.html', 'player-family')" class="sidebar-link ${p.includes('family') ? 'active' : ''}">${ICONS.nav.players}<span>My Family Hub</span></a>
                    <a href="player-dashboard.html#schedule" onclick="return UnifiedNav.handleNavClick(event, 'player-dashboard.html', 'schedule')" class="sidebar-link ${p.includes('schedule') ? 'active' : ''}">${ICONS.nav.training}<span>Schedule</span></a>
                    <a href="player-dashboard.html#teams" onclick="return UnifiedNav.handleNavClick(event, 'player-dashboard.html', 'teams')" class="sidebar-link ${p.includes('teams') ? 'active' : ''}">${ICONS.nav.teams}<span>My Teams</span></a>
                    <a href="player-academy-tv.html" onclick="return UnifiedNav.handleNavClick(event, 'player-academy-tv.html', 'academy-tv')" class="sidebar-link ${isActive('player-academy-tv.html')}">${ICONS.nav.academy}<span>Academy TV</span></a>
                    <a href="player-finances.html" onclick="return UnifiedNav.handleNavClick(event, 'player-finances.html', 'payments')" class="sidebar-link ${isActive('player-finances.html') || p.includes('payments') ? 'active' : ''}">${ICONS.nav.finance}<span>Finances</span></a>
                    
                    <div class="nav-group-title">Services</div>
                    <a href="player-chat.html" onclick="return UnifiedNav.handleNavClick(event, 'player-chat.html', 'club-messenger')" class="sidebar-link ${isActive('player-chat.html') || p.includes('messenger') ? 'active' : ''}">${ICONS.nav.chat}<span>Messenger</span></a>
                    <a href="player-shop.html" onclick="return UnifiedNav.handleNavClick(event, 'player-shop.html', 'item-shop')" class="sidebar-link ${isActive('player-shop.html') || p.includes('shop') ? 'active' : ''}">${ICONS.nav.shop}<span>Club Shop</span></a>
                    <a href="player-dashboard.html#tournaments" onclick="return UnifiedNav.handleNavClick(event, 'player-dashboard.html', 'tournaments')" class="sidebar-link ${p.includes('tournaments') ? 'active' : ''}">${ICONS.nav.trophy}<span>Tournaments</span></a>
                    
                    <div class="nav-group-title">Discovery</div>
                    <a href="club-finder.html" class="sidebar-link ${isActive('club-finder.html')}">${ICONS.nav.teams}<span>Club Finder</span></a>
                    <a href="team-finder.html" class="sidebar-link ${isActive('team-finder.html')}">${ICONS.nav.players}<span>Team Finder</span></a>
                    <a href="event-finder.html" class="sidebar-link ${isActive('event-finder.html')}">${ICONS.nav.events}<span>Event Finder</span></a>
                    <a href="tournament-finder.html" class="sidebar-link ${isActive('tournament-finder.html')}">${ICONS.nav.trophy}<span>Tournament Finder</span></a>
                    <a href="venue-finder.html" class="sidebar-link ${isActive('venue-finder.html')}">${ICONS.nav.venue}<span>Venue Finder</span></a>
        `;
    }

    // Add Settings directly to the scrollable menu area
    menuHtml += `
        <div class="nav-group-title">Account</div>
        <a href="settings.html" class="sidebar-link ${isActive('settings.html')}">${ICONS.nav.settings}<span>Settings</span></a>
    `;

    nav.innerHTML = menuHtml;

    // Render family switcher in sidebar if placeholder exists
    const sideFamilySlot = document.getElementById("sidebar-family-switcher-container");
    if (sideFamilySlot) {
      this.renderFamilySwitcher(sideFamilySlot);
    }

    this.stripHashLinks(nav);

    console.log("✅ Sidebar Menu Rendered for:", finalRole);

    // Discovery sections are now integrated into the main role-based menu structures above
    // to prevent duplication and ensure consistency across roles.

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

        // Collapse by default ONLY if explicitly set
        const isCollapsed = document.body.classList.contains("sidebar-collapsed");
        container.style.display = isCollapsed ? "none" : "block";

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
    if (!isMobile) {
      document.querySelectorAll('.mobile-only').forEach(el => el.style.display = 'none');
      return;
    }

    // 1. Ensure correct viewport meta is present
    if (!document.querySelector('meta[name="viewport"]')) {
      const meta = document.createElement('meta');
      meta.name = "viewport";
      meta.content = "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no";
      document.head.appendChild(meta);
    }

    // 2. Process all tables to ensure card-mode works
    this.autoLabelTables();

    // 2b. Convert remaining .table-responsive tables into `.mobile-card-list` for consistent mobile UX
    try {
      document.querySelectorAll('.table-responsive').forEach(container => {
        if (!container) return;
        // Skip if already converted
        if (container.querySelector('.mobile-card-list')) return;
        const table = container.querySelector('table');
        if (!table) return;

        // Only convert on narrow screens
        if (window.innerWidth > 991) return;

        const tbody = table.querySelector('tbody') || table;
        const rows = Array.from(tbody.querySelectorAll('tr'));
        if (rows.length === 0) return;

        const list = document.createElement('div');
        list.className = 'mobile-card-list';

        rows.forEach(row => {
          if (row.children.length === 1 && row.children[0].hasAttribute('colspan')) return;
          const card = document.createElement('div');
          card.className = 'mobile-card';
          Array.from(row.children).forEach(td => {
            const label = td.getAttribute('data-label') || '';
            const value = td.textContent.trim();
            const item = document.createElement('div');
            item.className = 'row-item';
            const l = document.createElement('div'); l.className='row-label'; l.textContent = label;
            const v = document.createElement('div'); v.className='row-value'; v.textContent = value;
            item.appendChild(l);
            item.appendChild(v);
            card.appendChild(item);
          });
          list.appendChild(card);
        });

        // Replace table with the card list
        try { table.parentElement.replaceChild(list, table); }
        catch (e) { console.warn('UnifiedNav: table->cards replace failed', e); }
      });
    } catch (e) { console.warn('UnifiedNav: convert tables to cards failed', e); }

    // 2c. Inject mobile-cards stylesheet if missing
    try {
      if (!document.getElementById('mobile-cards-css')) {
        const link = document.createElement('link');
        link.id = 'mobile-cards-css';
        link.rel = 'stylesheet';
        link.href = 'mobile-cards.css';
        document.head.appendChild(link);
      }
    } catch (e) { console.warn('UnifiedNav: inject mobile css failed', e); }

    // 2d. Convert generic tables to mobile cards, unless explicitly opted-out with .no-mobile-convert
    try {
      const allTables = Array.from(document.querySelectorAll('table'));
      allTables.forEach(table => {
        if (!table || table.closest('.mobile-card-list')) return;
        if (table.classList.contains('no-mobile-convert')) return;
        // skip tables already inside special non-data containers
        if (table.closest('form') && table.querySelector('input[type="checkbox"]')) return;

        // Only on narrow screens
        if (window.innerWidth > 991) return;

        // Avoid converting small layout tables
        const cols = table.querySelectorAll('th, td').length;
        if (cols === 0) return;

        // Build label set
        let headers = [];
        const thead = table.querySelector('thead');
        if (thead) headers = Array.from(thead.querySelectorAll('th')).map(h => h.textContent.trim());
        if (headers.length === 0) {
          // fallback to first row THs or data-labels
          const firstRow = table.querySelector('tr');
          if (firstRow) headers = Array.from(firstRow.querySelectorAll('th')).map(h => h.textContent.trim());
        }

        const tbody = table.querySelector('tbody') || table;
        const rows = Array.from(tbody.querySelectorAll('tr'));
        if (rows.length === 0) return;

        const list = document.createElement('div');
        list.className = 'mobile-card-list';

        rows.forEach(row => {
          // skip header rows with th only
          if (row.querySelectorAll('th').length && row.querySelectorAll('td').length === 0) return;
          const tds = Array.from(row.querySelectorAll('td'));
          if (tds.length === 0) return;

          const card = document.createElement('div');
          card.className = 'mobile-card';

          tds.forEach((td, idx) => {
            const label = td.getAttribute('data-label') || headers[idx] || `Column ${idx+1}`;
            const value = td.innerHTML.trim();
            const item = document.createElement('div');
            item.className = 'row-item';
            const l = document.createElement('div'); l.className='row-label'; l.textContent = label;
            const v = document.createElement('div'); v.className='row-value'; v.innerHTML = value;
            item.appendChild(l);
            item.appendChild(v);
            card.appendChild(item);
          });

          list.appendChild(card);
        });

        try { table.parentElement.replaceChild(list, table); }
        catch (e) { console.warn('UnifiedNav: generic table->cards replace failed', e); }
      });
    } catch (e) { console.warn('UnifiedNav: generic table conversion failed', e); }

    // Run per-page fallbacks for pages that need custom conversions
    try {
      if (typeof this.performPerPageFallbacks === 'function') this.performPerPageFallbacks();
    } catch (e) { console.warn('UnifiedNav: per-page fallbacks failed', e); }

    // 3. Global layout fixes
    document.body.style.overflowX = "hidden";

    const main = document.querySelector("main, .dashboard-main, .dashboard-container, #overview, #members");
    if (main) {
      main.style.paddingBottom = "100px";
      if (!isMobile) {
        main.style.marginLeft = "280px";
        main.style.width = "calc(100% - 280px)";
      } else {
        main.style.paddingLeft = "0";
        main.style.paddingRight = "0";
        main.style.width = "100%";
      }
      main.style.maxWidth = "100%";
      main.classList.add("dashboard-main");
    }

    // 4. Force grid stacking if missed by CSS
    const grids = document.querySelectorAll('.dash-grid, .dashboard-grid, .grid-2, .grid-3');
    grids.forEach(g => {
      g.style.display = "grid";
      g.style.gridTemplateColumns = "1fr";
      g.style.width = "100%";
    });

    // 5. Fix full-screen height issues on iOS
    document.documentElement.style.setProperty(
      "--vh",
      `${window.innerHeight * 0.01}px`,
    );
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
    this.renderHeaderNotifications();
    this.renderStripeHeaderButton();

    // 4. Ensure Video Modal exists for openVideoModal to work
    if (!document.getElementById("videoPlayerModal")) {
      const videoModalHtml = `
          <div id="videoPlayerModal" class="modal" style="display:none; align-items:center; justify-content:center; background:rgba(0,0,0,0.95); z-index:100000;">
            <div class="modal-content" style="max-width:1000px; width:95%; background:transparent; box-shadow:none; padding:0; position:relative;">
              <button class="btn btn-secondary" onclick="closeModal('videoPlayerModal')" style="position:absolute; top:-40px; right:0; border-radius:50%; width:36px; height:36px; padding:0; display:flex; align-items:center; justify-content:center; background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.2); color:white;">✕</button>
              <div id="videoPlayerContainer" style="aspect-ratio:16/9; background:#000; border-radius:12px; overflow:hidden; box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);">
                <!-- Iframe/Video injected here -->
              </div>
              <div id="videoPlayerTitle" style="margin-top:1rem; font-size:1.2rem; font-weight:700; color:white; text-align:center; font-family:var(--font-heading);"></div>
            </div>
          </div>
        `;
      const div = document.createElement('div');
      div.innerHTML = videoModalHtml;
      document.body.appendChild(div.firstElementChild);
    }

    console.log("✅ UnifiedNav Init Complete.");
  },

  /**
   * Global Video Player Modal
   * Supports direct video URLs and YouTube/Vimeo embeds
   */
  openVideoModal(title, videoUrl) {
    const modal = document.getElementById("videoPlayerModal");
    const container = document.getElementById("videoPlayerContainer");
    const titleEl = document.getElementById("videoPlayerTitle");

    if (!modal || !container) {
      console.warn("Video modal elements not found in DOM.");
      // Fallback: open in new tab
      window.open(videoUrl, "_blank");
      return;
    }

    let embedHtml = "";
    const url = videoUrl.trim();

    // YouTube Detection & Conversion
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      let videoId = "";
      if (url.includes("v=")) {
        videoId = url.split("v=")[1].split("&")[0];
      } else if (url.includes("youtu.be/")) {
        videoId = url.split("youtu.be/")[1].split("?")[0];
      } else if (url.includes("embed/")) {
        videoId = url.split("embed/")[1].split("?")[0];
      }
      embedHtml = `<iframe width="100%" height="100%" src="https://www.youtube.com/embed/${videoId}?autoplay=1" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
    }
    // Vimeo Detection
    else if (url.includes("vimeo.com")) {
      const videoId = url.split("/").pop();
      embedHtml = `<iframe src="https://player.vimeo.com/video/${videoId}?autoplay=1" width="100%" height="100%" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`;
    }
    // Direct Video Link (MP4, etc)
    else {
      embedHtml = `<video src="${url}" controls autoplay style="width:100%; height:100%; display:block; object-fit:contain;"></video>`;
    }

    container.innerHTML = embedHtml;
    if (titleEl) titleEl.textContent = title || "Academy Video";

    modal.style.display = "flex";
    document.body.style.overflow = "hidden";

    // Clean up on close (stop video)
    const originalClose = window.closeModal;
    window.closeModal = function (id) {
      if (id === 'videoPlayerModal') {
        container.innerHTML = "";
        window.closeModal = originalClose;
      }
      originalClose(id);
    };
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
UnifiedNav.handleNavClick = window.handleNavClick;
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
