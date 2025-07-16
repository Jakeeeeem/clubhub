class ApiService {
  constructor() {
    // 🔥 UPDATED: Use your production API URL
    this.baseURL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
      ? 'http://localhost:3000/api'  // Development
      : 'https://api.clubhubsports.net/api';  // Production
    
    this.token = localStorage.getItem('authToken');
    console.log('🌐 API Service initialized with baseURL:', this.baseURL);
  }

  // Helper method to make API calls with enhanced error handling
  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    // Add auth token if available
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
      
      // Handle different response types
      const contentType = response.headers.get('content-type');
      let data;
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        console.error(`❌ API Error ${response.status}:`, data);
        
        // Handle authentication errors
        if (response.status === 401) {
          this.handleAuthError();
          throw new Error(data.message || 'Authentication failed');
        }
        
        if (response.status === 404) {
          throw new Error(data.message || 'Resource not found');
        }
        
        if (response.status === 500) {
          console.error('❌ Server error details:', data);
          throw new Error(data.message || 'Internal server error. Please try again later.');
        }
        
        throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      console.log(`✅ API Response: ${response.status}`);
      return data;
    } catch (error) {
      console.error(`❌ API Error: ${endpoint}`, error);
      
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Cannot connect to server. Please check your internet connection.');
      }
      
      throw error;
    }
  }

  // Handle authentication errors
  handleAuthError() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    this.token = null;
    
    if (!window.location.pathname.includes('index.html') && window.location.pathname !== '/') {
      window.location.href = 'index.html';
    }
  }

  // Set auth token
  setToken(token) {
    this.token = token;
    localStorage.setItem('authToken', token);
  }

  // Clear auth token
  clearToken() {
    this.token = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
  }

  // =====================================================
  // AUTHENTICATION METHODS
  // =====================================================

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

  // =====================================================
  // 🔥 NEW: CLUB INVITE METHODS
  // =====================================================

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

  // =====================================================
  // CLUB MANAGEMENT METHODS
  // =====================================================

  async getClubs() {
    try {
      return await this.makeRequest('/clubs');
    } catch (error) {
      console.error('❌ Failed to fetch clubs:', error);
      return [];
    }
  }

  async getClubById(id) {
    return await this.makeRequest(`/clubs/${id}`);
  }

  async createClub(clubData) {
    return await this.makeRequest('/clubs', {
      method: 'POST',
      body: JSON.stringify(clubData)
    });
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

  // =====================================================
  // PLAYER MANAGEMENT METHODS
  // =====================================================

  async getPlayers(clubId = null) {
    try {
      const endpoint = clubId ? `/players?clubId=${clubId}` : '/players';
      return await this.makeRequest(endpoint);
    } catch (error) {
      console.error('❌ Failed to fetch players:', error);
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

  // =====================================================
  // 🔥 FIXED: PAYMENT METHODS WITH STRIPE INTEGRATION
  // =====================================================

  async createPaymentIntent(amount, description, metadata = {}) {
    return await this.makeRequest('/payments/create-intent', {
      method: 'POST',
      body: JSON.stringify({
        amount: amount,
        description,
        metadata
      })
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
      console.error('❌ Failed to fetch payments:', error);
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

  // 🔥 NEW: Public payment methods for payment page
  async getPublicPayment(paymentId, token) {
    return await this.makeRequest(`/payments/public/${paymentId}?token=${token}`);
  }

  // =====================================================
  // EVENT MANAGEMENT METHODS
  // =====================================================

  async getEvents(clubId = null) {
    try {
      const endpoint = clubId ? `/events?clubId=${clubId}` : '/events';
      return await this.makeRequest(endpoint);
    } catch (error) {
      console.error('❌ Failed to fetch events:', error);
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

  // 🔥 FIXED: Event booking with payment support
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
    
    return await this.makeRequest(endpoint);
  }

  // 🔥 NEW: Book event with payment
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

  // =====================================================
  // TEAM MANAGEMENT METHODS
  // =====================================================

  async getTeams(clubId = null) {
    try {
      const endpoint = clubId ? `/teams?clubId=${clubId}` : '/teams';
      return await this.makeRequest(endpoint);
    } catch (error) {
      console.error('❌ Failed to fetch teams:', error);
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
      console.error('❌ Failed to fetch player teams:', error);
      return [];
    }
  }

  // =====================================================
  // STAFF MANAGEMENT METHODS
  // =====================================================

  async getStaff(clubId = null) {
    try {
      const endpoint = clubId ? `/staff?clubId=${clubId}` : '/staff';
      return await this.makeRequest(endpoint);
    } catch (error) {
      console.error('❌ Failed to fetch staff:', error);
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

  // =====================================================
  // DASHBOARD DATA METHODS
  // =====================================================

  async getAdminDashboardData() {
    try {
      return await this.makeRequest('/dashboard/admin');
    } catch (error) {
      console.error('❌ Failed to fetch admin dashboard data:', error);
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
  }

  async getPlayerDashboardData() {
    try {
      return await this.makeRequest('/dashboard/player');
    } catch (error) {
      console.error('❌ Failed to fetch player dashboard data:', error);
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
  }

  // =====================================================
  // 🔥 NEW: SUBSCRIPTION METHODS FOR CLUBS
  // =====================================================

  async createSubscription(priceId, customerId = null) {
    return await this.makeRequest('/subscriptions/create', {
      method: 'POST',
      body: JSON.stringify({
        priceId,
        customerId
      })
    });
  }

  async getSubscriptions() {
    return await this.makeRequest('/subscriptions');
  }

  async cancelSubscription(subscriptionId) {
    return await this.makeRequest(`/subscriptions/${subscriptionId}/cancel`, {
      method: 'POST'
    });
  }

  async updateSubscription(subscriptionId, updates) {
    return await this.makeRequest(`/subscriptions/${subscriptionId}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

  // =====================================================
  // AVAILABILITY AND TEAM COORDINATION
  // =====================================================

  async submitAvailability(eventId, availabilityData) {
    return await this.makeRequest(`/events/${eventId}/availability`, {
      method: 'POST',
      body: JSON.stringify(availabilityData)
    });
  }

  async getEventAvailability(eventId) {
    return await this.makeRequest(`/events/${eventId}/availability`);
  }

  // =====================================================
  // CLUB APPLICATIONS (for players applying to clubs)
  // =====================================================

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

  // =====================================================
  // 🔥 FIXED: PRODUCTION-READY PAYMENT PROCESSING
  // =====================================================

  // Create a payment intent for any type of payment
  async createPaymentForAmount(amount, description, metadata = {}) {
    if (!amount || amount <= 0) {
      throw new Error('Invalid payment amount');
    }

    try {
      console.log(`💳 Creating payment intent for £${amount}`);
      
      const response = await this.makeRequest('/payments/create-intent', {
        method: 'POST',
        body: JSON.stringify({
          amount: amount,
          description: description || `ClubHub Payment of £${amount}`,
          metadata: {
            source: 'clubhub_web',
            environment: window.location.hostname.includes('localhost') ? 'development' : 'production',
            ...metadata
          }
        })
      });

      console.log('✅ Payment intent created:', response.paymentIntentId);
      return response;
    } catch (error) {
      console.error('❌ Failed to create payment intent:', error);
      throw error;
    }
  }

  // Process membership payment
  async processMembershipPayment(playerId, amount, description) {
    return await this.createPaymentForAmount(amount, description, {
      type: 'membership',
      playerId: playerId
    });
  }

  // Process event booking payment
  async processEventPayment(eventId, amount, description) {
    return await this.createPaymentForAmount(amount, description, {
      type: 'event_booking',
      eventId: eventId
    });
  }

  // =====================================================
  // UTILITY METHODS
  // =====================================================

  formatCurrency(amount) {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  }

  // =====================================================
  // HEALTH CHECK
  // =====================================================

  async healthCheck() {
    return await this.makeRequest('/health');
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

  // =====================================================
  // 🔥 NEW: HELPER METHODS FOR FINDING USERS
  // =====================================================

  async findUserByEmail(email) {
    try {
      return await this.makeRequest(`/users/find-by-email?email=${encodeURIComponent(email)}`);
    } catch (error) {
      // This is expected to fail if user doesn't exist
      return null;
    }
  }

  // =====================================================
  // 🔥 NEW: NOTIFICATIONS AND MESSAGING
  // =====================================================

  async sendClubInviteEmail(inviteId) {
    return await this.makeRequest(`/invites/${inviteId}/send-email`, {
      method: 'POST'
    });
  }

  async getNotifications() {
    try {
      return await this.makeRequest('/notifications');
    } catch (error) {
      console.error('❌ Failed to fetch notifications:', error);
      return [];
    }
  }

  async markNotificationAsRead(notificationId) {
    return await this.makeRequest(`/notifications/${notificationId}/read`, {
      method: 'PATCH'
    });
  }

  // =====================================================
  // 🔥 NEW: CLUB STATISTICS AND ANALYTICS
  // =====================================================

  async getClubStats(clubId) {
    return await this.makeRequest(`/clubs/${clubId}/stats`);
  }

  async getPlayerStats(playerId) {
    return await this.makeRequest(`/players/${playerId}/stats`);
  }

  async getTeamStats(teamId) {
    return await this.makeRequest(`/teams/${teamId}/stats`);
  }

  // =====================================================
  // 🔥 NEW: MONTHLY FEE GENERATION
  // =====================================================

  async generateMonthlyFees(clubId, month = null, year = null) {
    const body = {};
    if (month) body.month = month;
    if (year) body.year = year;

    return await this.makeRequest(`/payments/generate-monthly-fees/${clubId}`, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }
}

// Create and export a singleton instance
const apiService = new ApiService();

// Test connection immediately (only in development)
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  apiService.testConnection();
}

// Export for use in other files
window.apiService = apiService;

// 🔥 PRODUCTION READY: Enhanced error handling and logging
window.addEventListener('error', function(event) {
  if (event.error && event.error.message && event.error.message.includes('apiService')) {
    console.error('🚨 API Service Error:', event.error);
    // Could send to error tracking service in production
  }
});

console.log('✅ Enhanced API Service loaded with full payment processing and invite system!');