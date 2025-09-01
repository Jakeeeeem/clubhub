class ApiService {
  constructor() {
    // Determine base URL based on environment
    this.baseURL = this.getBaseURL();
    this.token = localStorage.getItem('authToken');
    this.retryCount = {};
    this.maxRetries = 2;
    
    console.log('🌐 Enhanced API Service initialized with baseURL:', this.baseURL);
    
    // Test connection on initialization
    this.testConnection();
  }

  getBaseURL() {
    const hostname = window.location.hostname;
    const port = window.location.port;
    
    console.log('🔍 Detecting environment:', { hostname, port });
    
    // Production environment
    if (hostname === 'clubhubsports.net' || hostname === 'www.clubhubsports.net') {
      console.log('🌍 Production environment detected');
      return 'https://api.clubhubsports.net/api';
    }
    
    // Local development
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      console.log('🏠 Local development environment detected');
      return 'http://localhost:3000/api';
    }
    
    // Fallback for unknown environments
    console.log('❓ Unknown environment, using production API');
    return 'https://api.clubhubsports.net/api';
  }

  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const requestId = `${options.method || 'GET'}_${endpoint}`;
    
    if (!this.retryCount[requestId]) {
      this.retryCount[requestId] = 0;
    }
    
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const config = {
      ...options,
      headers,
      mode: 'cors',
      credentials: 'include'
    };

    try {
      console.log(`🌐 API Request: ${options.method || 'GET'} ${url}`);
      
      const response = await fetch(url, config);
      
      const contentType = response.headers.get('content-type');
      let data;
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        try {
          data = JSON.parse(text);
        } catch {
          data = { message: text };
        }
      }

      if (!response.ok) {
        console.error(`❌ API Error ${response.status}:`, data);
        
        if (response.status === 401) {
          this.handleAuthError();
          throw new Error('Authentication required');
        }
        
        throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      this.retryCount[requestId] = 0;
      console.log(`✅ API Response: ${response.status}`);
      return data;
      
    } catch (error) {
      console.error(`❌ API Error: ${endpoint}`, error);
      
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        if (this.retryCount[requestId] < this.maxRetries) {
          this.retryCount[requestId]++;
          console.log(`🔄 Retrying request ${requestId} (${this.retryCount[requestId]}/${this.maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, 1000 * this.retryCount[requestId]));
          return this.makeRequest(endpoint, options);
        }
        throw new Error('Cannot connect to server. Please check your internet connection.');
      }
      
      throw error;
    }
  }

  handleAuthError() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    this.token = null;
    
    if (!window.location.pathname.includes('index.html') && window.location.pathname !== '/') {
      window.location.href = 'index.html';
    }
  }

  setToken(token) {
    this.token = token;
    localStorage.setItem('authToken', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
  }

  // =========================== ENHANCED INVITE METHODS ===========================

  async generateClubInvite(inviteData) {
    console.log('📧 Generating club invite:', inviteData);
    
    try {
      const response = await this.makeRequest('/invites/generate', {
        method: 'POST',
        body: JSON.stringify(inviteData)
      });
      
      console.log('✅ Club invite generated:', response);
      return response;
    } catch (error) {
      console.error('❌ Failed to generate club invite:', error);
      throw error;
    }
  }

  async getInviteDetails(token) {
    console.log('📄 Fetching invite details for token:', token);
    
    try {
      const response = await this.makeRequest(`/invites/details/${token}`);
      console.log('✅ Invite details fetched:', response);
      return response;
    } catch (error) {
      console.error('❌ Failed to fetch invite details:', error);
      throw error;
    }
  }

  async acceptClubInvite(token, acceptData = {}) {
    console.log('✅ Accepting club invite:', { token, acceptData });
    
    try {
      const response = await this.makeRequest(`/invites/accept/${token}`, {
        method: 'POST',
        body: JSON.stringify(acceptData)
      });
      
      console.log('✅ Club invite accepted:', response);
      return response;
    } catch (error) {
      console.error('❌ Failed to accept club invite:', error);
      throw error;
    }
  }

  async declineClubInvite(token, reason = null) {
    console.log('❌ Declining club invite:', { token, reason });
    
    try {
      const response = await this.makeRequest(`/invites/decline/${token}`, {
        method: 'POST',
        body: JSON.stringify({ reason })
      });
      
      console.log('✅ Club invite declined:', response);
      return response;
    } catch (error) {
      console.error('❌ Failed to decline club invite:', error);
      throw error;
    }
  }

  async getSentInvites(status = null) {
    console.log('📋 Fetching sent invites...');
    
    try {
      const endpoint = status ? `/invites/sent?status=${status}` : '/invites/sent';
      const response = await this.makeRequest(endpoint);
      console.log('✅ Sent invites fetched:', response);
      return response;
    } catch (error) {
      console.error('❌ Failed to fetch sent invites:', error);
      throw error;
    }
  }

   /* ------------ Stripe Connect (player payouts) ------------ */


  async ensureStripeAccount() {
    return this.makeRequest('/payments/stripe/account', { method: 'POST' });
  }

  async getStripeOnboardingLink() {
    return this.makeRequest('/payments/stripe/onboarding-link', { method: 'POST' });
  }

  async getStripeDashboardLink() {
    return this.makeRequest('/payments/stripe/dashboard-link', { method: 'POST' });
  }

  /* ------------ Payment plans (assignment) ------------ */

  async listPaymentPlans() {
  try {
    const response = await this.makeRequest('/payments/plans');
    return response;
  } catch (error) {
    console.error('❌ Failed to fetch payment plans:', error);
    throw error;
  }
}

  async unassignMeFromPlan() {
    return this.makeRequest('/payments/unassign-plan', { method: 'POST' });
  }

  async getPaymentPlans() {
  return (await this.makeRequest('/payments/plans')).plans
}

async createPaymentPlan(planData) {
  console.log('💳 Creating payment plan:', planData);
  
  try {
    const response = await this.makeRequest('/payments/plans', {
      method: 'POST',
      body: JSON.stringify({
        name: planData.name,
        amount: Math.round(planData.amount * 100), // Convert to pence for Stripe
        interval: planData.frequency,
        description: planData.description,
        currency: 'gbp'
      })
    });
    console.log('✅ Payment plan created:', response);
    return response;
  } catch (error) {
    console.error('❌ Failed to create payment plan:', error);
    throw error;
  }
}


async updatePaymentPlan(planId, planData) {
  try {
    const response = await this.makeRequest(`/payments/plans/${planId}`, {
      method: 'PUT',
      body: JSON.stringify({
        name: planData.name,
        amount: Math.round(planData.amount * 100),
        interval: planData.frequency,
        description: planData.description
      })
    });
    return response;
  } catch (error) {
    console.error('❌ Failed to update payment plan:', error);
    throw error;
  }
}

async deletePaymentPlan(planId) {
  try {
    const response = await this.makeRequest(`/payments/plans/${planId}`, {
      method: 'DELETE'
    });
    return response;
  } catch (error) {
    console.error('❌ Failed to delete payment plan:', error);
    throw error;
  }
}

  // =========================== EMAIL METHODS ===========================

  async sendEmail(emailData) {
    console.log('📧 Sending email:', emailData);
    
    try {
      const response = await this.makeRequest('/email/send', {
        method: 'POST',
        body: JSON.stringify(emailData)
      });
      
      console.log('✅ Email sent:', response);
      return response;
    } catch (error) {
      console.error('❌ Failed to send email:', error);
      throw error;
    }
  }

  async sendInviteEmail(inviteData) {
    console.log('📧 Sending invite email:', inviteData);
    
    try {
      const response = await this.makeRequest('/email/send-invite', {
        method: 'POST',
        body: JSON.stringify(inviteData)
      });
      
      console.log('✅ Invite email sent:', response);
      return response;
    } catch (error) {
      console.error('❌ Failed to send invite email:', error);
      throw error;
    }
  }

  // =========================== AUTHENTICATION METHODS ===========================

  async login(email, password) {
    const response = await this.makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    if (response.token) {
      this.setToken(response.token);
      localStorage.setItem('currentUser', JSON.stringify(response.user));
    }

    return response;
  }

  async register(userData) {
    const response = await this.makeRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });

    if (response.token) {
      this.setToken(response.token);
      localStorage.setItem('currentUser', JSON.stringify(response.user));
    }

    return response;
  }

  async logout() {
    try {
      await this.makeRequest('/auth/logout', {
        method: 'POST'
      });
    } finally {
      this.clearToken();
    }
  }

  async getCurrentUser() {
    return await this.makeRequest('/auth/me');
  }

  async findUserByEmail(email) {
    try {
      return await this.makeRequest(`/auth/find-user?email=${encodeURIComponent(email)}`);
    } catch (error) {
      console.log('No user found with email:', email);
      return null;
    }
  }

  // =========================== CLUB METHODS ===========================

  async getClubs() {
    try {
      const clubs = await this.makeRequest('/clubs');
      localStorage.setItem('cachedClubs', JSON.stringify(clubs));
      return clubs;
    } catch (error) {
      console.warn('❌ Failed to fetch clubs:', error);
      
      const cachedClubs = localStorage.getItem('cachedClubs');
      if (cachedClubs) {
        console.log('📚 Using cached clubs data');
        return JSON.parse(cachedClubs);
      }
      
      return [];
    }
  }

  async getClubById(id) {
    return await this.makeRequest(`/clubs/${id}`);
  }

  async createClub(clubData) {
    const response = await this.makeRequest('/clubs', {
      method: 'POST',
      body: JSON.stringify(clubData)
    });
    
    this.cacheClubs([response.club]);
    return response;
  }

  async updateClub(id, clubData) {
    return await this.makeRequest(`/clubs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(clubData)
    });
  }

  async deleteClub(id) {
    return await this.makeRequest(`/clubs/${id}`, {
      method: 'DELETE'
    });
  }

  // =========================== PLAYER METHODS ===========================

  async getPlayers(clubId = null) {
    try {
      const endpoint = clubId ? `/players?clubId=${clubId}` : '/players';
      return await this.makeRequest(endpoint);
    } catch (error) {
      console.warn('❌ Failed to fetch players:', error);
      return [];
    }
  }

  async getPlayerById(id) {
    return await this.makeRequest(`/players/${id}`);
  }

  async createPlayer(playerData) {
    return await this.makeRequest('/players', {
      method: 'POST',
      body: JSON.stringify(playerData)
    });
  }

  async updatePlayer(id, playerData) {
    return await this.makeRequest(`/players/${id}`, {
      method: 'PUT',
      body: JSON.stringify(playerData)
    });
  }

  async deletePlayer(id) {
    return await this.makeRequest(`/players/${id}`, {
      method: 'DELETE'
    });
  }

  // =========================== EVENT METHODS ===========================

  async getEvents(clubId = null) {
    try {
      const endpoint = clubId ? `/events?clubId=${clubId}&upcoming=true` : '/events?upcoming=true';
      const events = await this.makeRequest(endpoint);
      
      localStorage.setItem('cachedEvents', JSON.stringify(events));
      return events;
    } catch (error) {
      console.warn('❌ Failed to fetch events:', error);
      
      const cachedEvents = localStorage.getItem('cachedEvents');
      if (cachedEvents) {
        console.log('📚 Using cached events data');
        return JSON.parse(cachedEvents);
      }
      
      return [];
    }
  }

  async getEventById(id) {
    return await this.makeRequest(`/events/${id}`);
  }

  async createEvent(eventData) {
    return await this.makeRequest('/events', {
      method: 'POST',
      body: JSON.stringify(eventData)
    });
  }

  async updateEvent(id, eventData) {
    return await this.makeRequest(`/events/${id}`, {
      method: 'PUT',
      body: JSON.stringify(eventData)
    });
  }

  async deleteEvent(id) {
    return await this.makeRequest(`/events/${id}`, {
      method: 'DELETE'
    });
  }

  async bookEvent(eventId, bookingData = {}) {
    return await this.makeRequest(`/events/${eventId}/book`, {
      method: 'POST',
      body: JSON.stringify(bookingData)
    });
  }

  async getUserBookings(status = null, upcoming = null) {
    let endpoint = '/events/bookings/my-bookings';
    const params = new URLSearchParams();
    
    if (status) params.append('status', status);
    if (upcoming) params.append('upcoming', upcoming);
    
    if (params.toString()) {
      endpoint += `?${params.toString()}`;
    }
    
    try {
      return await this.makeRequest(endpoint);
    } catch (error) {
      console.warn('❌ Failed to fetch user bookings:', error);
      return [];
    }
  }

  // =========================== TEAM METHODS ===========================

  async getTeams(clubId = null) {
    try {
      const endpoint = clubId ? `/teams?clubId=${clubId}` : '/teams';
      return await this.makeRequest(endpoint);
    } catch (error) {
      console.warn('❌ Failed to fetch teams:', error);
      return [];
    }
  }

  async getTeamById(id) {
    return await this.makeRequest(`/teams/${id}`);
  }

  async createTeam(teamData) {
    return await this.makeRequest('/teams', {
      method: 'POST',
      body: JSON.stringify(teamData)
    });
  }

  async updateTeam(id, teamData) {
    return await this.makeRequest(`/teams/${id}`, {
      method: 'PUT',
      body: JSON.stringify(teamData)
    });
  }

  async deleteTeam(id) {
    return await this.makeRequest(`/teams/${id}`, {
      method: 'DELETE'
    });
  }

  async assignPlayerToTeam(teamId, assignmentData) {
    return await this.makeRequest(`/teams/${teamId}/players`, {
      method: 'POST',
      body: JSON.stringify(assignmentData)
    });
  }

  async removePlayerFromTeam(teamId, playerId) {
    return await this.makeRequest(`/teams/${teamId}/players/${playerId}`, {
      method: 'DELETE'
    });
  }

  async getTeamDetails(teamId) {
  try {
    const response = await this.makeRequest(`/teams/${teamId}/details`);
    return response;
  } catch (error) {
    console.error('❌ Failed to fetch team details:', error);
    throw error;
  }
}

async getTeamEvents(teamId, type = null) {
  try {
    const endpoint = type ? 
      `/teams/${teamId}/events?type=${type}` : 
      `/teams/${teamId}/events`;
    return await this.makeRequest(endpoint);
  } catch (error) {
    console.error('❌ Failed to fetch team events:', error);
    throw error;
  }
}

async getTeamAvailabilityVotes(teamId, eventId = null) {
  try {
    const endpoint = eventId ? 
      `/teams/${teamId}/availability?eventId=${eventId}` : 
      `/teams/${teamId}/availability`;
    return await this.makeRequest(endpoint);
  } catch (error) {
    console.error('❌ Failed to fetch team availability votes:', error);
    throw error;
  }
}

async createTeamEvent(teamId, eventData) {
  try {
    const response = await this.makeRequest(`/teams/${teamId}/events`, {
      method: 'POST',
      body: JSON.stringify(eventData)
    });
    return response;
  } catch (error) {
    console.error('❌ Failed to create team event:', error);
    throw error;
  }
}

  // =========================== STAFF METHODS ===========================

  async getStaff(clubId = null) {
    try {
      const endpoint = clubId ? `/staff?clubId=${clubId}` : '/staff';
      return await this.makeRequest(endpoint);
    } catch (error) {
      console.warn('❌ Failed to fetch staff:', error);
      return [];
    }
  }

  async createStaff(staffData) {
    return await this.makeRequest('/staff', {
      method: 'POST',
      body: JSON.stringify(staffData)
    });
  }

  async updateStaff(id, staffData) {
    return await this.makeRequest(`/staff/${id}`, {
      method: 'PUT',
      body: JSON.stringify(staffData)
    });
  }

  async deleteStaff(id) {
    return await this.makeRequest(`/staff/${id}`, {
      method: 'DELETE'
    });
  }

  // =========================== PAYMENT METHODS ===========================

  async getPayments(filters = {}) {
    try {
      const queryParams = new URLSearchParams(filters).toString();
      const endpoint = queryParams ? `/payments?${queryParams}` : '/payments';
      return await this.makeRequest(endpoint);
    } catch (error) {
      console.warn('❌ Failed to fetch payments:', error);
      return [];
    }
  }

  async createPayment(paymentData) {
    return await this.makeRequest('/payments', {
      method: 'POST',
      body: JSON.stringify(paymentData)
    });
  }

  async createPaymentIntent(paymentData) {
    console.log('💳 Creating payment intent:', paymentData);
    
    try {
      const response = await this.makeRequest('/payments/create-intent', {
        method: 'POST',
        body: JSON.stringify(paymentData)
      });
      
      console.log('✅ Payment intent created:', response);
      return response;
    } catch (error) {
      console.error('❌ Failed to create payment intent:', error);
      throw error;
    }
  }

  async confirmPayment(paymentIntentId, paymentId = null) {
    console.log('✅ Confirming payment:', { paymentIntentId, paymentId });
    
    try {
      const response = await this.makeRequest('/payments/confirm-payment', {
        method: 'POST',
        body: JSON.stringify({
          paymentIntentId,
          paymentId
        })
      });
      
      console.log('✅ Payment confirmed:', response);
      return response;
    } catch (error) {
      console.error('❌ Failed to confirm payment:', error);
      throw error;
    }
  }

  async markPaymentAsPaid(paymentId) {
    return await this.makeRequest(`/payments/${paymentId}/mark-paid`, {
      method: 'POST'
    });
  }

  async generatePaymentLink(paymentId) {
    return await this.makeRequest(`/payments/${paymentId}/payment-link`);
  }

  async sendPaymentReminder(paymentId) {
    return await this.makeRequest(`/payments/${paymentId}/send-reminder`, {
      method: 'POST'
    });
  }

  async getFilteredPlayers(filter, clubId = null) {
  try {
    const endpoint = clubId ? 
      `/players/filtered/${filter}?clubId=${clubId}` : 
      `/players/filtered/${filter}`;
    return await this.makeRequest(endpoint);
  } catch (error) {
    console.warn('Failed to fetch filtered players:', error);
    return [];
  }
}

async assignPlayerToPaymentPlan(playerId, planId, startDate = null) {
  try {
    const response = await this.makeRequest('/payments/assign-player-plan', {
      method: 'POST',
      body: JSON.stringify({
        playerId,
        planId,
        startDate: startDate || new Date().toISOString().split('T')[0]
      })
    });
    return response;
  } catch (error) {
    console.error('❌ Failed to assign player to payment plan:', error);
    throw error;
  }
}

async getPlayerPayments(playerId, status = null) {
  try {
    const endpoint = status ? 
      `/payments/player/${playerId}?status=${status}` : 
      `/payments/player/${playerId}`;
    return await this.makeRequest(endpoint);
  } catch (error) {
    console.error('❌ Failed to fetch player payments:', error);
    throw error;
  }
}
  // =========================== DASHBOARD METHODS ===========================

  async getAdminDashboardData() {
    try {
      return await this.makeRequest('/dashboard/admin');
    } catch (error) {
      console.warn('❌ Failed to fetch admin dashboard data:', error);
      
      try {
        console.log('🔄 Attempting to load dashboard data from individual endpoints...');
        
        const [clubs, players, staff, events, teams, payments] = await Promise.allSettled([
          this.getClubs(),
          this.getPlayers(),
          this.getStaff(),
          this.getEvents(),
          this.getTeams(),
          this.getPayments()
        ]);
        
        return {
          clubs: clubs.status === 'fulfilled' ? clubs.value : [],
          players: players.status === 'fulfilled' ? players.value : [],
          staff: staff.status === 'fulfilled' ? staff.value : [],
          events: events.status === 'fulfilled' ? events.value : [],
          teams: teams.status === 'fulfilled' ? teams.value : [],
          payments: payments.status === 'fulfilled' ? payments.value : [],
          statistics: {
            total_clubs: clubs.status === 'fulfilled' ? clubs.value.length : 0,
            total_players: players.status === 'fulfilled' ? players.value.length : 0,
            total_staff: staff.status === 'fulfilled' ? staff.value.length : 0,
            total_events: events.status === 'fulfilled' ? events.value.length : 0,
            total_teams: teams.status === 'fulfilled' ? teams.value.length : 0,
            monthly_revenue: 0
          }
        };
      } catch (fallbackError) {
        console.error('❌ Fallback data loading also failed:', fallbackError);
        return this.getAdminDashboardFallback();
      }
    }
  }

  async getPlayerDashboardData() {
    try {
      return await this.makeRequest('/dashboard/player');
    } catch (error) {
      console.warn('❌ Failed to fetch player dashboard data:', error);
      
      try {
        console.log('🔄 Attempting to load player dashboard data from individual endpoints...');
        
        const [events, clubs, teams, payments, bookings] = await Promise.allSettled([
          this.getEvents(),
          this.getClubs(),
          this.getTeams(),
          this.getPayments(),
          this.getUserBookings()
        ]);
        
        // Added attendance | 07.08.25 BM
        return {
          player: null,
          attendance: null,
          clubs: clubs.status === 'fulfilled' ? clubs.value : [],
          teams: teams.status === 'fulfilled' ? teams.value : [],
          events: events.status === 'fulfilled' ? events.value : [],
          payments: payments.status === 'fulfilled' ? payments.value : [],
          bookings: bookings.status === 'fulfilled' ? bookings.value : [],
          applications: []
        };
      } catch (fallbackError) {
        console.error('❌ Fallback player dashboard loading failed:', fallbackError);
        return this.getPlayerDashboardFallback();
      }
    }
  }

  // =========================== FALLBACK METHODS ===========================

  getAdminDashboardFallback() {
    console.log('📚 Using admin dashboard fallback data');
    return {
      clubs: [],
      players: [],
      staff: [],
      events: [],
      teams: [],
      payments: [],
      statistics: {
        total_clubs: 0,
        total_players: 0,
        total_staff: 0,
        total_events: 0,
        total_teams: 0,
        monthly_revenue: 0
      }
    };
  }

  getPlayerDashboardFallback() {
    console.log('📚 Using player dashboard fallback data');
    return {
      player: null,
      clubs: [],
      teams: [],
      events: [],
      payments: [],
      bookings: [],
      applications: []
    };
  }

  // =========================== HEALTH CHECK METHODS ===========================

  async healthCheck() {
    try {
      return await this.makeRequest('/health');
    } catch (error) {
      console.warn('Health check failed:', error);
      return { status: 'unhealthy' };
    }
  }

  async testConnection() {
    try {
      console.log('🔍 Testing API connection...');
      const health = await this.healthCheck();
      console.log('✅ API Connection successful:', health);
      return true;
    } catch (error) {
      console.error('❌ API Connection failed:', error);
      return false;
    }
  }

  // =========================== UTILITY METHODS ===========================

  cacheClubs(clubs) {
    localStorage.setItem('cachedClubs', JSON.stringify(clubs));
  }

  formatCurrency(amount) {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  }
}

// Create and export a singleton instance
const apiService = new ApiService();

// Export for use in other files
window.apiService = apiService;

// Enhanced error handling and logging
window.addEventListener('error', function(event) {
  if (event.error && event.error.message && event.error.message.includes('apiService')) {
    console.error('🚨 API Service Error:', event.error);
  }
});

// =========================== CHILD PROFILE METHODS ===========================

async function addChildProfile(childData) {
  console.log('👶 Adding child profile:', childData);
  
  try {
    const response = await this.makeRequest('/auth/add-child', {
      method: 'POST',
      body: JSON.stringify(childData)
    });
    
    console.log('✅ Child profile added:', response);
    return response;
  } catch (error) {
    console.error('❌ Failed to add child profile:', error);
    throw error;
  }
}

async function getChildProfiles() {
  console.log('👶 Fetching child profiles...');
  
  try {
    const response = await this.makeRequest('/auth/children');
    console.log('✅ Child profiles fetched:', response);
    return response;
  } catch (error) {
    console.error('❌ Failed to fetch child profiles:', error);
    throw error;
  }
}

async function updateChildProfile(childId, childData) {
  console.log('👶 Updating child profile:', childId, childData);
  
  try {
    const response = await this.makeRequest(`/auth/children/${childId}`, {
      method: 'PUT',
      body: JSON.stringify(childData)
    });
    
    console.log('✅ Child profile updated:', response);
    return response;
  } catch (error) {
    console.error('❌ Failed to update child profile:', error);
    throw error;
  }
}

async function deleteChildProfile(childId) {
  console.log('👶 Deleting child profile:', childId);
  
  try {
    const response = await this.makeRequest(`/auth/children/${childId}`, {
      method: 'DELETE'
    });
    
    console.log('✅ Child profile deleted:', response);
    return response;
  } catch (error) {
    console.error('❌ Failed to delete child profile:', error);
    throw error;
  }
}

// =========================== ORGANIZATION TOGGLE METHODS ===========================

async function getUserOrganizations() {
  console.log('🏢 Fetching user organizations...');
  
  try {
    const response = await this.makeRequest('/auth/organizations');
    console.log('✅ Organizations fetched:', response);
    return response;
  } catch (error) {
    console.error('❌ Failed to fetch organizations:', error);
    throw error;
  }
}

async function switchPrimaryOrganization(clubId) {
  console.log('🏢 Switching primary organization:', clubId);
  
  try {
    const response = await this.makeRequest(`/auth/switch-organization/${clubId}`, {
      method: 'POST'
    });
    
    console.log('✅ Primary organization switched:', response);
    return response;
  } catch (error) {
    console.error('❌ Failed to switch organization:', error);
    throw error;
  }
}

// =========================== PASSWORD RECOVERY METHODS ===========================

async function requestPasswordReset(email) {
  console.log('🔐 Requesting password reset for:', email);
  
  try {
    const response = await this.makeRequest('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
    
    console.log('✅ Password reset requested:', response);
    return response;
  } catch (error) {
    console.error('❌ Failed to request password reset:', error);
    throw error;
  }
}

async function validateResetToken(token) {
  console.log('🔐 Validating reset token...');
  
  try {
    const response = await this.makeRequest(`/auth/validate-reset-token?token=${encodeURIComponent(token)}`);
    console.log('✅ Reset token validated:', response);
    return response;
  } catch (error) {
    console.error('❌ Failed to validate reset token:', error);
    throw error;
  }
}

async function resetPassword(token, newPassword) {
  console.log('🔐 Resetting password...');
  
  try {
    const response = await this.makeRequest('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password: newPassword })
    });
    
    console.log('✅ Password reset successful:', response);
    return response;
  } catch (error) {
    console.error('❌ Failed to reset password:', error);
    throw error;
  }
}

// =========================== ENHANCED PROFILE METHODS ===========================

async function updateUserProfile(profileData) {
  console.log('📋 Updating user profile:', profileData);
  
  try {
    const response = await this.makeRequest('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    });
    
    console.log('✅ Profile updated:', response);
    return response;
  } catch (error) {
    console.error('❌ Failed to update profile:', error);
    throw error;
  }
}

async function getUserProfile() {
  console.log('📋 Fetching user profile...');
  
  try {
    const response = await this.makeRequest('/auth/profile');
    console.log('✅ Profile fetched:', response);
    return response;
  } catch (error) {
    console.error('❌ Failed to fetch profile:', error);
    throw error;
  }
}

// =========================== ENHANCED REGISTRATION ===========================

async function registerWithProfile(userData) {
  console.log('📝 Registering user with profile:', userData);
  
  try {
    const response = await this.makeRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });

    if (response.token) {
      this.setToken(response.token);
      localStorage.setItem('currentUser', JSON.stringify(response.user));
    }

    console.log('✅ Registration with profile successful:', response);
    return response;
  } catch (error) {
    console.error('❌ Failed to register with profile:', error);
    throw error;
  }
}

// =========================== PLAYER DASHBOARD WITH CHILD SUPPORT ===========================

async function getPlayerDashboardDataEnhanced() {
  try {
    return await this.makeRequest('/dashboard/player-enhanced');
  } catch (error) {
    console.warn('❌ Failed to fetch enhanced player dashboard data:', error);
    
    try {
      console.log('🔄 Attempting to load enhanced dashboard data from individual endpoints...');
      
      const [events, clubs, teams, payments, bookings, children, profile] = await Promise.allSettled([
        this.getEvents(),
        this.getClubs(),
        this.getTeams(),
        this.getPayments(),
        this.getUserBookings(),
        this.getChildProfiles().catch(() => ({ children: [] })),
        this.getUserProfile().catch(() => ({ profile: null }))
      ]);
      
      return {
        player: profile.status === 'fulfilled' ? profile.value.profile : null,
        children: children.status === 'fulfilled' ? children.value.children : [],
        clubs: clubs.status === 'fulfilled' ? clubs.value : [],
        teams: teams.status === 'fulfilled' ? teams.value : [],
        events: events.status === 'fulfilled' ? events.value : [],
        payments: payments.status === 'fulfilled' ? payments.value : [],
        bookings: bookings.status === 'fulfilled' ? bookings.value : [],
        applications: []
      };
    } catch (fallbackError) {
      console.error('❌ Enhanced dashboard fallback loading failed:', fallbackError);
      return this.getPlayerDashboardFallback();
    }
  }
}

// =========================== EVENT BOOKING WITH CHILD SUPPORT ===========================

async function bookEventForChild(eventId, childId, bookingData = {}) {
  console.log('📅 Booking event for child:', { eventId, childId, bookingData });
  
  try {
    const response = await this.makeRequest(`/events/${eventId}/book-child`, {
      method: 'POST',
      body: JSON.stringify({
        childId,
        ...bookingData
      })
    });
    
    console.log('✅ Event booked for child:', response);
    return response;
  } catch (error) {
    console.error('❌ Failed to book event for child:', error);
    throw error;
  }
}

// =========================== PAYMENT METHODS WITH CHILD SUPPORT ===========================

async function getPaymentsForChild(childId, filters = {}) {
  try {
    const queryParams = new URLSearchParams({
      childId,
      ...filters
    }).toString();
    const endpoint = `/payments/child?${queryParams}`;
    return await this.makeRequest(endpoint);
  } catch (error) {
    console.warn('❌ Failed to fetch child payments:', error);
    return [];
  }
}

async function createPaymentForChild(paymentData) {
  console.log('💳 Creating payment for child:', paymentData);
  
  try {
    const response = await this.makeRequest('/payments/child', {
      method: 'POST',
      body: JSON.stringify(paymentData)
    });
    
    console.log('✅ Child payment created:', response);
    return response;
  } catch (error) {
    console.error('❌ Failed to create child payment:', error);
    throw error;
  }
}

// =========================== CLUB APPLICATION WITH CHILD SUPPORT ===========================

async function applyToClubForChild(clubId, childId, applicationData) {
  console.log('📝 Applying to club for child:', { clubId, childId, applicationData });
  
  try {
    const response = await this.makeRequest(`/clubs/${clubId}/apply-child`, {
      method: 'POST',
      body: JSON.stringify({
        childId,
        ...applicationData
      })
    });
    
    console.log('✅ Club application submitted for child:', response);
    return response;
  } catch (error) {
    console.error('❌ Failed to apply to club for child:', error);
    throw error;
  }
}

// =========================== TEAM ASSIGNMENT WITH CHILD SUPPORT ===========================

async function assignChildToTeam(teamId, childId, assignmentData) {
  console.log('⚽ Assigning child to team:', { teamId, childId, assignmentData });
  
  try {
    const response = await this.makeRequest(`/teams/${teamId}/assign-child`, {
      method: 'POST',
      body: JSON.stringify({
        childId,
        ...assignmentData
      })
    });
    
    console.log('✅ Child assigned to team:', response);
    return response;
  } catch (error) {
    console.error('❌ Failed to assign child to team:', error);
    throw error;
  }
}

// =========================== AVAILABILITY SUBMISSION ===========================

async function submitAvailabilityForChild(eventId, childId, availabilityData) {
  console.log('📅 Submitting availability for child:', { eventId, childId, availabilityData });
  
  try {
    const response = await this.makeRequest(`/events/${eventId}/availability-child`, {
      method: 'POST',
      body: JSON.stringify({
        childId,
        ...availabilityData
      })
    });
    
    console.log('✅ Child availability submitted:', response);
    return response;
  } catch (error) {
    console.error('❌ Failed to submit child availability:', error);
    throw error;
  }
}

// =========================== NOTIFICATION METHODS ===========================

async function getNotifications(filters = {}) {
  try {
    const queryParams = new URLSearchParams(filters).toString();
    const endpoint = queryParams ? `/notifications?${queryParams}` : '/notifications';
    return await this.makeRequest(endpoint);
  } catch (error) {
    console.warn('❌ Failed to fetch notifications:', error);
    return [];
  }
}

async function markNotificationAsRead(notificationId) {
  try {
    return await this.makeRequest(`/notifications/${notificationId}/read`, {
      method: 'POST'
    });
  } catch (error) {
    console.error('❌ Failed to mark notification as read:', error);
    throw error;
  }
}

async function markAllNotificationsAsRead() {
  try {
    return await this.makeRequest('/notifications/mark-all-read', {
      method: 'POST'
    });
  } catch (error) {
    console.error('❌ Failed to mark all notifications as read:', error);
    throw error;
  }
}

// =========================== DOCUMENT METHODS ===========================

async function getDocuments(clubId = null) {
  try {
    const endpoint = clubId ? `/documents?clubId=${clubId}` : '/documents';
    return await this.makeRequest(endpoint);
  } catch (error) {
    console.warn('❌ Failed to fetch documents:', error);
    return [];
  }
}

async function downloadDocument(documentId) {
  try {
    const response = await fetch(`${this.baseURL}/documents/${documentId}/download`, {
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to download document');
    }
    
    return response.blob();
  } catch (error) {
    console.error('❌ Failed to download document:', error);
    throw error;
  }
}

// =========================== ENHANCED ADMIN DASHBOARD ===========================

async function getAdminDashboardDataEnhanced() {
  try {
    return await this.makeRequest('/dashboard/admin-enhanced');
  } catch (error) {
    console.warn('❌ Failed to fetch enhanced admin dashboard data:', error);
    
    try {
      console.log('🔄 Attempting to load enhanced admin dashboard data...');
      
      const [clubs, players, staff, events, teams, payments, children, organizations] = await Promise.allSettled([
        this.getClubs(),
        this.getPlayers(),
        this.getStaff(),
        this.getEvents(),
        this.getTeams(),
        this.getPayments(),
        this.getChildProfiles().catch(() => []),
        this.getUserOrganizations().catch(() => ({ organizations: [] }))
      ]);
      
      return {
        clubs: clubs.status === 'fulfilled' ? clubs.value : [],
        players: players.status === 'fulfilled' ? players.value : [],
        staff: staff.status === 'fulfilled' ? staff.value : [],
        events: events.status === 'fulfilled' ? events.value : [],
        teams: teams.status === 'fulfilled' ? teams.value : [],
        payments: payments.status === 'fulfilled' ? payments.value : [],
        children: children.status === 'fulfilled' ? children.value : [],
        organizations: organizations.status === 'fulfilled' ? organizations.value.organizations : [],
        statistics: {
          total_clubs: clubs.status === 'fulfilled' ? clubs.value.length : 0,
          total_players: players.status === 'fulfilled' ? players.value.length : 0,
          total_staff: staff.status === 'fulfilled' ? staff.value.length : 0,
          total_events: events.status === 'fulfilled' ? events.value.length : 0,
          total_teams: teams.status === 'fulfilled' ? teams.value.length : 0,
          total_children: children.status === 'fulfilled' ? children.value.length : 0,
          monthly_revenue: 0
        }
      };
    } catch (fallbackError) {
      console.error('❌ Enhanced admin dashboard fallback failed:', fallbackError);
      return this.getAdminDashboardFallback();
    }
  }
}

// =========================== UTILITY METHODS ===========================

function calculateAge(dateOfBirth) {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

function formatCurrency(amount, currency = 'GBP') {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: currency
  }).format(amount);
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', { 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric' 
  });
}

// =========================== ENHANCED ERROR HANDLING ===========================

function handleEnhancedError(error, context = '') {
  console.error(`❌ Enhanced API Error ${context}:`, error);
  
  // Enhanced error messages based on context
  const enhancedMessages = {
    'child-profile': 'Unable to manage child profile. Please check your parent account permissions.',
    'organization-switch': 'Unable to switch organization. Please verify your organization access.',
    'password-reset': 'Password reset failed. Please try again or contact support.',
    'profile-update': 'Profile update failed. Please check your information and try again.',
    'payment-child': 'Unable to process payment for child. Please verify the payment details.',
    'team-assignment': 'Team assignment failed. Please check team availability and permissions.'
  };
  
  const message = enhancedMessages[context] || error.message || 'An unexpected error occurred';
  
  return {
    error: true,
    message,
    context,
    originalError: error.message
  };
}

console.log('✅ Complete Production API Service loaded with proper environment detection!');