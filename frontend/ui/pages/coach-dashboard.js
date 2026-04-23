import { Card } from '../components/card.js';
import { Button } from '../components/button.js';

/**
 * Coach Dashboard Page
 * @returns {string} HTML string
 */
export const CoachDashboard = () => {
    return `
        <div class="page-header" style="margin-bottom: var(--space-6);">
            <h1 class="text-neon">Coach Dashboard</h1>
            <p style="color: hsl(var(--muted));">Manage your squads, sessions, and scouting reports.</p>
        </div>

        <div class="grid">
            ${Card({
                title: "Next Training",
                content: `
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <p style="font-weight: 800; font-size: var(--text-lg); color: hsl(var(--accent-cyan)); margin: 0;">Today 18:00</p>
                            <p style="font-size: var(--text-sm); opacity: 0.7; margin: 4px 0 0 0;">Under 14s · Training Pitch A</p>
                        </div>
                        ${Button({ 
                            text: "Attendance", 
                            variant: "primary", 
                            className: "btn-small",
                            onClick: "navigateTo('groups')" 
                        })}
                    </div>
                `,
                glass: true
            })}

            ${Card({
                title: "Squad Overview",
                content: `
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4);">
                        <div style="text-align: center; padding: var(--space-3); background: hsla(0, 0%, 100%, 0.03); border-radius: var(--radius-md);">
                            <span style="display: block; font-size: 1.5rem; font-weight: 800;">18</span>
                            <span style="font-size: var(--text-xs); opacity: 0.6; text-transform: uppercase;">Players</span>
                        </div>
                        <div style="text-align: center; padding: var(--space-3); background: hsla(0, 0%, 100%, 0.03); border-radius: var(--radius-md);">
                            <span style="display: block; font-size: 1.5rem; font-weight: 800; color: #4ade80;">92%</span>
                            <span style="font-size: var(--text-xs); opacity: 0.6; text-transform: uppercase;">Avg. Att.</span>
                        </div>
                    </div>
                `
            })}

            ${Card({
                title: "Recent Reports",
                content: `
                    <div style="display: flex; flex-direction: column; gap: var(--space-3);">
                        <div style="display: flex; justify-content: space-between; align-items: center; font-size: var(--text-sm);">
                            <span>Marcus J. (U14)</span>
                            <span style="color: hsl(var(--primary)); cursor: pointer;" onclick="navigateTo('profile')">View Report</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center; font-size: var(--text-sm);">
                            <span>Sarah K. (U16)</span>
                            <span style="color: hsl(var(--primary)); cursor: pointer;" onclick="navigateTo('profile')">View Report</span>
                        </div>
                    </div>
                `
            })}
        </div>

        <div style="margin-top: var(--space-8);">
            <h3 style="margin-bottom: var(--space-4);">Management Actions</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3);">
                ${Button({ text: "New Session", variant: "primary", onClick: "navigateTo('events')" })}
                ${Button({ text: "Message Squad", variant: "secondary", onClick: "navigateTo('groups')" })}
            </div>
        </div>
    `;
};
