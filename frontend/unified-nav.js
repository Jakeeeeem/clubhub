/**
 * Unified Pro Navigation Controller
 */
const UnifiedNav = {
    init() {
        console.log('🚀 Unified Nav Initializing...');
        this.renderSidebar();
        this.bindEvents();
        this.updateHeaderState();
    },

    renderSidebar() {
        if (document.getElementById('pro-sidebar')) return;

        const sidebarHTML = `
            <div class="sidebar-overlay" id="sidebar-overlay"></div>
            <aside class="pro-sidebar" id="pro-sidebar">
                <div class="sidebar-header">
                    <div class="sidebar-user-card">
                        <div class="sidebar-avatar" id="sidebar-avatar">?</div>
                        <div class="sidebar-name" id="sidebar-name">User Name</div>
                        
                        <div class="sidebar-mode-switcher">
                            <div class="mode-tab" id="mode-group" onclick="UnifiedNav.switchMode('group')">Group</div>
                            <div class="mode-tab" id="mode-player" onclick="UnifiedNav.switchMode('player')">Player</div>
                        </div>
                    </div>
                </div>

                <div class="sidebar-nav" id="sidebar-nav-content">
                    <!-- Loaded based on mode -->
                </div>

                <div class="sidebar-footer">
                    <a href="#" class="sidebar-link" onclick="logout(); return false;" style="color: #ef4444;">
                        <i>🚪</i> Logout
                    </a>
                </div>
            </aside>
        `;
        document.body.insertAdjacentHTML('beforeend', sidebarHTML);
    },

    bindEvents() {
        // Close sidebar on overlay click
        const overlay = document.getElementById('sidebar-overlay');
        if (overlay) {
            overlay.addEventListener('click', () => this.toggleSidebar(false));
        }

        // Mode toggle sync
        const modeToggle = document.getElementById('mode-toggle');
        if (modeToggle) {
            modeToggle.addEventListener('change', (e) => {
                const mode = e.target.checked ? 'player' : 'group';
                this.updateModeUI(mode);
            });
        }
    },

    toggleSidebar(show) {
        const sidebar = document.getElementById('pro-sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        if (show) {
            sidebar.classList.add('active');
            overlay.classList.add('active');
            this.syncUserData();
            this.renderMenu();
        } else {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        }
    },

    syncUserData() {
        const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
        const name = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'User';
        const initial = (user.first_name || 'U').charAt(0);

        const avatarEl = document.getElementById('sidebar-avatar');
        const nameEl = document.getElementById('sidebar-name');
        
        if (avatarEl) avatarEl.textContent = initial;
        if (nameEl) nameEl.textContent = name;

        // Sync mode tabs
        const isPlayer = window.location.href.includes('player-dashboard.html');
        this.updateModeUI(isPlayer ? 'player' : 'group');
    },

    updateModeUI(mode) {
        const groupTab = document.getElementById('mode-group');
        const playerTab = document.getElementById('mode-player');
        
        if (mode === 'player') {
            if (playerTab) playerTab.classList.add('active');
            if (groupTab) groupTab.classList.remove('active');
        } else {
            if (groupTab) groupTab.classList.add('active');
            if (playerTab) playerTab.classList.remove('active');
        }
    },

    switchMode(mode) {
        if (mode === 'player' && !window.location.href.includes('player-dashboard.html')) {
            window.location.href = 'player-dashboard.html';
        } else if (mode === 'group' && !window.location.href.includes('admin-dashboard.html')) {
            window.location.href = 'admin-dashboard.html';
        }
        this.toggleSidebar(false);
    },

    renderMenu() {
        const isPlayer = window.location.href.includes('player-dashboard.html');
        const nav = document.getElementById('sidebar-nav-content');
        
        if (isPlayer) {
            nav.innerHTML = `
                <div class="nav-group-title">Main</div>
                <a href="#" class="sidebar-link active" onclick="showPlayerSection('overview'); UnifiedNav.toggleSidebar(false); return false;"><i>📊</i> Overview</a>
                <a href="#" class="sidebar-link" onclick="showPlayerSection('club-messenger'); UnifiedNav.toggleSidebar(false); return false;"><i>💬</i> Messenger</a>
                
                <div class="nav-group-title">Career</div>
                <a href="#" class="sidebar-link" onclick="showPlayerSection('teams'); UnifiedNav.toggleSidebar(false); return false;"><i>🛡️</i> My Teams</a>
                <a href="#" class="sidebar-link" onclick="showPlayerSection('my-clubs'); UnifiedNav.toggleSidebar(false); return false;"><i>🏰</i> My Groups</a>
                <a href="#" class="sidebar-link" onclick="window.location.href='scouting.html'"><i>🔍</i> Scouting</a>
                
                <div class="nav-group-title">Finance</div>
                <a href="#" class="sidebar-link" onclick="showPlayerSection('payments'); UnifiedNav.toggleSidebar(false); return false;"><i>💳</i> Payments</a>
                <a href="#" class="sidebar-link" onclick="showPlayerSection('item-shop'); UnifiedNav.toggleSidebar(false); return false;"><i>🎁</i> Shop</a>
                
                <div class="nav-group-title">Settings</div>
                <a href="player-settings.html" class="sidebar-link"><i>⚙️</i> Account Settings</a>
            `;
        } else {
            nav.innerHTML = `
                <div class="nav-group-title">Management</div>
                <a href="#" class="sidebar-link active" onclick="showSection('overview'); UnifiedNav.toggleSidebar(false); return false;"><i>📊</i> Dashboard</a>
                <a href="#" class="sidebar-link" onclick="showSection('players'); UnifiedNav.toggleSidebar(false); return false;"><i>🏃</i> Players</a>
                <a href="#" class="sidebar-link" onclick="showSection('teams'); UnifiedNav.toggleSidebar(false); return false;"><i>🛡️</i> Teams</a>
                
                <div class="nav-group-title">Operations</div>
                <a href="#" class="sidebar-link" onclick="showSection('events'); UnifiedNav.toggleSidebar(false); return false;"><i>📅</i> Events</a>
                <a href="#" class="sidebar-link" onclick="showSection('tournaments'); UnifiedNav.toggleSidebar(false); return false;"><i>🏆</i> Tournaments</a>
                <a href="#" class="sidebar-link" onclick="showSection('tactical-board'); UnifiedNav.toggleSidebar(false); return false;"><i>📝</i> Tactics</a>
                
                <div class="nav-group-title">Recruitment</div>
                <a href="#" class="sidebar-link" onclick="showSection('listings'); UnifiedNav.toggleSidebar(false); return false;"><i>📢</i> Listings</a>
                <a href="scouting.html" class="sidebar-link"><i>🔍</i> Scout Hub</a>
                
                <div class="nav-group-title">Finance</div>
                <a href="#" class="sidebar-link" onclick="showSection('finances'); UnifiedNav.toggleSidebar(false); return false;"><i>💰</i> Finances</a>
            `;
        }
    },

    updateHeaderState() {
        window.addEventListener('scroll', () => {
            const header = document.querySelector('.pro-header');
            if (window.scrollY > 20) {
                header.classList.add('scrolled');
                header.style.height = '64px';
                header.style.background = 'rgba(10, 10, 12, 0.95)';
            } else {
                header.classList.remove('scrolled');
                header.style.height = '72px';
                header.style.background = 'rgba(10, 10, 12, 0.85)';
            }
        });
    }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => UnifiedNav.init());
window.UnifiedNav = UnifiedNav; // Global access
