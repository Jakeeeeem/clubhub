/**
 * Unified Pro Navigation Controller
 */

// Initialize on load
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    // If DOM is already ready, init with a small delay for other dependencies
    setTimeout(() => UnifiedNav.init(), 100);
} else {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => UnifiedNav.init(), 100);
    });
}

const UnifiedNav = {
  init() {
    console.log("🚀 UnifiedNav: Initializing standard navigation...");
    
    // Perform Mobile UX Sweep to fix layouts
    if (typeof this.performMobileUXSweep === 'function') {
        this.performMobileUXSweep();
    }

    // Standardize breakpoints: 992px+ is desktop
    const isDesktop = window.matchMedia('(min-width: 992px)').matches;
    const isDashboard = window.location.pathname.includes('dashboard.html');
    const isLandingPage = window.location.pathname.includes('index.html') || window.location.pathname === '/' || window.location.pathname === '';

    if (!isDesktop) {
      // ── MOBILE ──────────────────────────────────────────────────────────────
      console.log("📱 Mobile: rendering unified nav");
      this.cleanupLegacyArtifacts(); 
      this.renderHeader();
      this.renderSidebar();
      this.renderBottomNav();
      this.renderMenu();
      this.renderMobileHeaderElements();
    } else {
      // ── DESKTOP ─────────────────────────────────────────────────────────────
      console.log("💻 Desktop: standardizing dashboard header");
      this.cleanupLegacyArtifacts();
      
      // Always ensure full header structure on dashboards
      if (isDashboard || isLandingPage) {
        this.ensureDashboardHeader(); // Optimized ensure for desktop
        this.renderProfileDropdown();
        this.renderHeaderSwitcher(); 
        this.renderStripeHeaderButton(); 
        this.renderHeaderNotifications(); 
        this.updateHeaderState();
      } else {
        this.ensureHeaderElements();
        this.renderHeaderSwitcher();
        this.renderHeaderNotifications();
      }
    }
    
    this.bindEvents();
    this.syncUserData();
    this.autoLabelTables();
    this.toggleSidebar(false);
  },

  /**
   * Dynamically renders the appropriate switcher (Org or Family)
   */
  renderHeaderSwitcher() {
    const container = document.getElementById("org-switcher-container");
    if (!container) return;

    const userType = localStorage.getItem('userType');
    const isPlayerMode = window.location.href.includes('player-dashboard.html');

    if (isPlayerMode || userType === 'player') {
      console.log("👨‍👩‍👧‍👦 Rendering Family Switcher");
      this.renderFamilySwitcher(container);
    } else {
      console.log("🏢 Rendering Group Switcher");
      this.renderGroupSwitcher(container);
    }
  },

  renderGroupSwitcher(container) {
    if (typeof GroupSwitcher !== "undefined") {
      GroupSwitcher.render(container);
    } else {
      const script = document.createElement("script");
      script.src = "group-switcher.js";
      script.onload = () => {
        if (typeof GroupSwitcher !== "undefined") GroupSwitcher.render(container);
      };
      document.head.appendChild(script);
    }
  },

  renderFamilySwitcher(container) {
    // Ported from player-dashboard.js logic
    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const firstName = user.firstName || user.first_name || "User";
    const family = JSON.parse(localStorage.getItem('userFamily') || '[]');
    const activeId = localStorage.getItem('activePlayerId');
    
    const activePlayer = family.find(f => f.id == activeId);
    const displayName = activePlayer ? activePlayer.first_name : "Main Profile";
    const displayInitial = activePlayer ? activePlayer.first_name.charAt(0) : firstName.charAt(0);

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
            <button class="profile-item ${!activeId ? 'active' : ''}" onclick="UnifiedNav.switchFamilyProfile(null)" style="width:100%; display:flex; align-items:center; gap:0.75rem; padding:0.75rem 1rem; background:none; border:none; color:white; cursor:pointer; text-align:left;">
               <div style="width:28px; height:28px; border-radius:50%; background:var(--primary); display:flex; align-items:center; justify-content:center; font-weight:700;">${firstName.charAt(0)}</div>
               <div>
                 <div style="font-weight:600; font-size:0.9rem;">${firstName} (Main)</div>
               </div>
            </button>
            ${family.map(child => `
              <button class="profile-item ${activeId == child.id ? 'active' : ''}" onclick="UnifiedNav.switchFamilyProfile('${child.id}')" style="width:100%; display:flex; align-items:center; gap:0.75rem; padding:0.75rem 1rem; background:none; border:none; color:white; cursor:pointer; text-align:left;">
                 <div style="width:28px; height:28px; border-radius:50%; background:rgba(255,255,255,0.1); display:flex; align-items:center; justify-content:center; font-weight:700;">${child.first_name.charAt(0)}</div>
                 <div>
                   <div style="font-weight:600; font-size:0.9rem;">${child.first_name} ${child.last_name}</div>
                 </div>
              </button>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    // Bind dropdown toggle
    const trigger = document.getElementById('profile-switcher-trigger');
    const dropdown = document.getElementById('profile-switcher-dropdown');
    if (trigger && dropdown) {
      trigger.onclick = (e) => {
        e.stopPropagation();
        const isOpen = dropdown.style.visibility === 'visible';
        dropdown.style.opacity = isOpen ? '0' : '1';
        dropdown.style.visibility = isOpen ? 'hidden' : 'visible';
        dropdown.style.transform = isOpen ? 'translateY(-10px)' : 'translateY(0)';
      };
      document.addEventListener('click', () => {
        dropdown.style.opacity = '0';
        dropdown.style.visibility = 'hidden';
        dropdown.style.transform = 'translateY(-10px)';
      });
    }
  },

  switchFamilyProfile(id) {
    console.log("🔄 Switching family profile to:", id);
    if (id) {
      localStorage.setItem('activePlayerId', id);
    } else {
      localStorage.removeItem('activePlayerId');
    }
    window.location.reload();
  },

  renderHeaderNotifications() {
    // Try both standard and legacy selectors for maximum compatibility
    const rightSide = document.querySelector(".dash-header-right") || document.querySelector(".nav-right") || document.querySelector("header");
    if (!rightSide || rightSide.querySelector(".notification-wrapper")) return;

    const bellHTML = `
      <div class="notification-wrapper desktop-only" style="position: relative; margin-right: 1rem; display: flex; align-items: center;">
        <button class="notification-bell" onclick="UnifiedNav.toggleNotifications()" style="background: none; border: none; color: white; cursor: pointer; display: flex; align-items: center; opacity: 0.8; transition: opacity 0.2s; padding: 0;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
          <span id="header-notif-badge" class="badge" style="display:none; position: absolute; top: -4px; right: -4px; background: var(--primary); color: white; border-radius: 50%; width: 14px; height: 14px; font-size: 9px; align-items: center; justify-content: center; font-weight: 800;">0</span>
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
    rightSide.insertAdjacentHTML("afterbegin", bellHTML);
    this.loadNotifications();
  },

  toggleNotifications() {
     const dropdown = document.getElementById('notificationDropdown');
     if (!dropdown) return;
     const isOpen = dropdown.style.display === 'block';
     dropdown.style.display = isOpen ? 'none' : 'block';
     if (!isOpen) {
        // Close profile dropdown if open
        this.toggleProfileDropdown(false);
     }
  },

  async loadNotifications() {
     const list = document.getElementById('notification-list');
     const badge = document.getElementById('header-notif-badge');
     if (!list) return;

     try {
        if (typeof apiService === 'undefined') return;
        const res = await apiService.makeRequest('/notifications');
        const notifs = res || [];
        const unreadCount = notifs.filter(n => !n.read).length;

        if (unreadCount > 0) {
           badge.textContent = unreadCount;
           badge.style.display = 'flex';
        } else {
           badge.style.display = 'none';
        }

        if (notifs.length > 0) {
           list.innerHTML = notifs.slice(0, 5).map(n => `
             <div style="padding: 0.75rem; border-bottom: 1px solid rgba(255,255,255,0.05); cursor: pointer;" onclick="window.location.href='${n.link || '#'}'">
                <div style="font-weight: 600; font-size: 0.85rem; margin-bottom: 2px;">${n.title}</div>
                <div style="font-size: 0.75rem; color: rgba(255,255,255,0.5);">${n.message}</div>
             </div>
           `).join('');
        }
     } catch (e) {
        console.warn("Could not load notifications for header", e);
     }
  },

  markAllRead() {
     const badge = document.getElementById('header-notif-badge');
     if (badge) badge.style.display = 'none';
     const list = document.getElementById('notification-list');
     if (list) list.innerHTML = '<div style="text-align: center; color: rgba(255,255,255,0.4); font-size: 0.8rem; padding: 2rem 0;">No new notifications</div>';
  },

  renderStripeHeaderButton() {
    const rightSide = document.querySelector(".dash-header-right") || document.querySelector(".nav-right") || document.querySelector("header");
    if (!rightSide || rightSide.querySelector(".stripe-header-btn")) return;

    // Check if user is admin
    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const isAdmin = user.userType === 'admin' || user.userType === 'organization';
    const isDashboard = window.location.pathname.includes('admin-dashboard.html');

    if (isAdmin && isDashboard) {
      const stripeBtnHTML = `
        <div class="stripe-header-btn desktop-only" style="margin-right: 1rem;">
          <button class="btn btn-stripe btn-small" onclick="typeof manageStripeAccount === 'function' ? manageStripeAccount() : console.log('💳 Stripe Dashboard')" style="background: #635bff; color: white; border: none; padding: 5px 12px; border-radius: 6px; font-size: 0.75rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; transition: background 0.2s;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M13.962 10.935c0-1.212-1.046-1.309-1.973-1.309-1.353 0-2.321.31-2.321.31l-.22-1.552s.934-.367 2.592-.367c2.321 0 3.737 1.026 3.737 3.056 0 3.339-4.57 3.514-4.57 5.163 0 .726.65 1.045 1.636 1.045 1.418 0 2.503-.424 2.503-.424l.23 1.572s-1.162.53-2.88.53c-2.122 0-3.538-.986-3.538-2.936.01-3.6 4.804-3.66 4.804-5.088zM4.613 14.63c.18-1.52.92-2.14 1.94-2.14 1.34 0 2.3.26 2.3.26l.24-1.56s-1.25-.45-2.79-.45C4.213 10.74 3 12.18 3 14.73c0 3.03 2.1 3.54 4.13 3.54 1.7 0 3.1-.48 3.1-.48l.24-1.61s-1.45.66-3.1.66c-1.8 0-2.91-.71-2.757-2.21zm10.79 3.09h1.91v-6.85h-1.91v6.85zm0-8.54h1.91V7.27h-1.91v1.91zm2.34 8.54h1.91v-6.85h-1.91v6.85zm0-8.54h1.91V7.27h-1.91v1.91zm2.34 8.54h1.91v-3.7c0-2.02.8-3.15 2.14-3.15.22 0 .43.02.61.06v-1.74c-.17-.03-.38-.05-.61-.05-1.55 0-2.14.73-2.14.73V10.87h-1.91v6.85z"/>
            </svg>
            Stripe Dashboard
          </button>
        </div>
      `;
      rightSide.insertAdjacentHTML("afterbegin", stripeBtnHTML);
    }
  },

  cleanupLegacyArtifacts() {
    console.log("🧹 UnifiedNav: Purging legacy artifacts...");
    
    // 1. Remove specific legacy IDs that might have been injected
    ['loggedInNav', 'loggedOutNav', 'scoutStatusBadge'].forEach(id => {
      const el = document.getElementById(id);
      if (el && !el.closest('.pro-header')) {
        console.log(`🗑️ Removing rogue element: #${id}`);
        el.remove();
      }
    });

    // 2. Remove legacy welcome banners
    document.querySelectorAll('.welcome-banner, .user-info').forEach(el => {
      if (!el.closest('.pro-header') && !el.classList.contains('dash-header-left')) {
         console.log("🗑️ Removing legacy welcome banner");
         el.remove();
      }
    });

    // 3. Absolute purge of any top-level text nodes containing "Hello,"
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    const nodesToRemove = [];
    while(walker.nextNode()) {
      const node = walker.currentNode;
      if (node.textContent.includes("Hello,") && !node.parentElement.closest('.pro-header') && !node.parentElement.closest('.dashboard-container')) {
        nodesToRemove.push(node);
      }
    }
    nodesToRemove.forEach(node => {
      console.log("🗑️ Purging legacy text node:", node.textContent.trim());
      node.remove();
    });
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

    // Force exact structure if incomplete
    if (!header.querySelector(".dash-header-left") || !header.querySelector(".dash-header-right")) {
      header.innerHTML = `
        <div class="nav-container nav container">
            <div class="dash-header-left">
                <div class="logo" onclick="window.location.href='index.html'" style="display: flex; align-items: center; gap: 0.75rem; cursor: pointer;">
                    <img src="images/logo.png" alt="ClubHub Logo" class="logo-image" style="height: 32px; width: 32px;">
                    <span class="logo-text neon-text" style="font-weight: 800; font-size: 1.2rem;">ClubHub</span>
                </div>
                
                <div class="mode-toggle-container">
                    <span class="mode-label active" id="group-label">Group</span>
                    <label class="toggle-switch">
                        <input type="checkbox" id="mode-toggle" onchange="UnifiedNav.handleGlobalModeToggle(this)">
                        <span class="toggle-slider"></span>
                    </label>
                    <span class="mode-label" id="player-label">Player</span>
                </div>
                
                <div id="org-switcher-container"></div>
            </div>
            
            <div class="dash-header-right">
                <div class="user-profile-trigger" id="profileTrigger" onclick="UnifiedNav.toggleProfileDropdown(true)">
                    <span class="user-name desktop-only" id="header-user-name">Loading...</span>
                    <div class="user-avatar-sm" id="header-user-avatar">?</div>
                </div>
                <button class="btn btn-secondary btn-small desktop-only" onclick="handleAuthError()" style="margin-left: 0.5rem;">Logout</button>
            </div>
        </div>
      `;
    }
  },

  ensureHeaderElements() {
    this.ensureDashboardHeader();
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
   * Adds essential mobile buttons (Hamburger) to any header
   */
  renderMobileHeaderElements() {
    const header = document.querySelector("header.header, .pro-header");
    if (!header) return;

    let nav = header.querySelector(".nav-container, .nav");
    if (!nav) return;

    // Add Hamburger if missing (Mobile only)
    if (!nav.querySelector("#side-menu-trigger") && !nav.querySelector(".side-menu-trigger")) {
      const trigger = document.createElement("div");
      trigger.className = "side-menu-trigger mobile-only";
      trigger.id = "side-menu-trigger";
      trigger.onclick = () => UnifiedNav.toggleSidebar(true);
      trigger.innerHTML = `<i class="fa fa-bars"></i>`;
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

    header.innerHTML = `
            <div class="nav-container">
                <div class="side-menu-trigger mobile-only" id="side-menu-trigger" onclick="UnifiedNav.toggleSidebar(true)">
                    <i class="fa fa-bars"></i>
                </div>

                <div class="logo-area" onclick="window.location.href='index.html'">
                    <img src="images/logo.png" alt="Logo" class="logo-img">
                    <span class="logo-text">ClubHub</span>
                </div>

                <div class="mode-toggle-container desktop-only">
                    <div class="header-mode-toggle" id="header-mode-toggle">
                        <div class="mode-pill" id="header-mode-group-pill" onclick="UnifiedNav.switchMode('group')">Group Hub</div>
                        <div class="mode-pill" id="header-mode-player-pill" onclick="UnifiedNav.switchMode('player')">Player Pro</div>
                    </div>
                </div>

                <div class="header-actions">
                    <div class="action-btn desktop-only" onclick="typeof showPlayerSection !== 'undefined' ? showPlayerSection('notifications') : (typeof showSection !== 'undefined' ? showSection('notifications') : null)">
                        <i class="fa fa-bell-o"></i>
                        <span class="badge" id="header-notif-badge" style="display:none">0</span>
                    </div>

                    <div class="user-profile-trigger" id="profileTrigger" onclick="UnifiedNav.toggleProfileDropdown(true)">
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
    const userRole = localStorage.getItem('userType') || '';
    const isPlayer = url.includes("player-dashboard.html") || userRole === 'player';
    const isSuperAdmin = url.includes("super-admin-dashboard.html") || userRole === 'platform_admin';
    const isCoach = url.includes("coach-dashboard.html") || userRole === 'coach';
    const isScout = url.includes("scout-dashboard.html") || url.includes("scouting.html") || userRole === 'scout';
    const isAdmin = url.includes("admin-dashboard.html") || userRole === 'admin';

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
    // Try to attach to a header container if possible, otherwise body
    const container = document.querySelector(".pro-header .nav-container, header.header .nav, header.header .nav-container");
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
    // Standardize breakpoints: 992px+ is desktop
    const isDesktop = typeof window !== "undefined" && window.innerWidth >= 992;
    if (isDesktop) {
      // On desktop, we don't open the sidebar. Surface the profile dropdown instead.
      if (show) {
        this.toggleProfileDropdown(true);
      } else {
        // If closing, ensure active classes are removed
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
    const userRole = localStorage.getItem('userType') || '';
    const isPlayer = url.includes("player-dashboard.html") || userRole === 'player';
    const isSuperAdmin = url.includes("super-admin-dashboard.html") || userRole === 'platform_admin';
    const isCoach = url.includes("coach-dashboard.html") || userRole === 'coach';
    const isScout = url.includes("scout-dashboard.html") || url.includes("scouting.html") || userRole === 'scout';

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
                <a href="#" class="sidebar-link" onclick="showSection('scout-approvals'); UnifiedNav.toggleSidebar(false); return false;"><i>🛡️</i> Scout Approvals</a>
                
                <div class="nav-group-title">Operations</div>
                <a href="#" class="sidebar-link" onclick="showSection('tactical-board'); UnifiedNav.toggleSidebar(false); return false;"><i>🏟️</i> Tactics Board</a>
                <a href="#" class="sidebar-link" onclick="showSection('form-builder'); UnifiedNav.toggleSidebar(false); return false;"><i>📋</i> Form Builder</a>
                <a href="#" class="sidebar-link" onclick="showSection('events'); UnifiedNav.toggleSidebar(false); return false;"><i>📅</i> Events</a>
                <a href="#" class="sidebar-link" onclick="showSection('tournaments'); UnifiedNav.toggleSidebar(false); return false;"><i>🏆</i> Tournaments</a>
                
                <div class="nav-group-title">Programs</div>
                <a href="#" class="sidebar-link" onclick="showSection('training-manager'); UnifiedNav.toggleSidebar(false); return false;"><i>🎯</i> Training Hub</a>
                <a href="#" class="sidebar-link" onclick="showSection('camp-manager'); UnifiedNav.toggleSidebar(false); return false;"><i>🏕️</i> Camp Manager</a>
                <a href="#" class="sidebar-link" onclick="showSection('venue-booking'); UnifiedNav.toggleSidebar(false); return false;"><i>📍</i> Venue Booking</a>
                
                <div class="nav-group-title">Finance</div>
                <a href="#" class="sidebar-link" onclick="showSection('finances'); UnifiedNav.toggleSidebar(false); return false;"><i>💰</i> Finances</a>
                <a href="#" class="sidebar-link" onclick="showSection('shop'); UnifiedNav.toggleSidebar(false); return false;"><i>🛒</i> Item Shop</a>
            `;
    }

    // Add Logout/Settings at the bottom of the list too for desktop
    menuHtml += `
            <div class="nav-group-title">Settings</div>
            <a href="player-settings.html" class="sidebar-link"><i>⚙️</i> Account Settings</a>
        `;

    nav.innerHTML = menuHtml;
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
    const main = document.querySelector('main, .dashboard-container');
    if (main) {
      if (!main.style.paddingBottom || parseInt(main.style.paddingBottom) < 100) {
        main.style.paddingBottom = '100px';
      }
    }

    // 3. Fix full-screen height issues on iOS
    document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
    window.addEventListener('resize', () => {
      document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
    });
  },

  /**
   * Scans tables and adds data-label attributes for mobile card view
   */
  autoLabelTables() {
    const tables = document.querySelectorAll('table:not(.no-sweep), .data-table, .modern-table');
    tables.forEach(table => {
      const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent.trim());
      if (headers.length === 0) return;

      const rows = table.querySelectorAll('tbody tr');
      rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        cells.forEach((cell, index) => {
          if (headers[index] && !cell.getAttribute('data-label')) {
            cell.setAttribute('data-label', headers[index]);
          }
        });
      });
    });
  },

  updateHeaderState() {
    // 1. Synchronize the mode toggle checkbox
    const modeToggle = document.getElementById("mode-toggle");
    if (modeToggle) {
      modeToggle.checked = window.location.href.includes("player-dashboard.html");
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
      
      const isDesktop = typeof window !== "undefined" && window.innerWidth >= 992;
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
    this.renderHeaderSwitcher();
    this.renderHeaderNotifications();
  },

  handleGlobalModeToggle(input) {
    console.log("🔀 Global Mode Toggle:", input.checked ? "Player" : "Group");
    if (input.checked) {
      this.switchMode("player");
    } else {
      this.switchMode("group");
    }
  },
};

// Initialize on load
if (typeof window !== 'undefined') {
  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => UnifiedNav.init(), 100);
  });
  window.UnifiedNav = UnifiedNav; // Global access
}
