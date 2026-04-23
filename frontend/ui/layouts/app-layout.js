import { Sidebar } from '../components/sidebar.js';

/**
 * App Layout Component
 * @param {Object} props
 * @param {string} props.content - The page content
 * @param {string} props.nav - The bottom navigation HTML
 * @param {Array} props.navItems - Array of nav items for the sidebar
 * @returns {string} HTML string
 */
export const AppLayout = ({ content, nav, navItems }) => {
    return `
        <div class="app-shell" style="min-height: 100vh; display: flex; background: hsl(var(--bg));">
            ${Sidebar({ items: navItems })}
            
            <div class="main-wrapper" style="flex: 1; display: flex; flex-direction: column; min-width: 0;">
                <header class="mobile-only" style="padding: var(--space-4) 0; border-bottom: 1px solid hsl(var(--border)); background: hsla(var(--surface-h), var(--surface-s), var(--surface-l), 0.5); backdrop-filter: blur(10px); position: sticky; top: 0; z-index: 100;">
                    <div class="container" style="display: flex; justify-content: space-between; align-items: center;">
                        <h1 class="text-neon" style="font-size: var(--text-lg); margin: 0;">ClubHub</h1>
                        <select onchange="window.switchRole(this.value)" style="background: hsl(var(--surface)); color: #fff; border: 1px solid hsl(var(--border)); padding: 4px 8px; border-radius: var(--radius-sm); font-size: 0.7rem; font-weight: 700; text-transform: uppercase;">
                            <option value="player" ${window.currentRole === 'player' ? 'selected' : ''}>Player View</option>
                            <option value="coach" ${window.currentRole === 'coach' ? 'selected' : ''}>Coach View</option>
                            <option value="admin" ${window.currentRole === 'admin' ? 'selected' : ''}>Admin View</option>
                        </select>
                    </div>
                </header>
                
                <main class="container" style="padding-top: var(--space-8); padding-bottom: 100px;">
                    ${content}
                </main>
            </div>
            
            ${nav}
        </div>
        
        <style>
            .main-wrapper {
                margin-left: 280px;
                transition: margin-left 0.3s ease;
            }
            
            @media (max-width: 991px) {
                .main-wrapper {
                    margin-left: 0;
                }
                .desktop-only { display: none !important; }
                .mobile-only { display: flex !important; }
            }
            
            @media (min-width: 992px) {
                .mobile-only { display: none !important; }
            }
        </style>
    `;
};
