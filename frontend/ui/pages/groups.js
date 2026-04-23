import { Card } from '../components/card.js';
import { Button } from '../components/button.js';

/**
 * Groups / Clubs Listing Page
 * @returns {string} HTML string
 */
export const GroupsPage = () => {
    return `
        <div class="page-header" style="margin-bottom: var(--space-6);">
            <h1 class="text-neon">My Groups</h1>
            <p style="color: hsl(var(--muted));">Manage your memberships and discover new groups.</p>
        </div>

        <div style="margin-bottom: var(--space-6);">
            <input type="text" placeholder="Search groups..." style="width: 100%; padding: var(--space-4); background: hsla(0, 0%, 100%, 0.05); border: 1px solid hsl(var(--border)); border-radius: var(--radius-md); color: #fff;">
        </div>

        <div class="grid">
            ${Card({
                title: "North London Elite",
                content: `
                    <p style="font-size: var(--text-sm); opacity: 0.7; margin-bottom: var(--space-4);">Premier Youth Academy · Football</p>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: var(--text-xs); font-weight: 700; color: #4ade80;">Member</span>
                        ${Button({ text: "Manage", variant: "secondary", className: "btn-small" })}
                    </div>
                `,
                glass: true
            })}

            ${Card({
                title: "Westside Basketball",
                content: `
                    <p style="font-size: var(--text-sm); opacity: 0.7; margin-bottom: var(--space-4);">Community League · Basketball</p>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: var(--text-xs); font-weight: 700; color: #4ade80;">Member</span>
                        ${Button({ text: "Manage", variant: "secondary", className: "btn-small" })}
                    </div>
                `
            })}

            <div class="card" style="border: 2px dashed hsl(var(--border)); background: transparent; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: var(--space-8); cursor: pointer; transition: all 0.2s ease;">
                <span style="font-size: 2rem; margin-bottom: var(--space-2);">🔍</span>
                <span style="font-weight: 700; color: hsl(var(--muted));">Discover Groups</span>
            </div>
        </div>
    `;
};
