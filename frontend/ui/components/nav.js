/**
 * Bottom Navigation Component
 * @param {Object} props
 * @param {Array} props.items - Array of nav items { label, icon, id, active }
 * @returns {string} HTML string
 */
export const BottomNav = ({ items = [] }) => {
    return `
        <nav class="bottom-nav">
            <div class="container" style="display: flex; justify-content: space-around; align-items: center; height: 100%;">
                ${items.map(item => `
                    <a href="?page=${item.id}" 
                       class="nav-item ${item.active ? 'active' : ''}" 
                       onclick="event.preventDefault(); navigateTo('${item.id}')"
                       style="display: flex; flex-direction: column; align-items: center; text-decoration: none; color: inherit; gap: 4px; padding: 10px;"
                    >
                        <span class="nav-icon">${item.icon}</span>
                        <span style="font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">${item.label}</span>
                    </a>
                `).join('')}
            </div>
        </nav>
        
        <style>
            .bottom-nav {
                position: fixed;
                bottom: 0;
                left: 0;
                width: 100%;
                height: 70px;
                background: hsla(var(--surface-h), var(--surface-s), var(--surface-l), 0.95);
                backdrop-filter: blur(20px);
                border-top: 1px solid hsl(var(--border));
                z-index: 1000;
                padding-bottom: env(safe-area-inset-bottom);
            }
            .nav-item {
                opacity: 0.6;
                transition: opacity 0.2s ease;
            }
            .nav-item.active {
                opacity: 1;
                color: hsl(var(--primary));
            }
        </style>
    `;
};
