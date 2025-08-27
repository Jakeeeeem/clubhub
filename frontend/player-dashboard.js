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
  players: [],          // aggregated list from clubs or API
  plans: [],            // available payment plans
  currentPlan: null,    // current user plan assignment
  stripe: {
    linked: false,
    payouts_enabled: false,
    details_submitted: false,
    account_id: null
  },
  isLoading: false
};

/* ---------- Boot ---------- */
document.addEventListener('DOMContentLoaded', () => {
  // Make sure nav shows logout
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.style.display = 'inline-block';
    logoutBtn.addEventListener('click', () => {
      if (typeof window.handleLogout === 'function') {
        window.handleLogout();
      } else {
        // Fallback if not present for some reason
        localStorage.clear();
        window.location.href = 'index.html';
      }
    });
  }

  // Wait a tick for apiService/script.js/enhanced-login-handler.js
  setTimeout(() => {
    if (typeof apiService === 'undefined') {
      console.error('❌ API Service not loaded');
      showNotification('System error: API service not available', 'error');
      return;
    }
    initializePlayerDashboard();
  }, 300);
});

/* ---------- Initialize ---------- */
async function initializePlayerDashboard() {
  console.log('🏃‍♂️ Initializing player dashboard...');
  try {
    showLoading(true);
    wirePlayersFilterTabs();
    wireStripeButtons();
    wirePlanButtons();
    wireAccountModal();

    await loadPlayerDataWithFallback();

    // Initial content render
    loadPlayerOverview();
    loadPlayerClubs();
    loadPlayerTeams();
    loadPlayerFinances();
    loadClubFinder();
    loadEventFinder();
    loadPlayerDocuments();

    // Extra: players tab + plans + stripe
    await Promise.all([
      loadPlayersList(),
      refreshStripeStatus(),
      loadPaymentPlans(),
      loadCurrentPlan()
    ]);

    console.log('✅ Player dashboard initialized');
  } catch (err) {
    console.error('❌ Failed to initialize:', err);
    showNotification('Failed to load dashboard: ' + err.message, 'error');
  } finally {
    showLoading(false);
  }
}

/* ---------- Data Loading ---------- */

async function loadPlayerDataWithFallback() {
  console.log('📊 Loading player data with fallback...');
  try {
    try {
      const dashboardData = await apiService.getPlayerDashboardData();
      console.log('✅ Loaded from /dashboard/player:', dashboardData);

      PlayerDashboardState.player     = dashboardData.player || null;
      PlayerDashboardState.attendance = dashboardData.attendance ?? null;
      PlayerDashboardState.clubs      = dashboardData.clubs || [];
      PlayerDashboardState.teams      = dashboardData.teams || [];
      PlayerDashboardState.events     = dashboardData.events || [];
      PlayerDashboardState.payments   = dashboardData.payments || [];
      PlayerDashboardState.bookings   = dashboardData.bookings || [];
      PlayerDashboardState.applications = dashboardData.applications || [];
      return;
    } catch (e) {
      console.warn('⚠️ /dashboard/player failed; loading individually:', e);
    }

    // Fallback individual calls
    const tasks = [
      apiService.getEvents().then(v => PlayerDashboardState.events = v || []).catch(() => PlayerDashboardState.events = []),
      apiService.getClubs().then(v => PlayerDashboardState.clubs = v || []).catch(() => PlayerDashboardState.clubs = []),
      apiService.getTeams().then(v => PlayerDashboardState.teams = v || []).catch(() => PlayerDashboardState.teams = []),
      apiService.getPayments().then(v => PlayerDashboardState.payments = v || []).catch(() => PlayerDashboardState.payments = []),
      apiService.getUserBookings().then(v => PlayerDashboardState.bookings = v || []).catch(() => PlayerDashboardState.bookings = [])
    ];
    await Promise.all(tasks);

    // Try to map current user to a "player" record from clubs
    const currentUser = safeGetCurrentUser();
    if (currentUser?.email) {
      for (const club of PlayerDashboardState.clubs) {
        if (Array.isArray(club.players)) {
          const match = club.players.find(p => (p.email || '').toLowerCase() === currentUser.email.toLowerCase());
          if (match) {
            PlayerDashboardState.player = match;
            break;
          }
        }
      }
    }

    console.log('📊 Loaded:', {
      events: PlayerDashboardState.events.length,
      clubs: PlayerDashboardState.clubs.length,
      teams: PlayerDashboardState.teams.length,
      payments: PlayerDashboardState.payments.length,
      bookings: PlayerDashboardState.bookings.length,
      hasPlayer: !!PlayerDashboardState.player
    });
  } catch (err) {
    console.error('❌ loadPlayerDataWithFallback error:', err);
    throw err;
  }
}

/* ---------- Overview ---------- */

function loadPlayerOverview() {
  const clubsCount = PlayerDashboardState.clubs.length;
  const teamsCount = PlayerDashboardState.teams.length;
  const upcomingEventsCount = PlayerDashboardState.events.filter(e => new Date(e.event_date) > new Date()).length;

  updateText('playerClubs', clubsCount);
  updateText('playerTeams', teamsCount);
  updateText('playerEvents', upcomingEventsCount);
  updateText('playerAttendance', PlayerDashboardState.attendance != null ? `${PlayerDashboardState.attendance}%` : '0');

  loadUpcomingEvents();
  loadRecentActivity();
  loadPerformanceSummary();
}

function loadUpcomingEvents() {
  const el = byId('playerUpcomingEvents');
  if (!el) return;
  const now = new Date();
  const list = PlayerDashboardState.events
    .filter(e => new Date(e.event_date) > now)
    .sort((a, b) => new Date(a.event_date) - new Date(b.event_date))
    .slice(0, 5);

  el.innerHTML = list.length ? list.map(event => `
    <div class="item-list-item">
      <div class="item-info">
        <h4>${escapeHTML(event.title)}</h4>
        <p>${formatDate(event.event_date)}${event.event_time ? ` at ${escapeHTML(event.event_time)}` : ''}</p>
        <p>Price: ${formatCurrency(event.price || 0)}</p>
      </div>
      <div class="item-actions">
        <button class="btn btn-small btn-primary" onclick="bookEvent('${event.id}')">Book</button>
      </div>
    </div>
  `).join('') : '<p>No upcoming events</p>';
}

function loadRecentActivity() {
  const el = byId('playerRecentActivity');
  if (!el) return;
  const list = (PlayerDashboardState.bookings || []).slice(0, 3);

  el.innerHTML = list.length ? list.map(b => `
    <div class="item-list-item">
      <div class="item-info">
        <h4>${escapeHTML(b.title || 'Event')}</h4>
        <p>${formatDate(b.event_date)} - ${escapeHTML(b.booking_status || 'N/A')}</p>
      </div>
      <span class="status-badge status-${escapeHTML(b.booking_status || 'unknown')}">${escapeHTML(b.booking_status || 'Unknown')}</span>
    </div>
  `).join('') : '<p>No recent activity</p>';
}

function loadPerformanceSummary() {
  const matches = (PlayerDashboardState.bookings || []).filter(b => b.event_type === 'match').length;
  const trainings = (PlayerDashboardState.bookings || []).filter(b => b.event_type === 'training').length;

  updateText('playerMatchesPlayed', matches);
  updateText('playerAverageRating', '4.2'); // placeholder
  updateText('playerTrainingSessions', trainings);
  updateText('playerPosition', PlayerDashboardState.player?.position || 'Not Set');
}

/* ---------- Clubs & Teams ---------- */

function loadPlayerClubs() {
  const grid = byId('playerClubsContainer');
  if (!grid) return;

  if (!PlayerDashboardState.clubs.length) {
    grid.innerHTML = `
      <div class="empty-state">
        <h4>No clubs joined yet</h4>
        <p>Find and apply to clubs to get started</p>
        <button class="btn btn-primary" onclick="showPlayerSection('club-finder')">Find Clubs</button>
      </div>`;
    byId('clubStaffTableBody')?.replaceChildren();
    return;
  }

  grid.innerHTML = PlayerDashboardState.clubs.map(c => `
    <div class="card">
      <h4>${escapeHTML(c.name)}</h4>
      <p><strong>Location:</strong> ${escapeHTML(c.location || 'Not specified')}</p>
      <p><strong>Sport:</strong> ${escapeHTML(c.sport || 'Not specified')}</p>
      <p><strong>Members:</strong> ${Number(c.member_count || 0)}</p>
      <p>${escapeHTML(c.description || 'No description available')}</p>
      <div class="item-actions">
        <button class="btn btn-small btn-secondary" onclick="viewClubDetails('${c.id}')">View Details</button>
        <button class="btn btn-small btn-primary" onclick="viewClubEvents('${c.id}')">View Events</button>
      </div>
    </div>
  `).join('');

  // Staff table from clubs
  const staffBody = byId('clubStaffTableBody');
  if (staffBody) {
    const rows = [];
    PlayerDashboardState.clubs.forEach(c => {
      (c.staff || []).forEach(s => {
        rows.push(`
          <tr>
            <td>${escapeHTML((s.first_name || '') + ' ' + (s.last_name || ''))}</td>
            <td>${escapeHTML(s.role || '')}</td>
            <td>${escapeHTML(s.email || 'N/A')}</td>
            <td>${escapeHTML(c.name)}</td>
          </tr>
        `);
      });
    });
    staffBody.innerHTML = rows.length ? rows.join('') : '<tr><td colspan="4">No staff information available</td></tr>';
  }
}

function loadPlayerTeams() {
  const grid = byId('playerTeamsContainer');
  if (!grid) return;

  if (!PlayerDashboardState.teams.length) {
    grid.innerHTML = `
      <div class="empty-state">
        <h4>No teams joined yet</h4>
        <p>Join a club to be assigned to teams</p>
        <button class="btn btn-primary" onclick="showPlayerSection('club-finder')">Find Clubs</button>
      </div>`;
    byId('teamEventsContainer')?.replaceChildren();
    return;
  }

  grid.innerHTML = PlayerDashboardState.teams.map(t => `
    <div class="card">
      <h4>${escapeHTML(t.name)}</h4>
      <p><strong>Age Group:</strong> ${escapeHTML(t.age_group || 'Not specified')}</p>
      <p><strong>Sport:</strong> ${escapeHTML(t.sport || 'Not specified')}</p>
      <p><strong>Position:</strong> ${escapeHTML(t.player_position || 'Not assigned')}</p>
      <p><strong>Jersey Number:</strong> ${escapeHTML(t.jersey_number || 'Not assigned')}</p>
      ${t.coach ? `<p><strong>Coach:</strong> ${escapeHTML(t.coach.name || '')}</p>` : ''}
      <div class="item-actions">
        <button class="btn btn-small btn-secondary" onclick="viewTeamDetails('${t.id}')">View Team</button>
        <button class="btn btn-small btn-primary" onclick="viewTeamEvents('${t.id}')">Team Events</button>
      </div>
    </div>
  `).join('');

  loadTeamEvents();
}

function loadTeamEvents() {
  const container = byId('teamEventsContainer');
  if (!container) return;

  const teamIds = PlayerDashboardState.teams.map(t => t.id);
  const events = PlayerDashboardState.events.filter(e => teamIds.includes(e.team_id));

  container.innerHTML = events.length ? events.map(e => `
    <div class="event-item" style="border:1px solid #ddd;padding:1rem;margin:.5rem 0;border-radius:8px;">
      <h4>${escapeHTML(e.title)}</h4>
      <p><strong>Date:</strong> ${formatDate(e.event_date)}</p>
      <p><strong>Type:</strong> ${escapeHTML(e.event_type || '')}</p>
      <div class="item-actions">
        <button class="btn btn-small btn-primary" onclick="submitAvailability('${e.id}')">Submit Availability</button>
        <button class="btn btn-small btn-secondary" onclick="viewEventDetails('${e.id}')">View Details</button>
      </div>
    </div>
  `).join('') : '<p>No team events found</p>';
}

/* ---------- Finances (Payments) ---------- */

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
  body.innerHTML = payments.length ? payments.map(p => `
    <tr>
      <td>${formatDate(p.due_date)}</td>
      <td>${escapeHTML(p.description || '')}</td>
      <td>${formatCurrency(p.amount)}</td>
      <td><span class="status-badge status-${escapeHTML(p.payment_status || 'unknown')}">${escapeHTML(p.payment_status || 'unknown')}</span></td>
      <td>
        ${p.payment_status === 'pending'
          ? `<button class="btn btn-small btn-primary" onclick="payNow('${p.id}', ${Number(p.amount)}, '${escapeHTML(p.description || 'Payment')}')">Pay Now</button>`
          : `<span style="color:#28a745;">✅ Paid</span>`}
      </td>
    </tr>
  `).join('') : '<tr><td colspan="5">No payment history found</td></tr>';
}

function loadOutstandingPayments() {
  const container = byId('outstandingPayments');
  if (!container) return;

  const outstanding = (PlayerDashboardState.payments || []).filter(p => p.payment_status === 'pending');
  container.innerHTML = outstanding.length ? outstanding.map(p => `
    <div class="payment-item" style="border:1px solid #ddd;padding:1rem;margin:.5rem 0;border-radius:8px;background:#000000;">
      <h4>${escapeHTML(p.description || 'Payment')}</h4>
      <p><strong>Amount:</strong> ${formatCurrency(p.amount)}</p>
      <p><strong>Due Date:</strong> ${formatDate(p.due_date)}</p>
      <button class="btn btn-primary" onclick="payNow('${p.id}', ${Number(p.amount)}, '${escapeHTML(p.description || 'Payment')}')">Pay Now</button>
    </div>
  `).join('') : '<p>No outstanding payments</p>';
}

async function payNow(paymentId, amount, description) {
  console.log('💳 Processing payment:', paymentId, amount, description);
  try {
    if (typeof createPaymentModal === 'function') {
      const onSuccess = async (paymentResult) => {
        try {
          await apiService.confirmPayment(paymentResult.id, paymentId);
          showNotification('Payment successful!', 'success');
          await reloadPaymentsSection();
        } catch (e) {
          console.error('❌ Confirm payment failed:', e);
          showNotification('Payment successful but confirmation failed: ' + e.message, 'error');
        }
      };
      const onError = (e) => {
        console.error('❌ Payment failed:', e);
        showNotification('Payment failed: ' + e.message, 'error');
      };
      createPaymentModal(amount, description, onSuccess, onError);
    } else {
      // Fallback page
      const url = `payment.html?paymentId=${paymentId}&amount=${amount}&description=${encodeURIComponent(description)}`;
      window.open(url, '_blank');
    }
  } catch (err) {
    console.error('❌ payNow error:', err);
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

/* ---------- Club Finder ---------- */

function loadClubFinder() {
  const container = byId('availableClubsContainer');
  if (!container) return;

  if (!PlayerDashboardState.clubs.length) {
    container.innerHTML = `
      <div class="empty-state">
        <h4>No clubs available</h4>
        <p>Check back later for new clubs</p>
        <button class="btn btn-primary" onclick="refreshClubData()">Refresh</button>
      </div>`;
    return;
  }
  displayClubs(PlayerDashboardState.clubs);
}

function displayClubs(clubs) {
  const container = byId('availableClubsContainer');
  if (!container) return;
  container.innerHTML = (clubs || []).map(club => `
    <div class="card">
      <h4>${escapeHTML(club.name)}</h4>
      <p><strong>Location:</strong> ${escapeHTML(club.location || 'Not specified')}</p>
      <p><strong>Sport:</strong> ${escapeHTML(club.sport || 'Not specified')}</p>
      <p><strong>Members:</strong> ${Number(club.member_count || 0)}</p>
      <p>${escapeHTML(club.description || 'No description available')}</p>
      <div class="item-actions">
        <button class="btn btn-small btn-primary" onclick='applyToClub("${club.id}", "${escapeHTML((club.name || '').replace("'", ""))}")'>Apply</button>
        <button class="btn btn-small btn-secondary" onclick="viewClubDetails('${club.id}')">View Details</button>
      </div>
    </div>
  `).join('');
}

/* ---------- Event Finder ---------- */

function loadEventFinder() {
  const container = byId('availablePlayerEventsContainer');
  if (!container) return;
  displayEvents(PlayerDashboardState.events);
}

function displayEvents(events) {
  const container = byId('availablePlayerEventsContainer');
  if (!container) return;

  container.innerHTML = (events || []).length ? events.map(event => `
    <div class="card">
      <h4>${escapeHTML(event.title)}</h4>
      <p><strong>Type:</strong> ${escapeHTML(event.event_type || '')}</p>
      <p><strong>Date:</strong> ${formatDate(event.event_date)}${event.event_time ? ` at ${escapeHTML(event.event_time)}` : ''}</p>
      <p><strong>Location:</strong> ${escapeHTML(event.location || 'TBD')}</p>
      <p><strong>Price:</strong> ${formatCurrency(event.price || 0)}</p>
      <p><strong>Available Spots:</strong> ${escapeHTML(String(event.spots_available ?? 'Unlimited'))}</p>
      <p>${escapeHTML(event.description || 'No description available')}</p>
      <div class="item-actions">
        <button class="btn btn-small btn-primary" onclick="bookEvent('${event.id}')">Book Event</button>
        <button class="btn btn-small btn-secondary" onclick="viewEventDetails('${event.id}')">View Details</button>
      </div>
    </div>
  `).join('') : `
    <div class="empty-state">
      <h4>No events found</h4>
      <p>Try adjusting your search criteria or check back later</p>
      <button class="btn btn-primary" onclick="refreshEventData()">Refresh Events</button>
    </div>`;
}

/* ---------- Documents (placeholder) ---------- */

function loadPlayerDocuments() {
  const body = byId('playerDocumentsTableBody');
  if (!body) return;

  // Placeholder examples
  const docs = [
    { id: '1', name: 'Club Handbook', type: 'PDF', club_name: 'Elite Football Academy', updated_at: '2024-01-15' },
    { id: '2', name: 'Training Schedule', type: 'PDF', club_name: 'Elite Football Academy', updated_at: '2024-01-20' },
    { id: '3', name: 'Safety Guidelines', type: 'PDF', club_name: 'Elite Football Academy', updated_at: '2024-01-10' }
  ];

  body.innerHTML = docs.map(d => `
    <tr>
      <td>${escapeHTML(d.name)}</td>
      <td>${escapeHTML(d.type)}</td>
      <td>${escapeHTML(d.club_name)}</td>
      <td>${formatDate(d.updated_at)}</td>
      <td>
        <button class="btn btn-small btn-primary" onclick="downloadDocument('${d.id}')">Download</button>
        <button class="btn btn-small btn-secondary" onclick="viewDocument('${d.id}')">View</button>
      </td>
    </tr>
  `).join('');
}

/* ---------- Players Tab + Filters ---------- */

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
    // Primary source: aggregate from clubs if present
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

    // If empty, try explicit API (if your backend supports GET /players)
    if (!players.length && typeof apiService.getPlayers === 'function') {
      const apiPlayers = await apiService.getPlayers().catch(() => []);
      players = (apiPlayers || []).map(p => ({ ...p }));
    }

    PlayerDashboardState.players = uniqueByKey(players, p => `${p.id || p.email || p.user_id || Math.random()}`);

    // First render with "all"
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
    // If backend flags exist, use them
    if (p.overdue === true || p.has_overdue === true) return true;
    // Heuristic fallback: if this player equals current user AND we have pending payments overdue
    const you = safeGetCurrentUser();
    if (you && (p.email || '').toLowerCase() === you.email?.toLowerCase()) {
      const now = new Date();
      return (PlayerDashboardState.payments || []).some(pay => pay.payment_status === 'pending' && new Date(pay.due_date) < now);
    }
    return false;
  };

  switch (filterKey) {
    case 'on-plan':
      filtered = list.filter(isOnPlan);
      break;
    case 'not-on-plan':
      filtered = list.filter(p => !isOnPlan(p));
      break;
    case 'assigned':
      filtered = list.filter(isAssigned);
      break;
    case 'unassigned':
      filtered = list.filter(p => !isAssigned(p));
      break;
    case 'overdue':
      filtered = list.filter(isOverdue);
      break;
    case 'all':
    default:
      filtered = list;
  }

  container.innerHTML = filtered.length ? filtered.map(p => `
    <div class="card">
      <h4>${escapeHTML(`${p.first_name || p.firstName || ''} ${p.last_name || p.lastName || ''}`.trim() || (p.name || 'Player'))}</h4>
      <p><strong>Email:</strong> ${escapeHTML(p.email || 'N/A')}</p>
      ${p.club_name ? `<p><strong>Club:</strong> ${escapeHTML(p.club_name)}</p>` : ''}
      ${p.team_name ? `<p><strong>Team:</strong> ${escapeHTML(p.team_name)}</p>` : ''}
      <p><strong>Status:</strong> 
        ${isAssigned(p) ? 'Assigned' : 'Not assigned'} • 
        ${isOnPlan(p) ? 'On plan' : 'Not on plan'} 
        ${isOverdue(p) ? '• Overdue' : ''}</p>
    </div>
  `).join('') : '<p>No players found for this filter.</p>';
}

/* ---------- Stripe Connect ---------- */

function wireStripeButtons() {
  byId('stripeOnboardBtn')?.addEventListener('click', onboardStripe);
  byId('stripeManageBtn')?.addEventListener('click', manageStripe);
  byId('stripeRefreshBtn')?.addEventListener('click', refreshStripeStatus);
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
    console.error('❌ Stripe onboard error:', e);
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
    console.error('❌ Stripe manage error:', e);
    showNotification('Failed to open Stripe dashboard: ' + e.message, 'error');
  }
}

async function refreshStripeStatus() {
  try {
    const res = await apiService.makeRequest('/payments/stripe/connect/status', { method: 'GET' });
    // Expected response shape:
    // { linked, payouts_enabled, details_submitted, account_id }
    PlayerDashboardState.stripe = {
      linked: !!res?.linked,
      payouts_enabled: !!res?.payouts_enabled,
      details_submitted: !!res?.details_submitted,
      account_id: res?.account_id || null
    };
    renderStripeStatus();
  } catch (e) {
    console.warn('⚠️ Stripe status error:', e);
    renderStripeStatus(true);
  }
}

function renderStripeStatus(error = false) {
  const info = byId('stripeAccountInfo');
  const manageBtn = byId('stripeManageBtn');

  if (error) {
    info && (info.innerHTML = `<p style="color:#b00020">Unable to fetch Stripe status.</p>`);
    manageBtn && (manageBtn.disabled = true);
    return;
  }

  const s = PlayerDashboardState.stripe;
  const parts = [
    `<strong>Linked:</strong> ${s.linked ? 'Yes' : 'No'}`,
    `<strong>Details submitted:</strong> ${s.details_submitted ? 'Yes' : 'No'}`,
    `<strong>Payouts enabled:</strong> ${s.payouts_enabled ? 'Yes' : 'No'}`
  ];
  if (s.account_id) parts.push(`<strong>Account ID:</strong> ${escapeHTML(s.account_id)}`);

  info && (info.innerHTML = `<p>${parts.join(' • ')}</p>`);
  manageBtn && (manageBtn.disabled = !s.linked);
}

/* ---------- Payment Plans ---------- */

function wirePlanButtons() {
  byId('assignPlanBtn')?.addEventListener('click', assignOrUpdatePlan);
}

async function loadPaymentPlans() {
  try {
    const res = await apiService.makeRequest('/payments/plans', { method: 'GET' });
    PlayerDashboardState.plans = Array.isArray(res) ? res : (res?.plans || []);
    renderPlanSelector();
  } catch (e) {
    console.warn('⚠️ Failed to load plans:', e);
    PlayerDashboardState.plans = [];
    renderPlanSelector();
  }
}

function renderPlanSelector() {
  const sel = byId('planSelector');
  if (!sel) return;
  const plans = PlayerDashboardState.plans || [];
  sel.innerHTML = plans.length
    ? `<option value="">Select a plan</option>` + plans.map(p =>
        `<option value="${escapeAttr(p.id || p.plan_id)}">${escapeHTML(p.name || 'Plan')} — ${formatCurrency(p.amount || p.price || 0)} ${p.interval ? `/${escapeHTML(p.interval)}` : ''}</option>`
      ).join('')
    : `<option value="">No plans available</option>`;
  // Default start date today
  const start = byId('planStartDate');
  if (start && !start.value) {
    start.valueAsDate = new Date();
  }
}

async function loadCurrentPlan() {
  try {
    // If your backend returns a specific endpoint for current user plan:
    // e.g. GET /payments/plan/current
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
  el.innerHTML = cp ? `
    <div class="info">
      <p><strong>Current plan:</strong> ${escapeHTML(cp.name || 'Plan')}</p>
      <p><strong>Amount:</strong> ${formatCurrency(cp.amount || cp.price || 0)} ${cp.interval ? `/${escapeHTML(cp.interval)}` : ''}</p>
      ${cp.start_date ? `<p><strong>Started:</strong> ${formatDate(cp.start_date)}</p>` : ''}
      ${cp.status ? `<p><strong>Status:</strong> ${escapeHTML(cp.status)}</p>` : ''}
    </div>
  ` : `<p>No plan assigned.</p>`;
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
      body: JSON.stringify({ planId, startDate })
    });
    showNotification('Plan assigned/updated successfully!', 'success');
    await loadCurrentPlan();
    await reloadPaymentsSection();
  } catch (e) {
    console.error('❌ Assign plan error:', e);
    showNotification('Failed to assign plan: ' + (e.message || 'Unknown error'), 'error');
  }
}

/* ---------- Account management (profile update) ---------- */

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

      const res = await apiService.updateUserProfile(cleaned);
      showNotification('Account updated!', 'success');

      // Close modal and refresh basic info
      closeModal('accountModal');
      // Optionally reload profile
      await loadPlayerDataWithFallback();
      loadPlayerOverview();
    } catch (err) {
      console.error('❌ Profile update error:', err);
      showNotification('Failed to update account: ' + err.message, 'error');
    }
  });

  // Prefill if we can
  const you = safeGetCurrentUser();
  if (you) {
    if (byId('accFirstName')) byId('accFirstName').value = you.firstName || you.first_name || '';
    if (byId('accLastName'))  byId('accLastName').value  = you.lastName || you.last_name || '';
  }
}

/* ---------- Actions ---------- */

async function bookEvent(eventId) {
  console.log('📅 Booking event:', eventId);
  const event = (PlayerDashboardState.events || []).find(e => e.id === eventId);
  if (!event) return showNotification('Event not found', 'error');

  try {
    if (Number(event.price || 0) > 0) {
      // Paid event
      if (typeof createPaymentModal === 'function') {
        const onSuccess = async (paymentResult) => {
          try {
            await apiService.bookEvent(eventId);
            await apiService.confirmPayment(paymentResult.id, null);
            showNotification('Event booked successfully!', 'success');
            await loadPlayerDataWithFallback();
            loadPlayerOverview();
          } catch (e) {
            console.error('❌ Booking after payment failed:', e);
            showNotification('Payment ok, booking failed: ' + e.message, 'error');
          }
        };
        const onError = (e) => showNotification('Payment failed: ' + e.message, 'error');
        createPaymentModal(Number(event.price), event.title, onSuccess, onError);
      } else {
        const url = `payment.html?amount=${Number(event.price)}&description=${encodeURIComponent(event.title)}&eventId=${event.id}`;
        window.open(url, '_blank');
      }
    } else {
      // Free event
      await apiService.bookEvent(eventId);
      showNotification('Event booked successfully!', 'success');
      await loadPlayerDataWithFallback();
      loadPlayerOverview();
    }
  } catch (e) {
    console.error('❌ bookEvent error:', e);
    showNotification('Failed to book event: ' + e.message, 'error');
  }
}

function submitAvailability(eventId) {
  byId('availabilityEventId').value = eventId;
  showModal('availabilityModal');
}

async function handleAvailabilitySubmission(e) {
  e.preventDefault();
  try {
    const eventId = byId('availabilityEventId').value;
    const availability = document.querySelector('input[name="availability"]:checked')?.value;
    const notes = byId('availabilityNotes').value;

    if (!availability) return showNotification('Please select your availability', 'error');

    await apiService.makeRequest(`/events/${eventId}/availability`, {
      method: 'POST',
      body: JSON.stringify({ availability, notes })
    });

    closeModal('availabilityModal');
    showNotification('Availability submitted successfully!', 'success');
    e.target.reset();
  } catch (err) {
    console.error('❌ Availability submit error:', err);
    showNotification('Failed to submit availability: ' + err.message, 'error');
  }
}

function applyToClub(clubId, clubName) {
  byId('applyClubId').value = clubId;
  const title = document.querySelector('#applyClubModal .modal-header h2');
  if (title) title.textContent = `Apply to ${clubName}`;
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

    await apiService.makeRequest(`/clubs/${clubId}/apply`, {
      method: 'POST',
      body: JSON.stringify({
        message,
        preferredPosition: position,
        experienceLevel: experience,
        availability
      })
    });

    closeModal('applyClubModal');
    e.target.reset();
    showNotification('Application submitted successfully!', 'success');
  } catch (err) {
    console.error('❌ Club application error:', err);
    showNotification('Failed to submit application: ' + err.message, 'error');
  }
}

/* ---------- Filters (UI) ---------- */

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

/* ---------- View Modal Helpers ---------- */

function viewClubDetails(clubId) {
  const club = (PlayerDashboardState.clubs || []).find(c => c.id === clubId);
  if (!club) return showNotification('Club not found', 'error');

  removeIfExists('clubDetailsModal');
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = 'clubDetailsModal';
  modal.style.display = 'block';
  modal.innerHTML = `
    <div class="modal-content" style="max-width:600px;">
      <div class="modal-header">
        <h2>${escapeHTML(club.name)}</h2>
        <button class="close" onclick="closeModal('clubDetailsModal')">&times;</button>
      </div>
      <div class="modal-body">
        <p><strong>Location:</strong> ${escapeHTML(club.location || 'Not specified')}</p>
        <p><strong>Sport:</strong> ${escapeHTML(club.sport || 'Not specified')}</p>
        <p><strong>Members:</strong> ${Number(club.member_count || 0)}</p>
        <p><strong>Description:</strong> ${escapeHTML(club.description || 'No description available')}</p>
        ${club.philosophy ? `<p><strong>Philosophy:</strong> ${escapeHTML(club.philosophy)}</p>` : ''}
        ${club.website ? `<p><strong>Website:</strong> <a href="${escapeAttr(club.website)}" target="_blank">${escapeHTML(club.website)}</a></p>` : ''}
        <div style="margin-top:1rem;">
          <button class="btn btn-primary" onclick="applyToClub('${club.id}', '${escapeAttr(club.name)}')">Apply to Club</button>
          <button class="btn btn-secondary" onclick="closeModal('clubDetailsModal')">Close</button>
        </div>
      </div>
    </div>`;
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
  modal.innerHTML = `
    <div class="modal-content" style="max-width:600px;">
      <div class="modal-header">
        <h2>${escapeHTML(event.title)}</h2>
        <button class="close" onclick="closeModal('eventDetailsModal')">&times;</button>
      </div>
      <div class="modal-body">
        <p><strong>Type:</strong> ${escapeHTML(event.event_type || '')}</p>
        <p><strong>Date:</strong> ${formatDate(event.event_date)}${event.event_time ? ` at ${escapeHTML(event.event_time)}` : ''}</p>
        <p><strong>Location:</strong> ${escapeHTML(event.location || 'TBD')}</p>
        <p><strong>Price:</strong> ${formatCurrency(event.price || 0)}</p>
        <p><strong>Capacity:</strong> ${escapeHTML(String(event.capacity ?? 'Unlimited'))}</p>
        <p><strong>Available Spots:</strong> ${escapeHTML(String(event.spots_available ?? 'Unlimited'))}</p>
        <p><strong>Description:</strong> ${escapeHTML(event.description || 'No description available')}</p>
        <div style="margin-top:1rem;">
          <button class="btn btn-primary" onclick="bookEvent('${event.id}'); closeModal('eventDetailsModal')">Book Event</button>
          <button class="btn btn-secondary" onclick="closeModal('eventDetailsModal')">Close</button>
        </div>
      </div>
    </div>`;
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
  modal.innerHTML = `
    <div class="modal-content" style="max-width:600px;">
      <div class="modal-header">
        <h2>${escapeHTML(team.name)}</h2>
        <button class="close" onclick="closeModal('teamDetailsModal')">&times;</button>
      </div>
      <div class="modal-body">
        <p><strong>Age Group:</strong> ${escapeHTML(team.age_group || 'Not specified')}</p>
        <p><strong>Sport:</strong> ${escapeHTML(team.sport || 'Not specified')}</p>
        <p><strong>Your Position:</strong> ${escapeHTML(team.player_position || 'Not assigned')}</p>
        <p><strong>Your Jersey Number:</strong> ${escapeHTML(team.jersey_number || 'Not assigned')}</p>
        ${team.coach ? `<p><strong>Coach:</strong> ${escapeHTML(team.coach.name || '')} (${escapeHTML(team.coach.email || '')})</p>` : '<p><strong>Coach:</strong> Not assigned</p>'}
        <p><strong>Description:</strong> ${escapeHTML(team.description || 'No description available')}</p>
        <div style="margin-top:1rem;">
          <button class="btn btn-primary" onclick="viewTeamEvents('${team.id}'); closeModal('teamDetailsModal')">View Team Events</button>
          <button class="btn btn-secondary" onclick="closeModal('teamDetailsModal')">Close</button>
        </div>
      </div>
    </div>`;
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

/* ---------- Refresh Helpers ---------- */

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

async function refreshAllData() {
  try {
    showLoading(true);
    await loadPlayerDataWithFallback();
    const active = document.querySelector('.dashboard-section.active');
    if (active) {
      const id = active.id.replace('player-', '');
      showPlayerSection(id);
    }
    await Promise.all([loadPlayersList(), refreshStripeStatus(), loadPaymentPlans(), loadCurrentPlan()]);
    showNotification('All data refreshed!', 'success');
  } catch (e) {
    showNotification('Failed to refresh data: ' + e.message, 'error');
  } finally {
    showLoading(false);
  }
}

/* ---------- Section Switching ---------- */

function showPlayerSection(sectionId) {
  document.querySelectorAll('.dashboard-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.dashboard-nav button').forEach(b => b.classList.remove('active'));

  const target = byId(`player-${sectionId}`);
  if (target) target.classList.add('active');

  const btn = document.querySelector(`.dashboard-nav button[onclick*="showPlayerSection('${sectionId}')"]`);
  if (btn) btn.classList.add('active');

  switch (sectionId) {
    case 'overview':  loadPlayerOverview(); break;
    case 'my-clubs':  loadPlayerClubs(); break;
    case 'teams':     loadPlayerTeams(); break;
    case 'finances':  loadPlayerFinances(); break;
    case 'players':   renderPlayersList(document.querySelector('.filter-tab.active')?.dataset.filter || 'all'); break;
    case 'club-finder': loadClubFinder(); break;
    case 'event-finder': loadEventFinder(); break;
    case 'documents': loadPlayerDocuments(); break;
  }
}

/* ---------- Util ---------- */

function byId(id) { return document.getElementById(id); }

function updateText(id, val) {
  const el = byId(id);
  if (el) el.textContent = val;
}

function formatCurrency(amount, currency = 'GBP') {
  try {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(Number(amount) || 0);
  } catch {
    return `£${Number(amount || 0).toFixed(2)}`;
  }
}

function formatDate(dateString) {
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
function escapeAttr(s) { return escapeHTML(s).replace(/"/g, '&quot;'); }

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
  } catch { return null; }
}

/* ---------- Exports ---------- */

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
window.downloadDocument = (id) => showNotification('Document download coming soon', 'info');
window.viewDocument = (id) => showNotification('Document viewer coming soon', 'info');
window.refreshEventData = refreshEventData;
window.refreshClubData = refreshClubData;
window.refreshAllData = refreshAllData;

console.log('✅ Player Dashboard script loaded');