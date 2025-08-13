// Added attendance | 07.08.25 BM
let PlayerDashboardState = {
    player: null,
    attendance: null,
    clubs: [],
    teams: [],
    events: [],
    payments: [],
    bookings: [],
    applications: [],
    documents: [],
    isLoading: false
};

// Initialize Player Dashboard
document.addEventListener('DOMContentLoaded', function() {
    console.log('🏃‍♂️ Player dashboard loading...');
    
    // Wait for dependencies to load
    setTimeout(() => {
        if (typeof apiService === 'undefined') {
            console.error('❌ API Service not loaded');
            showNotification('System error: API service not available', 'error');
            return;
        }
        
        if (typeof createPaymentModal === 'undefined') {
            console.warn('⚠️ Payment modal not available - payments will redirect to payment page');
        }
        
        initializePlayerDashboard();
    }, 500);
});

async function initializePlayerDashboard() {
    console.log('🏃‍♂️ Initializing player dashboard...');
    
    try {
        showLoading(true);
        
        // Load player data with error handling
        await loadPlayerDataWithFallback();
        
        // Load all dashboard sections
        loadPlayerOverview();
        loadPlayerClubs();
        loadPlayerTeams();
        loadPlayerFinances();
        loadClubFinder();
        loadEventFinder();
        loadPlayerDocuments();
        loadPlayerListings();
        setupEventListeners();
        
        console.log('✅ Player dashboard initialized successfully');
        
    } catch (error) {
        console.error('❌ Failed to initialize player dashboard:', error);
        showNotification('Failed to load dashboard: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

async function loadPlayerDataWithFallback() {
    console.log('📊 Loading player data with fallback...');
    
    try {
        // Try to load from player dashboard endpoint first
        try {
            const dashboardData = await apiService.getPlayerDashboardData();
            console.log('✅ Loaded from player dashboard API:', dashboardData);
            
            // Added attendance 07.08.25 | BM
            PlayerDashboardState.player = dashboardData.player;
            PlayerDashboardState.attendance = dashboardData.attendance;
            PlayerDashboardState.clubs = dashboardData.clubs || [];
            PlayerDashboardState.teams = dashboardData.teams || [];
            PlayerDashboardState.events = dashboardData.events || [];
            PlayerDashboardState.payments = dashboardData.payments || [];
            PlayerDashboardState.bookings = dashboardData.bookings || [];
            PlayerDashboardState.applications = dashboardData.applications || [];
            
            return;
        } catch (error) {
            console.warn('⚠️ Player dashboard API failed, trying individual endpoints:', error);
        }
        
        // Fallback to individual API calls
        const loadPromises = [
            apiService.getEvents().then(data => PlayerDashboardState.events = data || []).catch(e => {
                console.warn('Failed to load events:', e);
                PlayerDashboardState.events = [];
            }),
            apiService.getClubs().then(data => PlayerDashboardState.clubs = data || []).catch(e => {
                console.warn('Failed to load clubs:', e);
                PlayerDashboardState.clubs = [];
            }),
            apiService.getTeams().then(data => PlayerDashboardState.teams = data || []).catch(e => {
                console.warn('Failed to load teams:', e);
                PlayerDashboardState.teams = [];
            }),
            apiService.getPayments().then(data => PlayerDashboardState.payments = data || []).catch(e => {
                console.warn('Failed to load payments:', e);
                PlayerDashboardState.payments = [];
            }),
            apiService.getUserBookings().then(data => PlayerDashboardState.bookings = data || []).catch(e => {
                console.warn('Failed to load bookings:', e);
                PlayerDashboardState.bookings = [];
            })
        ];
        
        await Promise.all(loadPromises);
        
        // Try to find current user as player
        if (AppState.currentUser) {
            const currentUserEmail = AppState.currentUser.email;
            console.log('🔍 Looking for player with email:', currentUserEmail);
            
            // Check if user exists in any club as a player
            PlayerDashboardState.clubs.forEach(club => {
                if (club.players) {
                    const playerRecord = club.players.find(p => p.email === currentUserEmail);
                    if (playerRecord) {
                        PlayerDashboardState.player = playerRecord;
                        console.log('✅ Found player record:', playerRecord);
                    }
                }
            });
        }
        
        console.log('📊 Loaded data successfully:', {
            events: PlayerDashboardState.events.length,
            clubs: PlayerDashboardState.clubs.length,
            teams: PlayerDashboardState.teams.length,
            payments: PlayerDashboardState.payments.length,
            bookings: PlayerDashboardState.bookings.length,
            hasPlayer: !!PlayerDashboardState.player
        });
        
    } catch (error) {
        console.error('❌ Failed to load player data:', error);
        throw error;
    }
}

function setupEventListeners() {
    // Form submissions
    const applyClubForm = document.getElementById('applyClubForm');
    const availabilityForm = document.getElementById('availabilityForm');
    
    if (applyClubForm) {
        applyClubForm.addEventListener('submit', handleClubApplication);
    }
    
    if (availabilityForm) {
        availabilityForm.addEventListener('submit', handleAvailabilitySubmission);
    }
    
    console.log('📋 Player dashboard event listeners setup');
}

// Load dashboard sections
function loadPlayerOverview() {
    console.log('📊 Loading player overview...');
    
    const playerClubsCount = PlayerDashboardState.clubs.length;
    const playerTeamsCount = PlayerDashboardState.teams.length;
    const upcomingEventsCount = PlayerDashboardState.events.filter(e => new Date(e.event_date) > new Date()).length;
    
    // Update stats | Added Attendance | 07.28.25 BM
    updateStatElement('playerClubs', playerClubsCount);
    updateStatElement('playerTeams', playerTeamsCount);
    updateStatElement('playerEvents', upcomingEventsCount);
    updateStatElement('playerAttendance', PlayerDashboardState.attendance+'%'); // Placeholder
    
    loadUpcomingEvents();
    loadRecentActivity();
    loadPerformanceSummary();
}

function updateStatElement(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = value;
    }
}

function loadUpcomingEvents() {
    const upcomingContainer = document.getElementById('playerUpcomingEvents');
    if (!upcomingContainer) return;
    
    const now = new Date();
    const upcoming = PlayerDashboardState.events
        .filter(e => new Date(e.event_date) > now)
        .sort((a, b) => new Date(a.event_date) - new Date(b.event_date))
        .slice(0, 5);
    
    if (upcoming.length === 0) {
        upcomingContainer.innerHTML = '<p>No upcoming events</p>';
        return;
    }
    
    upcomingContainer.innerHTML = upcoming.map(event => `
        <div class="item-list-item">
            <div class="item-info">
                <h4>${event.title}</h4>
                <p>${formatDate(event.event_date)}${event.event_time ? ` at ${event.event_time}` : ''}</p>
                <p>Price: ${formatCurrency(event.price || 0)}</p>
            </div>
            <div class="item-actions">
                <button class="btn btn-small btn-primary" onclick="bookEvent('${event.id}')">Book</button>
            </div>
        </div>
    `).join('');
}

function loadRecentActivity() {
    const activityContainer = document.getElementById('playerRecentActivity');
    if (!activityContainer) return;
    
    const recentBookings = PlayerDashboardState.bookings.slice(0, 3);
    
    if (recentBookings.length === 0) {
        activityContainer.innerHTML = '<p>No recent activity</p>';
        return;
    }
    
    activityContainer.innerHTML = recentBookings.map(booking => `
        <div class="item-list-item">
            <div class="item-info">
                <h4>${booking.title}</h4>
                <p>${formatDate(booking.event_date)} - ${booking.booking_status}</p>
            </div>
            <span class="status-badge status-${booking.booking_status}">${booking.booking_status}</span>
        </div>
    `).join('');
}

function loadPerformanceSummary() {
    updateStatElement('playerMatchesPlayed', PlayerDashboardState.bookings.filter(b => b.event_type === 'match').length);
    updateStatElement('playerAverageRating', '4.2'); // Placeholder
    updateStatElement('playerTrainingSessions', PlayerDashboardState.bookings.filter(b => b.event_type === 'training').length);
    updateStatElement('playerPosition', PlayerDashboardState.player?.position || 'Not Set');
}

function loadPlayerClubs() {
    console.log('🏢 Loading player clubs...');
    
    const clubsContainer = document.getElementById('playerClubsContainer');
    if (!clubsContainer) return;
    
    if (PlayerDashboardState.clubs.length === 0) {
        clubsContainer.innerHTML = `
            <div class="empty-state">
                <h4>No clubs joined yet</h4>
                <p>Find and apply to clubs to get started</p>
                <button class="btn btn-primary" onclick="showPlayerSection('club-finder')">Find Clubs</button>
            </div>
        `;
        return;
    }
    
    clubsContainer.innerHTML = PlayerDashboardState.clubs.map(club => `
        <div class="card">
            <h4>${club.name}</h4>
            <p><strong>Location:</strong> ${club.location || 'Not specified'}</p>
            <p><strong>Sport:</strong> ${club.sport || 'Not specified'}</p>
            <p><strong>Members:</strong> ${club.member_count || 0}</p>
            <p>${club.description || 'No description available'}</p>
            <div class="item-actions">
                <button class="btn btn-small btn-secondary" onclick="viewClubDetails('${club.id}')">View Details</button>
                <button class="btn btn-small btn-primary" onclick="viewClubEvents('${club.id}')">View Events</button>
            </div>
        </div>
    `).join('');
    
    // Load club staff
    loadClubStaff();
}

function loadClubStaff() {
    const staffTableBody = document.getElementById('clubStaffTableBody');
    if (!staffTableBody) return;
    
    let allStaff = [];
    
    // Collect staff from all clubs
    PlayerDashboardState.clubs.forEach(club => {
        if (club.staff) {
            club.staff.forEach(staff => {
                allStaff.push({
                    ...staff,
                    club_name: club.name
                });
            });
        }
    });
    
    if (allStaff.length === 0) {
        staffTableBody.innerHTML = '<tr><td colspan="4">No staff information available</td></tr>';
        return;
    }
    
    staffTableBody.innerHTML = allStaff.map(staff => `
        <tr>
            <td>${staff.first_name} ${staff.last_name}</td>
            <td>${staff.role}</td>
            <td>${staff.email || 'N/A'}</td>
            <td>${staff.club_name}</td>
        </tr>
    `).join('');
}

function loadPlayerTeams() {
    console.log('⚽ Loading player teams...');
    
    const teamsContainer = document.getElementById('playerTeamsContainer');
    if (!teamsContainer) return;
    
    if (PlayerDashboardState.teams.length === 0) {
        teamsContainer.innerHTML = `
            <div class="empty-state">
                <h4>No teams joined yet</h4>
                <p>Join a club to be assigned to teams</p>
                <button class="btn btn-primary" onclick="showPlayerSection('club-finder')">Find Clubs</button>
            </div>
        `;
        return;
    }
    
    teamsContainer.innerHTML = PlayerDashboardState.teams.map(team => `
        <div class="card">
            <h4>${team.name}</h4>
            <p><strong>Age Group:</strong> ${team.age_group || 'Not specified'}</p>
            <p><strong>Sport:</strong> ${team.sport || 'Not specified'}</p>
            <p><strong>Position:</strong> ${team.player_position || 'Not assigned'}</p>
            <p><strong>Jersey Number:</strong> ${team.jersey_number || 'Not assigned'}</p>
            ${team.coach ? `<p><strong>Coach:</strong> ${team.coach.name}</p>` : ''}
            <div class="item-actions">
                <button class="btn btn-small btn-secondary" onclick="viewTeamDetails('${team.id}')">View Team</button>
                <button class="btn btn-small btn-primary" onclick="viewTeamEvents('${team.id}')">Team Events</button>
            </div>
        </div>
    `).join('');
    
    loadTeamEvents();
}

function loadTeamEvents() {
    const eventsContainer = document.getElementById('teamEventsContainer');
    if (!eventsContainer) return;
    
    // Filter events for user's teams
    const teamIds = PlayerDashboardState.teams.map(t => t.id);
    const teamEvents = PlayerDashboardState.events.filter(e => teamIds.includes(e.team_id));
    
    if (teamEvents.length === 0) {
        eventsContainer.innerHTML = '<p>No team events found</p>';
        return;
    }
    
    eventsContainer.innerHTML = teamEvents.map(event => `
        <div class="event-item" style="border: 1px solid #ddd; padding: 1rem; margin: 0.5rem 0; border-radius: 8px;">
            <h4>${event.title}</h4>
            <p><strong>Date:</strong> ${formatDate(event.event_date)}</p>
            <p><strong>Type:</strong> ${event.event_type}</p>
            <div class="item-actions">
                <button class="btn btn-small btn-primary" onclick="submitAvailability('${event.id}')">Submit Availability</button>
                <button class="btn btn-small btn-secondary" onclick="viewEventDetails('${event.id}')">View Details</button>
            </div>
        </div>
    `).join('');
}

function loadPlayerFinances() {
    console.log('💰 Loading player finances...');
    
    const payments = PlayerDashboardState.payments;
    const totalDue = payments.filter(p => p.payment_status === 'pending').reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    const totalPaid = payments.filter(p => p.payment_status === 'paid').reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    const nextPayment = payments.find(p => p.payment_status === 'pending');
    
    // Update financial stats
    updateStatElement('totalDue', formatCurrency(totalDue));
    updateStatElement('totalPaid', formatCurrency(totalPaid));
    updateStatElement('nextPayment', nextPayment ? formatCurrency(nextPayment.amount) : '£0');
    updateStatElement('paymentStatus', totalDue > 0 ? 'Outstanding' : 'Up to Date');
    
    loadPaymentHistory();
    loadOutstandingPayments();
}

function loadPaymentHistory() {
    const tableBody = document.getElementById('paymentHistoryTableBody');
    if (!tableBody) return;
    
    const payments = PlayerDashboardState.payments;
    
    if (payments.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5">No payment history found</td></tr>';
        return;
    }
    
    tableBody.innerHTML = payments.map(payment => `
        <tr>
            <td>${formatDate(payment.due_date)}</td>
            <td>${payment.description}</td>
            <td>${formatCurrency(payment.amount)}</td>
            <td><span class="status-badge status-${payment.payment_status}">${payment.payment_status}</span></td>
            <td>
                ${payment.payment_status === 'pending' ? `
                    <button class="btn btn-small btn-primary" onclick="payNow('${payment.id}', ${payment.amount}, '${payment.description}')">Pay Now</button>
                ` : payment.payment_status === 'paid' ? `
                    <span style="color: #28a745;">✅ Paid</span>
                ` : ''}
            </td>
        </tr>
    `).join('');
}

function loadOutstandingPayments() {
    const container = document.getElementById('outstandingPayments');
    if (!container) return;
    
    const outstanding = PlayerDashboardState.payments.filter(p => p.payment_status === 'pending');
    
    if (outstanding.length === 0) {
        container.innerHTML = '<p>No outstanding payments</p>';
        return;
    }
    
    container.innerHTML = outstanding.map(payment => `
        <div class="payment-item" style="border: 1px solid #ddd; padding: 1rem; margin: 0.5rem 0; border-radius: 8px; background: #000000;">
            <h4>${payment.description}</h4>
            <p><strong>Amount:</strong> ${formatCurrency(payment.amount)}</p>
            <p><strong>Due Date:</strong> ${formatDate(payment.due_date)}</p>
            <button class="btn btn-primary" onclick="payNow('${payment.id}', ${payment.amount}, '${payment.description}')">Pay Now</button>
        </div>
    `).join('');
}

function loadClubFinder() {
    console.log('🔍 Loading club finder...');
    
    const clubsContainer = document.getElementById('availableClubsContainer');
    if (!clubsContainer) return;
    
    if (PlayerDashboardState.clubs.length === 0) {
        clubsContainer.innerHTML = `
            <div class="empty-state">
                <h4>No clubs available</h4>
                <p>Check back later for new clubs</p>
                <button class="btn btn-primary" onclick="refreshClubData()">Refresh</button>
            </div>
        `;
        return;
    }
    
    displayClubs(PlayerDashboardState.clubs);
}

function displayClubs(clubs) {
    const clubsContainer = document.getElementById('availableClubsContainer');
    if (!clubsContainer) return;
    
    // Temp fix to apply button - Club names all contain ' which interrupts the innerHTML, have added .replace to get rid of the ' from string. | 06.08.25 BM
    // Applying to club without invite doesn't seem to function yet anyways, missing from api-service.js
    clubsContainer.innerHTML = clubs.map(club => `
        <div class="card">
            <h4>${club.name}</h4>
            <p><strong>Location:</strong> ${club.location || 'Not specified'}</p>
            <p><strong>Sport:</strong> ${club.sport || 'Not specified'}</p>
            <p><strong>Members:</strong> ${club.member_count || 0}</p>
            <p>${club.description || 'No description available'}</p>
            <div class="item-actions">  
                <button class="btn btn-small btn-primary" onclick='applyToClub("${club.id}", "${club.name.replace("'", "")}")'>Apply</button>
                <button class="btn btn-small btn-secondary" onclick="viewClubDetails('${club.id}')">View Details</button>
            </div>
        </div>
    `).join('');
}

function loadEventFinder() {
    console.log('📅 Loading event finder...');
    
    const eventsContainer = document.getElementById('availablePlayerEventsContainer');
    if (!eventsContainer) return;
    
    // Show ALL events by default
    displayEvents(PlayerDashboardState.events);
}

function displayEvents(events) {
    const eventsContainer = document.getElementById('availablePlayerEventsContainer');
    if (!eventsContainer) return;
    
    if (events.length === 0) {
        eventsContainer.innerHTML = `
            <div class="empty-state">
                <h4>No events found</h4>
                <p>Try adjusting your search criteria or check back later</p>
                <button class="btn btn-primary" onclick="refreshEventData()">Refresh Events</button>
            </div>
        `;
        return;
    }
    
    eventsContainer.innerHTML = events.map(event => `
        <div class="card">
            <h4>${event.title}</h4>
            <p><strong>Type:</strong> ${event.event_type}</p>
            <p><strong>Date:</strong> ${formatDate(event.event_date)}${event.event_time ? ` at ${event.event_time}` : ''}</p>
            <p><strong>Location:</strong> ${event.location || 'TBD'}</p>
            <p><strong>Price:</strong> ${formatCurrency(event.price || 0)}</p>
            <p><strong>Available Spots:</strong> ${event.spots_available || 'Unlimited'}</p>
            <p>${event.description || 'No description available'}</p>
            <div class="item-actions">
                <button class="btn btn-small btn-primary" onclick="bookEvent('${event.id}')">Book Event</button>
                <button class="btn btn-small btn-secondary" onclick="viewEventDetails('${event.id}')">View Details</button>
            </div>
        </div>
    `).join('');
}

function loadPlayerDocuments() {
    console.log('📄 Loading player documents...');
    
    const tableBody = document.getElementById('playerDocumentsTableBody');
    if (!tableBody) return;
    
    // Mock documents for now - replace with real API call when available
    const documents = [
        {
            id: '1',
            name: 'Club Handbook',
            type: 'PDF',
            club_name: 'Elite Football Academy',
            updated_at: '2024-01-15'
        },
        {
            id: '2',
            name: 'Training Schedule',
            type: 'PDF',
            club_name: 'Elite Football Academy',
            updated_at: '2024-01-20'
        },
        {
            id: '3',
            name: 'Safety Guidelines',
            type: 'PDF',
            club_name: 'Elite Football Academy',
            updated_at: '2024-01-10'
        }
    ];
    
    if (documents.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5">No documents available</td></tr>';
        return;
    }
    
    tableBody.innerHTML = documents.map(doc => `
        <tr>
            <td>${doc.name}</td>
            <td>${doc.type}</td>
            <td>${doc.club_name}</td>
            <td>${formatDate(doc.updated_at)}</td>
            <td>
                <button class="btn btn-small btn-primary" onclick="downloadDocument('${doc.id}')">Download</button>
                <button class="btn btn-small btn-secondary" onclick="viewDocument('${doc.id}')">View</button>
            </td>
        </tr>
    `).join('');
}

function loadPlayerListings() {
    console.log('📋 Loading player listings...');
    
    // This function will be called when listings section is implemented
    // For now, we'll handle this in the showPlayerSection function
}

// Event handlers
function showPlayerSection(sectionId) {
    console.log('🔄 Showing player section:', sectionId);
    
    // Hide all sections
    document.querySelectorAll('.dashboard-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Remove active class from all nav buttons
    document.querySelectorAll('.dashboard-nav button').forEach(button => {
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
    
    // Load section-specific data
    switch(sectionId) {
        case 'overview':
            loadPlayerOverview();
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
            loadEventFinder();
            break;
        case 'documents':
            loadPlayerDocuments();
            break;
        case 'listings':
            showNotification('Listings feature coming soon!', 'info');
            break;
    }
}

// Fixed event booking with proper payment handling
async function bookEvent(eventId) {
    console.log('📅 Booking event:', eventId);
    
    const event = PlayerDashboardState.events.find(e => e.id === eventId);
    if (!event) {
        showNotification('Event not found', 'error');
        return;
    }
    
    try {
        if (event.price > 0) {
            // Event requires payment
            console.log('💳 Event requires payment, showing payment options...');
            
            if (typeof createPaymentModal !== 'undefined') {
                // Use payment modal if available
                const onSuccess = async (paymentResult) => {
                    console.log('✅ Payment successful:', paymentResult);
                    
                    try {
                        await apiService.bookEventWithPayment(eventId, paymentResult.id);
                        showNotification('Event booked successfully!', 'success');
                        await loadPlayerDataWithFallback();
                        loadPlayerOverview();
                    } catch (error) {
                        console.error('❌ Failed to complete booking:', error);
                        showNotification('Payment successful but booking failed: ' + error.message, 'error');
                    }
                };
                
                const onError = (error) => {
                    console.error('❌ Payment failed:', error);
                    showNotification('Payment failed: ' + error.message, 'error');
                };
                
                createPaymentModal(event.price, event.title, onSuccess, onError);
            } else {
                // Fallback to payment page
                const paymentData = {
                    amount: event.price,
                    description: event.title,
                    eventId: eventId
                };
                
                const paymentUrl = `payment.html?amount=${paymentData.amount}&description=${encodeURIComponent(paymentData.description)}&eventId=${paymentData.eventId}`;
                window.open(paymentUrl, '_blank');
            }
        } else {
            // Free event - book directly
            console.log('🆓 Free event, booking directly...');
            
            await apiService.bookEvent(eventId);
            showNotification('Event booked successfully!', 'success');
            
            await loadPlayerDataWithFallback();
            loadPlayerOverview();
        }
        
    } catch (error) {
        console.error('❌ Failed to book event:', error);
        showNotification('Failed to book event: ' + error.message, 'error');
    }
}

// Payment function with fallback
async function payNow(paymentId, amount, description) {
    console.log('💳 Processing payment:', paymentId, amount, description);
    
    try {
        if (typeof createPaymentModal !== 'undefined') {
            // Use payment modal if available
            const onSuccess = async (paymentResult) => {
                console.log('✅ Payment successful:', paymentResult);
                
                try {
                    await apiService.confirmPayment(paymentResult.id, paymentId);
                    showNotification('Payment successful!', 'success');
                    await loadPlayerDataWithFallback();
                    loadPlayerFinances();
                } catch (error) {
                    console.error('❌ Failed to confirm payment:', error);
                    showNotification('Payment successful but confirmation failed: ' + error.message, 'error');
                }
            };
            
            const onError = (error) => {
                console.error('❌ Payment failed:', error);
                showNotification('Payment failed: ' + error.message, 'error');
            };
            
            createPaymentModal(amount, description, onSuccess, onError);
        } else {
            // Fallback to payment page
            const paymentUrl = `payment.html?paymentId=${paymentId}&amount=${amount}&description=${encodeURIComponent(description)}`;
            window.open(paymentUrl, '_blank');
        }
        
    } catch (error) {
        console.error('❌ Failed to process payment:', error);
        showNotification('Failed to process payment: ' + error.message, 'error');
    }
}

// Club application
async function applyToClub(clubId, clubName) {
    console.log('📝 Applying to club:', clubId, clubName);
    
    // Set the club ID and name in the form
    document.getElementById('applyClubId').value = clubId;
    
    // Update modal title
    const modalTitle = document.querySelector('#applyClubModal .modal-header h2');
    if (modalTitle) {
        modalTitle.textContent = `Apply to ${clubName}`;
    }
    
    // Show the modal
    showModal('applyClubModal');
}

async function handleClubApplication(e) {
    e.preventDefault();
    
    try {
        const clubId = document.getElementById('applyClubId').value;
        const message = document.getElementById('applicationMessage').value;
        const position = document.getElementById('playerPosition').value;
        const experience = document.getElementById('playerExperience').value;
        
        const availability = Array.from(document.querySelectorAll('input[name="availability"]:checked'))
                                  .map(cb => cb.value);
        
        const applicationData = {
            message,
            preferredPosition: position,
            experienceLevel: experience,
            availability
        };
        
        await apiService.applyToClub(clubId, applicationData);
        
        closeModal('applyClubModal');
        showNotification('Application submitted successfully!', 'success');
        
        // Clear form
        document.getElementById('applyClubForm').reset();
        
    } catch (error) {
        console.error('❌ Failed to submit application:', error);
        showNotification('Failed to submit application: ' + error.message, 'error');
    }
}

// Availability submission
function submitAvailability(eventId) {
    console.log('📝 Submitting availability for event:', eventId);
    
    // Set event ID in form
    document.getElementById('availabilityEventId').value = eventId;
    
    // Show modal
    showModal('availabilityModal');
}

async function handleAvailabilitySubmission(e) {
    e.preventDefault();
    
    try {
        const eventId = document.getElementById('availabilityEventId').value;
        const availability = document.querySelector('input[name="availability"]:checked')?.value;
        const notes = document.getElementById('availabilityNotes').value;
        
        if (!availability) {
            showNotification('Please select your availability', 'error');
            return;
        }
        
        const availabilityData = {
            availability,
            notes
        };
        
        await apiService.submitAvailability(eventId, availabilityData);
        
        closeModal('availabilityModal');
        showNotification('Availability submitted successfully!', 'success');
        
        // Clear form
        document.getElementById('availabilityForm').reset();
        
    } catch (error) {
        console.error('❌ Failed to submit availability:', error);
        showNotification('Failed to submit availability: ' + error.message, 'error');
    }
}

// Filter functions
function filterPlayerEvents() {
    const searchTerm = document.getElementById('eventSearchInput')?.value.toLowerCase() || '';
    const typeFilter = document.getElementById('playerEventTypeFilter')?.value || '';
    const dateFilter = document.getElementById('playerEventDateFilter')?.value || '';
    
    let filteredEvents = [...PlayerDashboardState.events];
    
    if (searchTerm) {
        filteredEvents = filteredEvents.filter(event => 
            event.title.toLowerCase().includes(searchTerm) ||
            (event.description && event.description.toLowerCase().includes(searchTerm)) ||
            (event.location && event.location.toLowerCase().includes(searchTerm))
        );
    }
    
    if (typeFilter) {
        filteredEvents = filteredEvents.filter(event => event.event_type === typeFilter);
    }
    
    if (dateFilter) {
        filteredEvents = filteredEvents.filter(event => event.event_date >= dateFilter);
    }
    
    console.log('📅 Filtered events:', filteredEvents.length, 'from', PlayerDashboardState.events.length);
    displayEvents(filteredEvents);
}

function filterClubs() {
    const searchTerm = document.getElementById('clubSearchInput')?.value.toLowerCase() || '';
    const typeFilter = document.getElementById('clubTypeFilter')?.value || '';
    const sportFilter = document.getElementById('clubSportFilter')?.value || '';
    
    let filteredClubs = [...PlayerDashboardState.clubs];
    
    if (searchTerm) {
        filteredClubs = filteredClubs.filter(club => 
            club.name.toLowerCase().includes(searchTerm) ||
            (club.location && club.location.toLowerCase().includes(searchTerm)) ||
            (club.description && club.description.toLowerCase().includes(searchTerm))
        );
    }
    
    if (typeFilter) {
        filteredClubs = filteredClubs.filter(club => 
            club.types && club.types.includes(typeFilter)
        );
    }
    
    if (sportFilter) {
        filteredClubs = filteredClubs.filter(club => club.sport === sportFilter);
    }
    
    console.log('🏢 Filtered clubs:', filteredClubs.length, 'from', PlayerDashboardState.clubs.length);
    displayClubs(filteredClubs);
}

// View functions
function viewClubDetails(clubId) {
    console.log('👁️ View club details:', clubId);
    
    const club = PlayerDashboardState.clubs.find(c => c.id === clubId);
    if (!club) {
        showNotification('Club not found', 'error');
        return;
    }

    // If an instance of this modal is already in the DOM, remove it before creating a new one. Avoids duplicate DOMS as well as closeModal failing on second instance of a modal with same name.
    const prevModal = document.getElementById('clubDetailsModal');
    if (prevModal) prevModal.remove();
    
    // Create club details modal
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.id = 'clubDetailsModal';
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
            <div class="modal-header">
                <h2>${club.name}</h2>
                <button class="close" onclick="closeModal('clubDetailsModal')">&times;</button>
            </div>
            <div class="modal-body">
                <p><strong>Location:</strong> ${club.location || 'Not specified'}</p>
                <p><strong>Sport:</strong> ${club.sport || 'Not specified'}</p>
                <p><strong>Members:</strong> ${club.member_count || 0}</p>
                <p><strong>Description:</strong> ${club.description || 'No description available'}</p>
                ${club.philosophy ? `<p><strong>Philosophy:</strong> ${club.philosophy}</p>` : ''}
                ${club.website ? `<p><strong>Website:</strong> <a href="${club.website}" target="_blank">${club.website}</a></p>` : ''}
                <div style="margin-top: 1rem;">
                    <button class="btn btn-primary" onclick="applyToClub('${club.id}', '${club.name}')">Apply to Club</button>
                    <button class="btn btn-secondary" onclick="closeModal('clubDetailsModal')">Close</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function viewEventDetails(eventId) {
    console.log('👁️ View event details:', eventId);
    
    const event = PlayerDashboardState.events.find(e => e.id === eventId);
    if (!event) {
        showNotification('Event not found', 'error');
        return;
    }
    
    // If an instance of this modal is already in the DOM, remove it before creating a new one. Avoids duplicate DOMS as well as closeModal failing on second instance of a modal with same name.
    const prevModal = document.getElementById('eventDetailsModal');
    if (prevModal) prevModal.remove();

    // Create event details modal
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.id = 'eventDetailsModal';
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
            <div class="modal-header">
                <h2>${event.title}</h2>
                <button class="close" onclick="closeModal('eventDetailsModal')">&times;</button>
            </div>
            <div class="modal-body">
                <p><strong>Type:</strong> ${event.event_type}</p>
                <p><strong>Date:</strong> ${formatDate(event.event_date)}${event.event_time ? ` at ${event.event_time}` : ''}</p>
                <p><strong>Location:</strong> ${event.location || 'TBD'}</p>
                <p><strong>Price:</strong> ${formatCurrency(event.price || 0)}</p>
                <p><strong>Capacity:</strong> ${event.capacity || 'Unlimited'}</p>
                <p><strong>Available Spots:</strong> ${event.spots_available || 'Unlimited'}</p>
                <p><strong>Description:</strong> ${event.description || 'No description available'}</p>
                <div style="margin-top: 1rem;">
                    <button class="btn btn-primary" onclick="bookEvent('${event.id}'); closeModal('eventDetailsModal')">Book Event</button>
                    <button class="btn btn-secondary" onclick="closeModal('eventDetailsModal')">Close</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function viewTeamDetails(teamId) {
    console.log('👁️ View team details:', teamId);
    
    const team = PlayerDashboardState.teams.find(t => t.id === teamId);
    if (!team) {
        showNotification('Team not found', 'error');
        return;
    }
    
    // If an instance of this modal is already in the DOM, remove it before creating a new one. Avoids duplicate DOMS as well as closeModal failing on second instance of a modal with same name.
    const prevModal = document.getElementById('teamDetailsModal');
    if (prevModal) prevModal.remove();

    // Create team details modal
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.id = 'teamDetailsModal';
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
            <div class="modal-header">
                <h2>${team.name}</h2>
                <button class="close" onclick="closeModal('teamDetailsModal')">&times;</button>
            </div>
            <div class="modal-body">
                <p><strong>Age Group:</strong> ${team.age_group || 'Not specified'}</p>
                <p><strong>Sport:</strong> ${team.sport || 'Not specified'}</p>
                <p><strong>Your Position:</strong> ${team.player_position || 'Not assigned'}</p>
                <p><strong>Your Jersey Number:</strong> ${team.jersey_number || 'Not assigned'}</p>
                ${team.coach ? `<p><strong>Coach:</strong> ${team.coach.name} (${team.coach.email})</p>` : '<p><strong>Coach:</strong> Not assigned</p>'}
                <p><strong>Description:</strong> ${team.description || 'No description available'}</p>
                <div style="margin-top: 1rem;">
                    <button class="btn btn-primary" onclick="viewTeamEvents('${team.id}'); closeModal('teamDetailsModal')">View Team Events</button>
                    <button class="btn btn-secondary" onclick="closeModal('teamDetailsModal')">Close</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function viewClubEvents(clubId) {
    console.log('📅 View club events:', clubId);
    
    const clubEvents = PlayerDashboardState.events.filter(e => e.club_id === clubId);
    
    if (clubEvents.length === 0) {
        showNotification('No events found for this club', 'info');
        return;
    }
    
    // Switch to event finder and filter by club
    showPlayerSection('event-finder');
    displayEvents(clubEvents);
}

function viewTeamEvents(teamId) {
    console.log('📅 View team events:', teamId);
    
    const teamEvents = PlayerDashboardState.events.filter(e => e.team_id === teamId);
    
    if (teamEvents.length === 0) {
        showNotification('No events found for this team', 'info');
        return;
    }
    
    // Switch to event finder and filter by team
    showPlayerSection('event-finder');
    displayEvents(teamEvents);
}

// Document functions
function downloadDocument(documentId) {
    console.log('📥 Download document:', documentId);
    showNotification('Document download feature coming soon!', 'info');
}

function viewDocument(documentId) {
    console.log('👁️ View document:', documentId);
    showNotification('Document viewer coming soon!', 'info');
}

// Refresh functions
async function refreshEventData() {
    console.log('🔄 Refreshing event data...');
    
    try {
        showLoading(true);
        const events = await apiService.getEvents();
        PlayerDashboardState.events = events || [];
        displayEvents(PlayerDashboardState.events);
        showNotification('Events refreshed successfully!', 'success');
    } catch (error) {
        console.error('❌ Failed to refresh events:', error);
        showNotification('Failed to refresh events: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

async function refreshClubData() {
    console.log('🔄 Refreshing club data...');
    
    try {
        showLoading(true);
        const clubs = await apiService.getClubs();
        PlayerDashboardState.clubs = clubs || [];
        displayClubs(PlayerDashboardState.clubs);
        showNotification('Clubs refreshed successfully!', 'success');
    } catch (error) {
        console.error('❌ Failed to refresh clubs:', error);
        showNotification('Failed to refresh clubs: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

async function refreshAllData() {
    console.log('🔄 Refreshing all player data...');
    
    try {
        showLoading(true);
        await loadPlayerDataWithFallback();
        
        // Reload current section
        const activeSection = document.querySelector('.dashboard-section.active');
        if (activeSection) {
            const sectionId = activeSection.id.replace('player-', '');
            showPlayerSection(sectionId);
        }
        
        showNotification('All data refreshed successfully!', 'success');
    } catch (error) {
        console.error('❌ Failed to refresh data:', error);
        showNotification('Failed to refresh data: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// Export functions for global access
window.showPlayerSection = showPlayerSection;
window.bookEvent = bookEvent;
window.payNow = payNow;
window.applyToClub = applyToClub;
window.handleClubApplication = handleClubApplication;
window.submitAvailability = submitAvailability;
window.handleAvailabilitySubmission = handleAvailabilitySubmission;
window.filterPlayerEvents = filterPlayerEvents;
window.filterClubs = filterClubs;
window.viewClubDetails = viewClubDetails;
window.viewEventDetails = viewEventDetails;
window.viewTeamDetails = viewTeamDetails;
window.viewClubEvents = viewClubEvents;
window.viewTeamEvents = viewTeamEvents;
window.downloadDocument = downloadDocument;
window.viewDocument = viewDocument;
window.refreshEventData = refreshEventData;
window.refreshClubData = refreshClubData;
window.refreshAllData = refreshAllData;
window.initializePlayerDashboard = initializePlayerDashboard;

console.log('✅ Complete Player Dashboard loaded successfully!');