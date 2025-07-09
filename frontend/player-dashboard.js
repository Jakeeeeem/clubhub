document.addEventListener('DOMContentLoaded', function() {
    console.log('🏃‍♂️ Player dashboard loading...');
    
    // Wait for main app to initialize first
    setTimeout(() => {
        if (AppState.currentUser) {
            initializePlayerDashboard();
        } else {
            // Check every 100ms until user is loaded
            const checkUser = setInterval(() => {
                if (AppState.currentUser) {
                    clearInterval(checkUser);
                    initializePlayerDashboard();
                }
            }, 100);
            
            // Give up after 30 seconds
            setTimeout(() => {
                clearInterval(checkUser);
                if (!AppState.currentUser) {
                    console.log('No user found, redirecting to login');
                    window.location.href = 'index.html';
                }
            }, 30000);
        }
    }, 1000);
});

// Enhanced player data object
let playerData = {
    clubs: [],
    teams: [],
    payments: [],
    applications: [],
    bookings: [],
    coaches: [],
    listings: []
};

// Initialize player dashboard - NOW LOADS FROM DATABASE
async function initializePlayerDashboard() {
    console.log('🏃‍♂️ Initializing player dashboard...');
    
    // Check if apiService is available
    if (typeof apiService === 'undefined') {
        console.error('❌ apiService not loaded! Check script order in HTML.');
        showNotification('API service not available. Please refresh the page.', 'error');
        return;
    }
    
    try {
        // 🔥 LOAD ALL DATA FROM DATABASE VIA API
        console.log('📊 Loading ALL data from database...');
        
        // Load events from database
        const eventsData = await apiService.getEvents();
        AppState.events = eventsData || [];
        console.log('📅 Loaded events from database:', AppState.events.length);
        
        // Load clubs from database
        const clubsData = await apiService.getClubs();
        AppState.clubs = clubsData || [];
        console.log('🏠 Loaded clubs from database:', AppState.clubs.length);
        
        // Load players from database
        const playersResponse = await apiService.getPlayers();
        AppState.players = playersResponse.players || playersResponse || [];
        console.log('👥 Loaded players from database:', AppState.players.length);
        
        // Load staff from database
        const staffData = await apiService.getStaff();
        AppState.staff = staffData || [];
        console.log('👨‍💼 Loaded staff from database:', AppState.staff.length);
        
        // Load teams from database
        const teamsData = await apiService.getTeams();
        AppState.teams = teamsData || [];
        console.log('⚽ Loaded teams from database:', AppState.teams.length);
        
        // 🔥 NEW: Load player-specific teams
        if (AppState.currentUser?.id) {
            try {
                const playerTeams = await apiService.getPlayerTeams(AppState.currentUser.id);
                AppState.playerTeams = playerTeams || [];
                console.log('⚽ Loaded player-specific teams:', AppState.playerTeams.length);
            } catch (error) {
                console.log('No player teams found or error:', error.message);
                AppState.playerTeams = [];
            }
        }
        
        // Load player-specific data
        loadPlayerData();
        loadPlayerStats();
        setupPlayerEventListeners();
        
        // Check for notifications
        checkPlayerNotifications();
        
        console.log('✅ Player dashboard initialized with DATABASE data');
        
    } catch (error) {
        console.error('❌ Failed to initialize player dashboard:', error);
        showNotification('Failed to load dashboard data: ' + error.message, 'error');
        
        // Fallback to empty data
        AppState.events = [];
        AppState.clubs = [];
        AppState.players = [];
        AppState.staff = [];
        AppState.teams = [];
        AppState.playerTeams = [];
        loadPlayerData();
        loadPlayerStats();
    }
}

function setupPlayerEventListeners() {
    // Form submissions
    const applyClubForm = document.getElementById('applyClubForm');
    const availabilityForm = document.getElementById('availabilityForm');
    
    if (applyClubForm) {
        applyClubForm.addEventListener('submit', handleClubApplication);
    }
    
    if (availabilityForm) {
        availabilityForm.addEventListener('submit', handleAvailabilitySubmission);
    }
}

// 🔥 COMPLETELY FIXED: Enhanced data loading with proper user linking
function loadPlayerData() {
    console.log('📊 Loading player data from DATABASE...');
    
    // 🔥 FIX: Search by user_id FIRST, then fall back to email
    let player = null;
    
    // Method 1: Find by user_id (most reliable)
    if (AppState.currentUser?.id) {
        player = AppState.players?.find(p => p.user_id === AppState.currentUser.id);
        if (player) {
            console.log('✅ Player found by user_id:', player.first_name, player.last_name);
        }
    }
    
    // Method 2: Fall back to email matching if no user_id match
    if (!player && AppState.currentUser?.email) {
        player = AppState.players?.find(p => 
            p.email && p.email.toLowerCase() === AppState.currentUser.email.toLowerCase()
        );
        if (player) {
            console.log('✅ Player found by email:', player.first_name, player.last_name);
            
            // 🔥 IMPORTANT: Update the player record to link user_id
            linkPlayerToUser(player.id, AppState.currentUser.id);
        }
    }
    
    if (player) {
        console.log('👤 Player found in database:', player.first_name, player.last_name);
        
        // Load clubs player belongs to
        playerData.clubs = AppState.clubs?.filter(c => c.id === player.club_id) || [];
        
        // 🔥 FIXED: Load teams player is in using the new playerTeams data
        playerData.teams = AppState.playerTeams || [];
        
        // Load coaches from player's clubs
        const clubIds = playerData.clubs.map(c => c.id);
        playerData.coaches = AppState.staff?.filter(s => 
            clubIds.includes(s.club_id) && 
            ['coach', 'assistant-coach', 'coaching-supervisor'].includes(s.role)
        ) || [];
        
        // Load payment data (generate mock data based on player's monthly fee)
        playerData.payments = generatePlayerPayments(player);
        
        // Load applications and bookings (empty for now)
        playerData.applications = [];
        playerData.bookings = [];
        
        // Load listings (all available events)
        playerData.listings = AppState.events || [];
        
        console.log('📊 Player data loaded from DATABASE:', {
            player: `${player.first_name} ${player.last_name}`,
            clubs: playerData.clubs.length,
            teams: playerData.teams.length,
            coaches: playerData.coaches.length,
            events: playerData.listings.length,
            monthlyFee: player.monthly_fee,
            linkedByUserId: player.user_id === AppState.currentUser.id
        });
        
        // Show welcome message
        if (playerData.clubs.length > 0) {
            setTimeout(() => {
                showNotification(`Welcome ${player.first_name}! You're a member of ${playerData.clubs[0].name}`, 'success');
            }, 1000);
        }
        
        // Show team assignment message if player is in teams
        if (playerData.teams.length > 0) {
            setTimeout(() => {
                const teamNames = playerData.teams.map(t => t.name).join(', ');
                showNotification(`You are assigned to: ${teamNames}`, 'info');
            }, 2000);
        }
        
    } else {
        console.log('❌ No player record found for current user:', {
            userId: AppState.currentUser?.id,
            email: AppState.currentUser?.email,
            availablePlayers: AppState.players?.length || 0
        });
        
        // Debug: Show what players we have
        if (AppState.players?.length > 0) {
            console.log('🔍 Available players:', AppState.players.map(p => ({
                name: `${p.first_name} ${p.last_name}`,
                email: p.email,
                user_id: p.user_id
            })));
        }
        
        // Initialize empty data but still show available events
        playerData = {
            clubs: [],
            teams: [],
            payments: [],
            applications: [],
            bookings: [],
            coaches: [],
            listings: AppState.events || [] // Still show all events as available
        };
        
        // Show info message
        setTimeout(() => {
            showNotification('No player record found. Contact your club admin to be added as a player with your account email.', 'info');
        }, 1000);
    }
}

// 🔥 NEW: Function to link player to user account
async function linkPlayerToUser(playerId, userId) {
    try {
        console.log(`🔗 Linking player ${playerId} to user ${userId}...`);
        
        // This would make an API call to update the player record
        const response = await apiService.updatePlayer(playerId, { userId: userId });
        
        if (response.success) {
            console.log('✅ Player successfully linked to user account');
            
            // Update local player data
            const player = AppState.players?.find(p => p.id === playerId);
            if (player) {
                player.user_id = userId;
            }
        }
    } catch (error) {
        console.error('❌ Failed to link player to user:', error);
    }
}

// Generate mock payments based on player's actual monthly fee
function generatePlayerPayments(player) {
    const payments = [];
    const currentDate = new Date();
    const monthlyFee = player.monthly_fee || 50;
    
    for (let i = 0; i < 6; i++) {
        const paymentDate = new Date();
        paymentDate.setMonth(currentDate.getMonth() - i);
        
        payments.push({
            id: `payment_${player.id}_${i}`,
            playerId: player.id,
            date: paymentDate.toISOString(),
            description: `Monthly Club Fee - ${paymentDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}`,
            amount: monthlyFee,
            status: i === 0 ? 'pending' : i === 1 ? 'overdue' : 'paid',
            dueDate: paymentDate.toISOString(),
            clubId: player.club_id
        });
    }
    
    return payments;
}

// Check for notifications
function checkPlayerNotifications() {
    console.log('📢 Checking for notifications...');
}

// Section Navigation
function showPlayerSection(sectionId) {
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
    const targetSection = document.getElementById(`player-${sectionId}`);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    // Add active class to clicked button
    const clickedButton = document.querySelector(`[onclick*="showPlayerSection('${sectionId}')"]`);
    if (clickedButton) {
        clickedButton.classList.add('active');
    }
    
    // Load section-specific content
    switch(sectionId) {
        case 'overview':
            loadPlayerStats();
            break;
        case 'my-clubs':
            loadPlayerClubs();
            break;
        case 'teams':
            loadPlayerTeams();
            break;
        case 'finances':
            loadPlayerFinances();
            break;
        case 'club-finder':
            loadClubFinder();
            break;
        case 'event-finder':
            loadPlayerEventFinder();
            break;
        case 'documents':
            loadPlayerDocuments();
            break;
    }
}

// Enhanced Player Statistics
function loadPlayerStats() {
    const player = AppState.players?.find(p => p.email === AppState.currentUser?.email || p.user_id === AppState.currentUser?.id);
    
    // Update overview stats
    const playerClubsEl = document.getElementById('playerClubs');
    const playerTeamsEl = document.getElementById('playerTeams');
    const playerEventsEl = document.getElementById('playerEvents');
    
    if (playerClubsEl) playerClubsEl.textContent = playerData.clubs.length;
    if (playerTeamsEl) playerTeamsEl.textContent = playerData.teams.length;
    
    // Calculate upcoming events
    const now = new Date();
    const upcomingEvents = AppState.events?.filter(e => 
        new Date(e.event_date) > now
    ) || [];
    
    if (playerEventsEl) playerEventsEl.textContent = upcomingEvents.length;
    
    // Update performance stats
    const matchesPlayedEl = document.getElementById('playerMatchesPlayed');
    const averageRatingEl = document.getElementById('playerAverageRating');
    const trainingSessionsEl = document.getElementById('playerTrainingSessions');
    const positionEl = document.getElementById('playerPosition');
    
    if (matchesPlayedEl) matchesPlayedEl.textContent = '0';
    if (averageRatingEl) averageRatingEl.textContent = '0.0';
    if (trainingSessionsEl) trainingSessionsEl.textContent = Math.floor(Math.random() * 20) + 10;
    if (positionEl) positionEl.textContent = player?.position || 'Not Set';
    
    // Load upcoming events display
    loadPlayerUpcomingEvents(upcomingEvents.slice(0, 3));
}

function loadPlayerUpcomingEvents(events) {
    const container = document.getElementById('playerUpcomingEvents');
    if (!container) return;
    
    if (events.length === 0) {
        container.innerHTML = '<p>No upcoming events</p>';
        return;
    }
    
    container.innerHTML = events.map(event => `
        <div class="item-list-item">
            <div class="item-info">
                <h4>${event.title}</h4>
                <p>${formatDate(event.event_date)}${event.event_time ? ` at ${event.event_time}` : ''}</p>
            </div>
            <span class="status-badge status-active">${event.event_type}</span>
        </div>
    `).join('');
}

// My Clubs Section
function loadPlayerClubs() {
    const container = document.getElementById('playerClubsContainer');
    if (!container) return;
    
    if (playerData.clubs.length === 0) {
        container.innerHTML = '<div class="card"><p>You are not a member of any clubs yet. Contact your club admin to be added as a player.</p></div>';
        return;
    }
    
    container.innerHTML = playerData.clubs.map(club => {
        // Get coaches for this club
        const clubCoaches = playerData.coaches.filter(c => c.club_id === club.id);
        
        return `
            <div class="card">
                <h4>${club.name}</h4>
                <p><strong>Location:</strong> ${club.location || 'Not specified'}</p>
                <p><strong>Description:</strong> ${club.description || 'No description'}</p>
                <p><strong>Sport:</strong> ${club.sport || 'Not specified'}</p>
                
                ${clubCoaches.length > 0 ? `
                    <div style="margin-top: 1rem;">
                        <strong>Your Coaches:</strong>
                        ${clubCoaches.map(coach => `
                            <div style="margin-left: 1rem; padding: 0.5rem; background: #f8f9fa; border-radius: 4px; margin-top: 0.5rem;">
                                <p><strong>${coach.first_name} ${coach.last_name}</strong> - ${coach.role}</p>
                                <p style="font-size: 0.9rem; color: #666;">📧 ${coach.email}</p>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
                
                <div class="item-actions" style="margin-top: 1rem;">
                    <button class="btn btn-small btn-primary" onclick="viewClubDetails('${club.id}')">View Details</button>
                    <button class="btn btn-small btn-secondary" onclick="contactClub('${club.id}')">Contact Club</button>
                </div>
            </div>
        `;
    }).join('');
    
    // Load club staff table
    loadClubStaff();
}

function loadClubStaff() {
    const tableBody = document.getElementById('clubStaffTableBody');
    if (!tableBody) return;
    
    if (playerData.coaches.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="4">No coaching staff information available</td></tr>';
        return;
    }
    
    tableBody.innerHTML = playerData.coaches.map(coach => {
        const club = playerData.clubs.find(c => c.id === coach.club_id);
        return `
            <tr>
                <td>${coach.first_name} ${coach.last_name}</td>
                <td>${coach.role}</td>
                <td>
                    <a href="mailto:${coach.email}" class="btn btn-small btn-secondary">
                        📧 ${coach.email}
                    </a>
                </td>
                <td>${club ? club.name : 'Unknown'}</td>
            </tr>
        `;
    }).join('');
}

// 🔥 FIXED: Teams Section with proper team data
function loadPlayerTeams() {
    const container = document.getElementById('playerTeamsContainer');
    if (!container) return;
    
    if (playerData.teams.length === 0) {
        container.innerHTML = '<div class="card"><p>You are not assigned to any teams yet.</p></div>';
        return;
    }
    
    container.innerHTML = playerData.teams.map(team => {
        return `
            <div class="card">
                <h4>${team.name}</h4>
                <p><strong>Age Group:</strong> ${team.age_group || 'Not specified'}</p>
                <p><strong>Sport:</strong> ${team.sport || 'Football'}</p>
                
                ${team.player_assignment ? `
                    <div style="background: #e8f5e8; padding: 1rem; border-radius: 4px; margin: 1rem 0;">
                        <p><strong>Your Position:</strong> ${team.player_assignment.position || 'Not assigned'}</p>
                        ${team.player_assignment.jersey_number ? `<p><strong>Jersey Number:</strong> ${team.player_assignment.jersey_number}</p>` : ''}
                    </div>
                ` : ''}
                
                ${team.coach ? `
                    <div style="background: #f8f9fa; padding: 1rem; border-radius: 4px; margin: 1rem 0;">
                        <p><strong>Coach:</strong> ${team.coach.name}</p>
                        <p style="font-size: 0.9rem; color: #666;">📧 ${team.coach.email}</p>
                        <button class="btn btn-small btn-secondary" onclick="contactCoachByEmail('${team.coach.email}', '${team.coach.name}')">
                            Contact Coach
                        </button>
                    </div>
                ` : '<p><strong>Coach:</strong> Not assigned</p>'}
                
                <div class="team-stats">
                    <div class="team-stat">
                        <span class="team-stat-number">${team.wins || 0}</span>
                        <span class="team-stat-label">Wins</span>
                    </div>
                    <div class="team-stat">
                        <span class="team-stat-number">${team.losses || 0}</span>
                        <span class="team-stat-label">Losses</span>
                    </div>
                    <div class="team-stat">
                        <span class="team-stat-number">${team.draws || 0}</span>
                        <span class="team-stat-label">Draws</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// 🔥 FIXED: Enhanced Event Finder loads events from DATABASE
function loadPlayerEventFinder() {
    console.log('🔍 Loading events from DATABASE for event finder...');
    filterPlayerEvents();
}

// 🔥 COMPLETELY FIXED EVENT FILTERING FUNCTION
function filterPlayerEvents() {
    console.log('🔍 Filtering events from database:', {
        totalEvents: AppState.events?.length || 0
    });
    
    const searchInput = document.getElementById('eventSearchInput');
    const typeFilter = document.getElementById('playerEventTypeFilter');
    const dateFilter = document.getElementById('playerEventDateFilter');
    
    const searchTerm = searchInput?.value.toLowerCase() || '';
    const typeFilterValue = typeFilter?.value || '';
    const dateFilterValue = dateFilter?.value || '';
    
    // Get ALL events from database
    let availableEvents = AppState.events || [];
    console.log('📅 Starting with events:', availableEvents.length);
    
    if (availableEvents.length === 0) {
        const container = document.getElementById('availablePlayerEventsContainer');
        if (container) {
            container.innerHTML = `
                <div class="card">
                    <h4>No events found</h4>
                    <p>No events are currently available.</p>
                    <small>📊 Debug info: Total events in database: 0</small>
                    <button onclick="debugPlayerData()" class="btn btn-secondary">🔍 Debug</button>
                </div>
            `;
        }
        return;
    }
    
    // IMPROVED DATE FILTERING
    const now = new Date();
    availableEvents = availableEvents.filter(e => {
        let eventDateTime;
        
        if (e.event_date && e.event_time) {
            eventDateTime = new Date(`${e.event_date}T${e.event_time}`);
        } else if (e.event_date) {
            eventDateTime = new Date(e.event_date);
        } else {
            return false;
        }
        
        if (isNaN(eventDateTime.getTime())) {
            if (e.event_date.includes('/')) {
                const [day, month, year] = e.event_date.split('/');
                eventDateTime = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${e.event_time || '00:00:00'}`);
            } else {
                return false;
            }
        }
        
        const hoursDifference = (eventDateTime - now) / (1000 * 60 * 60);
        return eventDateTime > now || hoursDifference > -1;
    });
    
    // Apply filters
    if (searchTerm) {
        availableEvents = availableEvents.filter(event => 
            event.title.toLowerCase().includes(searchTerm) ||
            (event.description || '').toLowerCase().includes(searchTerm) ||
            (event.location || '').toLowerCase().includes(searchTerm)
        );
    }
    
    if (typeFilterValue) {
        availableEvents = availableEvents.filter(event => event.event_type === typeFilterValue);
    }
    
    if (dateFilterValue) {
        availableEvents = availableEvents.filter(event => event.event_date >= dateFilterValue);
    }
    
    const container = document.getElementById('availablePlayerEventsContainer');
    if (!container) return;
    
    if (availableEvents.length === 0) {
        container.innerHTML = `
            <div class="card">
                <h4>🔍 No events found</h4>
                <p>No events match your criteria.</p>
                <div style="background: #f0f0f0; padding: 1rem; margin: 1rem 0; font-family: monospace; font-size: 0.8rem;">
                    <strong>Debug Info:</strong><br>
                    • Total events in database: ${AppState.events?.length || 0}<br>
                    • Search term: "${searchTerm}"<br>
                    • Type filter: "${typeFilterValue}"<br>
                    • Date filter: "${dateFilterValue}"
                </div>
                <button onclick="showAllEvents()" class="btn btn-primary">Show All Events</button>
            </div>
        `;
        return;
    }
    
    // Display filtered events
    container.innerHTML = availableEvents.map(event => {
        const club = AppState.clubs?.find(c => c.id === event.club_id);
        
        let formattedDate = 'TBD';
        try {
            if (event.event_date) {
                const eventDate = new Date(event.event_date);
                if (!isNaN(eventDate.getTime())) {
                    formattedDate = eventDate.toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: '2-digit', 
                        year: 'numeric'
                    });
                } else {
                    formattedDate = event.event_date;
                }
            }
        } catch (error) {
            formattedDate = event.event_date || 'TBD';
        }
        
        return `
            <div class="card">
                <h4>${event.title}</h4>
                <p><strong>Type:</strong> ${event.event_type}</p>
                <p><strong>Date:</strong> ${formattedDate}${event.event_time ? ` at ${event.event_time}` : ''}</p>
                <p><strong>Location:</strong> ${event.location || 'TBD'}</p>
                <p><strong>Price:</strong> ${formatCurrency(event.price || 0)}</p>
                <p><strong>Club:</strong> ${club ? club.name : 'Unknown Club'}</p>
                ${event.capacity ? `<p><strong>Capacity:</strong> ${event.capacity} spots</p>` : ''}
                ${event.description ? `<p>${event.description}</p>` : ''}
                
                <div class="item-actions">
                    <button class="btn btn-small btn-primary" onclick="bookPlayerEvent('${event.id}')">Book Event</button>
                    <button class="btn btn-small btn-secondary" onclick="viewEventDetails('${event.id}')">View Details</button>
                </div>
            </div>
        `;
    }).join('');
}

// Helper function to show all events (for debugging)
function showAllEvents() {
    const container = document.getElementById('availablePlayerEventsContainer');
    if (!container || !AppState.events || AppState.events.length === 0) return;
    
    container.innerHTML = AppState.events.map(event => {
        const club = AppState.clubs?.find(c => c.id === event.club_id);
        
        return `
            <div class="card" style="border: 2px solid orange;">
                <h4>${event.title} <span style="color: orange;">[ALL EVENTS]</span></h4>
                <p><strong>Type:</strong> ${event.event_type}</p>
                <p><strong>Date:</strong> ${event.event_date}${event.event_time ? ` at ${event.event_time}` : ''}</p>
                <p><strong>Location:</strong> ${event.location || 'TBD'}</p>
                <p><strong>Price:</strong> ${formatCurrency(event.price || 0)}</p>
                <p><strong>Club:</strong> ${club ? club.name : 'Unknown Club'}</p>
                ${event.capacity ? `<p><strong>Capacity:</strong> ${event.capacity}</p>` : ''}
                ${event.description ? `<p>${event.description}</p>` : ''}
                
                <div class="item-actions">
                    <button class="btn btn-small btn-primary" onclick="bookPlayerEvent('${event.id}')">Book Event</button>
                    <button class="btn btn-small btn-secondary" onclick="viewEventDetails('${event.id}')">View Details</button>
                </div>
            </div>
        `;
    }).join('');
}

// Club Finder
function loadClubFinder() {
    filterClubs();
}

function filterClubs() {
    const searchInput = document.getElementById('clubSearchInput');
    const typeFilter = document.getElementById('clubTypeFilter');
    const sportFilter = document.getElementById('clubSportFilter');
    
    const searchTerm = searchInput?.value.toLowerCase() || '';
    const typeFilterValue = typeFilter?.value || '';
    const sportFilterValue = sportFilter?.value || '';
    
    let availableClubs = AppState.clubs?.filter(club => {
        return !playerData.clubs.some(playerClub => playerClub.id === club.id);
    }) || [];
    
    // Apply filters
    if (searchTerm) {
        availableClubs = availableClubs.filter(club => 
            club.name.toLowerCase().includes(searchTerm) ||
            (club.location || '').toLowerCase().includes(searchTerm) ||
            (club.description || '').toLowerCase().includes(searchTerm)
        );
    }
    
    if (typeFilterValue) {
        availableClubs = availableClubs.filter(club => 
            club.types && club.types.includes(typeFilterValue)
        );
    }
    
    if (sportFilterValue) {
        availableClubs = availableClubs.filter(club => 
            (club.sport || '').toLowerCase() === sportFilterValue
        );
    }
    
    const container = document.getElementById('availableClubsContainer');
    if (!container) return;
    
    if (availableClubs.length === 0) {
        container.innerHTML = '<div class="card"><p>No clubs found matching your criteria.</p></div>';
        return;
    }
    
    container.innerHTML = availableClubs.map(club => {
        const clubStaff = AppState.staff?.filter(s => s.club_id === club.id) || [];
        const coaches = clubStaff.filter(s => ['coach', 'assistant-coach'].includes(s.role));
        
        return `
            <div class="card">
                <h4>${club.name}</h4>
                <p><strong>Location:</strong> ${club.location || 'Not specified'}</p>
                <p><strong>Sport:</strong> ${club.sport || 'Not specified'}</p>
                
                ${coaches.length > 0 ? `
                    <div style="margin: 1rem 0; padding: 0.5rem; background: #f8f9fa; border-radius: 4px;">
                        <strong>Coaching Staff:</strong>
                        ${coaches.map(coach => `
                            <p style="margin: 0.25rem 0; font-size: 0.9rem;">
                                ${coach.first_name} ${coach.last_name} - ${coach.role}
                            </p>
                        `).join('')}
                    </div>
                ` : ''}
                
                <p>${club.description || 'No description available'}</p>
                
                <div class="item-actions">
                    <button class="btn btn-small btn-primary" onclick="applyToClub('${club.id}')">Apply to Join</button>
                    <button class="btn btn-small btn-secondary" onclick="viewClubDetails('${club.id}')">View Details</button>
                </div>
            </div>
        `;
    }).join('');
}

// Finances Section
function loadPlayerFinances() {
    const payments = playerData.payments;
    
    const totalDue = payments.filter(p => p.status === 'pending' || p.status === 'overdue')
                            .reduce((sum, p) => sum + p.amount, 0);
    const nextPayment = payments.find(p => p.status === 'pending')?.amount || 0;
    const overallStatus = payments.some(p => p.status === 'overdue') ? 'Overdue' :
                         payments.some(p => p.status === 'pending') ? 'Pending' : 'Up to Date';
    const totalPaid = payments.filter(p => p.status === 'paid')
                             .reduce((sum, p) => sum + p.amount, 0);
    
    const totalDueEl = document.getElementById('totalDue');
    const nextPaymentEl = document.getElementById('nextPayment');
    const paymentStatusEl = document.getElementById('paymentStatus');
    const totalPaidEl = document.getElementById('totalPaid');
    
    if (totalDueEl) totalDueEl.textContent = formatCurrency(totalDue);
    if (nextPaymentEl) nextPaymentEl.textContent = formatCurrency(nextPayment);
    if (paymentStatusEl) paymentStatusEl.textContent = overallStatus;
    if (totalPaidEl) totalPaidEl.textContent = formatCurrency(totalPaid);
    
    loadPaymentHistory(payments);
    loadOutstandingPayments(payments);
}

function loadPaymentHistory(payments) {
    const tableBody = document.getElementById('paymentHistoryTableBody');
    if (!tableBody) return;
    
    tableBody.innerHTML = payments.map(payment => `
        <tr>
            <td>${formatDate(payment.date)}</td>
            <td>${payment.description}</td>
            <td>${formatCurrency(payment.amount)}</td>
            <td><span class="status-badge status-${payment.status}">${payment.status}</span></td>
            <td>
                ${payment.status === 'pending' || payment.status === 'overdue' ? 
                    `<button class="btn btn-small btn-primary" onclick="makePayment('${payment.id}')">💳 Pay Now</button>` :
                    `<button class="btn btn-small btn-secondary" onclick="downloadReceipt('${payment.id}')">📄 Receipt</button>`
                }
            </td>
        </tr>
    `).join('');
}

function loadOutstandingPayments(payments) {
    const outstanding = payments.filter(p => p.status === 'pending' || p.status === 'overdue');
    const container = document.getElementById('outstandingPayments');
    if (!container) return;
    
    if (outstanding.length === 0) {
        container.innerHTML = '<p>✅ No outstanding payments. You are up to date!</p>';
        return;
    }
    
    container.innerHTML = outstanding.map(payment => `
        <div class="item-list-item">
            <div class="item-info">
                <h4>${payment.description}</h4>
                <p>Due: ${formatDate(payment.dueDate)} - ${formatCurrency(payment.amount)}</p>
            </div>
            <div class="item-actions">
                <span class="status-badge status-${payment.status}">${payment.status}</span>
                <button class="btn btn-small btn-primary" onclick="makePayment('${payment.id}')">💳 Pay Now</button>
            </div>
        </div>
    `).join('');
}

// Documents Section
function loadPlayerDocuments() {
    const tableBody = document.getElementById('playerDocumentsTableBody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '<tr><td colspan="5">No documents available</td></tr>';
}

// Payment Integration
async function makePayment(paymentId) {
    const payment = playerData.payments.find(p => p.id === paymentId);
    if (!payment) {
        showNotification('Payment not found', 'error');
        return;
    }
    
    if (confirm(`Pay ${formatCurrency(payment.amount)} for ${payment.description}?\n\nNote: This is demo mode.`)) {
        const paymentIndex = playerData.payments.findIndex(p => p.id === paymentId);
        if (paymentIndex !== -1) {
            playerData.payments[paymentIndex].status = 'paid';
            playerData.payments[paymentIndex].paidDate = new Date().toISOString();
        }
        
        loadPlayerFinances();
        showNotification('Payment successful! (Demo mode)', 'success');
    }
}

// Event Booking
function bookPlayerEvent(eventId) {
    const event = AppState.events?.find(e => e.id === eventId);
    if (!event) {
        showNotification('Event not found', 'error');
        return;
    }
    
    const club = AppState.clubs?.find(c => c.id === event.club_id);
    
    const content = `
        <div class="card">
            <h3>${event.title}</h3>
            <p><strong>Club:</strong> ${club ? club.name : 'Unknown'}</p>
            <p><strong>Date:</strong> ${formatDate(event.event_date)}${event.event_time ? ` at ${event.event_time}` : ''}</p>
            <p><strong>Location:</strong> ${event.location || 'TBD'}</p>
            <p><strong>Price:</strong> ${formatCurrency(event.price || 0)}</p>
            ${event.description ? `<p><strong>Description:</strong> ${event.description}</p>` : ''}
            
            <div style="margin-top: 2rem;">
                ${event.price > 0 ? `
                    <button class="btn btn-primary" onclick="processEventPayment('${eventId}')">
                        💳 Pay ${formatCurrency(event.price)} & Book
                    </button>
                ` : `
                    <button class="btn btn-primary" onclick="confirmEventBooking('${eventId}')">
                        ✅ Confirm Free Booking
                    </button>
                `}
                <button class="btn btn-secondary" onclick="closeModal('eventBookingModal')" style="margin-left: 1rem;">
                    Cancel
                </button>
            </div>
        </div>
    `;
    
    const contentContainer = document.getElementById('eventBookingContent');
    if (contentContainer) {
        contentContainer.innerHTML = content;
        showModal('eventBookingModal');
    }
}

async function processEventPayment(eventId) {
    const event = AppState.events?.find(e => e.id === eventId);
    if (!event) return;
    
    if (confirm(`Book ${event.title} for ${formatCurrency(event.price)}?\n\nNote: This is demo mode.`)) {
        confirmEventBooking(eventId);
    }
}

function confirmEventBooking(eventId) {
    const booking = {
        id: `booking_${Date.now()}`,
        eventId: eventId,
        playerId: AppState.currentUser.id,
        bookingDate: new Date().toISOString(),
        status: 'confirmed'
    };
    
    playerData.bookings.push(booking);
    closeModal('eventBookingModal');
    loadPlayerEventFinder();
    showNotification('Event booked successfully!', 'success');
}

// Club Application
function applyToClub(clubId) {
    const applyClubIdField = document.getElementById('applyClubId');
    if (applyClubIdField) {
        applyClubIdField.value = clubId;
        showModal('applyClubModal');
    }
}

async function handleClubApplication(e) {
    e.preventDefault();
    
    const clubId = document.getElementById('applyClubId')?.value;
    const message = document.getElementById('applicationMessage')?.value;
    const position = document.getElementById('playerPosition')?.value;
    const experience = document.getElementById('playerExperience')?.value;
    
    const availability = Array.from(document.querySelectorAll('input[name="availability"]:checked'))
                             .map(cb => cb.value);
    
    if (!clubId) {
        showNotification('Club selection error', 'error');
        return;
    }
    
    closeModal('applyClubModal');
    document.getElementById('applyClubForm')?.reset();
    showNotification('Application submitted successfully!', 'success');
}

function voteAvailability(eventId) {
    const availabilityEventIdField = document.getElementById('availabilityEventId');
    if (availabilityEventIdField) {
        availabilityEventIdField.value = eventId;
        showModal('availabilityModal');
    }
}

async function handleAvailabilitySubmission(e) {
    e.preventDefault();
    
    const eventId = document.getElementById('availabilityEventId')?.value;
    const availability = document.querySelector('input[name="availability"]:checked')?.value;
    const notes = document.getElementById('availabilityNotes')?.value;
    
    if (!availability) {
        showNotification('Please select your availability', 'error');
        return;
    }
    
    closeModal('availabilityModal');
    document.getElementById('availabilityForm')?.reset();
    showNotification('Availability submitted successfully!', 'success');
}

// Contact functions
function contactCoach(coachId) {
    const coach = playerData.coaches.find(c => c.id === coachId);
    if (coach) {
        window.location.href = `mailto:${coach.email}?subject=Message from ${AppState.currentUser.firstName} ${AppState.currentUser.lastName}`;
    }
}

// 🔥 NEW: Contact coach by email
function contactCoachByEmail(email, name) {
    window.location.href = `mailto:${email}?subject=Message from ${AppState.currentUser.first_name || AppState.currentUser.firstName} ${AppState.currentUser.last_name || AppState.currentUser.lastName}&body=Hi ${name},%0D%0A%0D%0A`;
}

function contactClub(clubId) {
    const club = playerData.clubs.find(c => c.id === clubId);
    if (club) {
        const coaches = playerData.coaches.filter(c => c.club_id === clubId);
        if (coaches.length > 0) {
            const email = coaches[0].email;
            window.location.href = `mailto:${email}?subject=Inquiry about ${club.name}`;
        } else {
            showNotification('No contact information available for this club', 'info');
        }
    }
}

// Utility functions
function viewClubDetails(clubId) {
    const club = AppState.clubs?.find(c => c.id === clubId);
    if (!club) return;
    
    const clubStaff = AppState.staff?.filter(s => s.club_id === clubId) || [];
    const coaches = clubStaff.filter(s => ['coach', 'assistant-coach'].includes(s.role));
    
    let details = `Club Details:\n\n`;
    details += `Name: ${club.name}\n`;
    details += `Location: ${club.location || 'Not specified'}\n`;
    details += `Sport: ${club.sport || 'Not specified'}\n`;
    
    if (coaches.length > 0) {
        details += `\nCoaching Staff:\n`;
        coaches.forEach(coach => {
            details += `- ${coach.first_name} ${coach.last_name} (${coach.role})\n`;
        });
    }
    
    details += `\nDescription: ${club.description || 'No description available'}`;
    
    if (club.philosophy) {
        details += `\n\nPhilosophy: ${club.philosophy}`;
    }
    
    alert(details);
}

function viewEventDetails(eventId) {
    const event = AppState.events?.find(e => e.id === eventId);
    if (!event) return;
    
    const club = AppState.clubs?.find(c => c.id === event.club_id);
    
    let details = `Event Details:\n\n`;
    details += `Title: ${event.title}\n`;
    details += `Type: ${event.event_type}\n`;
    details += `Date: ${formatDate(event.event_date)}${event.event_time ? ` at ${event.event_time}` : ''}\n`;
    details += `Location: ${event.location || 'TBD'}\n`;
    details += `Price: ${formatCurrency(event.price || 0)}\n`;
    details += `Club: ${club ? club.name : 'Unknown'}\n`;
    
    if (event.capacity) {
        details += `Capacity: ${event.capacity}\n`;
    }
    
    if (event.description) {
        details += `\nDescription: ${event.description}`;
    }
    
    alert(details);
}

function downloadReceipt(paymentId) {
    showNotification('Receipt download would start here - feature coming soon', 'info');
}

function viewDocument(docId) {
    showNotification('Document viewer would open here - feature coming soon', 'info');
}

function downloadDocument(docId) {
    showNotification('Document download would start here - feature coming soon', 'info');
}

// Debug function to check what data we have
function debugPlayerData() {
    console.log('🔍 DEBUG: Current AppState:', {
        currentUser: AppState.currentUser,
        events: AppState.events?.length || 0,
        clubs: AppState.clubs?.length || 0,
        players: AppState.players?.length || 0,
        staff: AppState.staff?.length || 0,
        playerTeams: AppState.playerTeams?.length || 0
    });
    
    if (AppState.events?.length > 0) {
        console.log('📅 Sample event:', AppState.events[0]);
    }
    
    if (AppState.players?.length > 0) {
        console.log('👤 Sample player:', AppState.players[0]);
    }
    
    console.log('👤 Current player data:', playerData);
    
    // Show in UI too
    alert(`Debug Info:\n\nTotal Events: ${AppState.events?.length || 0}\nTotal Players: ${AppState.players?.length || 0}\nPlayer Teams: ${AppState.playerTeams?.length || 0}\nPlayer Clubs: ${playerData.clubs.length}\n\nCheck console for detailed info.`);
}

// Export functions for global access
window.initializePlayerDashboard = initializePlayerDashboard;
window.showPlayerSection = showPlayerSection;
window.applyToClub = applyToClub;
window.voteAvailability = voteAvailability;
window.makePayment = makePayment;
window.bookPlayerEvent = bookPlayerEvent;
window.processEventPayment = processEventPayment;
window.confirmEventBooking = confirmEventBooking;
window.filterClubs = filterClubs;
window.filterPlayerEvents = filterPlayerEvents;
window.viewClubDetails = viewClubDetails;
window.contactClub = contactClub;
window.contactCoach = contactCoach;
window.contactCoachByEmail = contactCoachByEmail;
window.viewEventDetails = viewEventDetails;
window.downloadReceipt = downloadReceipt;
window.viewDocument = viewDocument;
window.downloadDocument = downloadDocument;
window.debugPlayerData = debugPlayerData;
window.handleClubApplication = handleClubApplication;
window.handleAvailabilitySubmission = handleAvailabilitySubmission;
window.showAllEvents = showAllEvents;

console.log('✅ Complete Fixed Player Dashboard loaded - now connects to DATABASE!');