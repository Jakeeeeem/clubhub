import { Card } from '../components/card.js';
import { Button } from '../components/button.js';

/**
 * Player Dashboard Page
 * @returns {string} HTML string
 */
export const PlayerDashboard = () => {
    return `
        <div class="page-header" style="margin-bottom: var(--space-6);">
            <h1 class="text-neon">Player Overview</h1>
            <p style="color: hsl(var(--muted));">Track your progress and upcoming sessions.</p>
        </div>

        <div class="grid">
            ${Card({
                title: "Next Session",
                content: `
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <p style="font-weight: 800; font-size: var(--text-lg); color: hsl(var(--primary)); margin: 0;">Tue 18:00</p>
                            <p style="font-size: var(--text-sm); opacity: 0.7; margin: 4px 0 0 0;">Elite Academy · Pitch 2</p>
                        </div>
                        ${Button({ text: "Details", variant: "secondary", className: "btn-small" })}
                    </div>
                `,
                glass: true
            })}

            ${Card({
                title: "Active Groups",
                content: `
                    <div style="display: flex; flex-direction: column; gap: var(--space-3);">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span>London Elite FC</span>
                            <span style="font-weight: 800; color: #4ade80;">Active</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span>Summer League 2024</span>
                            <span style="font-weight: 800; color: #4ade80;">Active</span>
                        </div>
                    </div>
                `
            })}

            ${Card({
                title: "Growth Index",
                content: `
                    <div style="text-align: center;">
                        <p style="font-size: 2.5rem; font-weight: 900; margin: 0; color: #4ade80;">+12.4%</p>
                        <p style="font-size: var(--text-xs); text-transform: uppercase; letter-spacing: 1px; opacity: 0.6; margin-top: 8px;">Scout Visibility is High</p>
                    </div>
                `
            })}
        </div>

        <div style="margin-top: var(--space-8);">
            <h3 style="margin-bottom: var(--space-4);">Quick Actions</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3);">
                ${Button({ text: "Book Event", variant: "primary" })}
                ${Button({ text: "Payments", variant: "secondary" })}
            </div>
        </div>
    `;
};
