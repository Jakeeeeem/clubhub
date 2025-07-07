let currentTeams = [];
let tacticalBoardData = {
    formation: '4-4-2',
    players: []
};

function initializeCoachDashboard() {
    loadCoachData();
    loadCoachStats();
    setupCoachEventListeners();
    initializeTacticalBoard();
}

function setupCoachEventListeners() {
    // Form submissions
    document.getElementById('createTeamForm').addEventListener('submit', handleCreateTeam);
    document.getElementById('addTeamEventForm').addEventListener('submit', handleAddTeamEvent);
    document.getElementById('matchResultForm').addEventListener('submit', handleMatchResult);
}

function loadCoachData() {
    // Load teams this coach manages
    const coachStaff = AppState.staff.find(s => s.email === AppState.currentUser.email);
    if (coachStaff) {
        currentTeams = AppState.teams?.filter(t => t.coachId === coachStaff.id) || [];
    }
}

// Section Navigation
function showCoachSection(sectionId) {
    // Hide all sections
    const sections = document.querySelectorAll('.dashboard-section');
    sections.forEach(section => {
        section.classList.remove('active');
    });
    
    // Remove active class from all nav buttons
    const navButtons = document.querySelectorAll('.dashboard-nav button');
    navButtons.forEach(button => {
        button.classList.remove('active');
    });
    
    // Show selected section
    const targetSection = document.getElementById(`coach-${sectionId}`);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    // Add active class to clicked button
    event.target.classList.add('active');
    
    // Load section-specific content
    switch(sectionId) {
        case 'overview':
            loadCoachStats();
            break;
        case 'teams':
            loadCoachTeams();
            break;
        case 'players':
            loadCoachPlayers();
            break;
        case 'events':
            loadCoachEvents();
            break;
        case 'tactical-board':
            loadTacticalBoard();
            break;
        case 'event-finder':
            loadEventFinder();
            break;
    }
}

// Coach Statistics
function loadCoachStats() {
    const coachStaff = AppState.staff.find(s => s.email === AppState.currentUser.email);
    if (!coachStaff) return;
    
    const teams = currentTeams;
    const totalPlayers = teams.reduce((total, team) => total + (team.players?.length || 0), 0);
    
    // Calculate upcoming events
    const now = new Date();
    const upcomingEvents = AppState.events.filter(e => 
        new Date(e.date) > now && 
        teams.some(t => t.id === e.teamId)
    ).length;
    
    // Calculate win rate (mock data for now)
    const winRate = Math.floor(Math.random() * 40) + 60; // 60-100%
    
    // Update stats
    document.getElementById('coachTotalTeams').textContent = teams.length;
    document.getElementById('coachTotalPlayers').textContent = totalPlayers;
    document.getElementById('coachUpcomingEvents').textContent = upcomingEvents;
    document.getElementById('coachWinRate').textContent = `${winRate}%`;
    
    loadRecentMatches();
    loadTodaySchedule();
}

function loadRecentMatches() {
    const recentMatches = [
        { opponent: 'City Lions', score: '3-1', result: 'win', date: '2025-06-15' },
        { opponent: 'United FC', score: '2-2', result: 'draw', date: '2025-06-10' },
        { opponent: 'Rangers', score: '1-2', result: 'loss', date: '2025-06-05' }
    ];
    
    const container = document.getElementById('recentMatches');
    container.innerHTML = recentMatches.map(match => `
        <div class="item-list-item">
            <div class="item-info">
                <h4>vs ${match.opponent}</h4>
                <p>${formatDate(match.date)} - Score: ${match.score}</p>
            </div>
            <span class="status-badge status-${match.result === 'win' ? 'paid' : match.result === 'draw' ? 'pending' : 'overdue'}">
                ${match.result.toUpperCase()}
            </span>
        </div>
    `).join('');
}

function loadTodaySchedule() {
    const today = new Date().toISOString().split('T')[0];
    const todayEvents = AppState.events.filter(e => e.date === today);
    
    const container = document.getElementById('todaySchedule');
    
    if (todayEvents.length === 0) {
        container.innerHTML = '<p>No events scheduled for today</p>';
        return;
    }
    
    container.innerHTML = todayEvents.map(event => `
        <div class="item-list-item">
            <div class="item-info">
                <h4>${event.title}</h4>
                <p>${event.time} - ${event.type}</p>
            </div>
            <span class="status-badge status-active">${event.type}</span>
        </div>
    `).join('');
}

// Teams Management
function loadCoachTeams() {
    const container = document.getElementById('coachTeamsContainer');
    
    if (currentTeams.length === 0) {
        container.innerHTML = '<div class="card"><p>No teams assigned yet. Create a team to get started.</p></div>';
        return;
    }
    
    container.innerHTML = currentTeams.map(team => `
        <div class="team-card">
            <h4>${team.name}</h4>
            <p><strong>Age Group:</strong> ${team.ageGroup}</p>
            <p><strong>Sport:</strong> ${team.sport}</p>
            
            <div class="team-stats">
                <div class="team-stat">
                    <span class="team-stat-number">${team.players?.length || 0}</span>
                    <span class="team-stat-label">Players</span>
                </div>
                <div class="team-stat">
                    <span class="team-stat-number">${team.wins || 0}</span>
                    <span class="team-stat-label">Wins</span>
                </div>
                <div class="team-stat">
                    <span class="team-stat-number">${team.events?.length || 0}</span>
                    <span class="team-stat-label">Events</span>
                </div>
            </div>
            
            <div class="item-actions">
                <button class="btn btn-small btn-primary" onclick="manageTeam('${team.id}')">Manage</button>
                <button class="btn btn-small btn-secondary" onclick="viewTeamStats('${team.id}')">Stats</button>
                <button class="btn btn-small btn-secondary" onclick="assignPlayers('${team.id}')">Players</button>
            </div>
        </div>
    `).join('');
}

function handleCreateTeam(e) {
    e.preventDefault();
    
    const coachStaff = AppState.staff.find(s => s.email === AppState.currentUser.email);
    if (!coachStaff) return;
    
    const newTeam = {
        id: generateId(),
        name: document.getElementById('teamName').value,
        ageGroup: document.getElementById('teamAgeGroup').value,
        sport: document.getElementById('teamSport').value,
        description: document.getElementById('teamDescription').value,
        coachId: coachStaff.id,
        clubId: coachStaff.clubId,
        players: [],
        events: [],
        wins: 0,
        losses: 0,
        draws: 0,
        createdDate: new Date().toISOString()
    };
    
    // Initialize teams array if it doesn't exist
    if (!AppState.teams) {
        AppState.teams = [];
    }
    
    AppState.teams.push(newTeam);
    currentTeams.push(newTeam);
    saveToStorage();
    
    closeModal('createTeamModal');
    loadCoachTeams();
    loadCoachStats();
    
    // Reset form
    document.getElementById('createTeamForm').reset();
    
    showNotification('Team created successfully!', 'success');
}

// Players Management
function loadCoachPlayers() {
    const teamFilter = document.getElementById('teamFilter');
    
    // Populate team filter
    teamFilter.innerHTML = '<option value="">All Teams</option>' + 
        currentTeams.map(team => `<option value="${team.id}">${team.name}</option>`).join('');
    
    filterCoachPlayers();
}

function filterCoachPlayers() {
    const teamFilter = document.getElementById('teamFilter').value;
    const searchTerm = document.getElementById('playerSearchCoach').value.toLowerCase();
    
    let players = [];
    
    // Get players from selected teams or all teams
    if (teamFilter) {
        const team = currentTeams.find(t => t.id === teamFilter);
        if (team && team.players) {
            players = AppState.players.filter(p => team.players.includes(p.id));
        }
    } else {
        // Get all players from coach's teams
        const allPlayerIds = currentTeams.flatMap(t => t.players || []);
        players = AppState.players.filter(p => allPlayerIds.includes(p.id));
    }
    
    // Apply search filter
    if (searchTerm) {
        players = players.filter(player => 
            `${player.firstName} ${player.lastName}`.toLowerCase().includes(searchTerm)
        );
    }
    
    const tableBody = document.getElementById('coachPlayersTableBody');
    
    if (players.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6">No players found</td></tr>';
        return;
    }
    
    tableBody.innerHTML = players.map(player => {
        const team = currentTeams.find(t => t.players?.includes(player.id));
        const age = new Date().getFullYear() - new Date(player.dateOfBirth).getFullYear();
        
        return `
            <tr>
                <td>${player.firstName} ${player.lastName}</td>
                <td>${team ? team.name : 'Unassigned'}</td>
                <td>${player.position || 'Not set'}</td>
                <td>${age}</td>
                <td>
                    <span class="status-badge status-${player.attendance > 80 ? 'paid' : player.attendance > 60 ? 'pending' : 'overdue'}">
                        ${player.attendance || 85}%
                    </span>
                </td>
                <td>
                    <button class="btn btn-small btn-primary" onclick="viewPlayerStats('${player.id}')">Stats</button>
                    <button class="btn btn-small btn-secondary" onclick="editPlayerPosition('${player.id}')">Edit</button>
                </td>
            </tr>
        `;
    }).join('');
}

// Events Management
function loadCoachEvents() {
    const teamEvents = AppState.events.filter(e => 
        currentTeams.some(t => t.id === e.teamId)
    );
    
    // Populate team selector for new events
    const teamSelect = document.getElementById('eventTeamSelect');
    teamSelect.innerHTML = currentTeams.map(team => 
        `<option value="${team.id}">${team.name}</option>`
    ).join('');
    
    const container = document.getElementById('coachEventsContainer');
    
    if (teamEvents.length === 0) {
        container.innerHTML = '<div class="card"><p>No team events scheduled</p></div>';
        return;
    }
    
    container.innerHTML = teamEvents.map(event => {
        const team = currentTeams.find(t => t.id === event.teamId);
        const isUpcoming = new Date(event.date) > new Date();
        
        return `
            <div class="event-card">
                <h4>${event.title}</h4>
                <div class="event-meta">
                    <span><strong>Team:</strong> ${team ? team.name : 'Unknown'}</span>
                    <span><strong>Date:</strong> ${formatDate(event.date)} at ${event.time}</span>
                    <span><strong>Location:</strong> ${event.location}</span>
                    ${event.opponent ? `<span><strong>Opponent:</strong> ${event.opponent}</span>` : ''}
                </div>
                <div class="event-actions">
                    ${event.type === 'match' && !isUpcoming ? 
                        `<button class="btn btn-small btn-primary" onclick="recordMatchResult('${event.id}')">Record Result</button>` : ''}
                    <button class="btn btn-small btn-secondary" onclick="manageEventPlayers('${event.id}')">Manage Players</button>
                    <button class="btn btn-small btn-secondary" onclick="editEvent('${event.id}')">Edit</button>
                </div>
            </div>
        `;
    }).join('');
}

function handleAddTeamEvent(e) {
    e.preventDefault();
    
    const newEvent = {
        id: generateId(),
        title: document.getElementById('teamEventTitle').value,
        type: document.getElementById('teamEventType').value,
        date: document.getElementById('teamEventDate').value,
        time: document.getElementById('teamEventTime').value,
        location: document.getElementById('teamEventLocation').value,
        opponent: document.getElementById('teamEventOpponent').value,
        teamId: document.getElementById('eventTeamSelect').value,
        createdBy: AppState.currentUser.id,
        createdDate: new Date().toISOString()
    };
    
    AppState.events.push(newEvent);
    saveToStorage();
    
    closeModal('addTeamEventModal');
    loadCoachEvents();
    loadCoachStats();
    
    // Reset form
    document.getElementById('addTeamEventForm').reset();
    
    showNotification('Team event added successfully!', 'success');
}

// Tactical Board
function initializeTacticalBoard() {
    const board = document.getElementById('tacticalBoard');
    
    // Add goal areas
    board.innerHTML = `
        <div style="position: absolute; top: 0; left: 25%; width: 50%; height: 15%; border: 2px solid white; border-top: none;"></div>
        <div style="position: absolute; bottom: 0; left: 25%; width: 50%; height: 15%; border: 2px solid white; border-bottom: none;"></div>
        <div style="position: absolute; top: 0; left: 40%; width: 20%; height: 8%; border: 2px solid white; border-top: none;"></div>
        <div style="position: absolute; bottom: 0; left: 40%; width: 20%; height: 8%; border: 2px solid white; border-bottom: none;"></div>
    `;
    
    setFormation();
    loadAvailablePlayers();
}

function setFormation() {
    const formation = document.getElementById('formationSelect').value;
    const board = document.getElementById('tacticalBoard');
    
    // Remove existing player positions
    const existingPlayers = board.querySelectorAll('.player-position');
    existingPlayers.forEach(p => p.remove());
    
    tacticalBoardData.formation = formation;
    tacticalBoardData.players = [];
    
    const formations = {
        '4-4-2': [
            {x: 50, y: 85}, // GK
            {x: 20, y: 65}, {x: 40, y: 65}, {x: 60, y: 65}, {x: 80, y: 65}, // Defense
            {x: 25, y: 45}, {x: 45, y: 45}, {x: 55, y: 45}, {x: 75, y: 45}, // Midfield
            {x: 40, y: 25}, {x: 60, y: 25} // Attack
        ],
        '4-3-3': [
            {x: 50, y: 85}, // GK
            {x: 20, y: 65}, {x: 40, y: 65}, {x: 60, y: 65}, {x: 80, y: 65}, // Defense
            {x: 30, y: 45}, {x: 50, y: 45}, {x: 70, y: 45}, // Midfield
            {x: 25, y: 25}, {x: 50, y: 25}, {x: 75, y: 25} // Attack
        ]
    };
    
    const positions = formations[formation] || formations['4-4-2'];
    
    positions.forEach((pos, index) => {
        const player = document.createElement('div');
        player.className = 'player-position';
        player.style.left = `${pos.x}%`;
        player.style.top = `${pos.y}%`;
        player.textContent = index + 1;
        player.draggable = true;
        
        // Add drag functionality
        player.addEventListener('dragstart', handleDragStart);
        player.addEventListener('click', () => selectPlayer(player, index));
        
        board.appendChild(player);
        
        tacticalBoardData.players.push({
            position: index + 1,
            x: pos.x,
            y: pos.y,
            playerId: null
        });
    });
}

function loadAvailablePlayers() {
    const container = document.getElementById('availablePlayers');
    
    // Get all players from coach's teams
    const allPlayerIds = currentTeams.flatMap(t => t.players || []);
    const players = AppState.players.filter(p => allPlayerIds.includes(p.id));
    
    container.innerHTML = `
        <div class="available-players">
            ${players.map(player => `
                <div class="available-player" data-player-id="${player.id}">
                    ${player.firstName} ${player.lastName}
                </div>
            `).join('')}
        </div>
    `;
    
    // Add click handlers
    container.querySelectorAll('.available-player').forEach(playerEl => {
        playerEl.addEventListener('click', () => assignPlayerToPosition(playerEl));
    });
}

let selectedPosition = null;

function selectPlayer(playerEl, index) {
    // Remove previous selection
    document.querySelectorAll('.player-position').forEach(p => p.classList.remove('selected'));
    
    // Select current position
    playerEl.classList.add('selected');
    selectedPosition = index;
}

function assignPlayerToPosition(playerEl) {
    if (selectedPosition === null) {
        showNotification('Please select a position on the tactical board first', 'error');
        return;
    }
    
    const playerId = playerEl.dataset.playerId;
    const player = AppState.players.find(p => p.id === playerId);
    
    if (player) {
        // Update tactical board data
        tacticalBoardData.players[selectedPosition].playerId = playerId;
        
        // Update visual representation
        const positionEl = document.querySelectorAll('.player-position')[selectedPosition];
        positionEl.textContent = player.firstName.charAt(0) + player.lastName.charAt(0);
        positionEl.title = `${player.firstName} ${player.lastName}`;
        
        // Mark player as assigned
        playerEl.classList.add('assigned');
        
        // Clear selection
        positionEl.classList.remove('selected');
        selectedPosition = null;
        
        showNotification(`${player.firstName} ${player.lastName} assigned to position`, 'success');
    }
}

function clearBoard() {
    tacticalBoardData.players.forEach(p => p.playerId = null);
    
    document.querySelectorAll('.player-position').forEach((pos, index) => {
        pos.textContent = index + 1;
        pos.title = '';
        pos.classList.remove('selected');
    });
    
    document.querySelectorAll('.available-player').forEach(p => {
        p.classList.remove('assigned');
    });
    
    selectedPosition = null;
    showNotification }