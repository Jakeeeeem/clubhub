/**
 * Dashboard Loaders
 * Unified functions to populate admin dashboards with live/demo data
 */

window.DashboardLoaders = {
    async initAdmin() {
        console.log("🚀 Initializing Admin Dashboard Data...");
        this.loadStats();
        this.loadActivityFeed();
        this.loadRecentMembers();
        this.loadTeams();
        this.loadStaff();
        this.loadAllMembers();
        this.loadScoutApprovals();
    },

    async loadStats() {
        try {
            const stats = await apiService.get('/api/admin/stats');
            if (stats) {
                if (document.getElementById('totalMembers')) document.getElementById('totalMembers').textContent = stats.totalMembers || 0;
                if (document.getElementById('monthlyRevenue')) document.getElementById('monthlyRevenue').textContent = '£' + (stats.monthlyRevenue || 0).toLocaleString();
                if (document.getElementById('activeEvents')) document.getElementById('activeEvents').textContent = stats.activeEvents || 0;
                if (document.getElementById('pendingScouts')) document.getElementById('pendingScouts').textContent = stats.pendingScouts || 0;
            }
        } catch (e) { console.warn("Stats load failed", e); }
    },

    async loadActivityFeed() {
        const container = document.getElementById('activityFeed');
        if (!container) return;
        try {
            const { activity } = await apiService.get('/api/feed');
            if (!activity || activity.length === 0) return;
            
            container.innerHTML = activity.map(a => `
                <div class="feed-entry">
                    <div class="feed-icon" style="background:${a.type === 'user_signup' ? 'rgba(74,222,128,0.1)' : 'rgba(220,38,38,0.1)'}; color:${a.type === 'user_signup' ? '#4ade80' : '#f87171'};">
                        ${a.type === 'user_signup' ? '👤' : a.type === 'payment' ? '💳' : '📅'}
                    </div>
                    <div class="feed-meta">
                        <strong>${a.title}</strong>
                        <span>${a.user_email || ''}</span>
                    </div>
                    <span class="feed-time">${this.formatRelativeTime(a.timestamp)}</span>
                </div>
            `).join('');
        } catch (e) { }
    },

    async loadRecentMembers() {
        const container = document.getElementById('recentMembersList');
        if (!container) return;
        try {
            const { players } = await apiService.get('/api/members');
            if (!players || players.length === 0) {
                container.innerHTML = '<p style="color:var(--text-muted); font-size:0.85rem;">No recent members.</p>';
                return;
            }
            
            container.innerHTML = players.slice(0, 5).map(p => `
                <div style="display:flex; align-items:center; gap:1rem; padding:0.75rem; background:rgba(255,255,255,0.03); border-radius:12px; border:1px solid rgba(255,255,255,0.05);">
                    <div style="width:36px; height:36px; border-radius:10px; background:rgba(220,38,38,0.15); color:#f87171; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:0.9rem;">
                        ${(p.first_name || 'P').charAt(0)}
                    </div>
                    <div style="flex:1;">
                        <div style="font-size:0.9rem; font-weight:600; color:#fff;">${p.first_name} ${p.last_name}</div>
                        <div style="font-size:0.75rem; color:var(--text-muted);">${p.team_name || 'Unassigned'}</div>
                    </div>
                    <button class="btn btn-text btn-small" onclick="window.location.href='admin-members.html'">View</button>
                </div>
            `).join('');
        } catch (e) { }
    },

    async loadTeams() {
        const container = document.getElementById('teamsListContainer') || document.getElementById('adminTeamsContainer');
        if (!container) return;
        try {
            const { teams } = await apiService.get('/api/teams');
            if (!teams || teams.length === 0) {
                container.innerHTML = '<div style="grid-column:1/-1; padding:3rem; text-align:center; color:var(--text-muted);">No teams created yet.</div>';
                return;
            }
            container.innerHTML = teams.map(t => `
                <div class="glass-card" style="padding:1.25rem; border:1px solid rgba(255,255,255,0.05);">
                    <div style="display:flex; justify-content:space-between; align-items:start;">
                        <h3 style="font-size:1.1rem; margin-bottom:0.25rem;">${t.name}</h3>
                        <span class="badge" style="background:rgba(59,130,246,0.1); color:#60a5fa;">${t.age_group || 'Open'}</span>
                    </div>
                    <p style="font-size:0.8rem; color:var(--text-muted); margin-bottom:1rem;">Coach: ${t.coach_name || 'Unassigned'}</p>
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-size:0.75rem; font-weight:700;">${t.player_count || 0} Players</span>
                        <button class="btn btn-text btn-small" onclick="window.location.href='admin-teams.html?id=${t.id}'">Manage</button>
                    </div>
                </div>
            `).join('');
        } catch (e) { }
    },

    async loadStaff() {
        const tableBody = document.getElementById('staffTableBody');
        if (!tableBody) return;
        try {
            const { staff } = await apiService.get('/api/members?role=coach');
            if (!staff || staff.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:2rem; opacity:0.5;">No staff found</td></tr>';
                return;
            }
            tableBody.innerHTML = staff.map(s => `
                <tr style="border-top:1px solid rgba(255,255,255,0.05);">
                    <td style="padding:1rem 0;">${s.first_name} ${s.last_name}</td>
                    <td style="padding:1rem 0;">Coach</td>
                    <td style="padding:1rem 0;">${s.team_name || 'All Squads'}</td>
                    <td style="padding:1rem 0;"><span class="badge" style="background:rgba(74,222,128,0.1); color:#4ade80;">Active</span></td>
                    <td style="padding:1rem 0; text-align:right;">
                        <button class="btn btn-text btn-small" onclick="showNotification('Staff details coming soon', 'info')">Edit</button>
                    </td>
                </tr>
            `).join('');
        } catch (e) { }
    },

    async loadAllMembers() {
        const tbody = document.getElementById('membersTableBody');
        if (!tbody) return;
        try {
            const response = await apiService.get('/api/members') || {};
            let players = response.players || [];
            
            if ((!players || players.length === 0) && localStorage.getItem('isDemoSession') === 'true') {
                players = [
                    { id: 'p1', first_name: 'Marcus', last_name: 'Thompson', role: 'Player', team_name: 'Under 16s', status: 'Active' },
                    { id: 'p2', first_name: 'Sarah', last_name: 'Davies', role: 'Parent', team_name: 'Under 12s', status: 'Active' },
                    { id: 'p3', first_name: 'James', last_name: 'Wilson', role: 'Player', team_name: 'First Team', status: 'Active' },
                    { id: 'p4', first_name: 'Emma', last_name: 'Knight', role: 'Coach', team_name: 'Under 14s', status: 'Active' },
                    { id: 'p5', first_name: 'Oliver', last_name: 'Smith', role: 'Player', team_name: 'Under 16s', status: 'Active' }
                ];
            }

            if (!players || players.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" style="padding:3rem; text-align:center; color:var(--text-muted);">No members found.</td></tr>';
                return;
            }

            tbody.innerHTML = players.map(p => `
                <tr style="border-top:1px solid rgba(255,255,255,0.05);">
                    <td data-label="Name" style="padding:1rem 0; font-weight:600; color:#fff;"> ${p.first_name} ${p.last_name}</td>
                    <td data-label="Role" style="padding:1rem 0;">${p.role || (p.is_staff ? 'Coach' : 'Player')}</td>
                    <td data-label="Squad" style="padding:1rem 0;">${p.team_name || 'Unassigned'}</td>
                    <td data-label="Status" style="padding:1rem 0;">
                        <span class="badge" style="background:rgba(74,222,128,0.1); color:#4ade80;">${p.status || 'Active'}</span>
                    </td>
                    <td data-label="Actions" style="padding:1rem 0; text-align:right;">
                        <!-- Actions auto-injected by unified-nav.js -->
                    </td>
                </tr>
            `).join('');
        } catch (e) {
            tbody.innerHTML = '<tr><td colspan="5" style="padding:2rem; text-align:center; color:#f87171;">Failed to load members.</td></tr>';
        }
    },

    async loadScoutApprovals() {
        const list = document.getElementById('scoutApprovalsList');
        if (!list) return;
        try {
            // Check if user is platform admin before calling restricted endpoint
            const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
            const isPlatformAdmin = user.role === 'platform_admin' || user.is_platform_admin === true || user.isPlatformAdmin === true;

            if (!isPlatformAdmin) {
                console.log("ℹ️ Skipping platform scout approvals: user is not a platform admin.");
                list.innerHTML = '<div style="padding:1rem; color:var(--text-muted);">Access restricted to platform administrators.</div>';
                return;
            }

            const approvals = await apiService.getPlatformScoutVerifications();
            if (!approvals || approvals.length === 0) {
                list.innerHTML = '<div style="padding:1rem; color:var(--text-muted);">No pending platform scout approvals.</div>';
                return;
            }
            list.innerHTML = approvals.map(r => `
                <div class="feed-entry" style="align-items:center;">
                    <div class="feed-icon" style="background:rgba(59,130,246,0.08); color:#60a5fa;">🕵️</div>
                    <div class="feed-meta">
                        <strong>${r.name || r.display_name || 'Unknown'}</strong>
                        <span style="display:block; color:var(--text-muted); font-size:0.85rem;">${r.email || r.contact || ''}</span>
                    </div>
                    <div style="margin-left:1rem; display:flex; gap:0.5rem;">
                        <button class="btn btn-primary btn-small" onclick="resolveApproval('${r.id}','approved')">Approve</button>
                    </div>
                </div>
            `).join('');
        } catch (e) { }
    },

    formatRelativeTime(timestamp) {
        const now = new Date();
        const then = new Date(timestamp);
        const diff = now - then;
        const minutes = Math.floor(diff / 60000);
        if (minutes < 60) return minutes + 'm ago';
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return hours + 'h ago';
        return Math.floor(hours / 24) + 'd ago';
    }
};
