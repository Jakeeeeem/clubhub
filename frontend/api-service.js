class ApiService {
  constructor() {
    this.baseURL = 'http://api.clubhubsports.net/api';
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
        throw new Error('Cannot connect to server. Please check if the backend is running on http://localhost:3000');
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

  async getPlayerStats(id) {
    return await this.makeRequest(`/players/${id}/stats`);
  }

  async updatePlayerPaymentStatus(id, paymentStatus) {
    return await this.makeRequest(`/players/${id}/payment-status`, {
      method: 'PATCH',
      body: JSON.stringify({ paymentStatus })
    });
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

  // Get teams for a specific player (by user ID)
  async getPlayerTeams(userId) {
    try {
      return await this.makeRequest(`/teams/player/${userId}`);
    } catch (error) {
      console.error('❌ Failed to fetch player teams:', error);
      return [];
    }
  }

  // Add player to team
  async addPlayerToTeam(teamId, assignmentData) {
    return await this.makeRequest(`/teams/${teamId}/players`, {
      method: 'POST',
      body: JSON.stringify(assignmentData)
    });
  }

  // Remove player from team
  async removePlayerFromTeam(teamId, playerId) {
    return await this.makeRequest(`/teams/${teamId}/players/${playerId}`, {
      method: 'DELETE'
    });
  }

  // Get team statistics
  async getTeamStats(id) {
    return await this.makeRequest(`/teams/${id}/stats`);
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

  // =====================================================
  // 🔥 COMPLETE PAYMENT METHODS
  // =====================================================

  // Get payments with filters
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

  // Get specific payment
  async getPaymentById(id) {
    return await this.makeRequest(`/payments/${id}`);
  }

  // Create payment
  async createPayment(paymentData) {
    return await this.makeRequest('/payments', {
      method: 'POST',
      body: JSON.stringify(paymentData)
    });
  }

  // Update payment
  async updatePayment(id, paymentData) {
    return await this.makeRequest(`/payments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(paymentData)
    });
  }

  // Delete payment
  async deletePayment(id) {
    return await this.makeRequest(`/payments/${id}`, {
      method: 'DELETE'
    });
  }

  // 🔥 STRIPE PAYMENT PROCESSING
  async createStripePaymentIntent(amount, paymentId = null, metadata = {}) {
    return await this.makeRequest('/payments/create-intent', {
      method: 'POST',
      body: JSON.stringify({
        amount,
        paymentId,
        metadata
      })
    });
  }

  async confirmStripePayment(paymentIntentId, paymentId = null) {
    return await this.makeRequest('/payments/confirm-payment', {
      method: 'POST',
      body: JSON.stringify({
        paymentIntentId,
        paymentId
      })
    });
  }

  // 🔥 ADMIN PAYMENT MANAGEMENT
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

  async generateMonthlyFees(clubId, month = null, year = null) {
    return await this.makeRequest(`/payments/generate-monthly-fees/${clubId}`, {
      method: 'POST',
      body: JSON.stringify({ month, year })
    });
  }

  // 🔥 PUBLIC PAYMENT ACCESS (for payment page)
  async getPublicPaymentDetails(paymentId, token) {
    // Note: This doesn't need auth token for public access
    const tempToken = this.token;
    this.token = null; // Remove auth for public endpoint
    
    try {
      const response = await fetch(`${this.baseURL}/payments/public/${paymentId}?token=${token}`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Payment not found');
      }
      
      return await response.json();
    } finally {
      this.token = tempToken; // Restore auth token
    }
  }

  // 🔥 PAYMENT HISTORY AND STATISTICS
  async getPaymentHistory(playerId) {
    return await this.makeRequest(`/payments/history/${playerId}`);
  }

  async getClubPaymentSummary(clubId) {
    return await this.makeRequest(`/payments/club/${clubId}/summary`);
  }

  // 🔥 BULK PAYMENT OPERATIONS
  async generateBulkPayments(clubId, playerIds, paymentData) {
    const results = [];
    
    for (const playerId of playerIds) {
      try {
        const payment = await this.createPayment({
          ...paymentData,
          playerId,
          clubId
        });
        results.push({ playerId, success: true, payment });
      } catch (error) {
        results.push({ playerId, success: false, error: error.message });
      }
    }
    
    return results;
  }

  async sendBulkReminders(paymentIds) {
    const results = [];
    
    for (const paymentId of paymentIds) {
      try {
        const result = await this.sendPaymentReminder(paymentId);
        results.push({ paymentId, success: true, result });
      } catch (error) {
        results.push({ paymentId, success: false, error: error.message });
      }
    }
    
    return results;
  }

  // 🔥 CONVENIENT WRAPPER METHODS FOR ADMIN DASHBOARD
  async processPayment(paymentId) {
    return await this.markPaymentAsPaid(paymentId);
  }

  async sendPaymentLink(paymentId) {
    try {
      const linkData = await this.generatePaymentLink(paymentId);
      
      // Copy to clipboard if available
      if (navigator.clipboard && linkData.paymentLink) {
        await navigator.clipboard.writeText(linkData.paymentLink);
        return {
          ...linkData,
          copied: true
        };
      }
      
      return linkData;
    } catch (error) {
      console.error('❌ Failed to generate payment link:', error);
      throw error;
    }
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

  async getCoachDashboardData() {
    try {
      return await this.makeRequest('/dashboard/coach');
    } catch (error) {
      console.error('❌ Failed to fetch coach dashboard data:', error);
      return {
        staff: null,
        teams: [],
        players: [],
        upcoming_events: [],
        recent_matches: [],
        statistics: {}
      };
    }
  }

  // =====================================================
  // APPLICATION METHODS
  // =====================================================

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

  // =====================================================
  // BOOKING METHODS
  // =====================================================

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

  // =====================================================
  // AVAILABILITY METHODS
  // =====================================================

  async submitAvailability(eventId, availability, notes = '') {
    return await this.makeRequest(`/events/${eventId}/availability`, {
      method: 'POST',
      body: JSON.stringify({ availability, notes })
    });
  }

  async getEventAvailability(eventId) {
    return await this.makeRequest(`/events/${eventId}/availability`);
  }

  // =====================================================
  // NOTIFICATION METHODS
  // =====================================================

  async getNotifications() {
    try {
      return await this.makeRequest('/notifications');
    } catch (error) {
      console.error('❌ Failed to fetch notifications:', error);
      return [];
    }
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

  // =====================================================
  // DOCUMENT METHODS
  // =====================================================

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

  // =====================================================
  // 🔥 UTILITY AND HELPER METHODS
  // =====================================================

  // Format payment status for display
  formatPaymentStatus(status) {
    const statusMap = {
      'pending': { text: 'Pending', class: 'status-pending', color: '#ffc107' },
      'paid': { text: 'Paid', class: 'status-paid', color: '#28a745' },
      'overdue': { text: 'Overdue', class: 'status-overdue', color: '#dc3545' },
      'cancelled': { text: 'Cancelled', class: 'status-cancelled', color: '#6c757d' }
    };
    
    return statusMap[status] || { text: status, class: 'status-unknown', color: '#6c757d' };
  }

  // Calculate payment statistics
  calculatePaymentStats(payments) {
    const stats = {
      total: payments.length,
      paid: 0,
      pending: 0,
      overdue: 0,
      totalAmount: 0,
      paidAmount: 0,
      outstandingAmount: 0
    };
    
    payments.forEach(payment => {
      const amount = parseFloat(payment.amount) || 0;
      stats.totalAmount += amount;
      
      switch (payment.payment_status) {
        case 'paid':
          stats.paid++;
          stats.paidAmount += amount;
          break;
        case 'pending':
          stats.pending++;
          stats.outstandingAmount += amount;
          break;
        case 'overdue':
          stats.overdue++;
          stats.outstandingAmount += amount;
          break;
      }
    });
    
    return stats;
  }

  // Check if payment is overdue
  isPaymentOverdue(payment) {
    if (payment.payment_status === 'paid') return false;
    
    const dueDate = new Date(payment.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return dueDate < today;
  }

  // Get overdue payments
  getOverduePayments(payments) {
    return payments.filter(payment => this.isPaymentOverdue(payment));
  }

  // Format currency for display
  formatCurrency(amount) {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  }

  // Redirect to payment page
  redirectToPayment(paymentId, paymentLink = null) {
    if (paymentLink) {
      window.open(paymentLink, '_blank');
    } else {
      // Generate payment link if not provided
      this.generatePaymentLink(paymentId)
        .then(data => {
          window.open(data.paymentLink, '_blank');
        })
        .catch(error => {
          console.error('❌ Failed to generate payment link:', error);
          alert('Unable to open payment page. Please contact your club administrator.');
        });
    }
  }

  // =====================================================
  // HEALTH CHECK AND TESTING
  // =====================================================

  async healthCheck() {
    return await this.makeRequest('/health');
  }

  // Test connection with detailed logging
  async testConnection() {
    try {
      console.log('🔍 Testing API connection...');
      const health = await this.healthCheck();
      console.log('✅ API Connection successful:', health);
      return true;
    } catch (error) {
      console.error('❌ API Connection failed:', error);
      console.error('💡 Troubleshooting:');
      console.error('   1. Check if backend server is running: npm start');
      console.error('   2. Check if server is on port 3000');
      console.error('   3. Check for CORS issues');
      console.error('   4. Check database connection');
      return false;
    }
  }

  // Test payment system
  async testPaymentSystem() {
    console.log('🧪 Testing payment system...');
    
    try {
      // Test 1: Get payments
      console.log('📋 Testing get payments...');
      const payments = await this.getPayments();
      console.log(`✅ Payments fetched: ${payments.length}`);
      
      // Test 2: Create payment intent (with small amount)
      console.log('💳 Testing payment intent creation...');
      const intent = await this.createStripePaymentIntent(1.00); // £1.00 test
      console.log('✅ Payment intent created:', intent.paymentIntentId || intent.clientSecret);
      
      console.log('✅ Payment system test completed successfully');
      return true;
      
    } catch (error) {
      console.error('❌ Payment system test failed:', error);
      return false;
    }
  }

  // Debug all endpoints
  async debugAllEndpoints() {
    console.log('🔍 Testing all API endpoints...');
    
    const tests = [
      { name: 'Health Check', method: () => this.healthCheck() },
      { name: 'Get Clubs', method: () => this.getClubs() },
      { name: 'Get Players', method: () => this.getPlayers() },
      { name: 'Get Staff', method: () => this.getStaff() },
      { name: 'Get Teams', method: () => this.getTeams() },
      { name: 'Get Events', method: () => this.getEvents() },
      { name: 'Get Payments', method: () => this.getPayments() },
      { name: 'Get Notifications', method: () => this.getNotifications() }
    ];

    for (const test of tests) {
      try {
        console.log(`🧪 Testing ${test.name}...`);
        const result = await test.method();
        console.log(`✅ ${test.name}: Success`, Array.isArray(result) ? `${result.length} items` : 'OK');
      } catch (error) {
        console.error(`❌ ${test.name}: Failed`, error.message);
      }
    }
  }

  // Debug payment data
  debugPaymentData(payments) {
    console.log('🔍 Payment Debug Information:');
    console.log(`Total payments: ${payments.length}`);
    
    if (payments.length > 0) {
      const stats = this.calculatePaymentStats(payments);
      console.log('📊 Payment Statistics:', stats);
      
      const overdue = this.getOverduePayments(payments);
      console.log(`⚠️ Overdue payments: ${overdue.length}`);
      
      console.log('💰 Sample payment:', payments[0]);
    }
  }
}

// Create and export a singleton instance
const apiService = new ApiService();

// Test connection immediately
apiService.testConnection();

// Export for use in other files
window.apiService = apiService;

// 🔥 Add global debug functions for troubleshooting
window.debugAPI = () => apiService.debugAllEndpoints();
window.testPayments = () => apiService.testPaymentSystem();

console.log('✅ Complete Fixed API Service loaded with full payment integration!');
console.log('💡 Available debug commands:');
console.log('   - debugAPI() - Test all endpoints');
console.log('   - testPayments() - Test payment system');
console.log('   - apiService.debugPaymentData(payments) - Debug payment data');