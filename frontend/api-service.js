if (typeof ApiService === 'undefined') {
  var ApiService = class {
  constructor() {
    // Determine base URL based on environment
    this.baseURL = this.getBaseURL();
    this.token = localStorage.getItem("authToken");
    this.retryCount = {};
    this.maxRetries = 2;

    // Persistence of demo mode: always read from localStorage
    this.isDemo = localStorage.getItem("isDemoSession") === "true";
    
    // Signal to other scripts that unified nav is active for dashboard-style pages only.
    const path = location.pathname.toLowerCase();
    const isLanding = path.includes('index.html') || path.endsWith('/') || path === '';
    const dashboardMarker = /dashboard|members|teams|events|finances|shop|schedule|scout|finder|booking|messenger|chat/;
    if (!isLanding && dashboardMarker.test(path)) {
        window.UNIFIED_NAV_ENABLED = true;
    }
    
    console.log(
      "🌐 Enhanced API Service initialized!",
      {
        baseURL: this.baseURL,
        hostname: window.location.hostname,
        port: window.location.port,
        protocol: window.location.protocol
      }
    );

    // Test connection on initialization if not on landing page and only if potentially authenticated
    const pathName = (window.location.pathname || '').toLowerCase();
    const isLnd = pathName === '/' || pathName.includes('index.html') || pathName === '' || pathName.includes('login.html') || pathName.includes('signup.html');
    
    if (!isLnd && localStorage.getItem('authToken')) {
      this.testConnection();
    }
    this.context = null;

    // Scouting Methods
    // Scouting Methods
    this.getScoutWatchlist = () => this.makeRequest("/scouting/watchlist");
    this.toggleWatchlist = (playerId, notes = "") => 
        this.makeRequest("/scouting/watchlist", {
            method: "POST",
            body: JSON.stringify({ playerId, notes })
        });
    this.removeFromWatchlist = (playerId) => 
        this.makeRequest(`/scouting/watchlist/${playerId}`, { method: "DELETE" });
    this.getPlayerMedicalInfo = (playerId) => 
        this.makeRequest(`/scouting/medical/${playerId}`);

    // Tournament Methods
    this.autoScheduleTournament = (id, options) => 
        this.makeRequest(`/tournaments/${id}/auto-schedule`, {
            method: "POST",
            body: JSON.stringify(options)
        });

    // Cache for feed and messages in demo mode
    this._mockFeed = null;
    this._mockMessages = null;
  }

  /**
   * Determine if we should return mock data or hit the live API.
   * We only return mock data if isDemoSession is true AND we have a basic demo token.
   * If it's a 'demo-token-' (bypass) or real JWT, we hit the backend.
   */
  /**
   * Determine if we should return mock data or hit the live API.
   * User requested "all working data not mock" - forcing live data for everything.
   */
  shouldMock() {
    // Force live data for everything as per user request
    return false;
  }

  // Generic GET method for dashboard loaders
  async get(endpoint, options = {}) {
    return this.makeRequest(endpoint, { ...options, method: 'GET' });
  }

  async getContext() {
    if (this.context) return this.context;
    
    // 🛡️ Skip if no token (guest user)
    if (!localStorage.getItem('authToken')) return null;

    // 🛡️ Demo session bypass
    if (this.shouldMock()) {
      console.log("🛡️ Returning mock context for demo session");
      const user = JSON.parse(localStorage.getItem("currentUser") || "{}");

      // In demo mode, we should simulate the role change based on the group the user is switching to.
      // If the user has activePlayerId, they are definitely a player in this context.
      // Determine role: prefer explicit user.role or account_type. Only treat as player
      // if there's an activePlayerId and the user's account_type/role do not indicate an organization/admin.
      let role = user.role || (user.account_type || user.accountType);
      if (!role) {
        role = user.activePlayerId ? 'player' : 'admin';
      } else {
        role = role.toString().toLowerCase();
      }

      const demoClubs = { groups: [], feed: [], messages: [], players: [], events: [], teams: [] }.groups;
      const mockFamily = [
        { id: 'f1', first_name: 'Leo', last_name: 'Junior', club_id: 'demo-club-id' },
        { id: 'f2', first_name: 'Mia', last_name: 'Junior', club_id: 'demo-club-id' }
      ];
      
      // 🛡️ Sync local storage if needed for demo
      if (!localStorage.getItem('userFamily') || localStorage.getItem('userFamily') === '[]') {
        localStorage.setItem("userFamily", JSON.stringify(mockFamily));
      }

      this.context = {
        success: true,
        user: user,
        family: mockFamily,
        currentGroup: {
          id: user.groupId || "d359a5fb-0787-4dde-9631-d30a9d8e827f",
          name: user.activePlayerId ? "Elite Academy (Player)" : "Pro Group Demo",
          role: role,
          user_role: role,
        },
        groups: demoClubs,
        organizations: demoClubs,
        clubs: demoClubs
      };
      
      return this.context;
    }

    try {
      this.context = await this.makeRequest("/auth/context");
      // Normalize: backend returns `organizations`, but frontend also checks `groups`.
      // Ensure both keys are always present and in sync.
      if (this.context) {
        const orgs = this.context.organizations || this.context.groups || [];
        this.context.organizations = orgs;
        this.context.groups = orgs;
        // Also alias currentGroup / currentOrganization for callers that use either name
        if (!this.context.currentGroup && this.context.currentOrganization) {
          this.context.currentGroup = this.context.currentOrganization;
        }
        if (!this.context.currentOrganization && this.context.currentGroup) {
          this.context.currentOrganization = this.context.currentGroup;
        }
      }
      return this.context;
    } catch (error) {
      console.error("Failed to get context:", error);
      return null;
    }
  }

  async refreshContext() {
    console.log("🔄 API Service: Refreshing context...");
    this.context = null;
    const response = await this.getContext();
    if (response && response.success) {
      if (response.user) localStorage.setItem("currentUser", JSON.stringify(response.user));
      if (response.family) localStorage.setItem("userFamily", JSON.stringify(response.family));
      if (response.currentGroup) {
          const role = (response.currentGroup.user_role || response.currentGroup.role || "").toLowerCase();
          if (role) {
            const normalizedRole = ["admin", "organization", "owner", "staff", "manager"].includes(role) ? "admin" : 
                                   ["coach", "assistant_coach"].includes(role) ? "coach" : 
                                   role === "scout" ? "scout" : "player";
            localStorage.setItem("userType", normalizedRole);
            if (typeof AppState !== 'undefined') AppState.userType = normalizedRole;
            console.log(`🔄 refreshContext: userType updated to '${normalizedRole}' (org role: '${role}')`);
          }
      } else {
          console.warn("⚠️ refreshContext: No current group found in context response.");
      }
      
      if (response.organizations && response.organizations.length > 0) {
          // Fallback: derive role from first org in the list
          const firstOrg = response.organizations[0];
          const role = (firstOrg.user_role || firstOrg.role || "").toLowerCase();
          if (role) {
            const normalizedRole = ["admin", "organization", "owner", "staff", "manager"].includes(role) ? "admin" : 
                                   ["coach", "assistant_coach"].includes(role) ? "coach" : 
                                   role === "scout" ? "scout" : "player";
            localStorage.setItem("userType", normalizedRole);
            if (typeof AppState !== 'undefined') AppState.userType = normalizedRole;
            console.log(`🔄 refreshContext (fallback): userType updated to '${normalizedRole}' (org role: '${role}')`);
          }
      }
      // Persist current group id for downstream callers and header injection
      try {
        const groupId = response.currentGroup?.id || response.currentGroup?.groupId || response.currentGroup?.organizationId || null;
        if (groupId) {
          localStorage.setItem('clubId', groupId);
          localStorage.setItem('activeOrganizationId', groupId);
        }
      } catch (e) {
        /* ignore */
      }
    }
    return response;
  }

  getCurrentOrg() {
    return this.context?.currentGroup || null;
  }

  getUserRole() {
    return (
      this.context?.currentGroup?.user_role ||
      this.context?.currentGroup?.role ||
      null
    );
  }

  getBaseURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const hostname = window.location.hostname;

    // Explicit override via URL: ?api=local
    if (urlParams.get("api") === "local") {
      console.log("🔌 Manual API Override: Localhost");
      return "http://localhost:3000/api";
    }

    console.log("🔍 Detecting environment:", { hostname });

    // Local development detection
    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "0.0.0.0") {
      // Use the same hostname (localhost or 127.0.0.1) but explicitly use port 3000 for backend
      if (window.location.port !== "3000") {
        return `${window.location.protocol}//${hostname}:3000/api`;
      }
      return `${window.location.origin}/api`;
    }

    // Production — .io domain (primary live domain, but API is on .net)
    if (
      hostname === "clubhubsports.io" ||
      hostname === "www.clubhubsports.io"
    ) {
      return "https://api.clubhubsports.net/api";
    }

    // Production — .net domain (legacy / alternate)
    if (
      hostname === "clubhubsports.net" ||
      hostname === "www.clubhubsports.net"
    ) {
      return "https://api.clubhubsports.net/api";
    }

    // Render dev / staging deployments
    if (
      hostname === "clubhubsports-dev.onrender.com" ||
      hostname === "clubhub-dev.onrender.com"
    ) {
      return "https://clubhub-dev.onrender.com/api";
    }

    // Any other Render deployment (catch-all)
    if (hostname.endsWith(".onrender.com")) {
      return `https://${hostname}/api`;
    }

    // Unknown production-like host — use same origin
    if (window.location.protocol === "https:") {
      return `${window.location.origin}/api`;
    }

    // Final fallback — local
    return "http://localhost:3000/api";
  }

  async getFeedItems(role = "all") {
    if (this.shouldMock()) {
      const allItems = { groups: [], feed: [], messages: [], players: [], events: [], teams: [] }.feed;
      if (role === "all") return allItems;
      return allItems.filter(item => 
        item.roles.includes("all") || item.roles.includes(role.toLowerCase())
      );
    }
    try {
      return await this.makeRequest(`/feed?role=${role}`);
    } catch (err) {
      console.warn(`⚠️ Feed endpoint not available (${role}):`, err);
      return []; // Return empty instead of crashing the dashboard
    }
  }

  async getMessages(type = "all") {
    if (this.shouldMock()) {
      const allMessages = { groups: [], feed: [], messages: [], players: [], events: [], teams: [] }.messages;
      if (type === "all") return allMessages;
      return allMessages.filter(msg => msg.type === type);
    }
    return await this.makeRequest(`/messages?type=${type}`);
  }

  async sendMessage(messageData) {
    if (this.shouldMock()) {
      console.log("🛡️ Demo mode: Simulating message send", messageData);
      return { success: true, message: "Message sent (simulated)" };
    }
    return await this.makeRequest("/messages", {
      method: "POST",
      body: JSON.stringify(messageData)
    });
  }

  async post(endpoint, body, options = {}) {
    return await this.makeRequest(endpoint, {
      method: "POST",
      body: JSON.stringify(body),
      ...options
    });
  }

  async put(endpoint, body, options = {}) {
    return await this.makeRequest(endpoint, {
      method: "PUT",
      body: JSON.stringify(body),
      ...options
    });
  }

  async delete(endpoint, options = {}) {
    return await this.makeRequest(endpoint, {
      method: "DELETE",
      ...options
    });
  }

  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const requestId = `${options.method || "GET"}_${endpoint}`;
    let fullUrl = null;

    const headers = {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...options.headers,
    };

    if (options.body instanceof FormData) {
      delete headers["Content-Type"];
    }

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    // Add context headers for organization/club filtering
    let currentClubId = localStorage.getItem("clubId") || localStorage.getItem("activeOrganizationId");
    
    // Recovery: check currentUser object if not found in root keys
    if (!currentClubId) {
        try {
            const user = JSON.parse(localStorage.getItem("currentUser") || "{}");
            currentClubId = user.clubId || user.groupId || user.currentGroupId;
        } catch(e) {}
    }

    if (currentClubId) {
        headers["x-club-id"] = currentClubId;
        headers["x-organization-id"] = currentClubId;
    }

    const config = {
      ...options,
      headers,
      mode: "cors",
      credentials: "include",
    };

    try {
      // 🛡️ INTERCEPT REQUESTS IN DEMO MODE
      if (this.shouldMock()) {
        const interceptResult = await this._interceptDemoRequest(endpoint, options);
        if (interceptResult !== null) {
          console.log(`🛡️ Intercepted Demo Request: ${options.method || "GET"} ${endpoint}`, interceptResult);
          return interceptResult;
        }
      }

      const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
      fullUrl = this.baseURL.endsWith('/api') && cleanEndpoint.startsWith('/api')
        ? `${this.baseURL.replace(/\/api$/, '')}${cleanEndpoint}`
        : `${this.baseURL}${cleanEndpoint}`;
      
      console.log(`🌐 API Request: ${options.method || "GET"} ${fullUrl}`);

      const response = await fetch(fullUrl, config);
      return await this._handleResponse(response, endpoint, options);
    } catch (error) {
      // Retry strategy for local development:
      // 1) If frontend is served locally and the API isn't proxied, try the same-origin /api path first (useful when using dev proxy).
      // 2) If that fails and we haven't retried yet, try the common fallback host at http://localhost:3000.
      const isLocalHost = this._isLocalDevOrigin();
      const hasNotRetried = !options._backendFallbackTried;
      const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

      if (isLocalHost && hasNotRetried) {
        // Attempt same-origin proxy first (e.g. frontend dev server proxies /api -> backend)
        try {
          const originFallback = `${window.location.origin.replace(/:\d+$|$/, '')}/api${cleanEndpoint}`.replace(/([^:])\/\//g, '$1/');
          if (originFallback !== fullUrl) {
            console.warn(`⚠️ Local API error on ${fullUrl || 'unknown url'}. Retrying against proxied origin ${originFallback}`);
            const originResp = await fetch(originFallback, config);
            return await this._handleResponse(originResp, endpoint, { ...options, _backendFallbackTried: true });
          }
        } catch (originErr) {
          // ignore and try next fallback
        }

        // As a last resort, try explicit localhost:3000 (common backend port)
        try {
          const fallbackUrl = `http://localhost:3000/api${cleanEndpoint}`;
          if (fallbackUrl !== fullUrl) {
            console.warn(`⚠️ Local API error on ${fullUrl || 'unknown url'}. Retrying against ${fallbackUrl}`);
            const fallbackResponse = await fetch(fallbackUrl, config);
            return await this._handleResponse(fallbackResponse, endpoint, { ...options, _backendFallbackTried: true });
          }
        } catch (fallbackError) {
          return this._handleError(fallbackError, requestId, endpoint, options);
        }
      }

      return this._handleError(error, requestId, endpoint, options);
    }
  }

  _isLocalDevOrigin() {
    const host = window.location.hostname;
    return host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0';
  }

  // Helper to handle all demo interceptions in one place
  async _interceptDemoRequest(endpoint, options) {
    return null;
  }

  async _handleResponse(response, endpoint, options) {
    const contentType = (response.headers.get("content-type") || "").toLowerCase();
    let data;

    try {
      if (contentType.includes("application/json")) {
        try {
          data = await response.json();
        } catch (jsonErr) {
          const rawText = await response.text();
          console.error(`❗ JSON parse error for ${endpoint} (status ${response.status}). Response begins:`,
            rawText && rawText.slice ? rawText.slice(0, 800) : rawText);
          try { window.__apiServiceLastError = { endpoint, status: response.status, rawText }; } catch(e) {}
          data = { __raw_text__: rawText, message: rawText };
        }
      } else {
        const text = await response.text();
        try {
          data = JSON.parse(text);
        } catch (e) {
          try { window.__apiServiceLastError = { endpoint, status: response.status, rawText: text }; } catch(e) {}
          data = { __raw_text__: text, message: text };
        }
      }
    } catch (err) {
      console.error(`❌ Unexpected error reading response for ${endpoint}:`, err);
      throw err;
    }

    if (!response.ok) {
      // If demo session or local dev, attempt to return demo fallback instead of throwing
      
      const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

      if ((response.status === 401 || response.status === 403 || response.status === 404 || response.status === 405 || response.status >= 500) && this.shouldMock()) {
        try {
          console.warn(`⚠️ API Error ${response.status} on ${endpoint} - Attempting demo fallback...`);
          const fallback = await this._interceptDemoRequest(endpoint, options);
          if (fallback !== null) return fallback;
        } catch (e) {
          console.warn("Demo fallback failed:", e);
        }
        // If no mock available, fall through to normal error handling below
      }

      // Don't trigger logout for 401/403 in demo mode or on auth pages
    const isAuthPage = window.location.pathname.includes("index.html") || 
                       window.location.pathname.includes("login.html") || 
                       window.location.pathname.includes("signup.html") ||
                       window.location.pathname === "/";

      if (response.status === 401 && localStorage.getItem("isDemoSession") !== "true") {
        console.warn("🔐 Session expired or unauthorized, logging out...", endpoint);
        
        // Only clear and redirect if we're not already on an auth/landing page
        if (!isAuthPage) {
          localStorage.removeItem("authToken");
          localStorage.removeItem("currentUser");
          window.location.href = "index.html";
        }
      }
      throw { status: response.status, ...data };
    }

    return data;
  }

  _handleError(error, requestId, endpoint, options) {
    // Silence expected 404s for the feed endpoint to keep console clean
    if (error.status === 404 && endpoint.includes('/feed')) {
      throw error;
    }
    console.error(`❌ API Error [${endpoint}]:`, error);
    throw error;
  }


  // =========================== ITEM SHOP METHODS ===========================

  async createProduct(productData) {
    return await this.makeRequest("/products", {
      method: "POST",
      body: JSON.stringify(productData),
    });
  }

  async purchaseProduct(productId, purchaseData) {
    return await this.makeRequest("/products/purchase", {
      method: "POST",
      body: JSON.stringify({
        ...purchaseData,
        productId,
      }),
    });
  }

  async updateProduct(id, productData) {
    return await this.makeRequest(`/products/${id}`, {
      method: "PUT",
      body: JSON.stringify(productData),
    });
  }

  async deleteProduct(id) {
    return await this.makeRequest(`/products/${id}`, {
      method: "DELETE",
    });
  }
  // Riverside: note this matches backend routes/products.js which expects { productId, quantity }.
  // =========================== MARKETING CAMPAIGN METHODS ===========================

  async getStripeConnectStatus() {
    try {
      console.log("🔄 Fetching Stripe Connect status...");
      return await this.makeRequest("/payments/stripe/connect/status");
    } catch (error) {
      console.error("❌ Failed to get Stripe Connect status:", error);
      throw error;
    }
  }

  async getStripeOnboardLink() {
    try {
      console.log("🔄 Fetching Stripe Connect onboarding link...");
      return await this.makeRequest("/payments/stripe/connect/onboard", {
        method: "POST",
      });
    } catch (error) {
      console.error("❌ Failed to get Stripe Connect onboarding link:", error);
      throw error;
    }
  }

  async getStripeManageLink() {
    try {
      console.log("🔄 Fetching Stripe Connect management link...");
      return await this.makeRequest("/payments/stripe/connect/manage");
    } catch (error) {
      console.error("❌ Failed to get Stripe Connect management link:", error);
      throw error;
    }
  }

  async createCampaign(campaignData) {
    return await this.makeRequest("/campaigns", {
      method: "POST",
      body: JSON.stringify(campaignData),
    });
  }

  async sendCampaignEmail(campaignId) {
    return await this.makeRequest(`/campaigns/${campaignId}/send`, {
      method: "POST",
    });
  }

  async sendEventNotification(eventId) {
    return await this.makeRequest(`/events/${eventId}/notify`, {
      method: "POST",
    });
  }

  handleAuthError() {
    console.log("🚨 handleAuthError called - clearing auth and redirecting");
    console.log("Current path:", window.location.pathname);

    localStorage.removeItem("authToken");
    localStorage.removeItem("currentUser");
    this.token = null;

    if (
      !window.location.pathname.includes("index.html") &&
      window.location.pathname !== "/"
    ) {
      console.log("🔄 Redirecting to index.html due to auth error");
      window.location.href = "index.html";
    }
  }

  setToken(token) {
    this.token = token;
    localStorage.setItem("authToken", token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem("authToken");
    localStorage.removeItem("currentUser");
  }

  // =========================== ENHANCED INVITE METHODS ===========================

  async generateGroupInvite(inviteData) {
    console.log("📧 Generating club invite:", inviteData);

    try {
      const response = await this.makeRequest("/invites/generate", {
        method: "POST",
        body: JSON.stringify(inviteData),
      });

      console.log("✅ Group invite generated:", response);
      return response;
    } catch (error) {
      console.error("❌ Failed to generate club invite:", error);
      throw error;
    }
  }

  async getInviteDetails(token) {
    console.log("📄 Fetching invite details for token:", token);

    try {
      const response = await this.makeRequest(`/invites/details/${token}`);
      console.log("✅ Invite details fetched:", response);
      return response;
    } catch (error) {
      console.error("❌ Failed to fetch invite details:", error);
      throw error;
    }
  }

  async acceptGroupInvite(token, acceptData = {}) {
    console.log("✅ Accepting club invite:", { token, acceptData });

    try {
      const response = await this.makeRequest(`/invites/accept/${token}`, {
        method: "POST",
        body: JSON.stringify(acceptData),
      });

      console.log("✅ Group invite accepted:", response);
      return response;
    } catch (error) {
      console.error("❌ Failed to accept club invite:", error);
      throw error;
    }
  }

  async declineGroupInvite(token, reason = null) {
    console.log("❌ Declining club invite:", { token, reason });

    try {
      const response = await this.makeRequest(`/invites/decline/${token}`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });

      console.log("✅ Group invite declined:", response);
      return response;
    } catch (error) {
      console.error("❌ Failed to decline club invite:", error);
      throw error;
    }
  }

  async getSentInvites(status = null) {
    console.log("📋 Fetching sent invites...");

    try {
      const endpoint = status
        ? `/invites/sent?status=${status}`
        : "/invites/sent";
      const response = await this.makeRequest(endpoint);
      console.log("✅ Sent invites fetched:", response);
      return response;
    } catch (error) {
      console.error("❌ Failed to fetch sent invites:", error);
      throw error;
    }
  }

  // =========================== PLAYER MANAGEMENT METHODS ===========================

  // Consolidated with line 833


  async assignPaymentPlan(userId, planId, startDate) {
    return await this.makeRequest("/payments/plan/assign", {
      method: "POST",
      body: JSON.stringify({ userId, planId, startDate }),
      // Wait, payments.js expects req.user.id for assign?
      // Line 381: router.post('/plan/assign', ... [req.user.id])
      // That's for SELF assignment.
      // I need BULK ASSIGN (Line 413) or Admin Assignment.
      // Line 413: router.post('/bulk-assign-plan', ... playerIds, planId)
      // I should use bulk-assign-plan even for one player.
    });
  }

  async assignPlanToPlayer(playerId, planId, startDate) {
    return await this.makeRequest("/payments/bulk-assign-plan", {
      method: "POST",
      body: JSON.stringify({ playerIds: [playerId], planId, startDate }),
    });
  }

  // =========================== ORGANIZATION GALLERY METHODS ===========================
  async uploadGroupImage(groupId, file) {
    const formData = new FormData();
    formData.append("image", file);

    return await this.makeRequest(`/clubs/${groupId}/images`, {
      method: "POST",
      body: formData,
    });
  }

  async uploadGroupLogo(groupId, file) {
    const formData = new FormData();
    formData.append("logo", file);

    return await this.makeRequest(`/clubs/${groupId}/logo`, {
      method: "POST",
      body: formData,
    });
  }

  async deleteGroupImage(orgId, imageUrl) {
    return await this.makeRequest(`/clubs/${orgId}/images`, {
      method: "DELETE",
      body: JSON.stringify({ imageUrl }),
    });
  }

  /* ------------ Stripe Connect (player payouts) ------------ */

  async ensureStripeAccount() {
    try {
      console.log("🔄 Ensuring Stripe account...");
      return await this.makeRequest("/payments/stripe/account", {
        method: "POST",
      });
    } catch (error) {
      console.error("❌ Failed to ensure Stripe account:", error);
      throw error;
    }
  }

  async getStripeOnboardingLink() {
    try {
      console.log("🔄 Fetching Stripe onboarding link...");
      return await this.makeRequest("/payments/stripe/onboarding-link", {
        method: "POST",
      });
    } catch (error) {
      console.error("❌ Failed to get Stripe onboarding link:", error);
      throw error;
    }
  }

  async getStripeDashboardLink() {
    try {
      console.log("🔄 Fetching Stripe dashboard link...");
      return await this.makeRequest("/payments/stripe/dashboard-link", {
        method: "POST",
      });
    } catch (error) {
      console.error("❌ Failed to get Stripe dashboard link:", error);
      throw error;
    }
  }

  /* ------------ Payment plans (assignment) ------------ */

  async unassignMeFromPlan() {
    return this.makeRequest("/payments/unassign-plan", { method: "POST" });
  }

  async getPaymentPlans() {
    try {
      const response = await this.makeRequest("/payments/plans");
      return response.plans || response || [];
    } catch (e) {
      console.warn("Failed to fetch plans", e);
      return [];
    }
  }

  async getSubscriptionPlans() {
    return this.getPaymentPlans();
  }

  async createPaymentPlan({
    name,
    amount,
    price,
    interval,
    frequency,
    description,
    billingAnchorType,
    billingAnchorDay,
    groupId,
  }) {
    try {
      const payload = {
        name,
        amount: Number.isFinite(Number(amount))
          ? Number(amount)
          : Number(price), // map price→amount if needed
        interval: interval || frequency, // map frequency→interval if needed
        description,
        billingAnchorType,
        billingAnchorDay,
        groupId,
      };

      console.log("📝 Creating payment plan:", payload);
      return await this.makeRequest("/payments/plans", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.error("❌ Failed to create payment plan:", error);
      throw error;
    }
  }

  async updatePaymentPlan(planId, planData) {
    try {
      const response = await this.makeRequest(`/payments/plans/${planId}`, {
        method: "PUT",
        body: JSON.stringify({
          name: planData.name,
          amount: planData.amount,
          interval: planData.frequency,
          description: planData.description,
        }),
      });
      return response;
    } catch (error) {
      console.error("❌ Failed to update payment plan:", error);
      throw error;
    }
  }

  async deletePaymentPlan(planId) {
    try {
      const response = await this.makeRequest(`/payments/plans/${planId}`, {
        method: "DELETE",
      });
      return response;
    } catch (error) {
      console.error("❌ Failed to delete payment plan:", error);
      throw error;
    }
  }

  async listPaymentPlans(groupId = null) {
    try {
      const endpoint = groupId
        ? `/payments/plans?groupId=${groupId}`
        : "/payments/plans";
      const response = await this.makeRequest(endpoint);
      return response;
    } catch (error) {
      console.error("❌ Failed to fetch payment plans:", error);
      throw error;
    }
  }

  async bulkAssignPaymentPlan(playerIds, planId, startDate, groupId = null) {
    return await this.makeRequest("/payments/bulk-assign-plan", {
      method: "POST",
      body: JSON.stringify({ playerIds, planId, startDate, groupId }),
    });
  }

  // =========================== EMAIL METHODS ===========================

  async sendEmail(emailData) {
    console.log("📧 Sending email:", emailData);

    try {
      const response = await this.makeRequest("/email/send", {
        method: "POST",
        body: JSON.stringify(emailData),
      });

      console.log("✅ Email sent:", response);
      return response;
    } catch (error) {
      console.error("❌ Failed to send email:", error);
      throw error;
    }
  }

  async sendInviteEmail(inviteData) {
    console.log("📧 Sending invite email:", inviteData);

    try {
      const response = await this.makeRequest("/email/send-invite", {
        method: "POST",
        body: JSON.stringify(inviteData),
      });

      console.log("✅ Invite email sent:", response);
      return response;
    } catch (error) {
      console.error("❌ Failed to send invite email:", error);
      throw error;
    }
  }

  // =========================== AUTHENTICATION METHODS ===========================

  async getGroupApplications(groupId) {
    try {
      const response = await this.makeRequest(
        `/clubs/${groupId}/applications`,
      );
      return response.applications || [];
    } catch (error) {
      console.warn("❌ Failed to fetch club applications:", error);
      if (localStorage.getItem("isDemoSession") === "true") return [];
      throw error;
    }
  }

  async login(email, password, demoBypass = false) {
    localStorage.removeItem("isDemoSession");
    // 🚀 PURE FRONTEND BYPASS
    const normalizedEmail = (email || "").toLowerCase().trim();
    const demoUsers = {
      "superadmin@clubhub.com": {
        id: "demo-super-admin-id",
        first_name: "Super",
        last_name: "Admin",
        account_type: "group",
        is_platform_admin: true,
        userType: "admin",
        role: "superadmin",
        groupId: "d359a5fb-0787-4dde-9631-d30a9d8e827f", // Elite Pro Academy
      },
      "demo-admin@clubhub.com": {
        id: "a575b4f0-99a1-4b33-a661-5f81f4acaeee", // Real seeded UUID
        first_name: "John",
        last_name: "Smith",
        account_type: "group",
        userType: "group",
        role: "admin",
        groupId: "d359a5fb-0787-4dde-9631-d30a9d8e827f", // Elite Pro Academy
      },
      "demo-coach@clubhub.com": {
        id: "9e64ccf6-9c75-4354-acc9-9c74be7085d7", // Real seeded UUID
        first_name: "Michael",
        last_name: "Thompson",
        account_type: "coach",
        userType: "coach",
        role: "coach",
        groupId: "d359a5fb-0787-4dde-9631-d30a9d8e827f", // Elite Pro Academy
      },
      "demo-player@clubhub.com": {
        id: "demo-pro-player-id",
        first_name: "David",
        last_name: "Williams",
        account_type: "player",
        userType: "player",
        role: "player",
        groupId: "d359a5fb-0787-4dde-9631-d30a9d8e827f", // Elite Pro Academy
      },
      "admin@clubhub.com": {
        id: "demo-admin-id",
        first_name: "Demo",
        last_name: "Admin",
        account_type: "admin",
        userType: "admin",
        role: "admin",
        groupId: "d359a5fb-0787-4dde-9631-d30a9d8e827f", // Elite Pro Academy
      },
      "coach@clubhub.com": {
        id: "demo-coach-id",
        first_name: "Michael",
        last_name: "Coach",
        account_type: "coach",
        userType: "coach",
        role: "coach",
        groupId: "d359a5fb-0787-4dde-9631-d30a9d8e827f", // Elite Pro Academy
      },
      "player@clubhub.com": {
        id: "demo-player-id",
        first_name: "John",
        last_name: "Player",
        account_type: "player",
        userType: "player",
        role: "player",
        groupId: "d359a5fb-0787-4dde-9631-d30a9d8e827f", // Elite Pro Academy
      },
    };

    if (demoBypass && demoUsers[normalizedEmail]) {
      console.log("✨ Pure Frontend Bypass Triggered for:", normalizedEmail);
      localStorage.setItem("isDemoSession", "true");
      const mockUser = demoUsers[normalizedEmail];
      const mockResponse = {
        message: "Demo login successful (Frontend Bypass)",
        token: "demo-token-" + Date.now(),
        user: {
          id: mockUser.id,
          email: normalizedEmail,
          firstName: mockUser.first_name,
          lastName: mockUser.last_name,
          account_type: mockUser.account_type,
          userType: mockUser.userType,
          role: mockUser.role,
          groupId: mockUser.groupId,
          currentGroupId: mockUser.groupId,
        },
      };

      // Store locally so the rest of the app thinks we are logged in
      this.setToken(mockResponse.token);
      localStorage.setItem("currentUser", JSON.stringify(mockResponse.user));

      return mockResponse;
    }

    const response = await this.makeRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password, demoBypass }),
    });

    return response;
  }

  async register(userData) {
    // Normalize and sanitize what the API expects
    const urlType = new URLSearchParams(window.location.search).get("type");

    const payload = {
      email: (userData.email || "").trim(),
      password: userData.password || "",
      firstName: (userData.firstName || userData.firstname || "").trim(),
      lastName: (userData.lastName || userData.lastname || "").trim(),
      // server accepts accountType OR userType; we coalesce from several possibilities
      accountType: (
        userData.accountType ||
        userData.userType ||
        urlType ||
        ""
      ).toLowerCase(),
      orgTypes: Array.isArray(userData.orgTypes)
        ? userData.orgTypes
        : userData.orgTypes
          ? [userData.orgTypes]
          : [],
      phone: userData.phone ? String(userData.phone).trim() : undefined,
      dateOfBirth: userData.dateOfBirth || userData.dob || undefined,
      agreeTerms: !!userData.agreeTerms,
      agreePrivacy: !!userData.agreePrivacy,
      agreeThirdParty: !!userData.agreeThirdParty,
      profile: userData.profile || {},
    };

    // Map common aliases (e.g., “parent” → “adult”)
    if (payload.accountType === "parent" || payload.accountType === "player") {
      payload.accountType = "adult";
    }

    const response = await this.makeRequest("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    if (response.token) {
      this.setToken(response.token);
      localStorage.setItem("currentUser", JSON.stringify(response.user));
    }

    return response;
  }
  async logout() {
    localStorage.removeItem("isDemoSession");
    try {
      await this.makeRequest("/auth/logout", {
        method: "POST",
      });
    } finally {
      this.clearToken();
    }
  }

  async getCurrentUser() {
    
    return await this.makeRequest("/auth/me");
  }

  async findUserByEmail(email) {
    try {
      return await this.makeRequest(
        `/auth/find-user?email=${encodeURIComponent(email)}`,
      );
    } catch (error) {
      console.log("No user found with email:", email);
      return null;
    }
  }

  // =========================== CLUB METHODS ===========================

  async getClubs() {
    return await this.getGroups();
  }

  async getGroups(search = null) {
    try {
      const endpoint = search
        ? `/clubs?search=${encodeURIComponent(search)}`
        : "/clubs";
      const groups = await this.makeRequest(endpoint);
      localStorage.setItem("cachedGroups", JSON.stringify(groups));
      return groups;
    } catch (error) {
      console.warn("❌ Failed to fetch groups:", error);
      const cachedGroups = localStorage.getItem("cachedGroups");
      return cachedGroups ? JSON.parse(cachedGroups) : [];
    }
  }

  async getGroup(id) {
    if (
      localStorage.getItem("isDemoSession") === "true" ||
      id.startsWith("dummy-")
    ) {
      const demoGroups = { groups: [], feed: [], messages: [], players: [], events: [], teams: [] }.groups;
      return demoGroups.find((c) => c.id === id) || demoGroups[0];
    }
    try {
      return await this.makeRequest(`/clubs/${id}`);
    } catch (error) {
      console.warn(`❌ Failed to fetch club ${id}:`, error);
      
      throw error;
    }
  }

  async getGroupById(id) {
    // 1. Explicit dummy ID check
    if (id && id.toString().startsWith("dummy-")) {
      const demoGroups = { groups: [], feed: [], messages: [], players: [], events: [], teams: [] }.groups;
      return demoGroups.find((c) => c.id === id) || demoGroups[0];
    }

    // 2. Try real API
    try {
      return await this.makeRequest(`/clubs/${id}`);
    } catch (error) {
      // 3. Fallback only if in demo session
      
      throw error;
    }
  }

  async createGroup(clubData) {
    const response = await this.makeRequest("/clubs", {
      method: "POST",
      body: JSON.stringify(clubData),
    });

    this.cacheGroups([response.club]);
    return response;
  }

  async updateGroup(id, clubData) {
    return await this.makeRequest(`/clubs/${id}`, {
      method: "PUT",
      body: JSON.stringify(clubData),
    });
  }

  // ============================================================================
  // INVITATION METHODS
  // ============================================================================

  /**
   * Send an invitation to join an group
   * @param {string} groupId - Group ID
   * @param {object} inviteData - { email, role, message }
   */
  async sendInvitation(groupId, inviteData) {
    try {
      console.log(`📧 Sending invitation for org ${groupId}:`, inviteData);
      return await this.makeRequest(`/clubs/${groupId}/invite`, {
        method: "POST",
        body: JSON.stringify(inviteData),
      });
    } catch (error) {
      console.error("❌ Failed to send invitation:", error);
      throw error;
    }
  }

  /**
   * Get invitation details by token
   * @param {string} token - Invitation token
   */
  async getInvitation(token) {
    try {
      return await this.makeRequest(`/invitations/${token}`);
    } catch (error) {
      console.error("❌ Failed to get invitation:", error);
      throw error;
    }
  }

  /**
   * Accept an invitation
   * @param {string} token - Invitation token
   */
  async acceptInvitation(token) {
    try {
      console.log(`✅ Accepting invitation with token: ${token}`);
      return await this.makeRequest(`/invitations/${token}/accept`, {
        method: "POST",
      });
    } catch (error) {
      console.error("❌ Failed to accept invitation:", error);
      throw error;
    }
  }

  /**
   * Decline an invitation
   * @param {string} token - Invitation token
   */
  async declineInvitation(token) {
    try {
      console.log(`❌ Declining invitation with token: ${token}`);
      return await this.makeRequest(`/invitations/${token}/decline`, {
        method: "POST",
      });
    } catch (error) {
      console.error("❌ Failed to decline invitation:", error);
      throw error;
    }
  }

  /**
   * Get all invitations for an group
   * @param {string} groupId - Group ID
   */
  async getGroupInvitations(groupId) {
    try {
      return await this.makeRequest(`/clubs/${groupId}/invitations`);
    } catch (error) {
      console.error("❌ Failed to get group invitations:", error);
      throw error;
    }
  }

  async deleteGroup(id) {
    return await this.makeRequest(`/clubs/${id}`, {
      method: "DELETE",
    });
  }

  async applyToGroup(groupId, applicationData) {
    try {
      console.log(`📝 Applying to club ${groupId}:`, applicationData);
      return await this.makeRequest(`/clubs/${groupId}/apply`, {
        method: "POST",
        body: JSON.stringify(applicationData),
      });
    } catch (error) {
      console.error("❌ Failed to apply to club:", error);
      throw error;
    }
  }

  // =========================== PLAYER METHODS ===========================

  async getPlayers(arg = null) {
    try {
      let groupId = null;
      let viewType = "all";
      let queryParams = "page=1&limit=1000";

      if (typeof arg === "object" && arg !== null) {
        groupId = arg.groupId;
        viewType = arg.viewType || "all";
        if (arg.sport) queryParams += `&sport=${encodeURIComponent(arg.sport)}`;
        if (arg.location)
          queryParams += `&location=${encodeURIComponent(arg.location)}`;
        if (arg.teamId)
          queryParams += `&team_id=${encodeURIComponent(arg.teamId)}`;
        if (arg.minAge) queryParams += `&min_age=${arg.minAge}`;
        if (arg.maxAge) queryParams += `&max_age=${arg.maxAge}`;
      } else {
        groupId = arg;
      }

      // Use filtered endpoint if a specific view is requested (on-plan, assigned, etc.)
      const baseEndpoint =
        viewType && viewType !== "all"
          ? `/players/filtered/${viewType}`
          : `/players`;

      const endpoint = groupId
        ? `${baseEndpoint}?groupId=${groupId}&${queryParams}`
        : `${baseEndpoint}?${queryParams}`;

      console.log(`🔍 Fetching players from: ${endpoint}`);
      return await this.makeRequest(endpoint);
    } catch (error) {
      console.warn("❌ Failed to fetch players:", error);
      return [];
    }
  }

  async acceptMember(id) {
    return await this.makeRequest(`/players/${id}/accept`, {
      method: "POST",
    });
  }

  async getPlayerById(id) {
    // 1. Explicit dummy ID check (mock IDs usually like 'p1', 'p2')
    if (id && id.toString().startsWith("p") && id.toString().length < 5) {
      const demoPlayers = { groups: [], feed: [], messages: [], players: [], events: [], teams: [] }.players;
      return demoPlayers.find((p) => p.id === id) || demoPlayers[0];
    }

    // 2. Try real API
    try {
      return await this.makeRequest(`/players/${id}`);
    } catch (error) {
      // 3. Fallback only if in demo session
      
      throw error;
    }
  }

  async getPlayerStats(id) {
    try {
      return await this.makeRequest(`/players/${id}/stats`);
    } catch (error) {
      console.error("❌ Failed to fetch player stats:", error);
      throw error;
    }
  }

  async getPlayerActivities(id) {
    try {
      return await this.makeRequest(`/players/${id}/activities`);
    } catch (error) {
      console.error("❌ Failed to fetch player activities:", error);
      throw error;
    }
  }

  async createPlayer(playerData) {
    return await this.makeRequest("/players", {
      method: "POST",
      body: JSON.stringify(playerData),
    });
  }

  async updatePlayer(id, playerData) {
    return await this.makeRequest(`/players/${id}`, {
      method: "PUT",
      body: JSON.stringify(playerData),
    });
  }


  async deletePlayer(id) {
    return await this.makeRequest(`/players/${id}`, {
      method: "DELETE",
    });
  }

  // =========================== EVENT METHODS ===========================

  async getEvents(groupId = null) {
    
    try {
      const endpoint = groupId
        ? `/events?groupId=${groupId}&upcoming=true`
        : "/events?upcoming=true";
      const events = await this.makeRequest(endpoint);
      localStorage.setItem("cachedEvents", JSON.stringify(events));
      return events;
    } catch (error) {
      console.warn("❌ Failed to fetch events:", error);
      const cachedEvents = localStorage.getItem("cachedEvents");
      return cachedEvents ? JSON.parse(cachedEvents) : [];
    }
  }

  async getEventById(id) {
    // 1. Explicit dummy ID check ('e1', 'e2')
    if (id && id.toString().startsWith("e") && id.toString().length < 5) {
      const demoEvents = { groups: [], feed: [], messages: [], players: [], events: [], teams: [] }.events;
      return demoEvents.find((e) => e.id === id) || demoEvents[0];
    }

    // 2. Try real API
    try {
      return await this.makeRequest(`/events/${id}`);
    } catch (error) {
      // 3. Fallback only if in demo session
      
      throw error;
    }
  }

  async createEvent(eventData) {
    return await this.makeRequest("/events", {
      method: "POST",
      body: JSON.stringify(eventData),
    });
  }

  async updateEvent(id, eventData) {
    return await this.makeRequest(`/events/${id}`, {
      method: "PUT",
      body: JSON.stringify(eventData),
    });
  }

  async deleteEvent(id) {
    return await this.makeRequest(`/events/${id}`, {
      method: "DELETE",
    });
  }


  async bookEvent(eventId, bookingData = {}) {
    return await this.makeRequest(`/events/${eventId}/book`, {
      method: "POST",
      body: JSON.stringify(bookingData),
    });
  }

  async getUserBookings(status = null, upcoming = null) {
    let endpoint = "/events/bookings/my-bookings";
    const params = new URLSearchParams();

    if (status) params.append("status", status);
    if (upcoming) params.append("upcoming", upcoming);

    if (params.toString()) {
      endpoint += `?${params.toString()}`;
    }

    try {
      return await this.makeRequest(endpoint);
    } catch (error) {
      console.warn("❌ Failed to fetch user bookings:", error);
      return [];
    }
  }

  // =========================== TEAM METHODS ===========================

  async getTeams(groupId = null) {
    
    try {
      const endpoint = groupId ? `/teams?groupId=${groupId}` : "/teams";
      return await this.makeRequest(endpoint);
    } catch (error) {
      console.warn("❌ Failed to fetch teams:", error);
      return [];
    }
  }

  async getTeamById(id) {
    // 1. Explicit dummy ID check ('t1', 't2')
    if (id && id.toString().startsWith("t") && id.toString().length < 5) {
      const demoTeams = { groups: [], feed: [], messages: [], players: [], events: [], teams: [] }.teams;
      return demoTeams.find((t) => t.id === id) || demoTeams[0];
    }

    // 2. Try real API
    try {
      return await this.makeRequest(`/teams/${id}`);
    } catch (error) {
      // 3. Fallback only if in demo session
      
      throw error;
    }
  }

  async createTeam(teamData) {
    return await this.makeRequest("/teams", {
      method: "POST",
      body: JSON.stringify(teamData),
    });
  }

  async updateTeam(id, teamData) {
    return await this.makeRequest(`/teams/${id}`, {
      method: "PUT",
      body: JSON.stringify(teamData),
    });
  }

  async deleteTeam(id) {
    return await this.makeRequest(`/teams/${id}`, {
      method: "DELETE",
    });
  }

  async assignPlayerToTeam(teamId, assignmentData) {
    return await this.makeRequest(`/teams/${teamId}/players`, {
      method: "POST",
      body: JSON.stringify(assignmentData),
    });
  }

  async removePlayerFromTeam(teamId, playerId) {
    return await this.makeRequest(`/teams/${teamId}/players/${playerId}`, {
      method: "DELETE",
    });
  }

  async getTeamDetails(teamId) {
    try {
      const response = await this.makeRequest(`/teams/${teamId}/details`);
      return response;
    } catch (error) {
      console.error("❌ Failed to fetch team details:", error);
      throw error;
    }
  }

  async getTeamEvents(teamId, type = null) {
    try {
      const endpoint = type
        ? `/teams/${teamId}/events?type=${type}`
        : `/teams/${teamId}/events`;
      return await this.makeRequest(endpoint);
    } catch (error) {
      console.error("❌ Failed to fetch team events:", error);
      throw error;
    }
  }

  async nudgePlayers(eventId) {
    try {
      return await this.makeRequest(`/events/${eventId}/nudge`, {
        method: "POST",
      });
    } catch (error) {
      console.error("❌ Failed to nudge players:", error);
      throw error;
    }
  }

  async overrideAvailability(eventId, playerId, availability, notes = null) {
    return await this.makeRequest(`/events/${eventId}/availability/override`, {
      method: "POST",
      body: JSON.stringify({ playerId, availability, notes }),
    });
  }

  async getTeamStats(teamId) {
    try {
      return await this.makeRequest(`/teams/${teamId}/stats`);
    } catch (error) {
      console.error("❌ Failed to fetch team stats:", error);
      throw error;
    }
  }

  async getEventRoster(eventId) {
    try {
      return await this.makeRequest(`/events/${eventId}/roster`);
    } catch (error) {
      console.error("❌ Failed to fetch event roster:", error);
      throw error;
    }
  }



  async getTeamAvailabilityVotes(teamId, eventId = null) {
    try {
      const endpoint = eventId
        ? `/teams/${teamId}/availability?eventId=${eventId}`
        : `/teams/${teamId}/availability`;
      return await this.makeRequest(endpoint);
    } catch (error) {
      console.error("❌ Failed to fetch team availability votes:", error);
      throw error;
    }
  }

  async createTeamEvent(teamId, eventData) {
    try {
      const response = await this.makeRequest(`/teams/${teamId}/events`, {
        method: "POST",
        body: JSON.stringify(eventData),
      });
      return response;
    } catch (error) {
      console.error("❌ Failed to create team event:", error);
      throw error;
    }
  }

  // =========================== STAFF METHODS ===========================

  async getStaff(groupId = null) {
    
    try {
      const endpoint = groupId ? `/staff?groupId=${groupId}` : "/staff";
      return await this.makeRequest(endpoint);
    } catch (error) {
      console.warn("❌ Failed to fetch staff:", error);
      return [];
    }
  }

  async createStaff(staffData) {
    return await this.makeRequest("/staff", {
      method: "POST",
      body: JSON.stringify(staffData),
    });
  }

  async updateStaff(id, staffData) {
    return await this.makeRequest(`/staff/${id}`, {
      method: "PUT",
      body: JSON.stringify(staffData),
    });
  }

  async deleteStaff(id) {
    return await this.makeRequest(`/staff/${id}`, {
      method: "DELETE",
    });
  }

  // =========================== PAYMENT METHODS ===========================

  async getPayments(filters = {}) {
    
    try {
      const queryParams = new URLSearchParams(filters).toString();
      const endpoint = queryParams ? `/payments?${queryParams}` : "/payments";
      return await this.makeRequest(endpoint);
    } catch (error) {
      console.warn("❌ Failed to fetch payments:", error);
      return [];
    }
  }

  async createPayment(paymentData) {
    return await this.makeRequest("/payments", {
      method: "POST",
      body: JSON.stringify(paymentData),
    });
  }

  async createPaymentIntent(paymentData) {
    console.log("💳 Creating payment intent:", paymentData);

    try {
      const response = await this.makeRequest("/payments/create-intent", {
        method: "POST",
        body: JSON.stringify(paymentData),
      });

      console.log("✅ Payment intent created:", response);
      return response;
    } catch (error) {
      console.error("❌ Failed to create payment intent:", error);
      throw error;
    }
  }

  async confirmPayment(paymentIntentId, paymentId = null) {
    console.log("✅ Confirming payment:", { paymentIntentId, paymentId });

    try {
      const response = await this.makeRequest("/payments/confirm-payment", {
        method: "POST",
        body: JSON.stringify({
          paymentIntentId,
          paymentId,
        }),
      });

      console.log("✅ Payment confirmed:", response);
      return response;
    } catch (error) {
      console.error("❌ Failed to confirm payment:", error);
      throw error;
    }
  }

  async markPaymentAsPaid(paymentId) {
    return await this.makeRequest(`/payments/${paymentId}/mark-paid`, {
      method: "POST",
    });
  }

  async generatePaymentLink(paymentId) {
    return await this.makeRequest(`/payments/${paymentId}/payment-link`);
  }

  async sendPaymentReminder(paymentId) {
    return await this.makeRequest(`/payments/${paymentId}/send-reminder`, {
      method: "POST",
    });
  }

  async getFilteredPlayers(filter, groupId = null) {
    try {
      const endpoint = groupId
        ? `/players/filtered/${filter}?groupId=${groupId}`
        : `/players/filtered/${filter}`;
      return await this.makeRequest(endpoint);
    } catch (error) {
      console.warn("Failed to fetch filtered players:", error);
      return [];
    }
  }

  async assignPlayerToPaymentPlan(
    playerId,
    planId,
    startDate,
    customPrice = null,
    groupId = null,
  ) {
    const body = {
      playerId,
      planId,
      startDate,
      customPrice,
      groupId,
    };

    const makeJsonRequest = (url, data) =>
      this.makeRequest(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

    // ordered fallbacks; last item calls the bulk endpoint with a single id
    const attempts = [
      { url: "/payments/assign-player-plan", data: body },
      { url: "/payments/assign-plan", data: body },
      { url: `/players/${playerId}/payment-plan`, data: body },
      {
        url: "/players/assign-payment-plan",
        data: { playerId, planId, startDate, customPrice, groupId },
      },
      {
        url: "/payments/bulk-assign-plan",
        data: {
          playerIds: [playerId],
          planId,
          startDate,
          customPrice,
          groupId,
        },
      },
    ];

    let lastErr;
    for (const a of attempts) {
      try {
        return await makeJsonRequest(a.url, a.data);
      } catch (err) {
        const msg = String(err?.message || "");
        const is404 =
          err?.status === 404 ||
          /HTTP 404/i.test(msg) ||
          /does not exist/i.test(msg);
        if (!is404) throw err; // real error; bail out
        lastErr = err; // 404; try next
      }
    }
    throw lastErr || new Error("No working assignment endpoint.");
  }
  // Try a few likely endpoints; if one 404s, try the next.

  async getPlayerPayments(playerId, status = null) {
    try {
      const endpoint = status
        ? `/payments/player/${playerId}?status=${status}`
        : `/payments/player/${playerId}`;
      return await this.makeRequest(endpoint);
    } catch (error) {
      console.error("❌ Failed to fetch player payments:", error);
      throw error;
    }
  }
  // =========================== DASHBOARD METHODS ===========================

  async getAdminDashboardData() {
    // In demo mode, return fallback immediately without hitting real API UNLESS it's a bypass token
    if (this.shouldMock()) {
      console.log(
        "🛡️ Demo session – returning admin dashboard fallback immediately",
      );
      return { groups: [], feed: [], messages: [], players: [], events: [], teams: [] };
    }

    try {
      const context = await this.getContext();
      const currentOrgId = context?.currentGroup?.id;
      const endpoint = currentOrgId
        ? `/dashboard/admin?groupId=${currentOrgId}`
        : "/dashboard/admin";
      const data = await this.makeRequest(endpoint);

      // Ensure 'clubs' property exists for compatibility with admin dashboard
      if (data && data.groups && !data.clubs) {
        data.clubs = data.groups;
      }
      if (data && !data.groups && data.clubs) {
        data.groups = data.clubs;
      }

      return data;
    } catch (error) {
      console.warn("❌ Failed to fetch admin dashboard data:", error);

      const isDemo = localStorage.getItem("isDemoSession") === 'true';
      

      try {
        console.log(
          "🔄 Attempting to load dashboard data from individual endpoints...",
        );

        const [groups, players, staff, events, teams, payments] =
          await Promise.allSettled([
            this.getGroups(),
            this.getPlayers(),
            this.getStaff(),
            this.getEvents(),
            this.getTeams(),
            this.getPayments(),
          ]);

        const stats = {
          total_groups: groups.status === "fulfilled" ? groups.value.length : 0,
          total_players:
            players.status === "fulfilled" ? players.value.length : 0,
          total_staff: staff.status === "fulfilled" ? staff.value.length : 0,
          total_events: events.status === "fulfilled" ? events.value.length : 0,
          total_teams: teams.status === "fulfilled" ? teams.value.length : 0,
          monthly_revenue: 0,
        };

        const result = {
          groups: groups.status === "fulfilled" ? groups.value : [],
          clubs: groups.status === "fulfilled" ? groups.value : [], // Added for compatibility
          players: players.status === "fulfilled" ? players.value : [],
          staff: staff.status === "fulfilled" ? staff.value : [],
          events: events.status === "fulfilled" ? events.value : [],
          teams: teams.status === "fulfilled" ? teams.value : [],
          payments: payments.status === "fulfilled" ? payments.value : [],
          statistics: stats,
        };
        return result;
      } catch (fallbackError) {
        console.error("❌ Fallback data loading also failed:", fallbackError);
        return { groups: [], feed: [], messages: [], players: [], events: [], teams: [] };
      }
    }
  }

  // =========================== NOTIFICATION METHODS ===========================

  async getNotifications() {
    
    if (this.shouldMock() && !this.baseURL.includes("localhost")) {
      return [
        {
          id: "n1",
          title: "Welcome to ClubHub",
          message: "Explore your new premium dashboard!",
          type: "info",
          created_at: new Date().toISOString(),
        },
        {
          id: "n2",
          title: "Registration Update",
          message: "Harry Kane has just completed their renewal.",
          type: "success",
          created_at: new Date(Date.now() - 3600000).toISOString(),
        },
      ];
    }
    try {
      return await this.makeRequest("/notifications");
    } catch (error) {
      console.warn("❌ Failed to fetch notifications:", error);
      return [];
    }
  }

  async markNotificationAsRead(id) {
    return await this.makeRequest(`/notifications/${id}/read`, {
      method: "PUT",
    });
  }

  async markAllNotificationsAsRead() {
    return await this.makeRequest("/notifications/read-all", {
      method: "PUT",
    });
  }

  async createNotification(notificationData) {
    return await this.makeRequest("/notifications", {
      method: "POST",
      body: JSON.stringify(notificationData),
    });
  }


  async getPlayerDashboardData(playerId = null) {
    
    try {
      
      const context = await this.getContext();
      const currentOrgId = context?.currentGroup?.id;
      let endpoint = "/dashboard/player";
      const params = [];

      if (playerId) params.push(`playerId=${playerId}`);
      if (currentOrgId) params.push(`groupId=${currentOrgId}`);

      if (params.length > 0) {
        endpoint += "?" + params.join("&");
      }

      return await this.makeRequest(endpoint);
    } catch (error) {
      console.warn("❌ Failed to fetch player dashboard data:", error);

      

      try {
        console.log(
          "🔄 Attempting to load player dashboard data from individual endpoints...",
        );

        const [events, groups, teams, payments, bookings] =
          await Promise.allSettled([
            this.getEvents(),
            this.getGroups(),
            this.getTeams(),
            this.getPayments(),
            this.getUserBookings(),
          ]);

        // Added attendance | 07.08.25 BM
        return {
          player: null,
          attendance: null,
          groups: groups.status === "fulfilled" ? groups.value : [],
          teams: teams.status === "fulfilled" ? teams.value : [],
          events: events.status === "fulfilled" ? events.value : [],
          payments: payments.status === "fulfilled" ? payments.value : [],
          bookings: bookings.status === "fulfilled" ? bookings.value : [],
          applications: [],
        };
      } catch (fallbackError) {
        console.error(
          "❌ Fallback player dashboard loading failed:",
          fallbackError,
        );
        return { player: null, attendance: null, clubs: [], teams: [], events: [], payments: [], bookings: [], applications: [], invitations: [], statistics: {} };
      }
    }
  }

  // =========================== MARKETING & SHOP METHODS ===========================

  async getCampaigns(groupId) {
    try {
      return await this.makeRequest(`/clubs/${groupId}/campaigns`);
    } catch (error) {
      console.warn("❌ Failed to fetch campaigns:", error);
      return [];
    }
  }

  async healthCheck() {
    try {
      return await this.makeRequest("/auth/context");
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async testConnection() {
    if (!localStorage.getItem('authToken')) return true;
    try {
      console.log("🔍 Testing API connection...");
      const health = await this.healthCheck();
      console.log("✅ API Connection successful:", health);
      return true;
    } catch (error) {
      console.error("❌ API Connection failed:", error);
      return false;
    }
  }

  // =========================== UTILITY METHODS ===========================

  cacheGroups(groups) {
    localStorage.setItem("cachedGroups", JSON.stringify(groups));
  }

  formatCurrency(amount) {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
    }).format(amount);
  }

  // =========================== APPLICANT MANAGEMENT METHODS ===========================

  async getListings(groupId = null) {
    
    try {
      const endpoint = groupId ? `/listings?groupId=${groupId}` : "/listings";
      return await this.makeRequest(endpoint);
    } catch (error) {
      console.warn("❌ Failed to fetch listings:", error);
      return [];
    }
  }

  async createListing(listingData) {
    return await this.makeRequest("/listings", {
      method: "POST",
      body: JSON.stringify(listingData),
    });
  }

  async updateListing(id, listingData) {
    return await this.makeRequest(`/listings/${id}`, {
      method: "PUT",
      body: JSON.stringify(listingData),
    });
  }

  async deleteListing(id) {
    return await this.makeRequest(`/listings/${id}`, {
      method: "DELETE",
    });
  }

  async getApplications(listingId) {
    return await this.makeRequest(`/listings/${listingId}/applications`);
  }

  async updateApplicationStatus(applicationId, status) {
    return await this.makeRequest(`/applications/${applicationId}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    });
  }

  async rejectApplicant(applicationId, reason = "") {
    return await this.makeRequest(`/applications/${applicationId}/reject`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  }

  async acceptApplicant(applicationId) {
    return await this.makeRequest(`/applications/${applicationId}/accept`, {
      method: "POST",
    });
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
      method: "POST",
      body: JSON.stringify(activityData),
    });
  }

  async submitGameResult(gameId, resultData) {
    return await this.makeRequest(`/games/${gameId}/result`, {
      method: "POST",
      body: JSON.stringify(resultData),
    });
  }
  // =========================== CHILD PROFILE METHODS ===========================

  async addChildProfile(childData) {
    console.log("👶 Adding child profile:", childData);
    try {
      const response = await this.makeRequest("/auth/add-child", {
        method: "POST",
        body: JSON.stringify(childData),
      });
      console.log("✅ Child profile added:", response);
      return response;
    } catch (error) {
      console.error("❌ Failed to add child profile:", error);
      throw error;
    }
  }

  async getChildProfiles() {
    try {
      const response = await this.makeRequest("/auth/children");
      return response;
    } catch (error) {
      console.error("❌ Failed to fetch child profiles:", error);
      throw error;
    }
  }

  async updateChildProfile(childId, childData) {
    try {
      const response = await this.makeRequest(`/auth/children/${childId}`, {
        method: "PUT",
        body: JSON.stringify(childData),
      });
      return response;
    } catch (error) {
      console.error("❌ Failed to update child profile:", error);
      throw error;
    }
  }

  async deleteChildProfile(childId) {
    try {
      return await this.makeRequest(`/auth/children/${childId}`, {
        method: "DELETE",
      });
    } catch (error) {
      console.error("❌ Failed to delete child profile:", error);
      throw error;
    }
  }

  // =========================== ORGANIZATION TOGGLE METHODS ===========================

  async getUserGroups() {
    try {
      return await this.makeRequest("/auth/clubs");
    } catch (error) {
      console.error("❌ Failed to fetch groups:", error);
      throw error;
    }
  }

  async switchPrimaryGroup(groupId) {
    try {
      const response = await this.makeRequest(`/auth/switch-group/${groupId}`, {
        method: "POST",
      });
      
      return response;
    } catch (error) {
      console.error("❌ Failed to switch group:", error);
      throw error;
    }
  }

  // =========================== PASSWORD RECOVERY METHODS ===========================

  async requestPasswordReset(email) {
    try {
      return await this.makeRequest("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
    } catch (error) {
      console.error("❌ Failed to request password reset:", error);
      throw error;
    }
  }

  async validateResetToken(token) {
    try {
      return await this.makeRequest(
        `/auth/validate-reset-token?token=${encodeURIComponent(token)}`,
      );
    } catch (error) {
      console.error("❌ Failed to validate reset token:", error);
      throw error;
    }
  }

  async resetPassword(token, newPassword) {
    try {
      return await this.makeRequest("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password: newPassword }),
      });
    } catch (error) {
      console.error("❌ Failed to reset password:", error);
      throw error;
    }
  }

  // =========================== ENHANCED PROFILE METHODS ===========================

  async updateUserProfile(profileData) {
    try {
      return await this.makeRequest("/auth/profile", {
        method: "PUT",
        body: JSON.stringify(profileData),
      });
    } catch (error) {
      console.error("❌ Failed to update profile:", error);
      throw error;
    }
  }

  async getUserProfile() {
    try {
      return await this.makeRequest("/auth/profile");
    } catch (error) {
      console.error("❌ Failed to fetch profile:", error);
      throw error;
    }
  }

  // =========================== ENHANCED REGISTRATION ===========================

  async registerWithProfile(userData) {
    try {
      const response = await this.makeRequest("/auth/register", {
        method: "POST",
        body: JSON.stringify(userData),
      });
      if (response.token) {
        this.setToken(response.token);
        localStorage.setItem("currentUser", JSON.stringify(response.user));
      }
      return response;
    } catch (error) {
      console.error("❌ Failed to register with profile:", error);
      throw error;
    }
  }

  // =========================== PLAYER DASHBOARD WITH CHILD SUPPORT ===========================

  async getPlayerDashboardDataEnhanced() {
    try {
      return await this.makeRequest("/dashboard/player-enhanced");
    } catch (error) {
      console.warn("❌ Failed to fetch enhanced player dashboard data:", error);
      try {
        const [events, groups, teams, payments, bookings, children, profile] =
          await Promise.allSettled([
            this.getEvents(),
            this.getGroups(),
            this.getTeams(),
            this.getPayments(),
            this.getUserBookings(),
            this.getChildProfiles().catch(() => ({ children: [] })),
            this.getUserProfile().catch(() => ({ profile: null })),
          ]);
        return {
          player: profile.status === "fulfilled" ? profile.value.profile : null,
          children:
            children.status === "fulfilled" ? children.value.children : [],
          groups: groups.status === "fulfilled" ? groups.value : [],
          teams: teams.status === "fulfilled" ? teams.value : [],
          events: events.status === "fulfilled" ? events.value : [],
          payments: payments.status === "fulfilled" ? payments.value : [],
          bookings: bookings.status === "fulfilled" ? bookings.value : [],
          applications: [],
        };
      } catch (fallbackError) {
        console.error(
          "❌ Enhanced dashboard fallback loading failed:",
          fallbackError,
        );
        return { player: null, attendance: null, clubs: [], teams: [], events: [], payments: [], bookings: [], applications: [], invitations: [], statistics: {} };
      }
    }
  }

  // =========================== EVENT BOOKING WITH CHILD SUPPORT ===========================

  async bookEventForChild(eventId, childId, bookingData = {}) {
    try {
      return await this.makeRequest(`/events/${eventId}/book-child`, {
        method: "POST",
        body: JSON.stringify({ childId, ...bookingData }),
      });
    } catch (error) {
      console.error("❌ Failed to book event for child:", error);
      throw error;
    }
  }

  // =========================== PAYMENT METHODS WITH CHILD SUPPORT ===========================

  async getPaymentsForChild(childId, filters = {}) {
    try {
      const queryParams = new URLSearchParams({
        childId,
        ...filters,
      }).toString();
      return await this.makeRequest(`/payments/child?${queryParams}`);
    } catch (error) {
      console.warn("❌ Failed to fetch child payments:", error);
      return [];
    }
  }

  async createPaymentForChild(paymentData) {
    try {
      return await this.makeRequest("/payments/child", {
        method: "POST",
        body: JSON.stringify(paymentData),
      });
    } catch (error) {
      console.error("❌ Failed to create child payment:", error);
      throw error;
    }
  }

  // =========================== CLUB APPLICATION WITH CHILD SUPPORT ===========================

  async applyToGroupForChild(groupId, childId, applicationData) {
    try {
      return await this.makeRequest(`/clubs/${groupId}/apply-child`, {
        method: "POST",
        body: JSON.stringify({ childId, ...applicationData }),
      });
    } catch (error) {
      console.error("❌ Failed to apply to club for child:", error);
      throw error;
    }
  }

  // =========================== TEAM ASSIGNMENT WITH CHILD SUPPORT ===========================

  async assignChildToTeam(teamId, childId, assignmentData) {
    try {
      return await this.makeRequest(`/teams/${teamId}/assign-child`, {
        method: "POST",
        body: JSON.stringify({ childId, ...assignmentData }),
      });
    } catch (error) {
      console.error("❌ Failed to assign child to team:", error);
      throw error;
    }
  }

  // =========================== AVAILABILITY SUBMISSION ===========================

  async submitAvailabilityForChild(eventId, childId, availabilityData) {
    try {
      return await this.makeRequest(`/events/${eventId}/availability-child`, {
        method: "POST",
        body: JSON.stringify({ childId, ...availabilityData }),
      });
    } catch (error) {
      console.error("❌ Failed to submit child availability:", error);
      throw error;
    }
  }

  // =========================== NOTIFICATION METHODS ===========================

  async getNotificationsEnhanced(filters = {}) {
    try {
      const queryParams = new URLSearchParams(filters).toString();
      const endpoint = queryParams
        ? `/notifications?${queryParams}`
        : "/notifications";
      return await this.makeRequest(endpoint);
    } catch (error) {
      console.warn("❌ Failed to fetch notifications:", error);
      return [];
    }
  }

  async markNotificationAsReadEnhanced(notificationId) {
    try {
      return await this.makeRequest(`/notifications/${notificationId}/read`, {
        method: "POST",
      });
    } catch (error) {
      console.error("❌ Failed to mark notification as read:", error);
      throw error;
    }
  }

  // =========================== DOCUMENT METHODS ===========================

  async getDocumentsEnhanced(groupId = null) {
    try {
      const endpoint = groupId ? `/documents?groupId=${groupId}` : "/documents";
      return await this.makeRequest(endpoint);
    } catch (error) {
      console.warn("❌ Failed to fetch documents:", error);
      return [];
    }
  }

  async downloadDocument(documentId) {
    try {
      const response = await fetch(
        `${this.baseURL}/documents/${documentId}/download`,
        {
          headers: { Authorization: `Bearer ${this.token}` },
        },
      );
      if (!response.ok) throw new Error("Failed to download document");
      return response.blob();
    } catch (error) {
      console.error("❌ Failed to download document:", error);
      throw error;
    }
  }

  // =========================== ENHANCED ADMIN DASHBOARD ===========================

  async getAdminDashboardDataEnhanced() {
    try {
      return await this.makeRequest("/dashboard/admin-enhanced");
    } catch (error) {
      console.warn("❌ Failed to fetch enhanced admin dashboard data:", error);
      try {
        const [
          groups,
          players,
          staff,
          events,
          teams,
          payments,
          children,
          userGroups,
        ] = await Promise.allSettled([
          this.getGroups(),
          this.getPlayers(),
          this.getStaff(),
          this.getEvents(),
          this.getTeams(),
          this.getPayments(),
          this.getChildProfiles().catch(() => []),
          this.getUserGroups().catch(() => ({ groups: [] })),
        ]);
        return {
          groups: groups.status === "fulfilled" ? groups.value : [],
          players: players.status === "fulfilled" ? players.value : [],
          staff: staff.status === "fulfilled" ? staff.value : [],
          events: events.status === "fulfilled" ? events.value : [],
          teams: teams.status === "fulfilled" ? teams.value : [],
          payments: payments.status === "fulfilled" ? payments.value : [],
          children: children.status === "fulfilled" ? children.value : [],
          userGroups:
            userGroups.status === "fulfilled" ? userGroups.value.groups : [],
          statistics: {
            total_groups:
              groups.status === "fulfilled" ? groups.value.length : 0,
            total_players:
              players.status === "fulfilled" ? players.value.length : 0,
            total_staff: staff.status === "fulfilled" ? staff.value.length : 0,
            total_events:
              events.status === "fulfilled" ? events.value.length : 0,
            total_teams: teams.status === "fulfilled" ? teams.value.length : 0,
            total_children:
              children.status === "fulfilled" ? children.value.length : 0,
            monthly_revenue: 0,
          },
        };
      } catch (fallbackError) {
        console.error(
          "❌ Enhanced admin dashboard fallback failed:",
          fallbackError,
        );
        return { groups: [], feed: [], messages: [], players: [], events: [], teams: [] };
      }
    }
  }

  // =========================== POLLS & VOTING ===========================
  async getPolls(groupId) {
    try {
      const response = await this.makeRequest(
        `/clubs/${groupId || "demo-club-id"}/polls`,
      );
      return Array.isArray(response) ? response : response.polls || [];
    } catch (error) {
      console.warn("getPolls failed, returning mock", error);
      return [];
    }
  }

  async createPoll(payload) {
    return await this.makeRequest("/polls", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async voteOnPoll(pollId, optionId) {
    return await this.makeRequest(`/polls/${pollId}/vote`, {
      method: "POST",
    });
  }

  // =========================== TOURNAMENTS ===========================
  async getTournaments(groupId = null) {
    
    try {
      const events = await this.getEvents(groupId);
      const directTournaments = await this.makeRequest("/tournaments");
      // Combine events of type tournament and direct tournament records
      const eventTournaments = events.filter((e) => e.event_type === "tournament" || e.type === "tournament");
      return [...eventTournaments, ...directTournaments];
    } catch (error) {
      console.warn("getTournaments failed", error);
      return [];
    }
  }

  async createTournament(payload) {
    return await this.makeRequest("/tournaments", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async getTournamentDetails(tournamentId) {
    return await this.makeRequest(`/tournaments/${tournamentId}`);
  }

  async getTournamentPitches(tournamentId) {
    return await this.makeRequest(`/tournaments/${tournamentId}/pitches`);
  }

  async createTournamentPitch(tournamentId, pitchData) {
    return await this.makeRequest(`/tournaments/${tournamentId}/pitches`, {
      method: "POST",
      body: JSON.stringify(pitchData),
    });
  }

  async autoScheduleTournament(tournamentId, scheduleData) {
    return await this.makeRequest(`/tournaments/${tournamentId}/auto-schedule`, {
      method: "POST",
      body: JSON.stringify(scheduleData),
    });
  }

  async getTournamentBracket(tournamentId) {
    return await this.makeRequest(`/tournaments/${tournamentId}/bracket`);
  }


  // =========================== SCOUTING ===========================
  async getScoutingReports(filters = {}) {
    const queryParams = new URLSearchParams(filters).toString();
    return await this.makeRequest(`/scouting/reports?${queryParams}`);
  }

  async submitScoutingReport(reportData) {
    return await this.makeRequest("/scouting/reports", {
      method: "POST",
      body: JSON.stringify(reportData),
    });
  }

  async getScoutingAnalytics() {
    return await this.makeRequest("/scouting/analytics");
  }

  async requestScoutContact(requestId, playerId) {
    return await this.makeRequest("/scouting/contact-requests", {
      method: "POST",
      body: JSON.stringify({ playerId, requestId }),
    });
  }

  // =========================== CAMPS & GROUPS ===========================
  async createCampGroup(eventId, groupData) {
    return await this.makeRequest(`/events/${eventId}/clubs`, {
      method: "POST",
      body: JSON.stringify(groupData),
    });
  }

  async assignPlayerToCampGroup(eventId, assignmentData) {
    return await this.makeRequest(`/events/${eventId}/assign-group`, {
      method: "POST",
      body: JSON.stringify(assignmentData),
    });
  }

  async assignCampBib(eventId, bibData) {
    return await this.makeRequest(`/events/${eventId}/bibs`, {
      method: "POST",
      body: JSON.stringify(bibData),
    });
  }

  async exportAttendeeData(eventId) {
    // This returns a blob for CSV export
    const response = await fetch(`${this.baseURL}/events/${eventId}/export`, {
      headers: { Authorization: `Bearer ${this.token}` },
    });
    if (!response.ok) throw new Error("Export failed");
    return await response.blob();
  }

  async checkInPlayer(eventId, checkInData) {
    return await this.makeRequest(`/events/${eventId}/checkin`, {
      method: "POST",
      body: JSON.stringify(checkInData),
    });
  }

  async updateMatchStats(matchId, payload) {
    return await this.makeRequest(`/tournaments/matches/${matchId}/result`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async recordMatchResult(eventId, payload) {
    return await this.makeRequest(`/events/${eventId}/result`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  // =========================== UTILITY METHODS ===========================

  calculateAge(dateOfBirth) {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }
    return age;
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  handleEnhancedError(error, context = "") {
    console.error(`❌ Enhanced API Error ${context}:`, error);
    const enhancedMessages = {
      "child-profile":
        "Unable to manage child profile. Please check your parent account permissions.",
      "group-switch":
        "Unable to switch group. Please verify your group access.",
      "password-reset":
        "Password reset failed. Please try again or contact support.",
      "profile-update":
        "Profile update failed. Please check your information and try again.",
      "payment-child":
        "Unable to process payment for child. Please verify the payment details.",
      "team-assignment":
        "Team assignment failed. Please check team availability and permissions.",
    };
    const message =
      enhancedMessages[context] ||
      error.message ||
      "An unexpected error occurred";
    return { error: true, message, context, originalError: error.message };
  }

  // Tactical Formations
  async getTacticalFormations(orgId, teamId = null) {
    let endpoint = `/tactical?group_id=${orgId}`;
    if (teamId) endpoint += `&team_id=${teamId}`;
    return await this.makeRequest(endpoint);
  }

  async saveTacticalFormation(data) {
    return await this.makeRequest("/tactical", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async deleteTacticalFormation(id) {
    return await this.makeRequest(`/tactical/${id}`, {
      method: "DELETE",
    });
  }

  // Messenger & Feed
  async getFeed(orgId) {
    return await this.makeRequest(`/feed?org_id=${orgId}`);
  }

  async postToFeed(orgId, data) {
    return await this.makeRequest(`/feed?org_id=${orgId}`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getMessengerConversations(orgId) {
    return await this.makeRequest(`/messages?org_id=${orgId}`);
  }

  async getConversationMessages(conversationId) {
    return await this.makeRequest(`/messages/${conversationId}`);
  }

  async postConversationMessage(conversationId, data) {
    return await this.makeRequest(`/messages/${conversationId}`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // Scouting Verifications
  async submitScoutVerification(data) {
    return await this.makeRequest("/scouting/verify-me", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getPlatformScoutVerifications(status = "pending") {
    return await this.makeRequest(
      `/platform-admin/scout-verifications?status=${status}`,
    );
  }

  async resolvePlatformScoutVerification(requestId, status, adminNotes) {
    return await this.makeRequest(
      `/platform-admin/scout-verifications/${requestId}/resolve`,
      {
        method: "POST",
        body: JSON.stringify({ status, adminNotes }),
      },
    );
  }

  async verifyClubScout(staffId, verified) {
    return await this.makeRequest(`/staff/${staffId}/verify-scout`, {
      method: "PATCH",
      body: JSON.stringify({ verified }),
    });
  }

  } // Close class ApiService

  // Expose class to window
  window.ApiService = ApiService;
} // Close if (typeof ApiService === 'undefined')
// Create and export a singleton instance
// Use window.ApiService explicitly to ensure it's found even if local scoping is tricky
if (!window.apiService && typeof window.ApiService !== 'undefined') {
  window.apiService = new window.ApiService();
}

// Enhanced error handling and logging
window.addEventListener("error", function (event) {
  if (
    event.error &&
    event.error.message &&
    event.error.message.includes("apiService")
  ) {
    console.error("🚨 API Service Error:", event.error);
  }
});

console.log(
  "✅ Complete Production API Service loaded (v20260429_v18) with proper environment detection!",
);
