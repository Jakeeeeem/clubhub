// Global Application State
window.AppState = {
  currentUser: null,
  userType: null,
  currentPage: "home",
  dashboardSection: "overview",
  clubs: [],
  players: [],
  staff: [],
  events: [],
  bookings: [],
  teams: [],
  notifications: [],
  isLoading: false,
  isLoggedIn: false,
  context: null,
  activeGroupId: null,
  statistics: {}
};

// Sync with localStorage on load
(function() {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
        try {
            window.AppState.currentUser = JSON.parse(storedUser);
            window.AppState.isLoggedIn = !!localStorage.getItem('authToken');
            window.AppState.userType = localStorage.getItem('userType') || window.AppState.currentUser.account_type;
        } catch (e) {
            console.error("Failed to parse stored user in AppState initialization", e);
        }
    }
})();
