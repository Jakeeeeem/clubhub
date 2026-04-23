import { Card } from '../components/card.js';
import { Button } from '../components/button.js';

/**
 * Admin Dashboard Page
 * @returns {string} HTML string
 */
export const AdminDashboard = () => {
    return `
        <div class="page-header" style="margin-bottom: var(--space-6);">
            <h1 class="text-neon" style="color: var(--accent-red);">System Admin</h1>
            <p style="color: hsl(var(--muted));">Global overview and platform management.</p>
        </div>

        <div class="dashboard-card-strip" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--space-4); margin-bottom: var(--space-6);">
            <div class="card glass" style="text-align: center; padding: var(--space-4);">
                <span style="display: block; font-size: var(--text-xs); opacity: 0.6; text-transform: uppercase; margin-bottom: 4px;">Total Users</span>
                <span style="font-size: 1.75rem; font-weight: 900;">1,284</span>
            </div>
            <div class="card glass" style="text-align: center; padding: var(--space-4);">
                <span style="display: block; font-size: var(--text-xs); opacity: 0.6; text-transform: uppercase; margin-bottom: 4px;">Active Groups</span>
                <span style="font-size: 1.75rem; font-weight: 900;">84</span>
            </div>
            <div class="card glass" style="text-align: center; padding: var(--space-4);">
                <span style="display: block; font-size: var(--text-xs); opacity: 0.6; text-transform: uppercase; margin-bottom: 4px;">MoM Growth</span>
                <span style="font-size: 1.75rem; font-weight: 900; color: #4ade80;">+22%</span>
            </div>
            <div class="card glass" style="text-align: center; padding: var(--space-4);">
                <span style="display: block; font-size: var(--text-xs); opacity: 0.6; text-transform: uppercase; margin-bottom: 4px;">Rev (MTD)</span>
                <span style="font-size: 1.75rem; font-weight: 900; color: var(--primary);">£14.2k</span>
            </div>
        </div>

        <div class="grid" style="grid-template-columns: 1fr 350px;">
            <div class="main-admin-column" style="display: flex; flex-direction: column; gap: var(--space-5);">
                ${Card({
                    title: "Pending Verifications",
                    content: `
                        <div style="display: flex; flex-direction: column; gap: var(--space-4);">
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: var(--space-3); background: hsla(0, 0%, 100%, 0.02); border-radius: var(--radius-md);">
                                <div>
                                    <p style="margin: 0; font-weight: 700;">North London Strikers</p>
                                    <p style="margin: 0; font-size: var(--text-xs); opacity: 0.5;">Group Application · 2h ago</p>
                                </div>
                                <div style="display: flex; gap: var(--space-2);">
                                    ${Button({ text: "Approve", variant: "primary", className: "btn-small" })}
                                    ${Button({ text: "Reject", variant: "secondary", className: "btn-small" })}
                                </div>
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: var(--space-3); background: hsla(0, 0%, 100%, 0.02); border-radius: var(--radius-md);">
                                <div>
                                    <p style="margin: 0; font-weight: 700;">Elite Coaching Ltd</p>
                                    <p style="margin: 0; font-size: var(--text-xs); opacity: 0.5;">Provider Verification · 5h ago</p>
                                </div>
                                <div style="display: flex; gap: var(--space-2);">
                                    ${Button({ text: "Approve", variant: "primary", className: "btn-small" })}
                                    ${Button({ text: "Reject", variant: "secondary", className: "btn-small" })}
                                </div>
                            </div>
                        </div>
                    `
                })}
            </div>

            <aside class="admin-sidebar" style="display: flex; flex-direction: column; gap: var(--space-5);">
                ${Card({
                    title: "System Status",
                    content: `
                        <div style="display: flex; flex-direction: column; gap: var(--space-3);">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <div style="width: 8px; height: 8px; background: #4ade80; border-radius: 50%; box-shadow: 0 0 10px #4ade80;"></div>
                                <span style="font-size: var(--text-sm);">API Gateway: Online</span>
                            </div>
                            <div style="display: center; align-items: center; gap: 10px;">
                                <div style="width: 8px; height: 8px; background: #4ade80; border-radius: 50%; box-shadow: 0 0 10px #4ade80;"></div>
                                <span style="font-size: var(--text-sm);">Stripe Webhooks: Active</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <div style="width: 8px; height: 8px; background: #fbbf24; border-radius: 50%; box-shadow: 0 0 10px #fbbf24;"></div>
                                <span style="font-size: var(--text-sm);">Mailgun: Delayed</span>
                            </div>
                        </div>
                    `,
                    glass: true
                })}

                ${Card({
                    title: "Quick Tasks",
                    content: `
                        <div style="display: flex; flex-direction: column; gap: var(--space-3);">
                            ${Button({ text: "Global Announcement", variant: "secondary", className: "btn-block" })}
                            ${Button({ text: "System Audit", variant: "secondary", className: "btn-block" })}
                            ${Button({ text: "Database Backup", variant: "secondary", className: "btn-block" })}
                        </div>
                    `
                })}
            </aside>
        </div>
    `;
};
