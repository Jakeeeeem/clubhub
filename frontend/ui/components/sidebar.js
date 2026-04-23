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
                <h1 class="text-neon" style="font-size: var(--text-lg); margin-bottom: var(--space-8); text-align: center;">ClubHub</h1>
            </div>
            
            <nav class="sidebar-nav">
                ${items.map(item => `
                    <a href="?page=${item.id}" 
                       class="sidebar-item ${item.active ? 'active' : ''}" 
                       onclick="event.preventDefault(); navigateTo('${item.id}')"
                    >
                        <div class="sidebar-icon-wrapper">
                            <span class="sidebar-icon">${item.icon}</span>
                        </div>
                        <span class="sidebar-label">${item.label}</span>
                    </a>
                `).join('')}
            </nav>
            
            <div class="sidebar-footer" style="padding-top: var(--space-4); border-top: 1px solid hsl(var(--border));">
                <div class="sidebar-item" onclick="navigateTo('login')" style="color: #ff4444; cursor: pointer;">
                    <div class="sidebar-icon-wrapper">
                        <span class="sidebar-icon">🚪</span>
                    </div>
                    <span class="sidebar-label">Sign Out</span>
                </div>
            </div>
        </aside>
        
        <div class="sidebar-overlay mobile-only" onclick="document.body.classList.remove('sidebar-open')"></div>

        <style>
            .sidebar {
                width: 280px;
                height: 100vh;
                position: fixed;
                left: 0;
                top: 0;
                background: hsla(var(--surface-h), var(--surface-s), var(--surface-l), 0.95);
                backdrop-filter: blur(20px);
                border-right: 1px solid hsl(var(--border));
                padding: var(--space-6) var(--space-4);
                display: flex;
                flex-direction: column;
                z-index: 2000;
                transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
            
            .sidebar-nav {
                display: flex;
                flex-direction: column;
                gap: var(--space-3);
                flex: 1;
            }
            
            .sidebar-item {
                display: flex;
                align-items: center;
                gap: var(--space-4);
                padding: 0.75rem 1rem;
                border-radius: var(--radius-md);
                text-decoration: none;
                color: #fff;
                font-weight: 700;
                font-size: 0.9rem;
                transition: all 0.2s ease;
                opacity: 0.6;
                border: 1px solid transparent;
            }
            
            .sidebar-icon-wrapper {
                width: 40px;
                height: 40px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: hsla(0, 0%, 100%, 0.03);
                border-radius: 12px;
                flex-shrink: 0;
                transition: all 0.2s ease;
            }

            .sidebar-item:hover {
                background: hsla(0, 0%, 100%, 0.05);
                opacity: 1;
                transform: translateX(4px);
            }

            .sidebar-item:hover .sidebar-icon-wrapper {
                background: hsla(0, 0%, 100%, 0.08);
                transform: scale(1.05);
            }
            
            .sidebar-item.active {
                background: hsla(var(--primary-h), var(--primary-s), var(--primary-l), 0.1);
                color: #fff;
                opacity: 1;
                border: 1px solid hsla(var(--primary-h), var(--primary-s), var(--primary-l), 0.2);
            }

            .sidebar-item.active .sidebar-icon-wrapper {
                background: hsl(var(--primary));
                box-shadow: 0 4px 15px hsla(var(--primary-h), var(--primary-s), var(--primary-l), 0.4);
            }
            
            .sidebar-icon {
                font-size: 1.25rem;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .sidebar-overlay {
                position: fixed;
                inset: 0;
                background: rgba(0,0,0,0.5);
                backdrop-filter: blur(4px);
                z-index: 1500;
                opacity: 0;
                visibility: hidden;
                transition: all 0.3s ease;
            }

            @media (max-width: 991px) {
                .sidebar {
                    transform: translateX(-100%);
                    display: flex !important;
                }
                
                body.sidebar-open .sidebar {
                    transform: translateX(0);
                }

                body.sidebar-open .sidebar-overlay {
                    opacity: 1;
                    visibility: visible;
                }
            }
        </style>
    `;
};
