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
    
    // Local development
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:3000/api';
    }
    
    // Production
    if (hostname.includes('clubhubsports.net')) {
      return 'https://api.clubhubsports.net/api';
    }
    
    // Fallback
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
        
        return {
          player: null,
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

console.log('✅ Enhanced API Service loaded with robust error handling and fallbacks!');