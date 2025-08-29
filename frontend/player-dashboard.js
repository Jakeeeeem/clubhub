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
  players: [],          
  plans: [],            
  currentPlan: null,    
  stripe: {
    linked: false,
    payouts_enabled: false,
    details_submitted: false,
    account_id: null
  },
  isLoading: false
};

function setupNavButtons() {
  const navContainer = document.getElementById("loggedInNav");
  if (!navContainer) return;

  if (AppState.currentUser) {
    const firstName = AppState.currentUser.first_name || AppState.currentUser.firstName || "User";
    const firstLetter = firstName.charAt(0).toUpperCase();
    
    navContainer.innerHTML = 
      '<div class="user-info" style="display: flex; align-items: center; gap: 10px;">' +
        '<div class="user-avatar" style="width: 32px; height: 32px; border-radius: 50%; background: #007bff; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold;">' + firstLetter + '</div>' +
        '<span>Welcome, ' + firstName + '</span>' +
        '<button class="btn btn-small btn-primary" onclick="showModal(\'accountModal\')">Account</button>' +
      '</div>' +
      '<button class="btn btn-secondary btn-small" onclick="logout()">Logout</button>';
  } else {
    navContainer.innerHTML = '<button class="btn btn-primary" onclick="window.location.href=\'index.html\'">Login</button>';
  }
}

async function initializePlayerDashboard() {
  console.log('Initializing player dashboard...');
  try {
    AppState.currentUser = safeGetCurrentUser();
    setupNavButtons();

    showLoading(true);

    wirePlayersFilterTabs();
    wireStripeButtons();
    wirePlanButtons();
    wireAccountModal();
    wireFormEventListeners();

    await loadPlayerDataWithFallback();

    loadPlayerOverview();
    loadPlayerClubs();
    loadPlayerTeams();
    loadPlayerFinances();
    loadClubFinder();
    loadEventFinder();
    loadPlayerDocuments();

    const additionalPromises = [
      loadPlayersList().catch(e => console.warn('Failed to load players list:', e)),
      refreshStripeStatus().catch(e => console.warn('Failed to load Stripe status:', e)),
      loadPaymentPlans().catch(e => console.warn('Failed to load payment plans:', e)),
      loadCurrentPlan().catch(e => console.warn('Failed to load current plan:', e))
    ];

    await Promise.allSettled(additionalPromises);

    console.log('Player dashboard initialized successfully');
  } catch (err) {
    console.error('Failed to initialize player dashboard:', err);
    showNotification('Dashboard loaded with some limitations: ' + err.message, 'warning');
  } finally {
    showLoading(false);
  }
}

function wireFormEventListeners() {
  const applyClubForm = document.getElementById('applyClubForm');
  if (applyClubForm) {
    applyClubForm.addEventListener('submit', handleClubApplication);
  }

  const availabilityForm = document.getElementById('availabilityForm');
  if (availabilityForm) {
    availabilityForm.addEventListener('submit', handleAvailabilitySubmission);
  }
}

async function loadPlayerDataWithFallback() {
  console.log('Loading player data...');
  try {
    if (typeof apiService === 'undefined') {
      throw new Error('API service not available');
    }

    try {
      const dashboardData = await apiService.getPlayerDashboardData();
      console.log('Loaded unified dashboard data:', dashboardData);

      PlayerDashboardState.player = dashboardData.player || null;
      PlayerDashboardState.attendance = dashboardData.attendance ?? null;
      PlayerDashboardState.clubs = dashboardData.clubs || [];
      PlayerDashboardState.teams = dashboardData.teams || [];
      PlayerDashboardState.events = dashboardData.events || [];
      PlayerDashboardState.payments = dashboardData.payments || [];
      PlayerDashboardState.bookings = dashboardData.bookings || [];
      PlayerDashboardState.applications = dashboardData.applications || [];
      return;
    } catch (e) {
      console.warn('Unified dashboard failed, trying individual calls:', e);
    }

    const promises = [
      apiService.getEvents().then(v => PlayerDashboardState.events = v || []).catch(() => PlayerDashboardState.events = []),
      apiService.getClubs().then(v => PlayerDashboardState.clubs = v || []).catch(() => PlayerDashboardState.clubs = []),
      apiService.getTeams().then(v => PlayerDashboardState.teams = v || []).catch(() => PlayerDashboardState.teams = []),
      apiService.getPayments().then(v => PlayerDashboardState.payments = v || []).catch(() => PlayerDashboardState.payments = []),
      apiService.getUserBookings().then(v => PlayerDashboardState.bookings = v || []).catch(() => PlayerDashboardState.bookings = [])
    ];

    await Promise.allSettled(promises);

    console.log('Data loaded:', {
      events: PlayerDashboardState.events.length,
      clubs: PlayerDashboardState.clubs.length,
      teams: PlayerDashboardState.teams.length,
      payments: PlayerDashboardState.payments.length,
      bookings: PlayerDashboardState.bookings.length
    });

  } catch (err) {
    console.error('Failed to load player data:', err);
    PlayerDashboardState.clubs = [];
    PlayerDashboardState.teams = [];
    PlayerDashboardState.events = [];
    PlayerDashboardState.payments = [];
    PlayerDashboardState.bookings = [];
    throw err;
  }
}

function loadPlayerOverview() {
  updateText('playerClubs', PlayerDashboardState.clubs.length);
  updateText('playerTeams', PlayerDashboardState.teams.length);
  
  const upcomingCount = PlayerDashboardState.events.filter(e => 
    e.event_date && new Date(e.event_date) > new Date()
  ).length;
  updateText('playerEvents', upcomingCount);
  
  updateText('playerAttendance', PlayerDashboardState.attendance != null ? 
    PlayerDashboardState.attendance + '%' : '0');

  loadUpcomingEvents();
  loadRecentActivity();
  loadPerformanceSummary();
}

function loadUpcomingEvents() {
  const el = byId('playerUpcomingEvents');
  if (!el) return;
  
  const now = new Date();
  const list = PlayerDashboardState.events
    .filter(e => e.event_date && new Date(e.event_date) > now)
    .sort((a, b) => new Date(a.event_date) - new Date(b.event_date))
    .slice(0, 5);

  if (list.length === 0) {
    el.innerHTML = '<p>No upcoming events</p>';
    return;
  }

  const eventsHTML = list.map(event => {
    const eventTime = event.event_time ? ' at ' + escapeHTML(event.event_time) : '';
    return '<div class="item-list-item">' +
      '<div class="item-info">' +
        '<h4>' + escapeHTML(event.title || 'Event') + '</h4>' +
        '<p>' + formatDate(event.event_date) + eventTime + '</p>' +
        '<p>Price: ' + formatCurrency(event.price || 0) + '</p>' +
      '</div>' +
      '<div class="item-actions">' +
        '<button class="btn btn-small btn-primary" onclick="bookEvent(\'' + event.id + '\')">Book</button>' +
      '</div>' +
    '</div>';
  }).join('');

  el.innerHTML = eventsHTML;
}

function loadRecentActivity() {
  const el = byId('playerRecentActivity');
  if (!el) return;
  
  const list = (PlayerDashboardState.bookings || []).slice(0, 3);

  if (list.length === 0) {
    el.innerHTML = '<p>No recent activity</p>';
    return;
  }

  const activitiesHTML = list.map(b => 
    '<div class="item-list-item">' +
      '<div class="item-info">' +
        '<h4>' + escapeHTML(b.title || 'Event') + '</h4>' +
        '<p>' + formatDate(b.event_date) + ' - ' + escapeHTML(b.booking_status || 'N/A') + '</p>' +
      '</div>' +
      '<span class="status-badge status-' + escapeHTML(b.booking_status || 'unknown') + '">' + escapeHTML(b.booking_status || 'Unknown') + '</span>' +
    '</div>'
  ).join('');

  el.innerHTML = activitiesHTML;
}

function loadPerformanceSummary() {
  const matches = (PlayerDashboardState.bookings || []).filter(b => b.event_type === 'match').length;
  const trainings = (PlayerDashboardState.bookings || []).filter(b => b.event_type === 'training').length;

  updateText('playerMatchesPlayed', matches);
  updateText('playerAverageRating', '4.2');
  updateText('playerTrainingSessions', trainings);
  updateText('playerPosition', PlayerDashboardState.player?.position || 'Not Set');
}

function loadPlayerClubs() {
  const grid = byId('playerClubsContainer');
  if (!grid) return;

  if (!PlayerDashboardState.clubs.length) {
    grid.innerHTML = '<div class="empty-state">' +
      '<h4>No clubs joined yet</h4>' +
      '<p>Find and apply to clubs to get started</p>' +
      '<button class="btn btn-primary" onclick="showPlayerSection(\'club-finder\')">Find Clubs</button>' +
    '</div>';
    const staffBody = byId('clubStaffTableBody');
    if (staffBody) staffBody.innerHTML = '<tr><td colspan="4">No staff information available</td></tr>';
    return;
  }

  const clubsHTML = PlayerDashboardState.clubs.map(c => 
    '<div class="card">' +
      '<h4>' + escapeHTML(c.name) + '</h4>' +
      '<p><strong>Location:</strong> ' + escapeHTML(c.location || 'Not specified') + '</p>' +
      '<p><strong>Sport:</strong> ' + escapeHTML(c.sport || 'Not specified') + '</p>' +
      '<p><strong>Members:</strong> ' + Number(c.member_count || 0) + '</p>' +
      '<p>' + escapeHTML(c.description || 'No description available') + '</p>' +
      '<div class="item-actions">' +
        '<button class="btn btn-small btn-secondary" onclick="viewClubDetails(\'' + c.id + '\')">View Details</button>' +
        '<button class="btn btn-small btn-primary" onclick="viewClubEvents(\'' + c.id + '\')">View Events</button>' +
      '</div>' +
    '</div>'
  ).join('');

  grid.innerHTML = clubsHTML;

  const staffBody = byId('clubStaffTableBody');
  if (staffBody) {
    const rows = [];
    PlayerDashboardState.clubs.forEach(c => {
      (c.staff || []).forEach(s => {
        rows.push('<tr>' +
          '<td>' + escapeHTML((s.first_name || '') + ' ' + (s.last_name || '')) + '</td>' +
          '<td>' + escapeHTML(s.role || '') + '</td>' +
          '<td>' + escapeHTML(s.email || 'N/A') + '</td>' +
          '<td>' + escapeHTML(c.name) + '</td>' +
        '</tr>');
      });
    });
    staffBody.innerHTML = rows.length ? rows.join('') : '<tr><td colspan="4">No staff information available</td></tr>';
  }
}

function loadPlayerTeams() {
  const grid = byId('playerTeamsContainer');
  if (!grid) return;

  if (!PlayerDashboardState.teams.length) {
    grid.innerHTML = '<div class="empty-state">' +
      '<h4>No teams joined yet</h4>' +
      '<p>Join a club to be assigned to teams</p>' +
      '<button class="btn btn-primary" onclick="showPlayerSection(\'club-finder\')">Find Clubs</button>' +
    '</div>';
    const container = byId('teamEventsContainer');
    if (container) container.innerHTML = '<p>No team events found</p>';
    return;
  }

  const teamsHTML = PlayerDashboardState.teams.map(t => {
    const coachInfo = t.coach ? '<p><strong>Coach:</strong> ' + escapeHTML(t.coach.name || '') + '</p>' : '';
    return '<div class="card">' +
      '<h4>' + escapeHTML(t.name) + '</h4>' +
      '<p><strong>Age Group:</strong> ' + escapeHTML(t.age_group || 'Not specified') + '</p>' +
      '<p><strong>Sport:</strong> ' + escapeHTML(t.sport || 'Not specified') + '</p>' +
      '<p><strong>Position:</strong> ' + escapeHTML(t.player_position || 'Not assigned') + '</p>' +
      '<p><strong>Jersey Number:</strong> ' + escapeHTML(t.jersey_number || 'Not assigned') + '</p>' +
      coachInfo +
      '<div class="item-actions">' +
        '<button class="btn btn-small btn-secondary" onclick="viewTeamDetails(\'' + t.id + '\')">View Team</button>' +
        '<button class="btn btn-small btn-primary" onclick="viewTeamEvents(\'' + t.id + '\')">Team Events</button>' +
      '</div>' +
    '</div>';
  }).join('');

  grid.innerHTML = teamsHTML;
  loadTeamEvents();
}

function loadTeamEvents() {
  const container = byId('teamEventsContainer');
  if (!container) return;

  const teamIds = PlayerDashboardState.teams.map(t => t.id);
  const events = PlayerDashboardState.events.filter(e => teamIds.includes(e.team_id));

  if (events.length === 0) {
    container.innerHTML = '<p>No team events found</p>';
    return;
  }

  const eventsHTML = events.map(e => 
    '<div class="event-item" style="border:1px solid #ddd;padding:1rem;margin:.5rem 0;border-radius:8px;">' +
      '<h4>' + escapeHTML(e.title) + '</h4>' +
      '<p><strong>Date:</strong> ' + formatDate(e.event_date) + '</p>' +
      '<p><strong>Type:</strong> ' + escapeHTML(e.event_type || '') + '</p>' +
      '<div class="item-actions">' +
        '<button class="btn btn-small btn-primary" onclick="submitAvailability(\'' + e.id + '\')">Submit Availability</button>' +
        '<button class="btn btn-small btn-secondary" onclick="viewEventDetails(\'' + e.id + '\')">View Details</button>' +
      '</div>' +
    '</div>'
  ).join('');

  container.innerHTML = eventsHTML;
}

function loadPlayerFinances() {
  const payments = PlayerDashboardState.payments || [];
  const totalDue = payments.filter(p => p.payment_status === 'pending').reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const totalPaid = payments.filter(p => p.payment_status === 'paid').reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const nextPayment = payments.find(p => p.payment_status === 'pending');

  updateText('totalDue', formatCurrency(totalDue));
  updateText('totalPaid', formatCurrency(totalPaid));
  updateText('nextPayment', nextPayment ? formatCurrency(nextPayment.amount) : '£0');
  updateText('paymentStatus', totalDue > 0 ? 'Outstanding' : 'Up to Date');

  loadPaymentHistory();
  loadOutstandingPayments();
}

function loadPaymentHistory() {
  const body = byId('paymentHistoryTableBody');
  if (!body) return;

  const payments = PlayerDashboardState.payments || [];
  
  if (payments.length === 0) {
    body.innerHTML = '<tr><td colspan="5">No payment history found</td></tr>';
    return;
  }

  const paymentsHTML = payments.map(p => {
    const actionButton = p.payment_status === 'pending'
      ? '<button class="btn btn-small btn-primary" onclick="payNow(\'' + p.id + '\', ' + Number(p.amount) + ', \'' + escapeHTML(p.description || 'Payment') + '\')">Pay Now</button>'
      : '<span style="color:#28a745;">Paid</span>';

    return '<tr>' +
      '<td>' + formatDate(p.due_date) + '</td>' +
      '<td>' + escapeHTML(p.description || '') + '</td>' +
      '<td>' + formatCurrency(p.amount) + '</td>' +
      '<td><span class="status-badge status-' + escapeHTML(p.payment_status || 'unknown') + '">' + escapeHTML(p.payment_status || 'unknown') + '</span></td>' +
      '<td>' + actionButton + '</td>' +
    '</tr>';
  }).join('');

  body.innerHTML = paymentsHTML;
}

function loadOutstandingPayments() {
  const container = byId('outstandingPayments');
  if (!container) return;

  const outstanding = (PlayerDashboardState.payments || []).filter(p => p.payment_status === 'pending');
  
  if (outstanding.length === 0) {
    container.innerHTML = '<p>No outstanding payments</p>';
    return;
  }

  const paymentsHTML = outstanding.map(p => 
    '<div class="payment-item" style="border:1px solid #ddd;padding:1rem;margin:.5rem 0;border-radius:8px;background:#fff8f0;">' +
      '<h4>' + escapeHTML(p.description || 'Payment') + '</h4>' +
      '<p><strong>Amount:</strong> ' + formatCurrency(p.amount) + '</p>' +
      '<p><strong>Due Date:</strong> ' + formatDate(p.due_date) + '</p>' +
      '<button class="btn btn-primary" onclick="payNow(\'' + p.id + '\', ' + Number(p.amount) + ', \'' + escapeHTML(p.description || 'Payment') + '\')">Pay Now</button>' +
    '</div>'
  ).join('');

  container.innerHTML = paymentsHTML;
}

async function payNow(paymentId, amount, description) {
  console.log('Processing payment:', paymentId, amount, description);
  try {
    if (typeof createPaymentModal === 'function') {
      const onSuccess = async (paymentResult) => {
        try {
          await apiService.confirmPayment(paymentResult.id, paymentId);
          showNotification('Payment successful!', 'success');
          await reloadPaymentsSection();
        } catch (e) {
          console.error('Confirm payment failed:', e);
          showNotification('Payment successful but confirmation failed: ' + e.message, 'error');
        }
      };
      const onError = (e) => {
        console.error('Payment failed:', e);
        showNotification('Payment failed: ' + e.message, 'error');
      };
      createPaymentModal(amount, description, onSuccess, onError);
    } else {
      const url = 'payment.html?paymentId=' + paymentId + '&amount=' + amount + '&description=' + encodeURIComponent(description);
      window.open(url, '_blank');
    }
  } catch (err) {
    console.error('payNow error:', err);
    showNotification('Failed to process payment: ' + err.message, 'error');
  }
}

async function reloadPaymentsSection() {
  try {
    const payments = await apiService.getPayments();
    PlayerDashboardState.payments = payments || [];
    loadPlayerFinances();
  } catch (e) {
    console.warn('Failed to reload payments:', e);
  }
}

function wirePlayersFilterTabs() {
  const tabs = document.querySelectorAll('.filter-tab');
  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      tabs.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.getAttribute('data-filter');
      renderPlayersList(filter);
    });
  });
}

async function loadPlayersList() {
  try {
    let players = [];
    PlayerDashboardState.clubs.forEach(c => {
      if (Array.isArray(c.players)) {
        players = players.concat(
          c.players.map(p => ({
            ...p,
            club_id: c.id,
            club_name: c.name
          }))
        );
      }
    });

    if (!players.length && typeof apiService.getPlayers === 'function') {
      const apiPlayers = await apiService.getPlayers().catch(() => []);
      players = (apiPlayers || []).map(p => ({ ...p }));
    }

    PlayerDashboardState.players = uniqueByKey(players, p => '' + (p.id || p.email || p.user_id || Math.random()));
    renderPlayersList('all');
  } catch (e) {
    console.warn('Failed to load players list:', e);
    PlayerDashboardState.players = [];
    renderPlayersList('all');
  }
}

function renderPlayersList(filterKey = 'all') {
  const container = byId('playersListContainer');
  if (!container) return;

  const list = (PlayerDashboardState.players || []);
  let filtered = list;

  const isAssigned = (p) => !!(p.team_id || (Array.isArray(p.teams) && p.teams.length));
  const isOnPlan = (p) => !!(p.plan_id || p.on_plan === true || p.payment_plan === true);
  const isOverdue = (p) => {
    if (p.overdue === true || p.has_overdue === true) return true;
    const you = safeGetCurrentUser();
    if (you && (p.email || '').toLowerCase() === you.email?.toLowerCase()) {
      const now = new Date();
      return (PlayerDashboardState.payments || []).some(pay => pay.payment_status === 'pending' && new Date(pay.due_date) < now);
    }
    return false;
  };

  switch (filterKey) {
    case 'on-plan': filtered = list.filter(isOnPlan); break;
    case 'not-on-plan': filtered = list.filter(p => !isOnPlan(p)); break;
    case 'assigned': filtered = list.filter(isAssigned); break;
    case 'unassigned': filtered = list.filter(p => !isAssigned(p)); break;
    case 'overdue': filtered = list.filter(isOverdue); break;
    case 'all':
    default: filtered = list;
  }

  if (filtered.length === 0) {
    container.innerHTML = '<p>No players found for this filter.</p>';
    return;
  }

  const playersHTML = filtered.map(p => {
    const clubInfo = p.club_name ? '<p><strong>Club:</strong> ' + escapeHTML(p.club_name) + '</p>' : '';
    const teamInfo = p.team_name ? '<p><strong>Team:</strong> ' + escapeHTML(p.team_name) + '</p>' : '';
    const overdueText = isOverdue(p) ? '• Overdue' : '';
    const playerName = ((p.first_name || p.firstName || '') + ' ' + (p.last_name || p.lastName || '')).trim() || (p.name || 'Player');
    
    return '<div class="card">' +
      '<h4>' + escapeHTML(playerName) + '</h4>' +
      '<p><strong>Email:</strong> ' + escapeHTML(p.email || 'N/A') + '</p>' +
      clubInfo +
      teamInfo +
      '<p><strong>Status:</strong> ' +
        (isAssigned(p) ? 'Assigned' : 'Not assigned') + ' • ' +
        (isOnPlan(p) ? 'On plan' : 'Not on plan') + ' ' +
        overdueText + '</p>' +
    '</div>';
  }).join('');

  container.innerHTML = playersHTML;
}

function loadClubFinder() {
  const container = byId('availableClubsContainer');
  if (!container) return;
  displayClubs(PlayerDashboardState.clubs);
}

function displayClubs(clubs) {
  const container = byId('availableClubsContainer');
  if (!container) return;
  
  if (!(clubs || []).length) {
    container.innerHTML = '<div class="empty-state">' +
      '<h4>No clubs available</h4>' +
      '<p>Check back later for new clubs</p>' +
      '<button class="btn btn-primary" onclick="refreshClubData()">Refresh</button>' +
    '</div>';
    return;
  }

  const clubsHTML = clubs.map(club => 
    '<div class="card">' +
      '<h4>' + escapeHTML(club.name) + '</h4>' +
      '<p><strong>Location:</strong> ' + escapeHTML(club.location || 'Not specified') + '</p>' +
      '<p><strong>Sport:</strong> ' + escapeHTML(club.sport || 'Not specified') + '</p>' +
      '<p><strong>Members:</strong> ' + Number(club.member_count || 0) + '</p>' +
      '<p>' + escapeHTML(club.description || 'No description available') + '</p>' +
      '<div class="item-actions">' +
        '<button class="btn btn-small btn-primary" onclick="applyToClub(\'' + club.id + '\', \'' + escapeHTML((club.name || '').replace(/"/g, '&quot;')) + '\')">Apply</button>' +
        '<button class="btn btn-small btn-secondary" onclick="viewClubDetails(\'' + club.id + '\')">View Details</button>' +
      '</div>' +
    '</div>'
  ).join('');

  container.innerHTML = clubsHTML;
}

function loadEventFinder() {
  const container = byId('availablePlayerEventsContainer');
  if (!container) return;
  displayEvents(PlayerDashboardState.events);
}

function displayEvents(events) {
  const container = byId('availablePlayerEventsContainer');
  if (!container) return;

  if (!(events || []).length) {
    container.innerHTML = '<div class="empty-state">' +
      '<h4>No events found</h4>' +
      '<p>Try adjusting your search criteria or check back later</p>' +
      '<button class="btn btn-primary" onclick="refreshEventData()">Refresh Events</button>' +
    '</div>';
    return;
  }

  const eventsHTML = events.map(event => {
    const eventTime = event.event_time ? ' at ' + escapeHTML(event.event_time) : '';
    return '<div class="card">' +
      '<h4>' + escapeHTML(event.title) + '</h4>' +
      '<p><strong>Type:</strong> ' + escapeHTML(event.event_type || '') + '</p>' +
      '<p><strong>Date:</strong> ' + formatDate(event.event_date) + eventTime + '</p>' +
      '<p><strong>Location:</strong> ' + escapeHTML(event.location || 'TBD') + '</p>' +
      '<p><strong>Price:</strong> ' + formatCurrency(event.price || 0) + '</p>' +
      '<p><strong>Available Spots:</strong> ' + escapeHTML(String(event.spots_available ?? 'Unlimited')) + '</p>' +
      '<p>' + escapeHTML(event.description || 'No description available') + '</p>' +
      '<div class="item-actions">' +
        '<button class="btn btn-small btn-primary" onclick="bookEvent(\'' + event.id + '\')">Book Event</button>' +
        '<button class="btn btn-small btn-secondary" onclick="viewEventDetails(\'' + event.id + '\')">View Details</button>' +
      '</div>' +
    '</div>';
  }).join('');

  container.innerHTML = eventsHTML;
}

function loadPlayerDocuments() {
  const body = byId('playerDocumentsTableBody');
  if (!body) return;

  const docs = [
    { id: '1', name: 'Club Handbook', type: 'PDF', club_name: 'Elite Football Academy', updated_at: '2024-01-15' },
    { id: '2', name: 'Training Schedule', type: 'PDF', club_name: 'Elite Football Academy', updated_at: '2024-01-20' },
    { id: '3', name: 'Safety Guidelines', type: 'PDF', club_name: 'Elite Football Academy', updated_at: '2024-01-10' }
  ];

  const docsHTML = docs.map(d => 
    '<tr>' +
      '<td>' + escapeHTML(d.name) + '</td>' +
      '<td>' + escapeHTML(d.type) + '</td>' +
      '<td>' + escapeHTML(d.club_name) + '</td>' +
      '<td>' + formatDate(d.updated_at) + '</td>' +
      '<td>' +
        '<button class="btn btn-small btn-primary" onclick="downloadDocument(\'' + d.id + '\')">Download</button>' +
        '<button class="btn btn-small btn-secondary" onclick="viewDocument(\'' + d.id + '\')">View</button>' +
      '</td>' +
    '</tr>'
  ).join('');

  body.innerHTML = docsHTML;
}

function wireStripeButtons() {
  const onboardBtn = byId('stripeOnboardBtn');
  const manageBtn = byId('stripeManageBtn');
  const refreshBtn = byId('stripeRefreshBtn');
  
  if (onboardBtn) onboardBtn.addEventListener('click', onboardStripe);
  if (manageBtn) manageBtn.addEventListener('click', manageStripe);
  if (refreshBtn) refreshBtn.addEventListener('click', refreshStripeStatus);
}

async function onboardStripe() {
  try {
    const res = await apiService.makeRequest('/payments/stripe/connect/onboard', { method: 'POST' });
    if (res?.url) {
      window.location.href = res.url;
    } else {
      throw new Error('Onboarding link not returned');
    }
  } catch (e) {
    console.error('Stripe onboard error:', e);
    showNotification('Failed to start Stripe onboarding: ' + e.message, 'error');
  }
}

async function manageStripe() {
  try {
    const res = await apiService.makeRequest('/payments/stripe/connect/manage', { method: 'GET' });
    if (res?.url) {
      window.open(res.url, '_blank');
    } else {
      throw new Error('Account management link not returned');
    }
  } catch (e) {
    console.error('Stripe manage error:', e);
    showNotification('Failed to open Stripe dashboard: ' + e.message, 'error');
  }
}

async function refreshStripeStatus() {
  try {
    const res = await apiService.makeRequest('/payments/stripe/connect/status', { method: 'GET' });
    PlayerDashboardState.stripe = {
      linked: !!res?.linked,
      payouts_enabled: !!res?.payouts_enabled,
      details_submitted: !!res?.details_submitted,
      account_id: res?.account_id || null
    };
    renderStripeStatus();
  } catch (e) {
    console.warn('Stripe status error:', e);
    renderStripeStatus(true);
  }
}

function renderStripeStatus(error = false) {
  const info = byId('stripeAccountInfo');
  const manageBtn = byId('stripeManageBtn');

  if (error) {
    if (info) info.innerHTML = '<p style="color:#b00020">Unable to fetch Stripe status.</p>';
    if (manageBtn) manageBtn.disabled = true;
    return;
  }

  const s = PlayerDashboardState.stripe;
  const parts = [
    '<strong>Linked:</strong> ' + (s.linked ? 'Yes' : 'No'),
    '<strong>Details submitted:</strong> ' + (s.details_submitted ? 'Yes' : 'No'),
    '<strong>Payouts enabled:</strong> ' + (s.payouts_enabled ? 'Yes' : 'No')
  ];
  if (s.account_id) parts.push('<strong>Account ID:</strong> ' + escapeHTML(s.account_id));

  if (info) info.innerHTML = '<p>' + parts.join(' • ') + '</p>';
  if (manageBtn) manageBtn.disabled = !s.linked;
}

function wirePlanButtons() {
  const assignBtn = byId('assignPlanBtn');
  if (assignBtn) assignBtn.addEventListener('click', assignOrUpdatePlan);
}

async function loadPaymentPlans() {
  try {
    const res = await apiService.makeRequest('/payments/plans', { method: 'GET' });
    PlayerDashboardState.plans = Array.isArray(res) ? res : (res?.plans || []);
    renderPlanSelector();
  } catch (e) {
    console.warn('Failed to load plans:', e);
    PlayerDashboardState.plans = [];
    renderPlanSelector();
  }
}

function renderPlanSelector() {
  const sel = byId('planSelector');
  if (!sel) return;
  const plans = PlayerDashboardState.plans || [];
  
  if (plans.length === 0) {
    sel.innerHTML = '<option value="">No plans available</option>';
  } else {
    const optionsHTML = plans.map(p => {
      const interval = p.interval ? '/' + escapeHTML(p.interval) : '';
      return '<option value="' + escapeAttr(p.id || p.plan_id) + '">' + escapeHTML(p.name || 'Plan') + ' — ' + formatCurrency(p.amount || p.price || 0) + ' ' + interval + '</option>';
    }).join('');
    sel.innerHTML = '<option value="">Select a plan</option>' + optionsHTML;
  }
  
  const start = byId('planStartDate');
  if (start && !start.value) {
    start.valueAsDate = new Date();
  }
}

async function loadCurrentPlan() {
  try {
    const res = await apiService.makeRequest('/payments/plan/current', { method: 'GET' }).catch(() => null);
    PlayerDashboardState.currentPlan = res?.plan || res || null;
  } catch {
    PlayerDashboardState.currentPlan = null;
  } finally {
    renderCurrentPlan();
  }
}

function renderCurrentPlan() {
  const el = byId('currentPlanInfo');
  if (!el) return;
  
  const cp = PlayerDashboardState.currentPlan;
  if (!cp) {
    el.innerHTML = '<p>No plan assigned.</p>';
    return;
  }

  const interval = cp.interval ? '/' + escapeHTML(cp.interval) : '';
  const startDate = cp.start_date ? '<p><strong>Started:</strong> ' + formatDate(cp.start_date) + '</p>' : '';
  const status = cp.status ? '<p><strong>Status:</strong> ' + escapeHTML(cp.status) + '</p>' : '';

  el.innerHTML = '<div class="info">' +
    '<p><strong>Current plan:</strong> ' + escapeHTML(cp.name || 'Plan') + '</p>' +
    '<p><strong>Amount:</strong> ' + formatCurrency(cp.amount || cp.price || 0) + ' ' + interval + '</p>' +
    startDate +
    status +
  '</div>';
}

async function assignOrUpdatePlan() {
  const planId = byId('planSelector')?.value;
  const startDate = byId('planStartDate')?.value;

  if (!planId) {
    showNotification('Please select a plan.', 'warning');
    return;
  }

  try {
    await apiService.makeRequest('/payments/plan/assign', {
      method: 'POST',
      body: JSON.stringify({ planId: planId, startDate: startDate })
    });
    showNotification('Plan assigned/updated successfully!', 'success');
    await loadCurrentPlan();
    await reloadPaymentsSection();
  } catch (e) {
    console.error('Assign plan error:', e);
    showNotification('Failed to assign plan: ' + (e.message || 'Unknown error'), 'error');
  }
}

function wireAccountModal() {
  const form = byId('accountForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const payload = {
        firstName: byId('accFirstName')?.value || undefined,
        lastName: byId('accLastName')?.value || undefined,
        location: byId('accLocation')?.value || undefined,
        primarySport: byId('accSport')?.value || undefined,
        bio: byId('accBio')?.value || undefined
      };
      const cleaned = Object.fromEntries(Object.entries(payload).filter(([,v]) => v !== undefined));

      await apiService.updateUserProfile(cleaned);
      showNotification('Account updated!', 'success');

      closeModal('accountModal');
      await loadPlayerDataWithFallback();
      loadPlayerOverview();
    } catch (err) {
      console.error('Profile update error:', err);
      showNotification('Failed to update account: ' + err.message, 'error');
    }
  });

  const you = safeGetCurrentUser();
  if (you) {
    const firstNameEl = byId('accFirstName');
    const lastNameEl = byId('accLastName');
    if (firstNameEl) firstNameEl.value = you.firstName || you.first_name || '';
    if (lastNameEl) lastNameEl.value = you.lastName || you.last_name || '';
  }
}

async function bookEvent(eventId) {
  console.log('Booking event:', eventId);
  const event = (PlayerDashboardState.events || []).find(e => e.id === eventId);
  if (!event) return showNotification('Event not found', 'error');

  try {
    if (Number(event.price || 0) > 0) {
      if (typeof createPaymentModal === 'function') {
        const onSuccess = async (paymentResult) => {
          try {
            await apiService.bookEvent(eventId);
            await apiService.confirmPayment(paymentResult.id, null);
            showNotification('Event booked successfully!', 'success');
            await loadPlayerDataWithFallback();
            loadPlayerOverview();
          } catch (e) {
            console.error('Booking after payment failed:', e);
            showNotification('Payment ok, booking failed: ' + e.message, 'error');
          }
        };
        const onError = (e) => showNotification('Payment failed: ' + e.message, 'error');
        createPaymentModal(Number(event.price), event.title, onSuccess, onError);
      } else {
        const url = 'payment.html?amount=' + Number(event.price) + '&description=' + encodeURIComponent(event.title) + '&eventId=' + event.id;
        window.open(url, '_blank');
      }
    } else {
      await apiService.bookEvent(eventId);
      showNotification('Event booked successfully!', 'success');
      await loadPlayerDataWithFallback();
      loadPlayerOverview();
    }
  } catch (e) {
    console.error('bookEvent error:', e);
    showNotification('Failed to book event: ' + e.message, 'error');
  }
}

function submitAvailability(eventId) {
  const eventIdEl = byId('availabilityEventId');
  if (eventIdEl) eventIdEl.value = eventId;
  showModal('availabilityModal');
}

async function handleAvailabilitySubmission(e) {
  e.preventDefault();
  try {
    const eventId = byId('availabilityEventId').value;
    const availability = document.querySelector('input[name="availability"]:checked')?.value;
    const notes = byId('availabilityNotes').value;

    if (!availability) return showNotification('Please select your availability', 'error');

    await apiService.makeRequest('/events/' + eventId + '/availability', {
      method: 'POST',
      body: JSON.stringify({ availability: availability, notes: notes })
    });

    closeModal('availabilityModal');
    showNotification('Availability submitted successfully!', 'success');
    e.target.reset();
  } catch (err) {
    console.error('Availability submit error:', err);
    showNotification('Failed to submit availability: ' + err.message, 'error');
  }
}

function applyToClub(clubId, clubName) {
  const clubIdEl = byId('applyClubId');
  if (clubIdEl) clubIdEl.value = clubId;
  const title = document.querySelector('#applyClubModal .modal-header h2');
  if (title) title.textContent = 'Apply to ' + clubName;
  showModal('applyClubModal');
}

async function handleClubApplication(e) {
  e.preventDefault();
  try {
    const clubId = byId('applyClubId').value;
    const message = byId('applicationMessage').value;
    const position = byId('playerPosition').value;
    const experience = byId('playerExperience').value;
    const availability = Array.from(document.querySelectorAll('input[name="availability"]:checked')).map(cb => cb.value);

    await apiService.makeRequest('/clubs/' + clubId + '/apply', {
      method: 'POST',
      body: JSON.stringify({
        message: message,
        preferredPosition: position,
        experienceLevel: experience,
        availability: availability
      })
    });

    closeModal('applyClubModal');
    e.target.reset();
    showNotification('Application submitted successfully!', 'success');
  } catch (err) {
    console.error('Club application error:', err);
    showNotification('Failed to submit application: ' + err.message, 'error');
  }
}

function filterPlayerEvents() {
  const search = (byId('eventSearchInput')?.value || '').toLowerCase();
  const type = byId('playerEventTypeFilter')?.value || '';
  const dateFrom = byId('playerEventDateFilter')?.value || '';

  let events = [...(PlayerDashboardState.events || [])];
  if (search) {
    events = events.filter(e =>
      (e.title || '').toLowerCase().includes(search) ||
      (e.description || '').toLowerCase().includes(search) ||
      (e.location || '').toLowerCase().includes(search)
    );
  }
  if (type) events = events.filter(e => (e.event_type || '') === type);
  if (dateFrom) events = events.filter(e => (e.event_date || '') >= dateFrom);

  displayEvents(events);
}

function filterClubs() {
  const search = (byId('clubSearchInput')?.value || '').toLowerCase();
  const type = byId('clubTypeFilter')?.value || '';
  const sport = byId('clubSportFilter')?.value || '';

  let clubs = [...(PlayerDashboardState.clubs || [])];
  if (search) {
    clubs = clubs.filter(c =>
      (c.name || '').toLowerCase().includes(search) ||
      (c.location || '').toLowerCase().includes(search) ||
      (c.description || '').toLowerCase().includes(search)
    );
  }
  if (type) clubs = clubs.filter(c => Array.isArray(c.types) && c.types.includes(type));
  if (sport) clubs = clubs.filter(c => (c.sport || '') === sport);

  displayClubs(clubs);
}

function viewClubDetails(clubId) {
  const club = (PlayerDashboardState.clubs || []).find(c => c.id === clubId);
  if (!club) return showNotification('Club not found', 'error');

  removeIfExists('clubDetailsModal');
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = 'clubDetailsModal';
  modal.style.display = 'block';
  
  const philosophy = club.philosophy ? '<p><strong>Philosophy:</strong> ' + escapeHTML(club.philosophy) + '</p>' : '';
  const website = club.website ? '<p><strong>Website:</strong> <a href="' + escapeAttr(club.website) + '" target="_blank">' + escapeHTML(club.website) + '</a></p>' : '';
  
  modal.innerHTML = '<div class="modal-content" style="max-width:600px;">' +
    '<div class="modal-header">' +
      '<h2>' + escapeHTML(club.name) + '</h2>' +
      '<button class="close" onclick="closeModal(\'clubDetailsModal\')">&times;</button>' +
    '</div>' +
    '<div class="modal-body">' +
      '<p><strong>Location:</strong> ' + escapeHTML(club.location || 'Not specified') + '</p>' +
      '<p><strong>Sport:</strong> ' + escapeHTML(club.sport || 'Not specified') + '</p>' +
      '<p><strong>Members:</strong> ' + Number(club.member_count || 0) + '</p>' +
      '<p><strong>Description:</strong> ' + escapeHTML(club.description || 'No description available') + '</p>' +
      philosophy +
      website +
      '<div style="margin-top:1rem;">' +
        '<button class="btn btn-primary" onclick="applyToClub(\'' + club.id + '\', \'' + escapeAttr(club.name) + '\')">Apply to Club</button>' +
        '<button class="btn btn-secondary" onclick="closeModal(\'clubDetailsModal\')">Close</button>' +
      '</div>' +
    '</div>' +
  '</div>';
  document.body.appendChild(modal);
}

function viewEventDetails(eventId) {
  const event = (PlayerDashboardState.events || []).find(e => e.id === eventId);
  if (!event) return showNotification('Event not found', 'error');

  removeIfExists('eventDetailsModal');
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = 'eventDetailsModal';
  modal.style.display = 'block';
  
  const eventTime = event.event_time ? ' at ' + escapeHTML(event.event_time) : '';
  
  modal.innerHTML = '<div class="modal-content" style="max-width:600px;">' +
    '<div class="modal-header">' +
      '<h2>' + escapeHTML(event.title) + '</h2>' +
      '<button class="close" onclick="closeModal(\'eventDetailsModal\')">&times;</button>' +
    '</div>' +
    '<div class="modal-body">' +
      '<p><strong>Type:</strong> ' + escapeHTML(event.event_type || '') + '</p>' +
      '<p><strong>Date:</strong> ' + formatDate(event.event_date) + eventTime + '</p>' +
      '<p><strong>Location:</strong> ' + escapeHTML(event.location || 'TBD') + '</p>' +
      '<p><strong>Price:</strong> ' + formatCurrency(event.price || 0) + '</p>' +
      '<p><strong>Capacity:</strong> ' + escapeHTML(String(event.capacity ?? 'Unlimited')) + '</p>' +
      '<p><strong>Available Spots:</strong> ' + escapeHTML(String(event.spots_available ?? 'Unlimited')) + '</p>' +
      '<p><strong>Description:</strong> ' + escapeHTML(event.description || 'No description available') + '</p>' +
      '<div style="margin-top:1rem;">' +
        '<button class="btn btn-primary" onclick="bookEvent(\'' + event.id + '\'); closeModal(\'eventDetailsModal\')">Book Event</button>' +
        '<button class="btn btn-secondary" onclick="closeModal(\'eventDetailsModal\')">Close</button>' +
      '</div>' +
    '</div>' +
  '</div>';
  document.body.appendChild(modal);
}

function viewTeamDetails(teamId) {
  const team = (PlayerDashboardState.teams || []).find(t => t.id === teamId);
  if (!team) return showNotification('Team not found', 'error');

  removeIfExists('teamDetailsModal');
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = 'teamDetailsModal';
  modal.style.display = 'block';
  
  const coachInfo = team.coach ? '<p><strong>Coach:</strong> ' + escapeHTML(team.coach.name || '') + ' (' + escapeHTML(team.coach.email || '') + ')</p>' : '<p><strong>Coach:</strong> Not assigned</p>';
  
  modal.innerHTML = '<div class="modal-content" style="max-width:600px;">' +
    '<div class="modal-header">' +
      '<h2>' + escapeHTML(team.name) + '</h2>' +
      '<button class="close" onclick="closeModal(\'teamDetailsModal\')">&times;</button>' +
    '</div>' +
    '<div class="modal-body">' +
      '<p><strong>Age Group:</strong> ' + escapeHTML(team.age_group || 'Not specified') + '</p>' +
      '<p><strong>Sport:</strong> ' + escapeHTML(team.sport || 'Not specified') + '</p>' +
      '<p><strong>Your Position:</strong> ' + escapeHTML(team.player_position || 'Not assigned') + '</p>' +
      '<p><strong>Your Jersey Number:</strong> ' + escapeHTML(team.jersey_number || 'Not assigned') + '</p>' +
      coachInfo +
      '<p><strong>Description:</strong> ' + escapeHTML(team.description || 'No description available') + '</p>' +
      '<div style="margin-top:1rem;">' +
        '<button class="btn btn-primary" onclick="viewTeamEvents(\'' + team.id + '\'); closeModal(\'teamDetailsModal\')">View Team Events</button>' +
        '<button class="btn btn-secondary" onclick="closeModal(\'teamDetailsModal\')">Close</button>' +
      '</div>' +
    '</div>' +
  '</div>';
  document.body.appendChild(modal);
}

function viewClubEvents(clubId) {
  const list = (PlayerDashboardState.events || []).filter(e => e.club_id === clubId);
  if (!list.length) return showNotification('No events found for this club', 'info');
  showPlayerSection('event-finder');
  displayEvents(list);
}

function viewTeamEvents(teamId) {
  const list = (PlayerDashboardState.events || []).filter(e => e.team_id === teamId);
  if (!list.length) return showNotification('No events found for this team', 'info');
  showPlayerSection('event-finder');
  displayEvents(list);
}

async function refreshEventData() {
  try {
    showLoading(true);
    const events = await apiService.getEvents();
    PlayerDashboardState.events = events || [];
    displayEvents(PlayerDashboardState.events);
    showNotification('Events refreshed successfully!', 'success');
  } catch (e) {
    showNotification('Failed to refresh events: ' + e.message, 'error');
  } finally {
    showLoading(false);
  }
}

async function refreshClubData() {
  try {
    showLoading(true);
    const clubs = await apiService.getClubs();
    PlayerDashboardState.clubs = clubs || [];
    displayClubs(PlayerDashboardState.clubs);
    showNotification('Clubs refreshed successfully!', 'success');
  } catch (e) {
    showNotification('Failed to refresh clubs: ' + e.message, 'error');
  } finally {
    showLoading(false);
  }
}

function showPlayerSection(sectionId) {
  document.querySelectorAll('.dashboard-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.dashboard-nav button').forEach(b => b.classList.remove('active'));

  const target = byId('player-' + sectionId);
  if (target) target.classList.add('active');

  const btn = document.querySelector('.dashboard-nav button[onclick*="showPlayerSection(\'' + sectionId + '\')"]');
  if (btn) btn.classList.add('active');

  switch (sectionId) {
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
    case 'players': 
      const activeFilter = document.querySelector('.filter-tab.active')?.dataset.filter || 'all';
      renderPlayersList(activeFilter); 
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
    default:
      loadPlayerOverview();
      break;
  }
}

function byId(id) { return document.getElementById(id); }

function updateText(id, val) {
  const el = byId(id);
  if (el) el.textContent = val;
}

function formatCurrency(amount, currency = 'GBP') {
  try {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: currency }).format(Number(amount) || 0);
  } catch {
    return '£' + Number(amount || 0).toFixed(2);
  }
}

function formatDate(dateString) {
  if (!dateString) return '—';
  const d = new Date(dateString);
  if (isNaN(d)) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function escapeHTML(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(s) { 
  return escapeHTML(s).replace(/"/g, '&quot;'); 
}

function uniqueByKey(arr, keyFn) {
  const map = new Map();
  for (const item of arr) {
    const k = keyFn(item);
    if (!map.has(k)) map.set(k, item);
  }
  return Array.from(map.values());
}

function removeIfExists(id) {
  const el = byId(id);
  if (el) el.remove();
}

function safeGetCurrentUser() {
  try {
    const raw = localStorage.getItem('currentUser');
    return raw ? JSON.parse(raw) : null;
  } catch { 
    return null; 
  }
}

function accessStripeAccount() {
    console.log('Accessing Stripe dashboard...');
    const stripeUrl = 'https://dashboard.stripe.com/';
    window.open(stripeUrl, '_blank');
}

// Make it globally available
window.accessStripeAccount = accessStripeAccount;

// 2. ADD THIS ROUTE TO YOUR payments.js FILE (after the existing routes)

// POST /api/payments/plans - Create new payment plan
router.post('/plans', authenticateToken, requireOrganization, [
  body('name').notEmpty().withMessage('Plan name is required'),
  body('price').isNumeric().withMessage('Price must be a number'),
  body('interval').isIn(['month', 'year', 'week', 'one-time']).withMessage('Invalid interval')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { name, price, interval, description } = req.body;

    // Ensure plans table exists
    const tableExists = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'plans'
      );
    `);

    if (!tableExists.rows[0].exists) {
      await query(`
        CREATE TABLE plans (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          price DECIMAL(10,2) NOT NULL DEFAULT 0,
          interval VARCHAR(50) DEFAULT 'month',
          active BOOLEAN DEFAULT true,
          description TEXT,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
    }

    // Insert new plan
    const result = await query(`
      INSERT INTO plans (name, price, interval, active, description, created_at, updated_at)
      VALUES ($1, $2, $3, true, $4, NOW(), NOW())
      RETURNING *
    `, [name, price, interval, description]);

    const newPlan = result.rows[0];

    console.log('Payment plan created:', newPlan.name);
    res.status(201).json({ 
      success: true, 
      message: 'Payment plan created successfully',
      plan: newPlan
    });

  } catch (err) {
    console.error('Create payment plan error:', err);
    res.status(500).json({ 
      error: 'Failed to create payment plan',
      message: err.message 
    });
  }
});

// 3. ADD PAYMENT PLAN DISPLAY FUNCTION TO admin-dashboard.js

async function loadPaymentPlans() {
  try {
    const plans = await apiService.makeRequest('/payments/plans');
    AppState.paymentPlans = plans || [];
    showPaymentPlans();
  } catch (error) {
    console.warn('Failed to load payment plans:', error);
    AppState.paymentPlans = [];
    showPaymentPlans();
  }
}

function showPaymentPlans() {
  const container = document.getElementById('paymentPlansContainer');
  if (!container) return;
  
  const plans = AppState.paymentPlans || [];
  
  if (plans.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="text-align: center; padding: 2rem;">
        <p>No payment plans created yet</p>
        <button class="btn btn-primary" onclick="showModal('createPaymentPlanModal')">
          Create First Payment Plan
        </button>
      </div>
    `;
    return;
  }
  
  container.innerHTML = plans.map(plan => `
    <div class="card" style="margin-bottom: 1rem;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <h4>${plan.name}</h4>
          <p><strong>Amount:</strong> £${plan.price}/${plan.interval}</p>
          <p><strong>Description:</strong> ${plan.description || 'No description'}</p>
          <p><strong>Status:</strong> <span class="status-badge status-${plan.active ? 'active' : 'inactive'}">${plan.active ? 'Active' : 'Inactive'}</span></p>
        </div>
        <div class="item-actions">
          <button class="btn btn-small btn-primary" onclick="assignPlanToPlayers('${plan.id}')">Assign to Players</button>
          <button class="btn btn-small btn-secondary" onclick="editPaymentPlan('${plan.id}')">Edit</button>
          <button class="btn btn-small btn-danger" onclick="deletePlan('${plan.id}')">Delete</button>
        </div>
      </div>
    </div>
  `).join('');
}

// 4. UPDATE THE PAYMENT PLAN FORM HANDLER IN admin-dashboard.js

async function handleCreatePaymentPlan(e) {
    e.preventDefault();
    console.log('Creating payment plan...');
    
    try {
        showLoading(true);
        
        const planData = {
            name: document.getElementById('planName').value,
            price: parseFloat(document.getElementById('planAmount').value),
            interval: document.getElementById('planFrequency').value,
            description: document.getElementById('planDescription').value
        };
        
        if (!planData.name || !planData.price || !planData.interval) {
            showNotification('Please fill in all required fields', 'error');
            return;
        }
        
        // Create the plan via API
        const response = await apiService.makeRequest('/payments/plans', {
            method: 'POST',
            body: JSON.stringify(planData)
        });
        
        // Update local state
        if (!AppState.paymentPlans) AppState.paymentPlans = [];
        AppState.paymentPlans.push(response.plan);
        
        closeModal('createPaymentPlanModal');
        document.getElementById('createPaymentPlanForm').reset();
        
        // Reload the payment plans section
        showPaymentPlans();
        
        showNotification('Payment plan created successfully!', 'success');
        
    } catch (error) {
        console.error('Failed to create payment plan:', error);
        showNotification('Failed to create payment plan: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// 5. ADD PLAN ASSIGNMENT FUNCTION TO admin-dashboard.js

async function assignPlanToPlayers(planId) {
    const plan = AppState.paymentPlans?.find(p => p.id === planId);
    if (!plan) return;
    
    const availablePlayers = AppState.players?.filter(p => !p.has_payment_plan) || [];
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.id = 'assignPlanModal';
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
            <div class="modal-header">
                <h2>Assign "${plan.name}" to Players</h2>
                <button class="close" onclick="closeModal('assignPlanModal')">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label>Select Players:</label>
                    <div class="checkbox-group" style="max-height: 300px; overflow-y: auto;">
                        ${availablePlayers.length > 0 ? availablePlayers.map(player => `
                            <label>
                                <input type="checkbox" name="selectedPlayers" value="${player.id}">
                                ${player.first_name} ${player.last_name} (Age: ${calculateAge(player.date_of_birth)})
                            </label>
                        `).join('') : '<p>No players available for assignment</p>'}
                    </div>
                </div>
                <div class="form-group">
                    <label for="planStartDate">Start Date</label>
                    <input type="date" id="planStartDate" value="${new Date().toISOString().split('T')[0]}">
                </div>
                <div style="margin-top: 1.5rem;">
                    <button class="btn btn-primary" onclick="confirmBulkPlanAssignment('${planId}')">Assign Plan</button>
                    <button class="btn btn-secondary" onclick="closeModal('assignPlanModal')">Cancel</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

async function confirmBulkPlanAssignment(planId) {
    const selectedPlayers = Array.from(document.querySelectorAll('input[name="selectedPlayers"]:checked'))
                                 .map(cb => cb.value);
    const startDate = document.getElementById('planStartDate').value;
    
    if (selectedPlayers.length === 0) {
        showNotification('Please select at least one player', 'error');
        return;
    }
    
    try {
        await apiService.makeRequest('/payments/bulk-assign-plan', {
            method: 'POST',
            body: JSON.stringify({
                playerIds: selectedPlayers,
                planId: planId,
                startDate: startDate
            })
        });
        
        closeModal('assignPlanModal');
        showNotification(`Payment plan assigned to ${selectedPlayers.length} players!`, 'success');
        
        // Refresh data
        const dashboardData = await apiService.getAdminDashboardData();
        AppState.players = dashboardData.players || [];
        loadPlayers();
        
    } catch (error) {
        console.error('Failed to assign payment plan:', error);
        showNotification('Failed to assign payment plan: ' + error.message, 'error');
    }
}

// Global exports
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
window.downloadDocument = function(id) { showNotification('Document download coming soon', 'info'); };
window.viewDocument = function(id) { showNotification('Document viewer coming soon', 'info'); };
window.refreshEventData = refreshEventData;
window.refreshClubData = refreshClubData;
window.initializePlayerDashboard = initializePlayerDashboard;
window.accessStripeAccount = accessStripeAccount;
window.loadPaymentPlans = loadPaymentPlans;
window.showPaymentPlans = showPaymentPlans;
window.handleCreatePaymentPlan = handleCreatePaymentPlan;
window.assignPlanToPlayers = assignPlanToPlayers;
window.confirmBulkPlanAssignment = confirmBulkPlanAssignment;

console.log('Player Dashboard script loaded successfully');