/**
 * App Layout Component
 * @param {Object} props
 * @param {string} props.content - The page content
 * @param {string} props.nav - The navigation HTML
 * @returns {string} HTML string
 */
export const AppLayout = ({ content, nav }) => {
    return `
        <div class="app-shell" style="min-height: 100vh; padding-bottom: 80px;">
            <header style="padding: var(--space-5) 0; border-bottom: 1px solid hsl(var(--border)); margin-bottom: var(--space-6);">
                <div class="container">
                    <h1 class="text-neon" style="font-size: var(--text-xl);">ClubHub</h1>
                </div>
            </header>
            
            <main class="container">
                ${content}
            </main>
            
            ${nav}
        </div>
    `;
};
