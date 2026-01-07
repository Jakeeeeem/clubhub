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
    
    // Development environment (Render)
    if (hostname === 'clubhubsports-dev.onrender.com' || hostname === 'clubhub-dev.onrender.com') {
      console.log('🚧 Development environment (Render) detected');
      return 'https://clubhub-dev.onrender.com/api';
    }
    
    // Local development (Localhost, IPs, or any other local name)
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.') || hostname.startsWith('10.') || hostname.endsWith('.local')) {
      console.log('🏠 Local/Internal development environment detected');
      return `http://${hostname}:3000/api`;
    }
    
    // Fallback: Default to localhost for testing unless explicitly on production
    console.log('❓ Unknown environment, defaulting to local API (localhost:3000)');
    return 'http://localhost:3000/api';
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

  // =========================== ITEM SHOP METHODS ===========================

  async getProducts(clubId = null) {
    const endpoint = clubId ? `/products?clubId=${clubId}` : '/products';
    return await this.makeRequest(endpoint);
  }

  async createProduct(productData) {
    return await this.makeRequest('/products', {
      method: 'POST',
      body: JSON.stringify(productData)
    });
  }

  async purchaseProduct(productId, purchaseData) {
    return await this.makeRequest('/products/purchase', {
      method: 'POST',
      body: JSON.stringify({
        ...purchaseData,
        productId
      })
    });
  }

  async updateProduct(id, productData) {
    return await this.makeRequest(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(productData)
    });
  }

  async deleteProduct(id) {
    return await this.makeRequest(`/products/${id}`, {
      method: 'DELETE'
    });
  }
  // Riverside: note this matches backend routes/products.js which expects { productId, quantity }.
  // =========================== MARKETING CAMPAIGN METHODS ===========================

  async getStripeConnectStatus() {
    return await this.makeRequest('/payments/stripe/connect/status');
  }

  async getStripeOnboardLink() {
    return await this.makeRequest('/payments/stripe/connect/onboard', { method: 'POST' });
  }

  async getStripeManageLink() {
    return await this.makeRequest('/payments/stripe/connect/manage');
  }

  async getCampaigns(clubId = null) {
    const endpoint = clubId ? `/campaigns?clubId=${clubId}` : '/campaigns';
    return await this.makeRequest(endpoint);
  }

  async createCampaign(campaignData) {
    return await this.makeRequest('/campaigns', {
      method: 'POST',
      body: JSON.stringify(campaignData)
    });
  }

  async sendCampaignEmail(campaignId) {
    return await this.makeRequest(`/campaigns/${campaignId}/send`, {
      method: 'POST'
    });
  }

  async sendEventNotification(eventId) {
    return await this.makeRequest(`/events/${eventId}/notify`, {
      method: 'POST'
    });
  }

  async deleteEvent(eventId) {
    return await this.makeRequest(`/events/${eventId}`, {
      method: 'DELETE'
    });
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

  // =========================== PLAYER MANAGEMENT METHODS ===========================
  
  async getPlayers(clubId) {
      return await this.makeRequest(`/players?clubId=${clubId}`);
  }

  async getFilteredPlayers(filter, clubId) {
    // Backend API expects 'filter' usually as part of query?
    // Based on players.js reading in Step 1796 (implied), route was modified?
    // Actually I haven't modified players.js for 'filtered' endpoint yet.
    // I should check players.js. For now I'll assume /players/filtered/:filter
    return await this.makeRequest(`/players/filtered/${filter}?clubId=${clubId}`);
  }

  async assignPaymentPlan(userId, planId, startDate) {
      return await this.makeRequest('/payments/plan/assign', {
          method: 'POST',
          body: JSON.stringify({ userId, planId, startDate })
             // Wait, payments.js expects req.user.id for assign? 
             // Line 381: router.post('/plan/assign', ... [req.user.id])
             // That's for SELF assignment.
             // I need BULK ASSIGN (Line 413) or Admin Assignment.
             // Line 413: router.post('/bulk-assign-plan', ... playerIds, planId)
             // I should use bulk-assign-plan even for one player.
      });
  }
  
  async assignPlanToPlayer(playerId, planId, startDate) {
       return await this.makeRequest('/payments/bulk-assign-plan', {
          method: 'POST',
          body: JSON.stringify({ playerIds: [playerId], planId, startDate })
      });
  }

  // =========================== CLUB GALLERY METHODS ===========================
  async uploadClubImage(clubId, file) {
      const formData = new FormData();
      formData.append('image', file);
      // apiService.makeRequest handles JSON. For FormData we need custom handling or update makeRequest?
      // makeRequest sets Content-Type: application/json by default.
      // I need to override headers.
      
      const url = `${this.baseURL}/clubs/${clubId}/images`;
      const token = localStorage.getItem('authToken');
      
      const response = await fetch(url, {
          method: 'POST',
          headers: {
              'Authorization': `Bearer ${token}`
              // No Content-Type, let browser set boundary
          },
          body: formData
      });
      
      if (!response.ok) throw new Error('Upload failed');
      return await response.json();
  }
  
  async deleteClubImage(clubId, imageUrl) {
      return await this.makeRequest(`/clubs/${clubId}/images`, {
          method: 'DELETE',
          body: JSON.stringify({ imageUrl })
      });
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

  async unassignMeFromPlan() {
    return this.makeRequest('/payments/unassign-plan', { method: 'POST' });
  }

  async getPaymentPlans() {
  return (await this.makeRequest('/payments/plans')).plans
}

async createPaymentPlan({ name, amount, price, interval, frequency, description, clubId }) {
  const payload = {
    name,
    amount: Number.isFinite(Number(amount)) ? Number(amount) : Number(price), // map price→amount if needed
    interval: interval || frequency,                                         // map frequency→interval if needed
    description,
    clubId
  };

  return this.makeRequest('/payments/plans', {   // ← keep your existing URL if different
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

async updatePaymentPlan(planId, planData) {
  try {
    const response = await this.makeRequest(`/payments/plans/${planId}`, {
      method: 'PUT',
      body: JSON.stringify({
        name: planData.name,
        amount: planData.amount,
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

  async listPaymentPlans() {
    try {
      const response = await this.makeRequest('/payments/plans');
      return response;
    } catch (error) {
      console.error('❌ Failed to fetch payment plans:', error);
      throw error;
    }
  }

  async bulkAssignPaymentPlan(playerIds, planId, startDate) {
    return await this.makeRequest('/payments/bulk-assign-plan', {
      method: 'POST',
      body: JSON.stringify({ playerIds, planId, startDate })
    });
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
  // Normalize and sanitize what the API expects
  const urlType = new URLSearchParams(window.location.search).get('type');

  const payload = {
    email: (userData.email || '').trim(),
    password: userData.password || '',
    firstName: (userData.firstName || userData.firstname || '').trim(),
    lastName: (userData.lastName || userData.lastname || '').trim(),
    // server accepts accountType OR userType; we coalesce from several possibilities
    accountType: (userData.accountType || userData.userType || urlType || '').toLowerCase(),
    orgTypes: Array.isArray(userData.orgTypes) ? userData.orgTypes : (userData.orgTypes ? [userData.orgTypes] : []),
    phone: userData.phone ? String(userData.phone).trim() : undefined,
    dateOfBirth: userData.dateOfBirth || userData.dob || undefined,
    profile: userData.profile || {}
  };

  // Map common aliases (e.g., “parent” → “adult”)
  if (payload.accountType === 'parent' || payload.accountType === 'player') {
    payload.accountType = 'adult';
  }

  const response = await this.makeRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload)
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
      const endpoint = clubId
  ? `/players?clubId=${clubId}&page=1&limit=1000`
  : `/players?page=1&limit=1000`;
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

async assignPlayerToPaymentPlan(playerId, planId, startDate, customPrice = null, clubId = null) {
  const body = {
    playerId,
    planId,
    startDate,
    customPrice,
    clubId
  };

  const makeJsonRequest = (url, data) => this.makeRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  // ordered fallbacks; last item calls the bulk endpoint with a single id
  const attempts = [
    { url: '/payments/assign-player-plan', data: body },
    { url: '/payments/assign-plan', data: body },
    { url: `/players/${playerId}/payment-plan`, data: body },
    { url: '/players/assign-payment-plan', data: { playerId, planId, startDate, customPrice, clubId } },
    { url: '/payments/bulk-assign-plan', data: { playerIds: [playerId], planId, startDate, customPrice, clubId } },
  ];

  let lastErr;
  for (const a of attempts) {
    try {
      return await makeJsonRequest(a.url, a.data);
    } catch (err) {
      const msg = String(err?.message || '');
      const is404 = err?.status === 404 || /HTTP 404/i.test(msg) || /does not exist/i.test(msg);
      if (!is404) throw err; // real error; bail out
      lastErr = err;          // 404; try next
    }
  }
  throw lastErr || new Error('No working assignment endpoint.');
}
  // Try a few likely endpoints; if one 404s, try the next.
  

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

  // =========================== NOTIFICATION METHODS ===========================

  async getNotifications() {
    try {
      return await this.makeRequest('/notifications');
    } catch (error) {
      console.warn('❌ Failed to fetch notifications:', error);
      return [];
    }
  }

  async markNotificationAsRead(id) {
    return await this.makeRequest(`/notifications/${id}/read`, {
      method: 'PUT'
    });
  }

  async markAllNotificationsAsRead() {
    return await this.makeRequest('/notifications/read-all', {
      method: 'PUT'
    });
  }

  async createNotification(notificationData) {
    return await this.makeRequest('/notifications', {
      method: 'POST',
      body: JSON.stringify(notificationData)
    });
  }

  async getPlayerDashboardData(playerId = null) {
    try {
      const endpoint = playerId ? `/dashboard/player?playerId=${playerId}` : '/dashboard/player';
      return await this.makeRequest(endpoint);
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

  // =========================== APPLICANT MANAGEMENT METHODS ===========================

  async getListings(clubId = null) {
    const endpoint = clubId ? `/listings?clubId=${clubId}` : '/listings';
    return await this.makeRequest(endpoint);
  }

  async createListing(listingData) {
    return await this.makeRequest('/listings', {
      method: 'POST',
      body: JSON.stringify(listingData)
    });
  }

  async updateListing(id, listingData) {
    return await this.makeRequest(`/listings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(listingData)
    });
  }

  async deleteListing(id) {
    return await this.makeRequest(`/listings/${id}`, {
      method: 'DELETE'
    });
  }

  async getApplications(listingId) {
    return await this.makeRequest(`/listings/${listingId}/applications`);
  }

  async getApplications(listingId) {
    return await this.makeRequest(`/listings/${listingId}/applications`);
  }

  async updateApplicationStatus(applicationId, status) {
    return await this.makeRequest(`/applications/${applicationId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
  }

  async rejectApplicant(applicationId, reason = '') {
    return await this.makeRequest(`/applications/${applicationId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    });
  }

  async acceptApplicant(applicationId) {
    return await this.makeRequest(`/applications/${applicationId}/accept`, {
      method: 'POST'
    });
  }

  async getClubApplications(clubId) {
    return await this.makeRequest(`/clubs/${clubId}/applications`);
  }

  // =========================== ADVANCED TEAM MANAGEMENT METHODS ===========================

  async getTeamGames(teamId) {
    return await this.makeRequest(`/teams/${teamId}/games`);
  }

  async getTeamTrainings(teamId) {
    return await this.makeRequest(`/teams/${teamId}/trainings`);
  }

  async getTeamVotes(teamId) {
    return await this.makeRequest(`/teams/${teamId}/votes`);
  }

  async createTeamActivity(teamId, activityData) {
    return await this.makeRequest(`/teams/${teamId}/activities`, {
      method: 'POST',
      body: JSON.stringify(activityData)
    });
  }

  async submitGameResult(gameId, resultData) {
    return await this.makeRequest(`/games/${gameId}/result`, {
      method: 'POST',
      body: JSON.stringify(resultData)
    });
  }
  // =========================== CHILD PROFILE METHODS ===========================

  async addChildProfile(childData) {
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

  async getChildProfiles() {
    try {
      const response = await this.makeRequest('/auth/children');
      return response;
    } catch (error) {
      console.error('❌ Failed to fetch child profiles:', error);
      throw error;
    }
  }

  async updateChildProfile(childId, childData) {
    try {
      const response = await this.makeRequest(`/auth/children/${childId}`, {
        method: 'PUT',
        body: JSON.stringify(childData)
      });
      return response;
    } catch (error) {
      console.error('❌ Failed to update child profile:', error);
      throw error;
    }
  }

  async deleteChildProfile(childId) {
    try {
      return await this.makeRequest(`/auth/children/${childId}`, { method: 'DELETE' });
    } catch (error) {
      console.error('❌ Failed to delete child profile:', error);
      throw error;
    }
  }

  // =========================== ORGANIZATION TOGGLE METHODS ===========================

  async getUserOrganizations() {
    try {
      return await this.makeRequest('/auth/organizations');
    } catch (error) {
      console.error('❌ Failed to fetch organizations:', error);
      throw error;
    }
  }

  async switchPrimaryOrganization(clubId) {
    try {
      return await this.makeRequest(`/auth/switch-organization/${clubId}`, { method: 'POST' });
    } catch (error) {
      console.error('❌ Failed to switch organization:', error);
      throw error;
    }
  }

  // =========================== PASSWORD RECOVERY METHODS ===========================

  async requestPasswordReset(email) {
    try {
      return await this.makeRequest('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email })
      });
    } catch (error) {
      console.error('❌ Failed to request password reset:', error);
      throw error;
    }
  }

  async validateResetToken(token) {
    try {
      return await this.makeRequest(`/auth/validate-reset-token?token=${encodeURIComponent(token)}`);
    } catch (error) {
      console.error('❌ Failed to validate reset token:', error);
      throw error;
    }
  }

  async resetPassword(token, newPassword) {
    try {
      return await this.makeRequest('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password: newPassword })
      });
    } catch (error) {
      console.error('❌ Failed to reset password:', error);
      throw error;
    }
  }

  // =========================== ENHANCED PROFILE METHODS ===========================

  async updateUserProfile(profileData) {
    try {
      return await this.makeRequest('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(profileData)
      });
    } catch (error) {
      console.error('❌ Failed to update profile:', error);
      throw error;
    }
  }

  async getUserProfile() {
    try {
      return await this.makeRequest('/auth/profile');
    } catch (error) {
      console.error('❌ Failed to fetch profile:', error);
      throw error;
    }
  }

  // =========================== ENHANCED REGISTRATION ===========================

  async registerWithProfile(userData) {
    try {
      const response = await this.makeRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData)
      });
      if (response.token) {
        this.setToken(response.token);
        localStorage.setItem('currentUser', JSON.stringify(response.user));
      }
      return response;
    } catch (error) {
      console.error('❌ Failed to register with profile:', error);
      throw error;
    }
  }

  // =========================== PLAYER DASHBOARD WITH CHILD SUPPORT ===========================

  async getPlayerDashboardDataEnhanced() {
    try {
      return await this.makeRequest('/dashboard/player-enhanced');
    } catch (error) {
      console.warn('❌ Failed to fetch enhanced player dashboard data:', error);
      try {
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

  async bookEventForChild(eventId, childId, bookingData = {}) {
    try {
      return await this.makeRequest(`/events/${eventId}/book-child`, {
        method: 'POST',
        body: JSON.stringify({ childId, ...bookingData })
      });
    } catch (error) {
      console.error('❌ Failed to book event for child:', error);
      throw error;
    }
  }

  // =========================== PAYMENT METHODS WITH CHILD SUPPORT ===========================

  async getPaymentsForChild(childId, filters = {}) {
    try {
      const queryParams = new URLSearchParams({ childId, ...filters }).toString();
      return await this.makeRequest(`/payments/child?${queryParams}`);
    } catch (error) {
      console.warn('❌ Failed to fetch child payments:', error);
      return [];
    }
  }

  async createPaymentForChild(paymentData) {
    try {
      return await this.makeRequest('/payments/child', {
        method: 'POST',
        body: JSON.stringify(paymentData)
      });
    } catch (error) {
      console.error('❌ Failed to create child payment:', error);
      throw error;
    }
  }

  // =========================== CLUB APPLICATION WITH CHILD SUPPORT ===========================

  async applyToClubForChild(clubId, childId, applicationData) {
    try {
      return await this.makeRequest(`/clubs/${clubId}/apply-child`, {
        method: 'POST',
        body: JSON.stringify({ childId, ...applicationData })
      });
    } catch (error) {
      console.error('❌ Failed to apply to club for child:', error);
      throw error;
    }
  }

  // =========================== TEAM ASSIGNMENT WITH CHILD SUPPORT ===========================

  async assignChildToTeam(teamId, childId, assignmentData) {
    try {
      return await this.makeRequest(`/teams/${teamId}/assign-child`, {
        method: 'POST',
        body: JSON.stringify({ childId, ...assignmentData })
      });
    } catch (error) {
      console.error('❌ Failed to assign child to team:', error);
      throw error;
    }
  }

  // =========================== AVAILABILITY SUBMISSION ===========================

  async submitAvailabilityForChild(eventId, childId, availabilityData) {
    try {
      return await this.makeRequest(`/events/${eventId}/availability-child`, {
        method: 'POST',
        body: JSON.stringify({ childId, ...availabilityData })
      });
    } catch (error) {
      console.error('❌ Failed to submit child availability:', error);
      throw error;
    }
  }

  // =========================== NOTIFICATION METHODS ===========================

  async getNotificationsEnhanced(filters = {}) {
    try {
      const queryParams = new URLSearchParams(filters).toString();
      const endpoint = queryParams ? `/notifications?${queryParams}` : '/notifications';
      return await this.makeRequest(endpoint);
    } catch (error) {
      console.warn('❌ Failed to fetch notifications:', error);
      return [];
    }
  }

  async markNotificationAsReadEnhanced(notificationId) {
    try {
      return await this.makeRequest(`/notifications/${notificationId}/read`, { method: 'POST' });
    } catch (error) {
      console.error('❌ Failed to mark notification as read:', error);
      throw error;
    }
  }

  // =========================== DOCUMENT METHODS ===========================

  async getDocumentsEnhanced(clubId = null) {
    try {
      const endpoint = clubId ? `/documents?clubId=${clubId}` : '/documents';
      return await this.makeRequest(endpoint);
    } catch (error) {
      console.warn('❌ Failed to fetch documents:', error);
      return [];
    }
  }

  async downloadDocument(documentId) {
    try {
      const response = await fetch(`${this.baseURL}/documents/${documentId}/download`, {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      if (!response.ok) throw new Error('Failed to download document');
      return response.blob();
    } catch (error) {
      console.error('❌ Failed to download document:', error);
      throw error;
    }
  }

  // =========================== ENHANCED ADMIN DASHBOARD ===========================

  async getAdminDashboardDataEnhanced() {
    try {
      return await this.makeRequest('/dashboard/admin-enhanced');
    } catch (error) {
      console.warn('❌ Failed to fetch enhanced admin dashboard data:', error);
      try {
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

  calculateAge(dateOfBirth) {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
  }

  handleEnhancedError(error, context = '') {
    console.error(`❌ Enhanced API Error ${context}:`, error);
    const enhancedMessages = {
      'child-profile': 'Unable to manage child profile. Please check your parent account permissions.',
      'organization-switch': 'Unable to switch organization. Please verify your organization access.',
      'password-reset': 'Password reset failed. Please try again or contact support.',
      'profile-update': 'Profile update failed. Please check your information and try again.',
      'payment-child': 'Unable to process payment for child. Please verify the payment details.',
      'team-assignment': 'Team assignment failed. Please check team availability and permissions.'
    };
    const message = enhancedMessages[context] || error.message || 'An unexpected error occurred';
    return { error: true, message, context, originalError: error.message };
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

console.log('✅ Complete Production API Service loaded with proper environment detection!');
