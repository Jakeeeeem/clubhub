class ApiService {
  constructor() {
    this.baseURL = 'http://localhost:3000/api';
    this.token = localStorage.getItem('authToken');
    console.log('🌐 API Service initialized with baseURL:', this.baseURL);
  }

  // Helper method to make API calls
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
        // Handle authentication errors
        if (response.status === 401) {
          this.handleAuthError();
          throw new Error(data.message || 'Authentication failed');
        }
        
        throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      console.log(`✅ API Response: ${response.status}`);
      return data;
    } catch (error) {
      console.error(`❌ API Error: ${endpoint}`, error);
      throw error;
    }
  }

  // Handle authentication errors
  handleAuthError() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    this.token = null;
    
    // Redirect to login if not already there
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

  // Club management methods
  async getClubs() {
    return await this.makeRequest('/clubs');
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

  // Player management methods
  async getPlayers(clubId = null) {
    const endpoint = clubId ? `/players?clubId=${clubId}` : '/players';
    return await this.makeRequest(endpoint);
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

  // Staff management methods
  async getStaff(clubId = null) {
    const endpoint = clubId ? `/staff?clubId=${clubId}` : '/staff';
    return await this.makeRequest(endpoint);
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

  // Team management methods
  async getTeams(clubId = null) {
    const endpoint = clubId ? `/teams?clubId=${clubId}` : '/teams';
    return await this.makeRequest(endpoint);
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

  // Event management methods
  async getEvents(clubId = null) {
    const endpoint = clubId ? `/events?clubId=${clubId}` : '/events';
    return await this.makeRequest(endpoint);
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

  // Dashboard data methods
  async getAdminDashboardData() {
    return await this.makeRequest('/dashboard/admin');
  }

  async getPlayerDashboardData() {
    return await this.makeRequest('/dashboard/player');
  }

  async getCoachDashboardData() {
    return await this.makeRequest('/dashboard/coach');
  }

  // Notification methods
  async getNotifications() {
    return await this.makeRequest('/notifications');
  }

  async markNotificationRead(id) {
    return await this.makeRequest(`/notifications/${id}/read`, {
      method: 'PUT'
    });
  }

  async markAllNotificationsRead() {
    return await this.makeRequest('/notifications/read-all', {
      method: 'PUT'
    });
  }

  // Payment methods
  async createPaymentIntent(amount, description, metadata = {}) {
    return await this.makeRequest('/payments/create-intent', {
      method: 'POST',
      body: JSON.stringify({ amount, description, metadata })
    });
  }

  async confirmPayment(paymentIntentId, paymentMethodId) {
    return await this.makeRequest('/payments/confirm', {
      method: 'POST',
      body: JSON.stringify({ paymentIntentId, paymentMethodId })
    });
  }

  async getPaymentHistory() {
    return await this.makeRequest('/payments/history');
  }

  async processPayment(paymentId) {
    return await this.makeRequest(`/payments/${paymentId}/pay`, {
      method: 'PATCH'
    });
  }

  // Application methods
  async submitClubApplication(applicationData) {
    return await this.makeRequest('/clubs/apply', {
      method: 'POST',
      body: JSON.stringify(applicationData)
    });
  }

  async getApplications() {
    return await this.makeRequest('/applications');
  }

  async updateApplicationStatus(id, status) {
    return await this.makeRequest(`/applications/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
  }

  // Document methods
  async uploadDocument(formData) {
    // Note: FormData doesn't need JSON.stringify and different headers
    return await this.makeRequest('/documents/upload', {
      method: 'POST',
      body: formData,
      headers: {} // Let browser set multipart headers automatically
    });
  }

  async getDocuments(clubId = null) {
    const endpoint = clubId ? `/documents?clubId=${clubId}` : '/documents';
    return await this.makeRequest(endpoint);
  }

  async deleteDocument(id) {
    return await this.makeRequest(`/documents/${id}`, {
      method: 'DELETE'
    });
  }

  // Booking methods
  async bookEvent(eventId, bookingData = {}) {
    return await this.makeRequest(`/events/${eventId}/book`, {
      method: 'POST',
      body: JSON.stringify(bookingData)
    });
  }

  async cancelBooking(bookingId) {
    return await this.makeRequest(`/events/bookings/${bookingId}/cancel`, {
      method: 'POST'
    });
  }

  async getMyBookings() {
    return await this.makeRequest('/events/bookings/my-bookings');
  }

  // Availability methods
  async submitAvailability(eventId, availability, notes = '') {
    return await this.makeRequest(`/events/${eventId}/availability`, {
      method: 'POST',
      body: JSON.stringify({ availability, notes })
    });
  }

  async getEventAvailability(eventId) {
    return await this.makeRequest(`/events/${eventId}/availability`);
  }

  // Health check
  async healthCheck() {
    return await this.makeRequest('/health');
  }

  // Test connection
  async testConnection() {
    try {
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

console.log('✅ Complete API Service initialized and ready');