class ApiService {
  constructor() {
    this.baseURL = 'https://api.clubhubsports.net/api';
    this.token = localStorage.getItem('authToken');
    console.log('🌐 API Service initialized with baseURL:', this.baseURL);
  }

   setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('authToken', token);
        } else {
            localStorage.removeItem('authToken');
        }
    }

    // Get authentication headers
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json',
        };
        
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        
        return headers;
    }

    // Generic request method
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: this.getHeaders(),
            ...options,
        };

        try {
            console.log(`🌐 API Request: ${options.method || 'GET'} ${url}`);
            
            const response = await fetch(url, config);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({
                    error: 'Network error',
                    message: `HTTP ${response.status}: ${response.statusText}`
                }));
                throw new Error(errorData.message || errorData.error || 'API request failed');
            }

            const data = await response.json();
            console.log(`✅ API Response: ${options.method || 'GET'} ${url}`, data);
            
            return data;
        } catch (error) {
            console.error(`❌ API Error: ${options.method || 'GET'} ${url}`, error);
            throw error;
        }
    }

    // AUTH ENDPOINTS
    async register(userData) {
        return this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData),
        });
    }

    async login(credentials) {
        const response = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify(credentials),
        });
        
        if (response.token) {
            this.setToken(response.token);
        }
        
        return response;
    }

    async logout() {
        const response = await this.request('/auth/logout', {
            method: 'POST',
        });
        
        this.setToken(null);
        return response;
    }

    async getCurrentUser() {
        return this.request('/auth/me');
    }

    async findUserByEmail(email) {
        return this.request(`/auth/find-user?email=${encodeURIComponent(email)}`);
    }

    // DASHBOARD ENDPOINTS
    async getAdminDashboardData() {
        return this.request('/dashboard/admin');
    }

    async getPlayerDashboardData() {
        return this.request('/dashboard/player');
    }

    // CLUB ENDPOINTS
    async getClubs(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.request(`/clubs${queryString ? `?${queryString}` : ''}`);
    }

    async getClub(clubId) {
        return this.request(`/clubs/${clubId}`);
    }

    async createClub(clubData) {
        return this.request('/clubs', {
            method: 'POST',
            body: JSON.stringify(clubData),
        });
    }

    async updateClub(clubId, clubData) {
        return this.request(`/clubs/${clubId}`, {
            method: 'PUT',
            body: JSON.stringify(clubData),
        });
    }

    async deleteClub(clubId) {
        return this.request(`/clubs/${clubId}`, {
            method: 'DELETE',
        });
    }

    async applyToClub(clubId, applicationData) {
        return this.request(`/clubs/${clubId}/apply`, {
            method: 'POST',
            body: JSON.stringify(applicationData),
        });
    }

    async getClubApplications(clubId) {
        return this.request(`/clubs/${clubId}/applications`);
    }

    // PLAYER ENDPOINTS
    async getPlayers(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.request(`/players${queryString ? `?${queryString}` : ''}`);
    }

    async getPlayer(playerId) {
        return this.request(`/players/${playerId}`);
    }

    async createPlayer(playerData) {
        return this.request('/players', {
            method: 'POST',
            body: JSON.stringify(playerData),
        });
    }

    async updatePlayer(playerId, playerData) {
        return this.request(`/players/${playerId}`, {
            method: 'PUT',
            body: JSON.stringify(playerData),
        });
    }

    async deletePlayer(playerId) {
        return this.request(`/players/${playerId}`, {
            method: 'DELETE',
        });
    }

    async getPlayerStats(playerId) {
        return this.request(`/players/${playerId}/stats`);
    }

    async updatePlayerPaymentStatus(playerId, status) {
        return this.request(`/players/${playerId}/payment-status`, {
            method: 'PATCH',
            body: JSON.stringify({ paymentStatus: status }),
        });
    }

    // STAFF ENDPOINTS
    async getStaff(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.request(`/staff${queryString ? `?${queryString}` : ''}`);
    }

    async getStaffMember(staffId) {
        return this.request(`/staff/${staffId}`);
    }

    async createStaff(staffData) {
        return this.request('/staff', {
            method: 'POST',
            body: JSON.stringify(staffData),
        });
    }

    async updateStaff(staffId, staffData) {
        return this.request(`/staff/${staffId}`, {
            method: 'PUT',
            body: JSON.stringify(staffData),
        });
    }

    async deleteStaff(staffId) {
        return this.request(`/staff/${staffId}`, {
            method: 'DELETE',
        });
    }

    async getStaffByClub(clubId) {
        return this.request(`/staff/club/${clubId}`);
    }

    async updateStaffPermissions(staffId, permissions) {
        return this.request(`/staff/${staffId}/permissions`, {
            method: 'PATCH',
            body: JSON.stringify({ permissions }),
        });
    }

    // TEAM ENDPOINTS
    async getTeams(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.request(`/teams${queryString ? `?${queryString}` : ''}`);
    }

    async getTeam(teamId) {
        return this.request(`/teams/${teamId}`);
    }

    async createTeam(teamData) {
        return this.request('/teams', {
            method: 'POST',
            body: JSON.stringify(teamData),
        });
    }

    async updateTeam(teamId, teamData) {
        return this.request(`/teams/${teamId}`, {
            method: 'PUT',
            body: JSON.stringify(teamData),
        });
    }

    async deleteTeam(teamId) {
        return this.request(`/teams/${teamId}`, {
            method: 'DELETE',
        });
    }

    async getPlayerTeams(userId) {
        return this.request(`/teams/player/${userId}`);
    }

    async assignPlayerToTeam(teamId, assignmentData) {
        return this.request(`/teams/${teamId}/players`, {
            method: 'POST',
            body: JSON.stringify(assignmentData),
        });
    }

    async removePlayerFromTeam(teamId, playerId) {
        return this.request(`/teams/${teamId}/players/${playerId}`, {
            method: 'DELETE',
        });
    }

    async getTeamStats(teamId) {
        return this.request(`/teams/${teamId}/stats`);
    }

    // EVENT ENDPOINTS
    async getEvents(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.request(`/events${queryString ? `?${queryString}` : ''}`);
    }

    async getEvent(eventId) {
        return this.request(`/events/${eventId}`);
    }

    async createEvent(eventData) {
        return this.request('/events', {
            method: 'POST',
            body: JSON.stringify(eventData),
        });
    }

    async updateEvent(eventId, eventData) {
        return this.request(`/events/${eventId}`, {
            method: 'PUT',
            body: JSON.stringify(eventData),
        });
    }

    async deleteEvent(eventId) {
        return this.request(`/events/${eventId}`, {
            method: 'DELETE',
        });
    }

    async bookEvent(eventId, bookingData) {
        return this.request(`/events/${eventId}/book`, {
            method: 'POST',
            body: JSON.stringify(bookingData),
        });
    }

    async cancelEventBooking(bookingId) {
        return this.request(`/events/bookings/${bookingId}/cancel`, {
            method: 'POST',
        });
    }

    async getEventBookings(eventId) {
        return this.request(`/events/${eventId}/bookings`);
    }

    async getUserBookings(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.request(`/events/bookings/my-bookings${queryString ? `?${queryString}` : ''}`);
    }

    async submitAvailability(eventId, availabilityData) {
        return this.request(`/events/${eventId}/availability`, {
            method: 'POST',
            body: JSON.stringify(availabilityData),
        });
    }

    async getEventAvailability(eventId) {
        return this.request(`/events/${eventId}/availability`);
    }

    // PAYMENT ENDPOINTS
    async getPayments(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.request(`/payments${queryString ? `?${queryString}` : ''}`);
    }

    async getPayment(paymentId) {
        return this.request(`/payments/${paymentId}`);
    }

    async createPayment(paymentData) {
        return this.request('/payments', {
            method: 'POST',
            body: JSON.stringify(paymentData),
        });
    }

    async createPaymentIntent(intentData) {
        return this.request('/payments/create-intent', {
            method: 'POST',
            body: JSON.stringify(intentData),
        });
    }

    async confirmPayment(paymentIntentId, paymentId) {
        return this.request('/payments/confirm-payment', {
            method: 'POST',
            body: JSON.stringify({
                paymentIntentId,
                paymentId,
            }),
        });
    }

    async markPaymentAsPaid(paymentId, notes = '') {
        return this.request(`/payments/${paymentId}/mark-paid`, {
            method: 'PATCH',
            body: JSON.stringify({ notes }),
        });
    }

    async generatePaymentLink(paymentId) {
        return this.request(`/payments/${paymentId}/payment-link`);
    }

    async sendPaymentReminder(paymentId) {
        return this.request(`/payments/${paymentId}/send-reminder`, {
            method: 'POST',
        });
    }

    async getPublicPayment(paymentId, token) {
        return this.request(`/payments/public/${paymentId}?token=${encodeURIComponent(token)}`);
    }

    async generateMonthlyFees(clubId, month, year) {
        return this.request(`/payments/generate-monthly-fees/${clubId}`, {
            method: 'POST',
            body: JSON.stringify({ month, year }),
        });
    }

    // FINANCIAL ENDPOINTS
    async processStripePayment(paymentData) {
        return this.request('/payments/process-stripe', {
            method: 'POST',
            body: JSON.stringify(paymentData),
        });
    }

    async getFinancialSummary(clubId) {
        return this.request(`/clubs/${clubId}/financial-summary`);
    }

    async getPaymentAnalytics(clubId, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.request(`/clubs/${clubId}/payment-analytics${queryString ? `?${queryString}` : ''}`);
    }

    // LISTING ENDPOINTS (for public events/camps)
    async getListings(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.request(`/listings${queryString ? `?${queryString}` : ''}`);
    }

    async createListing(listingData) {
        return this.request('/listings', {
            method: 'POST',
            body: JSON.stringify(listingData),
        });
    }

    async updateListing(listingId, listingData) {
        return this.request(`/listings/${listingId}`, {
            method: 'PUT',
            body: JSON.stringify(listingData),
        });
    }

    async deleteListing(listingId) {
        return this.request(`/listings/${listingId}`, {
            method: 'DELETE',
        });
    }

    // DOCUMENT ENDPOINTS
    async getDocuments(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.request(`/documents${queryString ? `?${queryString}` : ''}`);
    }

    async uploadDocument(documentData) {
        return this.request('/documents', {
            method: 'POST',
            body: JSON.stringify(documentData),
        });
    }

    async downloadDocument(documentId) {
        return this.request(`/documents/${documentId}/download`);
    }

    async deleteDocument(documentId) {
        return this.request(`/documents/${documentId}`, {
            method: 'DELETE',
        });
    }

    // NOTIFICATION ENDPOINTS
    async getNotifications() {
        return this.request('/notifications');
    }

    async markNotificationAsRead(notificationId) {
        return this.request(`/notifications/${notificationId}/read`, {
            method: 'PATCH',
        });
    }

    async sendNotification(notificationData) {
        return this.request('/notifications', {
            method: 'POST',
            body: JSON.stringify(notificationData),
        });
    }

    // ANALYTICS ENDPOINTS
    async getClubAnalytics(clubId, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.request(`/clubs/${clubId}/analytics${queryString ? `?${queryString}` : ''}`);
    }

    async getPlayerAnalytics(playerId, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.request(`/players/${playerId}/analytics${queryString ? `?${queryString}` : ''}`);
    }

    // SEARCH ENDPOINTS
    async searchClubs(searchTerm, filters = {}) {
        const params = { search: searchTerm, ...filters };
        return this.getClubs(params);
    }

    async searchEvents(searchTerm, filters = {}) {
        const params = { search: searchTerm, ...filters };
        return this.getEvents(params);
    }

    async searchPlayers(searchTerm, filters = {}) {
        const params = { search: searchTerm, ...filters };
        return this.getPlayers(params);
    }

    // UTILITY METHODS
    async healthCheck() {
        return this.request('/health');
    }

    async uploadFile(file, endpoint = '/upload') {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${this.baseURL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Authorization': this.token ? `Bearer ${this.token}` : undefined,
            },
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({
                error: 'Upload failed',
                message: `HTTP ${response.status}: ${response.statusText}`
            }));
            throw new Error(errorData.message || errorData.error || 'File upload failed');
        }

        return response.json();
    }

    // BATCH OPERATIONS
    async batchCreatePlayers(playersData) {
        return this.request('/players/batch', {
            method: 'POST',
            body: JSON.stringify({ players: playersData }),
        });
    }

    async batchUpdatePayments(paymentsData) {
        return this.request('/payments/batch-update', {
            method: 'PATCH',
            body: JSON.stringify({ payments: paymentsData }),
        });
    }

    async batchSendInvitations(invitationsData) {
        return this.request('/invitations/batch', {
            method: 'POST',
            body: JSON.stringify({ invitations: invitationsData }),
        });
    }

    // REPORTING ENDPOINTS
    async generateClubReport(clubId, reportType, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.request(`/reports/club/${clubId}/${reportType}${queryString ? `?${queryString}` : ''}`);
    }

    async generatePaymentReport(clubId, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.request(`/reports/payments/${clubId}${queryString ? `?${queryString}` : ''}`);
    }

    async generateAttendanceReport(teamId, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.request(`/reports/attendance/${teamId}${queryString ? `?${queryString}` : ''}`);
    }

    // INTEGRATION ENDPOINTS
    async syncWithExternalCalendar(calendarData) {
        return this.request('/integrations/calendar/sync', {
            method: 'POST',
            body: JSON.stringify(calendarData),
        });
    }

    async importPlayersFromCSV(csvData) {
        return this.request('/integrations/import/players', {
            method: 'POST',
            body: JSON.stringify({ csvData }),
        });
    }

    async exportClubData(clubId, format = 'json') {
        return this.request(`/integrations/export/club/${clubId}?format=${format}`);
    }

    // ERROR HANDLING HELPERS
    handleApiError(error) {
        console.error('API Error:', error);
        
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
            this.setToken(null);
            window.location.href = '/login.html';
            return;
        }
        
        if (error.message.includes('403') || error.message.includes('Forbidden')) {
            showNotification('You do not have permission to perform this action', 'error');
            return;
        }
        
        if (error.message.includes('404') || error.message.includes('Not Found')) {
            showNotification('Requested resource not found', 'error');
            return;
        }
        
        if (error.message.includes('429') || error.message.includes('Too Many Requests')) {
            showNotification('Too many requests. Please try again later.', 'error');
            return;
        }
        
        showNotification(error.message || 'An unexpected error occurred', 'error');
    }

    // REQUEST INTERCEPTORS
    setRequestInterceptor(interceptor) {
        this.requestInterceptor = interceptor;
    }

    setResponseInterceptor(interceptor) {
        this.responseInterceptor = interceptor;
    }

    // CACHING HELPERS
    enableCaching() {
        this.cachingEnabled = true;
        this.cache = new Map();
    }

    disableCaching() {
        this.cachingEnabled = false;
        this.cache = null;
    }

    clearCache() {
        if (this.cache) {
            this.cache.clear();
        }
    }

    // RETRY LOGIC
    async requestWithRetry(endpoint, options = {}, maxRetries = 3) {
        let lastError;
        
        for (let i = 0; i <= maxRetries; i++) {
            try {
                return await this.request(endpoint, options);
            } catch (error) {
                lastError = error;
                
                if (i === maxRetries) {
                    throw error;
                }
                
                // Wait before retrying (exponential backoff)
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
            }
        }
        
        throw lastError;
    }
}

// Create and export global API service instance
const apiService = new APIService();

// Make it available globally
window.apiService = apiService;

console.log('✅ Enhanced API Service loaded with full functionality');

export default apiService;