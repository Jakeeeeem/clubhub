/**
 * Tournament UI - Premium, "FIFA-style" components for Brackets and Leagues
 * Designed to be shared across Coach and Admin dashboards.
 */

const TournamentUI = {
    /**
     * Renders a knockout tournament bracket (tree)
     * @param {Array} matches - List of matches with round_number
     * @param {string} containerId - ID of the target div
     */
    renderBracket(matches, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        let bracketMatches = matches.filter(m => m.round_number !== null && m.round_number !== undefined);
        if (bracketMatches.length === 0) bracketMatches = matches;

        if (bracketMatches.length === 0) {
            container.innerHTML = `
                <div style="text-align:center; padding: 4rem; opacity: 0.5;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">🏆</div>
                    <p>Bracket will be generated once teams are finalized.</p>
                </div>`;
            return;
        }

        const rounds = {};
        bracketMatches.forEach(m => {
            const rk = m.round_number ?? 1;
            if (!rounds[rk]) rounds[rk] = [];
            rounds[rk].push(m);
        });

        const sortedRoundNums = Object.keys(rounds).map(Number).sort((a, b) => a - b);
        const totalRounds = sortedRoundNums.length;

        container.innerHTML = `
            <div class="fifa-bracket">
                ${sortedRoundNums.map((roundNum, idx) => {
                    const label = totalRounds > 1 && idx === totalRounds - 1 ? 'FINAL' : 
                                 totalRounds > 2 && idx === totalRounds - 2 ? 'SEMI FINALS' : 
                                 `ROUND ${roundNum}`;
                    
                    return `
                    <div class="bracket-round">
                        <div class="round-header">${label}</div>
                        <div class="matches-column">
                            ${rounds[roundNum].map((m, mIdx) => {
                                const played = m.played || m.status === 'completed';
                                const homeWinner = played && (m.home_score > m.away_score);
                                const awayWinner = played && (m.away_score > m.home_score);
                                
                                return `
                                <div class="match-wrapper">
                                    <div class="match-card ${played ? 'played' : ''}" onclick="if(window.viewMatchDetails) viewMatchDetails('${m.id}')">
                                        <div class="team ${homeWinner ? 'winner' : ''}">
                                            <span class="team-name">${m.home_team || 'TBD'}</span>
                                            <span class="score">${m.home_score ?? '-'}</span>
                                        </div>
                                        <div class="team ${awayWinner ? 'winner' : ''}">
                                            <span class="team-name">${m.away_team || 'TBD'}</span>
                                            <span class="score">${m.away_score ?? '-'}</span>
                                        </div>
                                        ${m.status === 'Live' ? '<div class="live-indicator">LIVE</div>' : ''}
                                    </div>
                                    ${idx < totalRounds - 1 ? `<div class="connector-line"></div>` : ''}
                                </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                    `;
                }).join('')}
            </div>
        `;

        this.injectStyles();
    },

    /**
     * Renders a premium league standings table
     * @param {Array} standings - List of teams with stats
     * @param {string} containerId - ID of target div
     */
    renderLeagueTable(standings, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (!standings || standings.length === 0) {
            container.innerHTML = '<p style="text-align:center; padding:2rem; opacity:0.5;">No league data available.</p>';
            return;
        }

        container.innerHTML = `
            <div class="fifa-table-container">
                <table class="fifa-table">
                    <thead>
                        <tr>
                            <th class="col-pos">#</th>
                            <th class="col-team">TEAM</th>
                            <th class="col-stat">P</th>
                            <th class="col-stat desktop-only">W</th>
                            <th class="col-stat desktop-only">D</th>
                            <th class="col-stat desktop-only">L</th>
                            <th class="col-stat desktop-only">GD</th>
                            <th class="col-stat highlighted">PTS</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${standings.map((team, idx) => `
                            <tr class="table-row ${idx < 3 ? 'top-team' : ''}">
                                <td class="col-pos">${idx + 1}</td>
                                <td class="col-team">
                                    <div class="team-info">
                                        <div class="team-crest" style="background:${this.getMockColor(team.team_name || team.name)}">${(team.team_name || team.name || 'T').charAt(0)}</div>
                                        <span>${team.team_name || team.name}</span>
                                    </div>
                                </td>
                                <td class="col-stat">${(team.wins || 0) + (team.draws || 0) + (team.losses || 0)}</td>
                                <td class="col-stat desktop-only">${team.wins || 0}</td>
                                <td class="col-stat desktop-only">${team.draws || 0}</td>
                                <td class="col-stat desktop-only">${team.losses || 0}</td>
                                <td class="col-stat desktop-only">${team.goal_difference || (team.goals_for - team.goals_against) || 0}</td>
                                <td class="col-stat highlighted">${team.points || 0}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        this.injectStyles();
    },

    getMockColor(name) {
        const colors = ['#dc2626', '#2563eb', '#16a34a', '#d97706', '#7c3aed', '#db2777'];
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    },

    injectStyles() {
        if (document.getElementById('tournament-ui-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'tournament-ui-styles';
        style.textContent = `
            .fifa-bracket { display: flex; gap: 4rem; overflow-x: auto; padding: 2.5rem; align-items: stretch; scrollbar-width: none; }
            .fifa-bracket::-webkit-scrollbar { display: none; }
            .bracket-round { display: flex; flex-direction: column; min-width: 280px; }
            .round-header { text-align: center; font-weight: 800; font-size: 0.75rem; color: var(--text-muted); letter-spacing: 2px; margin-bottom: 2.5rem; text-transform: uppercase; opacity: 0.8; }
            .matches-column { display: flex; flex-direction: column; justify-content: space-around; flex: 1; gap: 2.5rem; }
            .match-wrapper { position: relative; display: flex; align-items: center; }
            .match-card { background: rgba(30, 30, 40, 0.4); border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; width: 100%; overflow: hidden; transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1); cursor: pointer; backdrop-filter: blur(20px); box-shadow: 0 4px 20px rgba(0,0,0,0.2); }
            .match-card:hover { transform: translateY(-4px) scale(1.02); border-color: var(--primary); box-shadow: 0 20px 40px rgba(220, 38, 38, 0.15); background: rgba(40, 40, 50, 0.6); }
            .team { padding: 1rem 1.25rem; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.03); transition: background 0.2s; }
            .team:last-child { border-bottom: none; }
            .team.winner { background: rgba(220, 38, 38, 0.03); }
            .team.winner .team-name { color: #fff; font-weight: 700; }
            .team.winner .score { color: var(--primary); font-weight: 800; background: rgba(220, 38, 38, 0.1); }
            .team-name { font-size: 0.95rem; color: rgba(255,255,255,0.6); letter-spacing: -0.01em; }
            .score { font-family: 'JetBrains Mono', monospace; font-weight: 600; min-width: 28px; text-align: center; background: rgba(255,255,255,0.05); border-radius: 6px; padding: 4px 8px; font-size: 0.9rem; }
            .live-indicator { position: absolute; top: -10px; right: 10px; background: #dc2626; color: white; font-size: 0.65rem; font-weight: 900; padding: 3px 10px; border-radius: 100px; box-shadow: 0 0 15px rgba(220, 38, 38, 0.6); animation: pulse 2s infinite; letter-spacing: 1px; }
            
            .connector-line { position: absolute; right: -4rem; width: 4rem; height: 2px; background: linear-gradient(90deg, rgba(255,255,255,0.08), rgba(220, 38, 38, 0.3)); }
            
            .fifa-table-container { background: rgba(10, 10, 15, 0.3); border-radius: 24px; border: 1px solid rgba(255,255,255,0.04); overflow: hidden; backdrop-filter: blur(25px); box-shadow: 0 20px 50px rgba(0,0,0,0.3); }
            .fifa-table { width: 100%; border-collapse: collapse; text-align: left; }
            .fifa-table th { padding: 1.5rem; font-size: 0.7rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; letter-spacing: 2px; border-bottom: 1px solid rgba(255,255,255,0.05); }
            .fifa-table td { padding: 1.25rem 1.5rem; border-bottom: 1px solid rgba(255,255,255,0.03); color: rgba(255,255,255,0.7); }
            .table-row { transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
            .table-row:hover { background: rgba(255,255,255,0.04); transform: scale(1.002); }
            .table-row.top-team .col-pos { color: var(--primary); font-weight: 900; text-shadow: 0 0 10px rgba(220, 38, 38, 0.3); }
            .team-info { display: flex; align-items: center; gap: 1.25rem; }
            .team-crest { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 0.9rem; color: white; box-shadow: 0 4px 12px rgba(0,0,0,0.3); }
            .col-stat { text-align: center; font-weight: 600; font-size: 0.9rem; opacity: 0.8; }
            .highlighted { color: #fff; font-weight: 900; background: rgba(255,255,255,0.02); font-size: 1rem; }
            
            @keyframes pulse { 0% { opacity: 1; transform: scale(1); } 50% { opacity: 0.7; transform: scale(0.95); } 100% { opacity: 1; transform: scale(1); } }
            @media (max-width: 991px) { .desktop-only { display: none; } .fifa-bracket { gap: 2rem; } .connector-line { width: 2rem; right: -2rem; } }
        `;
        document.head.appendChild(style);
    }
};
