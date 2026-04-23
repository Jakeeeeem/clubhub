import { Card } from '../components/card.js';
import { Button } from '../components/button.js';

/**
 * Events / Booking Page
 * @returns {string} HTML string
 */
export const EventsPage = () => {
    return `
        <div class="page-header" style="margin-bottom: var(--space-6);">
            <h1 class="text-neon">Events & Booking</h1>
            <p style="color: hsl(var(--muted));">Find upcoming tournaments, camps, and sessions.</p>
        </div>

        <div class="dashboard-card-strip" style="display: flex; gap: var(--space-3); overflow-x: auto; padding-bottom: var(--space-4); margin-bottom: var(--space-6);">
            <div class="btn btn-primary" style="flex: 0 0 auto; min-height: auto; padding: 10px 20px;">All</div>
            <div class="btn btn-secondary" style="flex: 0 0 auto; min-height: auto; padding: 10px 20px;">Tournaments</div>
            <div class="btn btn-secondary" style="flex: 0 0 auto; min-height: auto; padding: 10px 20px;">Camps</div>
            <div class="btn btn-secondary" style="flex: 0 0 auto; min-height: auto; padding: 10px 20px;">Training</div>
        </div>

        <div class="grid">
            ${Card({
                title: "Summer Elite Cup",
                content: `
                    <div style="margin-bottom: var(--space-4);">
                        <p style="font-weight: 700; margin: 0;">15-17 July</p>
                        <p style="font-size: var(--text-sm); opacity: 0.6; margin: 4px 0 0 0;">Hackney Marshes · London</p>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-weight: 900; color: var(--primary);">£25.00</span>
                        ${Button({ text: "Book Now", variant: "primary", className: "btn-small" })}
                    </div>
                `,
                glass: true
            })}

            ${Card({
                title: "Pro-ID Selection Day",
                content: `
                    <div style="margin-bottom: var(--space-4);">
                        <p style="font-weight: 700; margin: 0;">22 June</p>
                        <p style="font-size: var(--text-sm); opacity: 0.6; margin: 4px 0 0 0;">St. George's Park</p>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-weight: 900; color: var(--primary);">FREE</span>
                        ${Button({ text: "Register", variant: "primary", className: "btn-small" })}
                    </div>
                `
            })}
        </div>
    `;
};
