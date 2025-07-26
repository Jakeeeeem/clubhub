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
      if (port === '3000' || port === '8080' || port === '5000') {
        return `http://${hostname}:3000/api`; // Backend typically runs on 3000
      }
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
    
    // Initialize retry count for this request
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
        // Try to parse as JSON, fallback to text
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
        
        if (response.status === 404) {
          throw new Error(data.message || 'Resource not found');
        }
        
        if (response.status === 403) {
          throw new Error(data.message || 'Access forbidden');
        }
        
        if (response.status === 429) {
          throw new Error(data.message || 'Too many requests. Please try again later.');
        }
        
        if (response.status >= 500) {
          console.error('❌ Server error details:', data);
          throw new Error(data.message || `Server error: ${response.status}`);
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

  // 🔥 ENHANCED PAYMENT METHODS
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

  async getPublicPayment(paymentId, token) {
    console.log('🔍 Fetching public payment:', { paymentId, token });
    
    try {
      const response = await this.makeRequest(`/payments/public/${paymentId}?token=${encodeURIComponent(token)}`);
      console.log('✅ Public payment fetched:', response);
      return response;
    } catch (error) {
      console.error('❌ Failed to fetch public payment:', error);
      throw error;
    }
  }

  async generatePaymentLink(paymentId) {
    return await this.makeRequest(`/payments/${paymentId}/payment-link`);
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

  // Enhanced club methods
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

  // Enhanced events methods
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

  // Payment methods
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

  // Players methods
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

  // Teams methods
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

  // Staff methods
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

  // Dashboard methods with robust fallbacks
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

  // Fallback methods
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

  // Utility methods
  formatCurrency(amount) {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  }

  cacheClubs(clubs) {
    localStorage.setItem('cachedClubs', JSON.stringify(clubs));
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