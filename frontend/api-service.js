class ApiService {
  constructor() {
    this.baseURL = 'https://api.clubhubsports.net/api';
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
          throw new Error(data.message || 'Internal server error. Please check the backend logs.');
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
  // PAYMENT METHODS - REAL STRIPE INTEGRATION
  // =====================================================

  async createPaymentIntent(amount, description, metadata = {}) {
    return await this.makeRequest('/payments/create-intent', {
      method: 'POST',
      body: JSON.stringify({
        amount: Math.round(amount * 100), // Convert to cents
        description,
        metadata
      })
    });
  }

  async confirmPayment(paymentIntentId, paymentMethodId = null) {
    return await this.makeRequest('/payments/confirm', {
      method: 'POST',
      body: JSON.stringify({
        paymentIntentId,
        paymentMethodId
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

  async createEvent(eventData) {
    return await this.makeRequest('/events', {
      method: 'POST',
      body: JSON.stringify(eventData)
    });
  }

  async bookEvent(eventId, bookingData = {}) {
    return await this.makeRequest(`/events/${eventId}/book`, {
      method: 'POST',
      body: JSON.stringify(bookingData)
    });
  }

  async createEventPayment(eventId, playerData) {
    return await this.makeRequest(`/events/${eventId}/payment`, {
      method: 'POST',
      body: JSON.stringify(playerData)
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

  async createTeam(teamData) {
    return await this.makeRequest('/teams', {
      method: 'POST',
      body: JSON.stringify(teamData)
    });
  }

  async addPlayerToTeam(teamId, assignmentData) {
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

  async createStaff(staffData) {
    return await this.makeRequest('/staff', {
      method: 'POST',
      body: JSON.stringify(staffData)
    });
  }

  async deleteStaff(id) {
    return await this.makeRequest(`/staff/${id}`, {
      method: 'DELETE'
    });
  }

  async deleteTeam(id) {
    return await this.makeRequest(`/teams/${id}`, {
      method: 'DELETE'
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
}

// Create and export a singleton instance
const apiService = new ApiService();

// Test connection immediately
apiService.testConnection();

// Export for use in other files
window.apiService = apiService;

console.log('✅ Fixed API Service loaded with real payment processing!');