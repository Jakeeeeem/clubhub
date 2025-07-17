class ApiService {
  constructor() {
    this.baseURL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
      ? 'http://localhost:3000/api'
      : 'https://api.clubhubsports.net/api';
    
    this.token = localStorage.getItem('authToken');
    this.retryCount = {};
    this.maxRetries = 2;
    
    console.log('🌐 Enhanced API Service initialized with baseURL:', this.baseURL);
  }

  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const requestId = `${options.method || 'GET'}_${endpoint}`;
    
    // Initialize retry count for this request
    if (!this.retryCount[requestId]) {
      this.retryCount[requestId] = 0;
    }
    
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const config = {
      ...options,
      headers
    };

    try {
      console.log(`🌐 API Request: ${options.method || 'GET'} ${url}`);
      const response = await fetch(url, config);
      
      const contentType = response.headers.get('content-type');
      let data;
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        console.error(`❌ API Error ${response.status}:`, data);
        
        if (response.status === 401) {
          this.handleAuthError();
          throw new Error('Authentication required');
        }
        
        if (response.status === 404) {
          throw new Error('Resource not found');
        }
        
        if (response.status === 500) {
          console.error('❌ Server error details:', data);
          
          // For 500 errors, provide specific fallback strategies
          if (endpoint.includes('/clubs')) {
            console.warn('⚠️ Clubs service unavailable, using fallback');
            return this.getClubsFallback();
          } else if (endpoint.includes('/dashboard/player')) {
            console.warn('⚠️ Player dashboard service unavailable, using fallback');
            return this.getPlayerDashboardFallback();
          } else if (endpoint.includes('/dashboard/admin')) {
            console.warn('⚠️ Admin dashboard service unavailable, using fallback');
            return this.getAdminDashboardFallback();
          }
          
          throw new Error('Service temporarily unavailable - using cached data');
        }
        
        throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      // Reset retry count on success
      this.retryCount[requestId] = 0;
      
      console.log(`✅ API Response: ${response.status}`);
      return data;
    } catch (error) {
      console.error(`❌ API Error: ${endpoint}`, error);
      
      // Handle network errors with retry logic
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

  // Fallback methods for when services are unavailable
  getClubsFallback() {
    console.log('📚 Using clubs fallback data');
    // Return mock/cached data or empty array
    return [];
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

  // Authentication methods
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

  // Enhanced club methods with fallbacks
  async getClubs() {
    try {
      return await this.makeRequest('/clubs');
    } catch (error) {
      console.warn('❌ Failed to fetch clubs:', error);
      
      // Try to get from localStorage cache
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
    
    // Cache the created club
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

  // Enhanced events methods
  async getEvents(clubId = null) {
    try {
      const endpoint = clubId ? `/events?clubId=${clubId}&upcoming=true` : '/events?upcoming=true';
      const events = await this.makeRequest(endpoint);
      
      // Cache events
      localStorage.setItem('cachedEvents', JSON.stringify(events));
      
      return events;
    } catch (error) {
      console.warn('❌ Failed to fetch events:', error);
      
      // Try cached events
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

  async cancelEventBooking(bookingId) {
    return await this.makeRequest(`/events/bookings/${bookingId}/cancel`, {
      method: 'POST'
    });
  }

  async getEventBookings(eventId) {
    return await this.makeRequest(`/events/${eventId}/bookings`);
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

  // Enhanced players methods
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

  // Enhanced teams methods
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

  async getPlayerTeams(userId) {
    try {
      return await this.makeRequest(`/teams/player/${userId}`);
    } catch (error) {
      console.warn('❌ Failed to fetch player teams:', error);
      return [];
    }
  }

  // Enhanced staff methods
  async getStaff(clubId = null) {
    try {
      const endpoint = clubId ? `/staff?clubId=${clubId}` : '/staff';
      return await this.makeRequest(endpoint);
    } catch (error) {
      console.warn('❌ Failed to fetch staff:', error);
      return [];
    }
  }

  async getStaffById(id) {
    return await this.makeRequest(`/staff/${id}`);
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

  // Enhanced dashboard methods with robust fallbacks
  async getAdminDashboardData() {
    try {
      return await this.makeRequest('/dashboard/admin');
    } catch (error) {
      console.warn('❌ Failed to fetch admin dashboard data:', error);
      
      // Try to assemble data from individual endpoints
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
      
      // Try to assemble data from individual endpoints
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
          player: null, // Will be populated by the dashboard
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

  // Enhanced payment methods
  async createPaymentIntent(paymentData) {
    return await this.makeRequest('/payments/create-intent', {
      method: 'POST',
      body: JSON.stringify(paymentData)
    });
  }

  async confirmPayment(paymentIntentId, paymentId = null) {
    return await this.makeRequest('/payments/confirm-payment', {
      method: 'POST',
      body: JSON.stringify({
        paymentIntentId,
        paymentId
      })
    });
  }

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

  async markPaymentAsPaid(paymentId, notes = '') {
    return await this.makeRequest(`/payments/${paymentId}/mark-paid`, {
      method: 'PATCH',
      body: JSON.stringify({ notes })
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

  async getPublicPayment(paymentId, token) {
    return await this.makeRequest(`/payments/public/${paymentId}?token=${token}`);
  }

  async bookEventWithPayment(eventId, paymentIntentId, playerData = null) {
    return await this.makeRequest('/payments/book-event', {
      method: 'POST',
      body: JSON.stringify({
        eventId,
        paymentIntentId,
        playerData
      })
    });
  }

  // Enhanced invite methods
  async generateClubInvite(inviteData) {
    return await this.makeRequest('/invites/generate', {
      method: 'POST',
      body: JSON.stringify(inviteData)
    });
  }

  async getInviteDetails(token) {
    return await this.makeRequest(`/invites/details/${token}`);
  }

  async acceptInvite(token, acceptData) {
    return await this.makeRequest(`/invites/accept/${token}`, {
      method: 'POST',
      body: JSON.stringify(acceptData)
    });
  }

  async declineInvite(token, reason = null) {
    return await this.makeRequest(`/invites/decline/${token}`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    });
  }

  async getSentInvites(status = null) {
    const endpoint = status ? `/invites/sent?status=${status}` : '/invites/sent';
    return await this.makeRequest(endpoint);
  }

  async getReceivedInvites() {
    return await this.makeRequest('/invites/received');
  }

  async resendInvite(inviteId) {
    return await this.makeRequest(`/invites/resend/${inviteId}`, {
      method: 'POST'
    });
  }

  async cancelInvite(inviteId) {
    return await this.makeRequest(`/invites/${inviteId}`, {
      method: 'DELETE'
    });
  }

  // Club applications
  async applyToClub(clubId, applicationData) {
    return await this.makeRequest(`/clubs/${clubId}/apply`, {
      method: 'POST',
      body: JSON.stringify(applicationData)
    });
  }

  async getClubApplications(clubId) {
    return await this.makeRequest(`/clubs/${clubId}/applications`);
  }

  async reviewApplication(applicationId, decision, notes = null) {
    return await this.makeRequest(`/clubs/applications/${applicationId}/review`, {
      method: 'POST',
      body: JSON.stringify({ decision, notes })
    });
  }

  // Availability submission
  async submitAvailability(eventId, availabilityData) {
    return await this.makeRequest(`/events/${eventId}/availability`, {
      method: 'POST',
      body: JSON.stringify(availabilityData)
    });
  }

  async getEventAvailability(eventId) {
    return await this.makeRequest(`/events/${eventId}/availability`);
  }

  // Notifications
  async getNotifications() {
    try {
      return await this.makeRequest('/notifications');
    } catch (error) {
      console.warn('❌ Failed to fetch notifications:', error);
      return [];
    }
  }

  async markNotificationAsRead(notificationId) {
    return await this.makeRequest(`/notifications/${notificationId}/read`, {
      method: 'PATCH'
    });
  }

  // Statistics
  async getClubStats(clubId) {
    return await this.makeRequest(`/clubs/${clubId}/stats`);
  }

  async getPlayerStats(playerId) {
    return await this.makeRequest(`/players/${playerId}/stats`);
  }

  async getTeamStats(teamId) {
    return await this.makeRequest(`/teams/${teamId}/stats`);
  }

  // Utility methods
  formatCurrency(amount) {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  }

  // Caching methods
  cacheClubs(clubs) {
    localStorage.setItem('cachedClubs', JSON.stringify(clubs));
  }

  cacheEvents(events) {
    localStorage.setItem('cachedEvents', JSON.stringify(events));
  }

  // Health check
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

  // Enhanced error recovery
  async recoverFromError(endpoint, originalOptions) {
    console.log(`🔄 Attempting recovery for ${endpoint}`);
    
    // Wait a bit before retry
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    try {
      return await this.makeRequest(endpoint, originalOptions);
    } catch (retryError) {
      console.error('❌ Recovery attempt failed:', retryError);
      throw retryError;
    }
  }

  // Batch operations for efficiency
  async batchRequest(requests) {
    const results = await Promise.allSettled(
      requests.map(({ endpoint, options }) => this.makeRequest(endpoint, options))
    );
    
    return results.map((result, index) => ({
      ...requests[index],
      success: result.status === 'fulfilled',
      data: result.status === 'fulfilled' ? result.value : null,
      error: result.status === 'rejected' ? result.reason : null
    }));
  }
}

// Create and export a singleton instance
const apiService = new ApiService();

// Test connection in development only
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  apiService.testConnection().then(connected => {
    if (connected) {
      console.log('🌐 API Service ready');
    } else {
      console.warn('⚠️ API Service connection issues - some features may not work');
    }
  });
}

// Export for use in other files
window.apiService = apiService;

// Enhanced error handling and logging
window.addEventListener('error', function(event) {
  if (event.error && event.error.message && event.error.message.includes('apiService')) {
    console.error('🚨 API Service Error:', event.error);
  }
});

// Periodic health check in production
if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
  setInterval(() => {
    apiService.healthCheck().catch(() => {
      console.warn('⚠️ Periodic health check failed');
    });
  }, 5 * 60 * 1000); // Every 5 minutes
}

console.log('✅ Enhanced API Service loaded with robust error handling and fallbacks!');