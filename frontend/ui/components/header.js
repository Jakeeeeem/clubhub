import { Button } from './button.js';

/**
 * Dashboard Header Component
 * Includes Group Switcher placeholder and User Actions
 * @returns {string} HTML string
 */
export const DashboardHeader = () => {
    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const initials = `${user.first_name?.[0] || 'D'}${user.last_name?.[0] || 'U'}`;

    return `
        <header class="dashboard-header">
            <div class="header-left">
                <button class="mobile-only burger-btn" onclick="document.body.classList.toggle('sidebar-open')">
                    <span></span>
                    <span></span>
                    <span></span>
                </button>
                <div id="group-switcher-container" class="desktop-only">
                    <!-- Loaded by group-switcher.js -->
                    <div class="switcher-skeleton">Loading Group...</div>
                </div>
            </div>
            
            <div class="header-center desktop-only">
                <div class="view-switcher">
                    <button class="${window.currentRole === 'player' ? 'active' : ''}" onclick="window.switchRole('player')">Player Pro</button>
                    <button class="${window.currentRole === 'coach' ? 'active' : ''}" onclick="window.switchRole('coach')">Coach Pro</button>
                    <button class="${window.currentRole === 'admin' ? 'active' : ''}" onclick="window.switchRole('admin')">Groups Hub</button>
                </div>
            </div>

            <div class="header-right">
                <div class="header-actions">
                    <button class="action-btn">
                        <span class="icon">🔔</span>
                        <span class="badge">3</span>
                    </button>
                    
                    <div class="user-profile">
                        <div class="avatar">${initials}</div>
                        <span class="name desktop-only">${user.first_name || 'Demo'} ${user.last_name || 'User'}</span>
                    </div>

                    <button class="btn btn-secondary btn-small" onclick="navigateTo('login')">Logout</button>
                </div>
            </div>
        </header>

        <style>
            .dashboard-header {
                height: 80px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 0 var(--space-6);
                background: hsla(var(--surface-h), var(--surface-s), var(--surface-l), 0.8);
                backdrop-filter: blur(20px);
                border-bottom: 1px solid hsl(var(--border));
                position: sticky;
                top: 0;
                z-index: 100;
            }

            .header-left {
                display: flex;
                align-items: center;
                gap: var(--space-4);
            }

            .burger-btn {
                width: 44px;
                height: 44px;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                gap: 5px;
                background: hsla(0, 0%, 100%, 0.05);
                border: 1px solid hsl(var(--border));
                border-radius: 12px;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .burger-btn span {
                display: block;
                width: 20px;
                height: 2px;
                background: #fff;
                border-radius: 2px;
                transition: all 0.2s ease;
            }

            .burger-btn:hover {
                background: hsla(0, 0%, 100%, 0.1);
                border-color: hsl(var(--primary));
            }

            .header-center {
                position: absolute;
                left: 50%;
                transform: translateX(-50%);
            }

            .view-switcher {
                display: flex;
                background: hsla(0, 0%, 100%, 0.05);
                padding: 4px;
                border-radius: 100px;
                border: 1px solid hsl(var(--border));
            }

            .view-switcher button {
                padding: 6px 16px;
                border-radius: 100px;
                border: none;
                background: transparent;
                color: #fff;
                font-size: 0.75rem;
                font-weight: 700;
                text-transform: uppercase;
                cursor: pointer;
                transition: all 0.2s ease;
                opacity: 0.6;
            }

            .view-switcher button.active {
                background: #fff;
                color: #000;
                opacity: 1;
            }

            .header-actions {
                display: flex;
                align-items: center;
                gap: var(--space-4);
            }

            .action-btn {
                width: 40px;
                height: 40px;
                border-radius: 12px;
                background: hsla(0, 0%, 100%, 0.05);
                border: 1px solid hsl(var(--border));
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                position: relative;
            }

            .action-btn .badge {
                position: absolute;
                top: -4px;
                right: -4px;
                background: hsl(var(--primary));
                color: #fff;
                font-size: 10px;
                font-weight: 900;
                width: 18px;
                height: 18px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                border: 2px solid #000;
            }

            .user-profile {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 4px 12px;
                background: hsla(0, 0%, 100%, 0.05);
                border: 1px solid hsl(var(--border));
                border-radius: 100px;
            }

            .user-profile .avatar {
                width: 32px;
                height: 32px;
                border-radius: 50%;
                background: hsl(var(--primary));
                color: #fff;
                font-size: 0.8rem;
                font-weight: 900;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .user-profile .name {
                font-size: 0.85rem;
                font-weight: 600;
                color: #fff;
            }

            .switcher-skeleton {
                font-size: 0.85rem;
                color: hsl(var(--muted));
                padding: 8px 16px;
                background: hsla(0, 0%, 100%, 0.03);
                border-radius: var(--radius-md);
                border: 1px solid hsl(var(--border));
            }

            @media (max-width: 991px) {
                .dashboard-header {
                    height: 64px;
                    padding: 0 var(--space-4);
                }
            }
        </style>
    `;
};
