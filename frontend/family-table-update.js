// Modern table-based family grid rendering
// Replace the renderFamilyGrid function in player-dashboard.js with this code

function renderFamilyGrid() {
    const grid = document.getElementById('familyGrid');
    if (!grid) return;
    
    if (PlayerDashboardState.family.length === 0) {
        grid.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 4rem 2rem; background: rgba(255,255,255,0.02); border-radius: 12px; border: 1px dashed rgba(255,255,255,0.1);">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin: 0 auto 1.5rem; opacity: 0.3;">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
                <h3 style="margin: 0 0 0.5rem; font-size: 1.25rem;">No Family Members Yet</h3>
                <p style="color: var(--text-muted); margin: 0 0 2rem; max-width: 400px; margin-left: auto; margin-right: auto;">Add your children to manage their sports activities and track their progress</p>
                <button class="btn btn-primary" onclick="openAddChildModal()" style="padding: 0.75rem 2rem;">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style="margin-right: 0.5rem;">
                        <path d="M8 3V13M3 8H13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                    Add First Child
                </button>
            </div>
        `;
        return;
    }
    
    // Modern table layout
    const tableHTML = `
        <div class="table-container" style="background: rgba(255,255,255,0.02); border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); overflow: hidden;">
            <div class="table-header" style="display: flex; justify-content: space-between; align-items: center; padding: 1.5rem; border-bottom: 1px solid rgba(255,255,255,0.1);">
                <h3 style="margin: 0; font-size: 1.1rem;">Family Members (${PlayerDashboardState.family.length})</h3>
                <button class="btn btn-primary btn-small" onclick="openAddChildModal()">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style="margin-right: 0.5rem;">
                        <path d="M8 3V13M3 8H13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                    Add Child
                </button>
            </div>
            <table class="modern-table" style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background: rgba(255,255,255,0.03); border-bottom: 1px solid rgba(255,255,255,0.1);">
                        <th style="padding: 1rem 1.5rem; text-align: left; font-weight: 600; font-size: 0.85rem; color: rgba(255,255,255,0.6); text-transform: uppercase; letter-spacing: 0.5px;">Name</th>
                        <th style="padding: 1rem 1.5rem; text-align: left; font-weight: 600; font-size: 0.85rem; color: rgba(255,255,255,0.6); text-transform: uppercase; letter-spacing: 0.5px;">Age</th>
                        <th style="padding: 1rem 1.5rem; text-align: left; font-weight: 600; font-size: 0.85rem; color: rgba(255,255,255,0.6); text-transform: uppercase; letter-spacing: 0.5px;">Sport</th>
                        <th style="padding: 1rem 1.5rem; text-align: left; font-weight: 600; font-size: 0.85rem; color: rgba(255,255,255,0.6); text-transform: uppercase; letter-spacing: 0.5px;">Position</th>
                        <th style="padding: 1rem 1.5rem; text-align: left; font-weight: 600; font-size: 0.85rem; color: rgba(255,255,255,0.6); text-transform: uppercase; letter-spacing: 0.5px;">Location</th>
                        <th style="padding: 1rem 1.5rem; text-align: right; font-weight: 600; font-size: 0.85rem; color: rgba(255,255,255,0.6); text-transform: uppercase; letter-spacing: 0.5px;">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${PlayerDashboardState.family.map(child => {
                        const age = child.age || calculateAge(child.date_of_birth);
                        const firstName = escapeHTML(child.first_name);
                        const lastName = escapeHTML(child.last_name);
                        const sport = escapeHTML(child.sport || 'Not set');
                        const position = escapeHTML(child.position || 'Not set');
                        const location = escapeHTML(child.location || 'Not set');
                        
                        return `
                            <tr style="border-bottom: 1px solid rgba(255,255,255,0.05); transition: background 0.2s;" onmouseenter="this.style.background='rgba(255,255,255,0.03)'" onmouseleave="this.style.background='transparent'">
                                <td style="padding: 1.25rem 1.5rem;">
                                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                                        <div style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.9rem;">
                                            ${firstName.charAt(0)}
                                        </div>
                                        <div>
                                            <div style="font-weight: 500; font-size: 0.95rem;">${firstName} ${lastName}</div>
                                            <div style="font-size: 0.8rem; color: rgba(255,255,255,0.5); margin-top: 2px;">${child.gender || 'Not specified'}</div>
                                        </div>
                                    </div>
                                </td>
                                <td style="padding: 1.25rem 1.5rem;">
                                    <span style="font-size: 0.95rem;">${age} years</span>
                                </td>
                                <td style="padding: 1.25rem 1.5rem;">
                                    <span style="display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.35rem 0.75rem; background: rgba(220,67,67,0.1); border: 1px solid rgba(220,67,67,0.2); border-radius: 6px; font-size: 0.85rem;">
                                        ⚽ ${sport}
                                    </span>
                                </td>
                                <td style="padding: 1.25rem 1.5rem;">
                                    <span style="font-size: 0.9rem; color: rgba(255,255,255,0.8);">${position}</span>
                                </td>
                                <td style="padding: 1.25rem 1.5rem;">
                                    <span style="font-size: 0.9rem; color: rgba(255,255,255,0.6);">${location}</span>
                                </td>
                                <td style="padding: 1.25rem 1.5rem; text-align: right;">
                                    <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                                        <button class="btn btn-small btn-secondary" onclick="switchProfile('${child.id}')" title="View Profile" style="padding: 0.4rem 0.75rem;">
                                            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                                                <path d="M1 8s3-5 7-5 7 5 7 5-3 5-7 5-7-5-7-5z" stroke="currentColor" stroke-width="1.5"/>
                                                <circle cx="8" cy="8" r="2" stroke="currentColor" stroke-width="1.5"/>
                                            </svg>
                                        </button>
                                        <button class="btn btn-small btn-secondary" onclick="editChildProfile('${child.id}')" title="Edit" style="padding: 0.4rem 0.75rem;">
                                            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                                                <path d="M11.5 2.5l2 2L6 12H4v-2l7.5-7.5z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                                            </svg>
                                        </button>
                                        <button class="btn btn-small btn-danger" onclick="deleteChildProfile('${child.id}')" title="Delete" style="padding: 0.4rem 0.75rem;">
                                            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                                                <path d="M2 4h12M5 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1M13 4v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                                            </svg>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
    
    grid.innerHTML = tableHTML;
}
