/**
 * Sidebar Component
 * @param {Object} props
 * @param {Array} props.items - Array of nav items { label, icon, id, active }
 * @returns {string} HTML string
 */
export const Sidebar = ({ items = [] }) => {
    return `
        <aside class="sidebar desktop-only">
            <div class="sidebar-header">
                <h1 class="text-neon" style="font-size: var(--text-lg); margin-bottom: var(--space-8);">ClubHub</h1>
            </div>
            
            <nav class="sidebar-nav">
                ${items.map(item => `
                    <a href="#" 
                       class="sidebar-item ${item.active ? 'active' : ''}" 
                       onclick="navigateTo('${item.id}')"
                    >
                        <span class="sidebar-icon">${item.icon}</span>
                        <span class="sidebar-label">${item.label}</span>
                    </a>
                `).join('')}
            </nav>
            
            <div class="sidebar-footer">
                <div class="sidebar-item" onclick="navigateTo('login')" style="margin-top: auto; color: #ff4444; cursor: pointer;">
                    <span class="sidebar-icon">🚪</span>
                    <span class="sidebar-label">Sign Out</span>
                </div>
            </div>
        </aside>
        
        <style>
            .sidebar {
                width: 280px;
                height: 100vh;
                position: fixed;
                left: 0;
                top: 0;
                background: hsla(var(--surface-h), var(--surface-s), var(--surface-l), 0.8);
                backdrop-filter: blur(20px);
                border-right: 1px solid hsl(var(--border));
                padding: var(--space-6) var(--space-4);
                display: flex;
                flex-direction: column;
                z-index: 1000;
            }
            
            .sidebar-nav {
                display: flex;
                flex-direction: column;
                gap: var(--space-2);
                flex: 1;
            }
            
            .sidebar-item {
                display: flex;
                align-items: center;
                gap: var(--space-4);
                padding: 0.85rem 1.25rem;
                border-radius: var(--radius-md);
                text-decoration: none;
                color: #fff;
                font-weight: 700;
                font-size: 0.9rem;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                opacity: 0.5;
                margin-bottom: 4px;
                border: 1px solid transparent;
            }
            
            .sidebar-item:hover {
                background: hsla(0, 0%, 100%, 0.05);
                opacity: 1;
                transform: translateX(6px);
                border-color: hsla(0, 0%, 100%, 0.1);
            }
            
            .sidebar-item.active {
                background: hsla(var(--primary-h), var(--primary-s), var(--primary-l), 0.15);
                color: hsl(var(--primary));
                opacity: 1;
                border: 1px solid hsla(var(--primary-h), var(--primary-s), var(--primary-l), 0.3);
                box-shadow: 0 4px 20px rgba(0,0,0,0.2);
            }
            
            .sidebar-item.active .sidebar-icon {
                filter: drop-shadow(0 0 8px hsl(var(--primary)));
            }
            
            .sidebar-icon {
                font-size: 1.4rem;
                width: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .sidebar-label {
                letter-spacing: 0.3px;
            }
            
            @media (max-width: 991px) {
                .sidebar { display: none; }
            }
        </style>
    `;
};
