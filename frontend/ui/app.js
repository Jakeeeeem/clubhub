import { AppLayout } from './layouts/app-layout.js';
import { BottomNav } from './components/nav.js';
import { PlayerDashboard } from './pages/player-dashboard.js';
import { CoachDashboard } from './pages/coach-dashboard.js';
import { AdminDashboard } from './pages/admin-dashboard.js';
import { GroupsPage } from './pages/groups.js';
import { EventsPage } from './pages/events.js';
import { LoginPage } from './pages/login.js';

window.currentRole = 'player'; // 'player', 'coach', 'admin', 'auth'

const getNavItems = () => {
    const role = window.currentRole;
    
    if (role === 'admin') {
        return [
            { label: 'Overview', icon: '📊', id: 'home', active: true },
            { label: 'Player List', icon: '👥', id: 'players' },
            { label: 'Squads & Teams', icon: '🛡️', id: 'groups' },
            { label: 'Event Manager', icon: '📅', id: 'events' },
            { label: 'Admin Chat', icon: '💬', id: 'chat' },
            { label: 'Staff', icon: '👤', id: 'staff' },
            { label: 'System Settings', icon: '⚙️', id: 'settings' }
        ];
    }
    
    if (role === 'coach') {
        return [
            { label: 'Overview', icon: '🏠', id: 'home', active: true },
            { label: 'My Squads', icon: '👥', id: 'groups' },
            { label: 'Event Manager', icon: '📅', id: 'events' },
            { label: 'Performance', icon: '📈', id: 'profile' },
            { label: 'Messages', icon: '💬', id: 'chat' },
            { label: 'Settings', icon: '⚙️', id: 'settings' }
        ];
    }
    
    // Default: Player
    return [
        { label: 'Overview', icon: '🏠', id: 'home', active: true },
        { label: 'My Groups', icon: '🛡️', id: 'groups' },
        { label: 'My Sessions', icon: '📅', id: 'events' },
        { label: 'Performance', icon: '📈', id: 'profile' },
        { label: 'Payments', icon: '💳', id: 'finance' },
        { label: 'Settings', icon: '⚙️', id: 'settings' }
    ];
};

let navItems = getNavItems();

const render = (pageContent) => {
    const app = document.querySelector('#app');
    
    if (window.currentRole === 'auth') {
        app.innerHTML = pageContent;
        return;
    }

    app.innerHTML = AppLayout({
        content: pageContent,
        nav: BottomNav({ items: navItems }),
        navItems: navItems
    });

    // Initialize Group Switcher if it exists
    const switcherContainer = document.getElementById('group-switcher-container');
    if (switcherContainer && window.GroupSwitcher) {
        window.GroupSwitcher.render(switcherContainer);
    }
};

// Simple Router
window.navigateTo = (pageId, fromUrl = false) => {
    // Update URL if not triggered by popstate/load
    if (!fromUrl) {
        const url = new URL(window.location);
        url.searchParams.set('page', pageId);
        window.history.pushState({}, '', url);
    }

    // Update active state for main nav items
    navItems.forEach(item => item.active = item.id === pageId);
    
    if (pageId === 'login') {
        window.currentRole = 'auth';
        render(LoginPage());
        return;
    }

    if (pageId === 'home' || pageId === 'dashboard') {
        const homeItem = navItems.find(i => i.id === 'home');
        if (homeItem) homeItem.active = true;
        
        if (window.currentRole === 'coach') {
            render(CoachDashboard());
        } else if (window.currentRole === 'admin') {
            render(AdminDashboard());
        } else {
            render(PlayerDashboard());
        }
    } else if (pageId === 'groups') {
        render(GroupsPage());
    } else if (pageId === 'events' || pageId === 'training') {
        render(EventsPage());
    } else if (pageId === 'players') {
        render(`
            <div class="page-header" style="margin-bottom: var(--space-6);">
                <h1 class="text-neon">Player Management</h1>
                <p style="color: hsl(var(--muted));">Global directory of all platform athletes.</p>
            </div>
            <div class="grid">
                <div class="card glass">Player List Loading...</div>
            </div>
        `);
    } else if (pageId === 'chat') {
        render(`
            <div class="page-header" style="margin-bottom: var(--space-6);">
                <h1 class="text-neon">Messenger</h1>
                <p style="color: hsl(var(--muted));">Real-time communication with your groups and staff.</p>
            </div>
            <div class="card glass" style="height: 400px; display: flex; align-items: center; justify-content: center;">
                <p>Select a conversation to start chatting</p>
            </div>
        `);
    } else if (pageId === 'staff') {
        render(`
            <div class="page-header" style="margin-bottom: var(--space-6);">
                <h1 class="text-neon">Staff Directory</h1>
                <p style="color: hsl(var(--muted));">Manage coaches, admins, and support staff.</p>
            </div>
            <div class="grid">
                <div class="card glass">Staff List Loading...</div>
            </div>
        `);
    } else if (pageId === 'approvals') {
        render(`
            <div class="page-header" style="margin-bottom: var(--space-6);">
                <h1 class="text-neon">Approvals</h1>
                <p style="color: hsl(var(--muted));">Manage pending group and provider applications.</p>
            </div>
            <div class="grid">
                <div class="card glass">No pending approvals at this time.</div>
            </div>
        `);
    } else if (pageId === 'finance') {
        render(`
            <div class="page-header" style="margin-bottom: var(--space-6);">
                <h1 class="text-neon">Finance Hub</h1>
                <p style="color: hsl(var(--muted));">Track revenue, payouts, and financial health.</p>
            </div>
            <div class="grid">
                <div class="card glass" style="padding: var(--space-6);">
                    <h3 style="margin-top: 0;">Revenue Overview</h3>
                    <p style="font-size: 2rem; font-weight: 900; color: #4ade80;">£14,200.00 <span style="font-size: 1rem; opacity: 0.5;">MTD</span></p>
                </div>
                <div class="card glass" style="padding: var(--space-6);">
                    <h3 style="margin-top: 0;">Next Payout</h3>
                    <p style="font-size: 2rem; font-weight: 900; color: var(--primary);">£2,450.00 <span style="font-size: 1rem; opacity: 0.5;">Friday</span></p>
                </div>
            </div>
        `);
    } else if (pageId === 'profile' || pageId === 'settings') {
        render(`
            <div class="page-header" style="margin-bottom: var(--space-6);">
                <h1 class="text-neon">Account Settings</h1>
                <p style="color: hsl(var(--muted));">Manage your profile, billing, and preferences.</p>
            </div>
            <div class="card glass">
                <div style="display: flex; align-items: center; gap: var(--space-4); margin-bottom: var(--space-6);">
                    <div style="width: 80px; height: 80px; border-radius: 50%; background: hsl(var(--primary)); display: flex; align-items: center; justify-content: center; font-size: 2rem; font-weight: 900; color: #fff;">JD</div>
                    <div>
                        <h2 style="margin: 0;">John Doe</h2>
                        <p style="margin: 4px 0 0 0; opacity: 0.6;">Premium ${window.currentRole.charAt(0).toUpperCase() + window.currentRole.slice(1)} · London</p>
                    </div>
                </div>
                <div style="display: flex; flex-direction: column; gap: var(--space-4);">
                    <div class="btn btn-secondary" style="justify-content: flex-start;" onclick="alert('Settings coming soon')">👤 Profile Details</div>
                    <div class="btn btn-secondary" style="justify-content: flex-start;" onclick="alert('Payments coming soon')">💳 Payment Methods</div>
                    <div class="btn btn-secondary" style="justify-content: flex-start; color: #ff4444;" onclick="navigateTo('login')">🚪 Sign Out</div>
                </div>
            </div>
        `);
    } else {
        render(`<div style="padding: 100px 0; text-align: center;"><h2>${pageId.charAt(0).toUpperCase() + pageId.slice(1)} coming soon</h2></div>`);
    }
    
    // Scroll to top on navigation
    window.scrollTo(0, 0);
};

// Demo Role Switcher
window.switchRole = (role) => {
    window.currentRole = role;
    navItems = getNavItems();
    window.navigateTo('home');
};

// Initial render
document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const page = params.get('page') || 'login';
    window.navigateTo(page, true);
});

// Handle browser back/forward
window.onpopstate = () => {
    const params = new URLSearchParams(window.location.search);
    const page = params.get('page') || 'home';
    window.navigateTo(page, true);
};
