import { Sidebar } from '../components/sidebar.js';
import { DashboardHeader } from '../components/header.js';

/**
 * App Layout Component
 */
export const AppLayout = ({ content, nav, navItems }) => {
    return `
        <div class="app-shell" style="min-height: 100vh; display: flex; background: hsl(var(--bg));">
            ${Sidebar({ items: navItems })}
            
            <div class="main-wrapper" style="flex: 1; display: flex; flex-direction: column; min-width: 0;">
                ${DashboardHeader()}
                
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
