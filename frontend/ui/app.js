import { AppLayout } from './layouts/app-layout.js';
import { BottomNav } from './components/nav.js';
import { PlayerDashboard } from './pages/player-dashboard.js';
import { CoachDashboard } from './pages/coach-dashboard.js';
import { AdminDashboard } from './pages/admin-dashboard.js';
import { GroupsPage } from './pages/groups.js';
import { EventsPage } from './pages/events.js';
import { LoginPage } from './pages/login.js';

let currentRole = 'player'; // 'player', 'coach', 'admin', 'auth'

const navItems = [
    { label: 'Home', icon: '🏠', id: 'home', active: true },
    { label: 'Groups', icon: '👥', id: 'groups' },
    { label: 'Events', icon: '📅', id: 'events' },
    { label: 'Profile', icon: '👤', id: 'profile' }
];

const render = (pageContent) => {
    const app = document.querySelector('#app');
    
    if (currentRole === 'auth') {
        app.innerHTML = pageContent;
        return;
    }

    app.innerHTML = AppLayout({
        content: pageContent,
        nav: BottomNav({ items: navItems })
    });
};

// Simple Router
window.navigateTo = (pageId) => {
    // Update active state
    navItems.forEach(item => item.active = item.id === pageId);
    
    if (pageId === 'login') {
        currentRole = 'auth';
        render(LoginPage());
        return;
    }

    if (pageId === 'home') {
        if (currentRole === 'coach') {
            render(CoachDashboard());
        } else if (currentRole === 'admin') {
            render(AdminDashboard());
        } else {
            render(PlayerDashboard());
        }
    } else if (pageId === 'groups') {
        render(GroupsPage());
    } else if (pageId === 'events') {
        render(EventsPage());
    } else if (pageId === 'profile') {
        render(`
            <div class="page-header" style="margin-bottom: var(--space-6);">
                <h1 class="text-neon">My Profile</h1>
                <p style="color: hsl(var(--muted));">Manage your account and preferences.</p>
            </div>
            <div class="card glass">
                <div style="display: flex; align-items: center; gap: var(--space-4); margin-bottom: var(--space-6);">
                    <div style="width: 80px; height: 80px; border-radius: 50%; background: var(--primary); display: flex; align-items: center; justify-content: center; font-size: 2rem; font-weight: 900; color: #000;">JD</div>
                    <div>
                        <h2 style="margin: 0;">John Doe</h2>
                        <p style="margin: 4px 0 0 0; opacity: 0.6;">Premium Player · London</p>
                    </div>
                </div>
                <div style="display: flex; flex-direction: column; gap: var(--space-4);">
                    <div class="btn btn-secondary" style="justify-content: flex-start;">👤 Account Settings</div>
                    <div class="btn btn-secondary" style="justify-content: flex-start;">💳 Payment Methods</div>
                    <div class="btn btn-secondary" style="justify-content: flex-start;">🔔 Notifications</div>
                    <div class="btn btn-secondary" style="justify-content: flex-start; color: var(--accent-red);" onclick="navigateTo('login')">🚪 Sign Out</div>
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
    currentRole = role;
    window.navigateTo('home');
};

// Initial render
document.addEventListener('DOMContentLoaded', () => {
    window.navigateTo('login');
});
