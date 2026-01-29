const AppState = {
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
};

// Wait for all scripts to load before initializing
let initializationAttempts = 0;
const maxInitializationAttempts = 50; // 5 seconds max wait

function waitForApiService() {
  return new Promise((resolve, reject) => {
    function checkApiService() {
      if (typeof apiService !== "undefined") {
        console.log("✅ API Service found, initializing app...");
        resolve();
      } else if (initializationAttempts < maxInitializationAttempts) {
        initializationAttempts++;
        console.log(
          `⏳ Waiting for API Service... (${initializationAttempts}/${maxInitializationAttempts})`,
        );
        setTimeout(checkApiService, 100);
      } else {
        console.error("❌ API Service not available after 5 seconds");
        reject(new Error("API Service not available"));
      }
    }
    checkApiService();
  });
}

// Initialize App
document.addEventListener("DOMContentLoaded", async function () {
  console.log("🚀 DOM loaded, waiting for API service...");

  try {
    // Wait for API service to be available
    await waitForApiService();

    // Now initialize the app
    await initializeApp();
    await checkAuthState();
  } catch (error) {
    console.error("❌ Failed to initialize app:", error);

    // Fallback: Initialize without API service for basic functionality
    setupEventListeners();
    checkAuthStateWithoutAPI();
  }
});

async function initializeApp() {
  try {
    // Setup event listeners
    setupEventListeners();

    // Check if user is logged in
    await checkAuthState();

    // Load initial data if user is authenticated
    if (AppState.currentUser) {
      await loadInitialData();
    }

    console.log("✅ App initialized successfully");
  } catch (error) {
    console.error("❌ Failed to initialize app:", error);
    showNotification("Failed to load application: " + error.message, "error");
  }
}

function setupEventListeners() {
  // Form submissions
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");

  if (loginForm) {
    loginForm.addEventListener("submit", handleLogin);
  }

  if (registerForm) {
    registerForm.addEventListener("submit", handleRegister);
  }

  // Modal close events
  window.addEventListener("click", function (e) {
    if (e.target.classList.contains("modal")) {
      closeModal(e.target.id);
    }
  });

  // Handle browser back/forward buttons
  window.addEventListener("popstate", function (e) {
    if (e.state) {
      AppState.currentPage = e.state.page;
      updatePageContent();
    }
  });

  console.log("✅ Event listeners setup complete");
}

// Authentication Functions with API Service Checks
async function checkAuthState() {
  console.log("🔍 Checking auth state...");

  // Check if API service is available
  if (typeof apiService === "undefined") {
    console.warn("⚠️ API service not available, using localStorage fallback");
    checkAuthStateWithoutAPI();
    return;
  }

  const token = localStorage.getItem("authToken");
  console.log("🎫 Token found:", !!token);

  if (token) {
    // 🛡️ DEMO BYPASS: Skip API check if we are in an offline demo session
    if (localStorage.getItem("isDemoSession") === "true") {
      console.log("🛡️ Demo session detected - skipping API auth check");
      checkAuthStateWithoutAPI();
      return;
    }

    try {
      // Try to get current user from API
      console.log("📡 Fetching current user from API...");
      const user = await apiService.getCurrentUser();

      // Fetch full context (including role in current org)
      const context = await apiService.getContext();
      AppState.context = context;

      // Merge context role into user object for easy access
      if (context?.currentOrganization) {
        user.role =
          context.currentOrganization.role ||
          context.currentOrganization.user_role;
        user.currentOrgId = context.currentOrganization.id;
      }

      AppState.currentUser = user;
      AppState.userType = user.account_type;

      // Update localStorage with fresh data
      localStorage.setItem("currentUser", JSON.stringify(user));
      localStorage.setItem("userType", user.account_type);

      console.log("✅ User loaded from API:", user.email, "| Role:", user.role);
    } catch (error) {
      console.warn(
        "⚠️ API user fetch failed, trying localStorage fallback:",
        error,
      );
      checkAuthStateWithoutAPI();
    }
  } else {
    console.log("❌ No auth token found");
    clearAuthData();
  }

  // Update UI and handle redirects
  updateNavigation();
  handlePostAuthRedirect();
}

function checkAuthStateWithoutAPI() {
  console.log("🔍 Checking auth state without API (localStorage only)...");

  const storedUser = localStorage.getItem("currentUser");
  const storedUserType = localStorage.getItem("userType");
  const token = localStorage.getItem("authToken");

  if (storedUser && storedUserType && token) {
    try {
      AppState.currentUser = JSON.parse(storedUser);
      AppState.userType = storedUserType;
      console.log(
        "✅ User loaded from localStorage:",
        AppState.currentUser.email,
      );
    } catch (parseError) {
      console.error("❌ Failed to parse stored user data:", parseError);
      clearAuthData();
    }
  } else {
    console.log("❌ No valid auth data found in localStorage");
    clearAuthData();
  }

  // Update UI and handle redirects
  updateNavigation();
  handlePostAuthRedirect();
}

function handlePostAuthRedirect() {
  console.log("🔍 handlePostAuthRedirect called", {
    pathname: window.location.pathname,
    hasUser: !!AppState.currentUser,
    userType: AppState.userType,
    userRole: AppState.currentUser?.role,
  });

  // 1. Initial Login/Landing Redirect
  if (
    AppState.currentUser &&
    (window.location.pathname === "/" ||
      window.location.pathname.endsWith("index.html") ||
      window.location.pathname.endsWith("login.html"))
  ) {
    console.log("🔄 Redirecting authenticated user to dashboard...");
    redirectToDashboard();
    return;
  }

  // 2. Dashboard Access Enforcement - DISABLED for now to prevent conflicts
  // The dashboard HTML pages will handle their own auth checks
  // This was causing the redirect loop

  console.log("🔍 Final auth state:", {
    hasUser: !!AppState.currentUser,
    userEmail: AppState.currentUser?.email,
    userType: AppState.userType,
    contextRole: AppState.currentUser?.role,
  });
}

function clearAuthData() {
  localStorage.removeItem("authToken");
  localStorage.removeItem("currentUser");
  localStorage.removeItem("userType");
  AppState.currentUser = null;
  AppState.userType = null;
}

async function handleLogin(e) {
  e.preventDefault();

  // Clear previous errors
  document.querySelectorAll(".field-error").forEach((el) => el.remove());
  document
    .querySelectorAll("input")
    .forEach((input) => (input.style.borderColor = ""));

  try {
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;

    const response = await apiService.login(email, password);

    console.log("🔐 Login Response:", {
      user: response.user,
      account_type: response.user.account_type,
      role: response.user.role,
      email: response.user.email,
    });

    AppState.currentUser = response.user;
    AppState.userType = response.user.account_type;

    localStorage.setItem("currentUser", JSON.stringify(response.user));
    localStorage.setItem("userType", response.user.account_type);

    console.log("💾 Stored in localStorage:", {
      currentUser: localStorage.getItem("currentUser"),
      userType: localStorage.getItem("userType"),
    });

    closeModal("loginModal");

    console.log("🚀 Redirecting immediately with:", {
      userType: AppState.userType,
      account_type: response.user.account_type,
    });

    // Redirect IMMEDIATELY - don't load initial data yet
    // The dashboard will load its own data
    redirectToDashboard();

    showNotification("Login successful!", "success");
  } catch (error) {
    console.error("❌ Login failed:", error);

    if (error.message && error.message.toLowerCase().includes("password")) {
      const passwordField = document.getElementById("loginPassword");
      const errorDiv = document.createElement("div");
      errorDiv.className = "field-error";
      errorDiv.style.cssText =
        "color: #dc2626; font-size: 0.875rem; margin-top: 0.25rem; font-weight: 500;";
      errorDiv.textContent = "Incorrect password. Please try again.";

      passwordField.parentElement.appendChild(errorDiv);
      passwordField.focus();
      passwordField.select();
      passwordField.style.borderColor = "#dc2626";
    } else if (error.message && error.message.toLowerCase().includes("email")) {
      const emailField = document.getElementById("loginEmail");
      const errorDiv = document.createElement("div");
      errorDiv.className = "field-error";
      errorDiv.style.cssText =
        "color: #dc2626; font-size: 0.875rem; margin-top: 0.25rem; font-weight: 500;";
      errorDiv.textContent =
        "Email not found. Please check your email address.";

      emailField.parentElement.appendChild(errorDiv);
      emailField.focus();
      emailField.style.borderColor = "#dc2626";
    } else {
      showNotification(
        error.message || "Login failed. Please try again.",
        "error",
      );
    }
  }
}

async function handleRegister(e) {
  e.preventDefault();

  try {
    const accountType = document.getElementById("accountType").value;
    const firstName = document.getElementById("firstName").value;
    const lastName = document.getElementById("lastName").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    // Validation
    if (password !== confirmPassword) {
      showNotification("Passwords do not match", "error");
      return;
    }

    if (password.length < 6) {
      showNotification("Password must be at least 6 characters", "error");
      return;
    }

    // Check if API service is available
    if (typeof apiService === "undefined") {
      throw new Error(
        "API service not available. Please refresh the page and try again.",
      );
    }

    // Get organization types if applicable
    let orgTypes = [];
    if (accountType === "organization") {
      const checkboxes = document.querySelectorAll(
        'input[name="orgType"]:checked',
      );
      orgTypes = Array.from(checkboxes).map((cb) => cb.value);

      if (orgTypes.length === 0) {
        showNotification(
          "Please select at least one organization type",
          "error",
        );
        return;
      }
    }

    const userData = {
      firstName,
      lastName,
      email,
      password,
      accountType,
      orgTypes,
    };

    const response = await apiService.register(userData);

    AppState.currentUser = response.user;
    AppState.userType = response.user.account_type;

    // Store user data in localStorage
    localStorage.setItem("currentUser", JSON.stringify(response.user));
    localStorage.setItem("userType", response.user.account_type);

    closeModal("registerModal");
    updateNavigation();
    await loadInitialData();
    redirectToDashboard();

    showNotification("Account created successfully!", "success");
  } catch (error) {
    console.error("❌ Registration failed:", error);
    showNotification(
      error.message || "Registration failed. Please try again.",
      "error",
    );
  } finally {
    document.getElementById("registerForm")?.reset();
  }
}

async function logout() {
  try {
    // Try to logout via API if available
    if (typeof apiService !== "undefined" && apiService.logout) {
      await apiService.logout();
    }

    // Clear all state regardless of API success
    AppState.currentUser = null;
    AppState.userType = null;
    AppState.clubs = [];
    AppState.players = [];
    AppState.staff = [];
    AppState.events = [];
    AppState.bookings = [];
    AppState.teams = [];
    AppState.notifications = [];

    // Clear localStorage
    clearAuthData();

    updateNavigation();
    window.location.href = "index.html";

    showNotification("Logged out successfully", "success");
  } catch (error) {
    console.error("❌ Logout failed:", error);
    // Force logout even if API call fails
    clearAuthData();
    AppState.currentUser = null;
    AppState.userType = null;
    window.location.href = "index.html";
  }
}

// Data Loading Functions with API Service Checks
async function loadInitialData() {
  if (!AppState.currentUser) {
    console.log("❌ No current user, skipping data load");
    return;
  }

  // Check if API service is available
  if (typeof apiService === "undefined") {
    console.warn("⚠️ API service not available, skipping data load");
    showNotification(
      "Some features may not work - API service unavailable",
      "info",
    );
    return;
  }

  try {
    console.log("📊 Loading initial data for user type:", AppState.userType);

    // Load data based on user type
    switch (AppState.userType) {
      case "admin":
      case "organization":
        await loadAdminData();
        break;
      case "adult":
      default:
        await loadUserData();
        break;
    }

    // Load notifications for all users
    await loadNotifications();

    console.log("✅ Initial data loaded successfully");
  } catch (error) {
    console.error("❌ Failed to load initial data:", error);
    showNotification("Failed to load some data: " + error.message, "error");
  }
}

async function loadAdminData() {
  try {
    console.log("📊 Loading admin data...");

    // Try to load admin dashboard data
    const dashboardData = await apiService.getAdminDashboardData();

    AppState.clubs = dashboardData.clubs || [];
    AppState.players = dashboardData.players || [];
    AppState.staff = dashboardData.staff || [];
    AppState.events = dashboardData.events || [];
    AppState.teams = dashboardData.teams || [];

    console.log("✅ Admin data loaded:", {
      clubs: AppState.clubs.length,
      players: AppState.players.length,
      staff: AppState.staff.length,
      events: AppState.events.length,
      teams: AppState.teams.length,
    });
  } catch (error) {
    console.error("❌ Failed to load admin data:", error);
    await loadDataFallback();
  }
}

async function loadUserData() {
  console.log("📊 Loading user data for player dashboard...");

  try {
    // Load all data that players need with individual API calls for reliability
    const [clubs, events, playersResponse, staff, teams] = await Promise.all([
      apiService.getClubs().catch((e) => {
        console.warn("Failed to load clubs:", e);
        return [];
      }),
      apiService.getEvents().catch((e) => {
        console.warn("Failed to load events:", e);
        return [];
      }),
      apiService.getPlayers().catch((e) => {
        console.warn("Failed to load players:", e);
        return { players: [] };
      }),
      apiService.getStaff().catch((e) => {
        console.warn("Failed to load staff:", e);
        return [];
      }),
      apiService.getTeams().catch((e) => {
        console.warn("Failed to load teams:", e);
        return [];
      }),
    ]);

    AppState.clubs = clubs || [];
    AppState.events = events || [];
    AppState.players = playersResponse?.players || playersResponse || [];
    AppState.staff = staff || [];
    AppState.teams = teams || [];

    console.log("📊 User data loaded successfully:", {
      clubs: AppState.clubs.length,
      events: AppState.events.length,
      players: AppState.players.length,
      staff: AppState.staff.length,
      teams: AppState.teams.length,
    });

    // Debug: Check if current user is in players list
    const currentUserAsPlayer = AppState.players.find(
      (p) => p.email === AppState.currentUser?.email,
    );
    if (currentUserAsPlayer) {
      console.log(
        "✅ Current user found as player:",
        currentUserAsPlayer.first_name,
        currentUserAsPlayer.last_name,
      );
    } else {
      console.log("⚠️ Current user not found in players list");
      console.log("📧 Current user email:", AppState.currentUser?.email);
      console.log(
        "📧 Available player emails:",
        AppState.players.map((p) => p.email),
      );
    }
  } catch (error) {
    console.error("❌ Failed to load user data:", error);
    showNotification("Failed to load some data: " + error.message, "error");
  }
}

async function loadDataFallback() {
  try {
    console.log("📊 Loading data with fallback method...");

    const clubs = await apiService.getClubs().catch(() => []);
    const events = await apiService.getEvents().catch(() => []);

    AppState.clubs = clubs;
    AppState.events = events;

    console.log("✅ Fallback data loaded:", {
      clubs: AppState.clubs.length,
      events: AppState.events.length,
    });
  } catch (error) {
    console.error("❌ Fallback data loading failed:", error);
  }
}

async function loadNotifications() {
  try {
    if (apiService.getNotifications) {
      const notifications = await apiService.getNotifications();
      AppState.notifications = notifications || [];
      updateNotificationBadge();
    }
  } catch (error) {
    console.error("Failed to load notifications:", error);
    AppState.notifications = [];
  }
}

function updateNotificationBadge() {
  const unreadCount = AppState.notifications.filter((n) => !n.is_read).length;
  const badge = document.getElementById("notificationBadge");

  if (badge) {
    if (unreadCount > 0) {
      badge.textContent = unreadCount;
      badge.style.display = "inline-block";
    } else {
      badge.style.display = "none";
    }
  }
}

window.AppState = window.AppState || {};

async function getActiveClubId() {
  if (AppState.activeClubId) return AppState.activeClubId;

  // 1. Check Context (Most accurate for current session)
  try {
    const context = await apiService.getContext();
    if (context?.currentOrganization?.id) {
      AppState.activeClubId = context.currentOrganization.id;
      return AppState.activeClubId;
    }
  } catch (_) {
    /* fall through */
  }

  // 2. Authoritative source (fallback)
  try {
    const resp = await apiService.getUserOrganizations();
    const orgs = (resp && resp.organizations) || [];
    const primary = orgs.find((o) => o.is_primary) || orgs[0];
    if (primary?.id) {
      AppState.activeClubId = primary.id;
      return AppState.activeClubId;
    }
  } catch (_) {
    /* fall through */
  }

  // 3. Fallback to AppState clubs
  if (Array.isArray(AppState.clubs) && AppState.clubs.length) {
    const primaryFromDashboard =
      AppState.clubs.find((c) => c.is_primary) || AppState.clubs[0];
    if (primaryFromDashboard?.id) {
      AppState.activeClubId = primaryFromDashboard.id;
      return AppState.activeClubId;
    }
  }

  return null;
}

// Navigation Functions
function updateNavigation() {
  const navButtons = document.getElementById("navButtons");
  const loggedInNav = document.getElementById("loggedInNav");

  if (AppState.currentUser) {
    if (navButtons) navButtons.style.display = "none";
    if (loggedInNav) {
      loggedInNav.style.display = "flex";
      loggedInNav.innerHTML = `
                <div class="user-info">
                    <div class="user-avatar">${(AppState.currentUser.first_name || "U").charAt(0)}</div>
                    <span>Welcome, ${AppState.currentUser.first_name}</span>
                    ${
                      AppState.notifications.length > 0
                        ? `
                        <div class="notification-icon" onclick="showNotificationsModal()">
                            🔔
                            <span id="notificationBadge" class="notification-badge" style="display: none;"></span>
                        </div>
                    `
                        : ""
                    }
                </div>
                <button class="btn btn-secondary btn-small" onclick="logout()">Logout</button>
            `;
      updateNotificationBadge();
    }
  } else {
    if (navButtons) navButtons.style.display = "flex";
    if (loggedInNav) loggedInNav.style.display = "none";
  }
}

function redirectToDashboard() {
  // 0. Ensure we have the user
  if (!AppState.currentUser) return;

  const userType = AppState.userType; // Global type: 'organization' | 'adult' | ...
  const userRole = AppState.currentUser?.role; // Contextual role from API

  console.log(
    "🔄 Redirecting | Global Type:",
    userType,
    "| Context Role:",
    userRole,
  );

  // Priority 1: Global Account Type (organization account = admin dashboard)
  if (userType === "organization") {
    // Organization accounts should go to admin dashboard
    // They can switch to player view if they have that role in another org
    window.location.href = "admin-dashboard.html";
    return;
  }

  // Priority 2: Contextual Role for non-organization accounts
  if (userRole === "player" || userRole === "parent") {
    window.location.href = "player-dashboard.html";
    return;
  }

  if (["coach", "assistant-coach", "coaching-supervisor"].includes(userRole)) {
    window.location.href = "admin-dashboard.html"; // Coaches use admin dashboard
    return;
  }

  // Priority 3: Fallback based on account type
  switch (userType) {
    case "adult":
      window.location.href = "player-dashboard.html";
      break;
    default:
      window.location.href = "player-dashboard.html";
  }
}

// Modal Functions
function showModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = "block";
    document.body.style.overflow = "hidden";
    modal.classList.add("fade-in");
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = "none";
    document.body.style.overflow = "auto";
    modal.classList.remove("fade-in");
  }
}

function showLogin() {
  showModal("loginModal");
}

function showRegister() {
  showModal("registerModal");
}

function toggleOrgOptions() {
  const accountType = document.getElementById("accountType").value;
  const orgOptions = document.getElementById("orgOptions");

  if (orgOptions) {
    if (accountType === "organization") {
      orgOptions.style.display = "block";
    } else {
      orgOptions.style.display = "none";
    }
  }
}

function showNotification(message, type = "info") {
  const existingNotifications = document.querySelectorAll(".notification");
  existingNotifications.forEach((n) => n.remove());

  const notification = document.createElement("div");
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">&times;</button>
    `;

  if (!document.querySelector("#notification-styles")) {
    const styles = document.createElement("style");
    styles.id = "notification-styles";
    styles.textContent = `
            .notification {
                position: fixed;
                top: 100px;
                right: 20px;
                padding: 1rem 1.5rem;
                border-radius: 8px;
                color: white;
                font-weight: 600;
                z-index: 3000;
                display: flex;
                align-items: center;
                gap: 1rem;
                animation: slideInRight 0.3s ease-out;
                max-width: 400px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            }
            .notification-success { background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); }
            .notification-error { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); }
            .notification-info { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); }
            .notification button {
                background: none; border: none; color: white; font-size: 1.2rem; cursor: pointer;
                padding: 0; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center;
            }
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
    document.head.appendChild(styles);
  }

  document.body.appendChild(notification);
  setTimeout(() => {
    if (notification.parentElement) notification.remove();
  }, 5000);
}

function showLoading(show) {
  AppState.isLoading = show;
  let loader = document.getElementById("globalLoader");

  if (!loader && show) {
    loader = document.createElement("div");
    loader.id = "globalLoader";
    loader.innerHTML = `
            <div class="loader-overlay">
                <div class="loader-spinner">
                    <div class="spinner"></div>
                    <p>Loading...</p>
                </div>
            </div>
        `;

    const styles = document.createElement("style");
    styles.textContent = `
            .loader-overlay {
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0, 0, 0, 0.7); display: flex; align-items: center;
                justify-content: center; z-index: 9999; backdrop-filter: blur(5px);
            }
            .loader-spinner { text-align: center; color: white; }
            .spinner {
                border: 3px solid rgba(220, 38, 38, 0.3); border-left: 3px solid #dc2626;
                border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite;
                margin: 0 auto 1rem;
            }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        `;
    document.head.appendChild(styles);
    document.body.appendChild(loader);
  }

  if (loader) {
    loader.style.display = show ? "block" : "none";
    if (!show) {
      setTimeout(() => {
        if (loader.parentElement) loader.remove();
      }, 300);
    }
  }
}

// Utility Functions
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(amount);
}

function generateId() {
  return Date.now() + Math.random().toString(36).substr(2, 9);
}

async function refreshData() {
  if (AppState.currentUser) {
    await loadInitialData();
    showNotification("Data refreshed", "success");
  }
}

function handleApiError(error, defaultMessage = "An error occurred") {
  console.error("API Error:", error);
  if (error.message === "Unauthorized" || error.message === "Token expired") {
    logout();
    showNotification("Session expired. Please log in again.", "error");
  } else {
    showNotification(error.message || defaultMessage, "error");
  }
}

// Debug Functions
function debugSessionState() {
  console.log("🔍 SESSION DEBUG:", {
    "API Service Available": typeof apiService !== "undefined",
    "Token in localStorage": !!localStorage.getItem("authToken"),
    "User in localStorage": !!localStorage.getItem("currentUser"),
    "AppState.currentUser": !!AppState.currentUser,
    "Current user email": AppState.currentUser?.email,
    "User type": AppState.userType,
    "Current page": window.location.pathname,
    "Events loaded": AppState.events?.length || 0,
    "Players loaded": AppState.players?.length || 0,
    "Clubs loaded": AppState.clubs?.length || 0,
  });
}

function forceLogin(email) {
  const testUser = {
    id: "test-" + Date.now(),
    email: email,
    first_name: "Test",
    last_name: "User",
    account_type: "adult",
  };

  AppState.currentUser = testUser;
  AppState.userType = "adult";

  localStorage.setItem("authToken", "test-token-" + Date.now());
  localStorage.setItem("currentUser", JSON.stringify(testUser));
  localStorage.setItem("userType", "adult");

  console.log("🧪 Force login complete for:", email);
  updateNavigation();
  loadInitialData();
}

// Export functions
window.AppState = AppState;
window.showModal = showModal;
window.closeModal = closeModal;
window.showLogin = showLogin;
window.showRegister = showRegister;
window.toggleOrgOptions = toggleOrgOptions;
window.logout = logout;
window.showNotification = showNotification;
window.formatDate = formatDate;
window.formatCurrency = formatCurrency;
window.generateId = generateId;
window.showLoading = showLoading;
window.refreshData = refreshData;
window.handleApiError = handleApiError;
window.loadInitialData = loadInitialData;
window.debugSessionState = debugSessionState;
window.forceLogin = forceLogin;
