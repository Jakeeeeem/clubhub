/**
 * Unified Pro Navigation Controller
 */
const UnifiedNav = {
    init() {
        console.log('🚀 Unified Nav Initializing...');
        this.renderSidebar();
        this.renderBottomNav();
        this.renderHeaderAddons();
        this.renderProfileDropdown();
        this.bindEvents();
        this.updateHeaderState();
        this.renderMenu();
        this.autoLabelTables();
    },

    renderSidebar() {
        if (document.getElementById('pro-sidebar')) return;

        const sidebarHTML = `
            <div class="sidebar-overlay" id="sidebar-overlay"></div>
            <aside class="pro-sidebar" id="pro-sidebar">
                <div class="sidebar-header" style="display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.5rem; border-bottom: 1px solid rgba(255,255,255,0.05); margin-bottom: 1rem;">
                    <span style="font-weight: 800; opacity: 0.8;">MENU</span>
                    <button onclick="UnifiedNav.toggleSidebar(false)" style="background: none; border: none; color: white; cursor: pointer; font-size: 1.5rem; line-height: 1;">&times;</button>
                </div>

                <nav class="sidebar-nav" id="sidebar-nav-content">
                    <!-- Dynamic rendering by renderMenu() -->
                </nav>

                <div class="sidebar-footer" style="padding: 1.5rem; border-top: 1px solid rgba(255,255,255,0.05);">
                    <a href="#" class="sidebar-link" onclick="handleLogout(); return false;" style="color: #ef4444; padding: 0.75rem 0;"><i>🚪</i> Logout</a>
                </div>
            </aside>
        `;
        document.body.insertAdjacentHTML('beforeend', sidebarHTML);
    },

    renderBottomNav() {
        const bottomNavContainer = document.getElementById('pro-bottom-nav-content');
        if (!bottomNavContainer) return;

        const url = window.location.href;
        const isPlayer = url.includes('player-dashboard.html');
        const isSuperAdmin = url.includes('super-admin-dashboard.html');
        const isCoach = url.includes('coach-dashboard.html');
        const isScout = url.includes('scout-dashboard.html') || url.includes('scouting.html');

        let navHtml = '';

        if (isPlayer) {
            navHtml = `
                <a href="#" class="bottom-nav-link active" onclick="showPlayerSection('overview'); return false;"><i>📊</i><span>Home</span></a>
                <a href="#" class="bottom-nav-link" onclick="showPlayerSection('teams'); return false;"><i>🛡️</i><span>Teams</span></a>
                <a href="#" class="bottom-nav-link" onclick="showPlayerSection('club-messenger'); return false;"><i>💬</i><span>Chat</span></a>
                <a href="scouting.html" class="bottom-nav-link"><i>🔍</i><span>Scout</span></a>
                <a href="#" class="bottom-nav-link" onclick="UnifiedNav.toggleSidebar(true); return false;"><i>👤</i><span>Profile</span></a>
            `;
        } else if (isCoach) {
            navHtml = `
                <a href="#" class="bottom-nav-link active" onclick="showCoachSection('overview'); return false;"><i>📊</i><span>Home</span></a>
                <a href="#" class="bottom-nav-link" onclick="showCoachSection('players'); return false;"><i>👥</i><span>Players</span></a>
                <a href="#" class="bottom-nav-link" onclick="showCoachSection('messenger'); return false;"><i>💬</i><span>Chat</span></a>
                <a href="#" class="bottom-nav-link" onclick="showCoachSection('scouting'); return false;"><i>🔍</i><span>Scout</span></a>
                <a href="#" class="bottom-nav-link" onclick="UnifiedNav.toggleSidebar(true); return false;"><i>🍔</i><span>More</span></a>
            `;
        } else if (isScout) {
            navHtml = `
                <a href="#" class="bottom-nav-link active" onclick="showScoutSection('discovery'); return false;"><i>🔍</i><span>Discover</span></a>
                <a href="#" class="bottom-nav-link" onclick="showScoutSection('watchlist'); return false;"><i>⭐</i><span>Stars</span></a>
                <a href="#" class="bottom-nav-link" onclick="showScoutSection('messenger'); return false;"><i>💬</i><span>Chat</span></a>
                <a href="#" class="bottom-nav-link" onclick="showScoutSection('reports'); return false;"><i>📝</i><span>Reports</span></a>
                <a href="#" class="bottom-nav-link" onclick="UnifiedNav.toggleSidebar(true); return false;"><i>👤</i><span>Account</span></a>
            `;
        } else if (isSuperAdmin) {
            navHtml = `
                <a href="#" class="bottom-nav-link active" onclick="showSection('overview'); return false;"><i>📊</i><span>Panel</span></a>
                <a href="#" class="bottom-nav-link" onclick="showSection('groups'); return false;"><i>🏢</i><span>Groups</span></a>
                <a href="#" class="bottom-nav-link" onclick="showSection('users'); return false;"><i>👥</i><span>Users</span></a>
                <a href="#" class="bottom-nav-link" onclick="showSection('activity'); return false;"><i>📜</i><span>Logs</span></a>
                <a href="#" class="bottom-nav-link" onclick="UnifiedNav.toggleSidebar(true); return false;"><i>⚙️</i><span>System</span></a>
            `;
        } else {
            navHtml = `
                <a href="#" class="bottom-nav-link active" onclick="showSection('overview'); return false;"><i>📊</i><span>Home</span></a>
                <a href="#" class="bottom-nav-link" onclick="showSection('players'); return false;"><i>🏃</i><span>Players</span></a>
                <a href="#" class="bottom-nav-link" onclick="showSection('events'); return false;"><i>📅</i><span>Events</span></a>
                <a href="#" class="bottom-nav-link" onclick="showSection('finances'); return false;"><i>💰</i><span>Finance</span></a>
                <a href="#" class="bottom-nav-link" onclick="UnifiedNav.toggleSidebar(true); return false;"><i>🍔</i><span>More</span></a>
            `;
        }

        bottomNavContainer.innerHTML = navHtml;
    },

    renderHeaderAddons() {
        const headerContainer = document.querySelector('.pro-header .nav-container');
        if (!headerContainer) return;
        
        // 1. ADD HAMBURGER (Left)
        const logoArea = headerContainer.querySelector('.logo-area');
        if (logoArea && !document.getElementById('side-menu-trigger')) {
            const hamburgerHTML = `
                <div class="side-menu-trigger" id="side-menu-trigger" onclick="UnifiedNav.toggleSidebar(true)">
                    <i>☰</i>
                </div>
            `;
            logoArea.insertAdjacentHTML('beforebegin', hamburgerHTML);
        }
        
        // 2. Role Switcher in Header (Desktop Only)
        const headerActions = headerContainer.querySelector('.header-actions');
        if (headerActions && !document.getElementById('header-mode-toggle')) {
            const toggleHTML = `
                <div class="header-mode-toggle desktop-only" id="header-mode-toggle" style="margin-left: auto; margin-right: 1rem;">
                    <div class="mode-pill" id="header-mode-group-pill" onclick="UnifiedNav.switchMode('group')">Group</div>
                    <div class="mode-pill" id="header-mode-player-pill" onclick="UnifiedNav.switchMode('player')">Player</div>
                </div>
            `;
            headerActions.insertAdjacentHTML('beforebegin', toggleHTML);
        }
        
        // 3. Update Profile Trigger for Dropdown
        const profileTrigger = document.querySelector('.user-profile-trigger');
        if (profileTrigger) {
            profileTrigger.removeAttribute('onclick');
            profileTrigger.onclick = (e) => {
                e.stopPropagation();
                this.toggleProfileDropdown();
            };
        }
    },

    renderProfileDropdown() {
        if (document.getElementById('pro-dropdown')) return;
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
                
                <div class="dropdown-mode-switcher">
                    <div class="dropdown-mode-pill active" id="drop-mode-group" onclick="UnifiedNav.switchMode('group')">Group Hub</div>
                    <div class="dropdown-mode-pill" id="drop-mode-player" onclick="UnifiedNav.switchMode('player')">Player Pro</div>
                </div>
                
                <div class="dropdown-divider"></div>
                
                <a href="player-settings.html" class="dropdown-link"><i>⚙️</i> Account Settings</a>
                <a href="#" class="dropdown-link" onclick="handleLogout(); return false;" style="color: #ef4444;"><i>🚪</i> Logout</a>
            </div>
        `;
        const headerActions = document.querySelector('.header-actions');
        if (headerActions) headerActions.insertAdjacentHTML('beforeend', dropdownHTML);
    },

    toggleProfileDropdown(show) {
        const dropdown = document.getElementById('pro-dropdown');
        if (!dropdown) return;
        
        if (show === false) {
            dropdown.classList.remove('active');
        } else {
            const isActive = dropdown.classList.contains('active');
            // Close others if opening
            if (!isActive) {
                dropdown.classList.add('active');
                this.syncUserData();
            } else {
                dropdown.classList.remove('active');
            }
        }
    },

    autoLabelTables() {
        document.querySelectorAll('table').forEach(table => {
            const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent.trim());
            if (headers.length === 0) return;
            table.querySelectorAll('tbody tr').forEach(row => {
                row.querySelectorAll('td').forEach((td, index) => {
                    if (headers[index] && !td.getAttribute('data-label')) {
                        td.setAttribute('data-label', headers[index]);
                    }
                });
            });
        });
        console.log('📋 Tables auto-labeled for mobile view');
    },

    bindEvents() {
        const overlay = document.getElementById('sidebar-overlay');
        if (overlay) {
            overlay.addEventListener('click', () => this.toggleSidebar(false));
        }

        // Close dropdown on click outside
        document.addEventListener('click', () => this.toggleProfileDropdown(false));
    },

    toggleSidebar(show) {
        const sidebar = document.getElementById('pro-sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        if (show) {
            sidebar.classList.add('active');
            overlay.classList.add('active');
            this.syncUserData();
        } else {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        }
    },

    syncUserData() {
        const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
        const name = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Professional';
        const initial = (user.first_name || 'P').charAt(0);
        
        let role = 'Member';
        const type = user.account_type || localStorage.getItem('userType');
        if (type === 'platform_admin') role = 'Super Admin';
        else if (type === 'coach') role = 'Technical Coach';
        else if (type === 'scout') role = 'Talent Scout';
        else if (type === 'admin') role = 'Group Admin';

        const avatarEl = document.getElementById('dropdown-avatar');
        const nameEl = document.getElementById('dropdown-name');
        const roleEl = document.getElementById('dropdown-role');
        
        if (avatarEl) avatarEl.textContent = initial;
        if (nameEl) nameEl.textContent = name;
        if (roleEl) roleEl.textContent = role;

        this.updateModeUI();
    },

    updateModeUI(mode) {
        if (!mode) {
            mode = window.location.href.includes('player-dashboard.html') ? 'player' : 'group';
        }

        // 1. Header Pills
        const gPill = document.getElementById('header-mode-group-pill');
        const pPill = document.getElementById('header-mode-player-pill');
        if (gPill && pPill) {
            gPill.classList.toggle('active', mode === 'group');
            pPill.classList.toggle('active', mode === 'player');
        }

        // 2. Dropdown Pills
        const dgPill = document.getElementById('drop-mode-group');
        const dpPill = document.getElementById('drop-mode-player');
        if (dgPill && dpPill) {
            dgPill.classList.toggle('active', mode === 'group');
            dpPill.classList.toggle('active', mode === 'player');
        }
    },

    switchMode(mode) {
        if (mode === 'player') {
            window.location.href = 'player-dashboard.html';
        } else {
            const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
            const type = user.account_type || localStorage.getItem('userType');

            if (type === 'platform_admin' || window.location.href.includes('super-admin')) {
                window.location.href = 'super-admin-dashboard.html';
            } else if (type === 'coach' || window.location.href.includes('coach-dashboard')) {
                window.location.href = 'coach-dashboard.html';
            } else if (type === 'scout' || window.location.href.includes('scout-dashboard')) {
                window.location.href = 'scout-dashboard.html';
            } else {
                window.location.href = 'admin-dashboard.html';
            }
        }
        this.toggleSidebar(false);
    },

    renderMenu() {
        const url = window.location.href;
        const isPlayer = url.includes('player-dashboard.html');
        const isSuperAdmin = url.includes('super-admin-dashboard.html');
        const isCoach = url.includes('coach-dashboard.html');
        const isScout = url.includes('scout-dashboard.html') || url.includes('scouting.html');

        const nav = document.getElementById('sidebar-nav-content');
        if (!nav) return;

        let menuHtml = '';

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
        window.addEventListener('scroll', () => {
            const header = document.querySelector('.pro-header');
            if (!header) return;
            if (window.scrollY > 30) {
                header.style.height = '68px';
                header.style.background = 'rgba(10, 10, 12, 0.95)';
                header.style.borderBottomColor = 'rgba(255, 255, 255, 0.15)';
            } else {
                header.style.height = '80px';
                header.style.background = 'rgba(10, 10, 12, 0.7)';
                header.style.borderBottomColor = 'rgba(255, 255, 255, 0.08)';
            }
        });
    }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => UnifiedNav.init());
window.UnifiedNav = UnifiedNav; // Global access
