async function handleLogin(e) {
  e.preventDefault();

  try {
    showLoading(true);

    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;
    const demoMode = document.getElementById("demoMode")?.checked;

    if (!email || !password) {
      showNotification("Please fill in all fields", "error");
      return;
    }

    if (demoMode) {
      console.log("🛡️ DEMO BYPASS: Logging in via demo mode...");
      localStorage.setItem("isDemoSession", "true");
    } else {
      localStorage.removeItem("isDemoSession");
    }

    console.log("🔑 Attempting login for:", email);

    const response = await apiService.login(email, password, demoMode);

    console.log("✅ Login successful:", response);

    // Store user data
    localStorage.setItem("authToken", response.token);
    localStorage.setItem("currentUser", JSON.stringify(response.user));

    // CRITICAL: Update apiService token so subsequent API calls work
    apiService.setToken(response.token);
    console.log("✅ Token set in apiService");

    // Update global state
    if (typeof AppState !== "undefined") {
      AppState.currentUser = response.user;
      AppState.isLoggedIn = true;
    }

    // Check for pending invite token (auto-join club after login)
    const pendingInviteToken = localStorage.getItem("pendingInviteToken");

    if (pendingInviteToken) {
      console.log(
        "🎉 Pending invite token found, auto-accepting group invitation...",
      );

      try {
        // Auto-accept the group invitation
        const acceptResponse = await fetch(
          `${apiService.baseURL}/invites/accept/${pendingInviteToken}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${response.token}`,
            },
            body: JSON.stringify({
              acceptTerms: true,
            }),
          },
        );

        if (acceptResponse.ok) {
          const inviteResult = await acceptResponse.json();
          console.log("✅ Auto-accepted group invitation:", inviteResult);

          // Clear the pending invite token
          localStorage.removeItem("pendingInviteToken");

          // Show success message
          showNotification(
            `Welcome to ${inviteResult.club.name}!`,
            "success",
            4000,
          );

          // Redirect to player dashboard (or admin if role requires)
          const role = inviteResult.membership?.role || "player";
          const redirectUrl = ["admin", "owner", "coach"].includes(
            role.toLowerCase(),
          )
            ? "admin-dashboard.html"
            : "player-dashboard.html";

          setTimeout(() => {
            window.location.href = redirectUrl;
          }, 1500);

          return; // Exit early since we're handling redirect
        } else {
          console.error("❌ Failed to auto-accept invite");
          // Continue with normal flow if auto-accept fails
          localStorage.removeItem("pendingInviteToken");
        }
      } catch (inviteError) {
        console.error("❌ Error auto-accepting invite:", inviteError);
        // Continue with normal flow if auto-accept fails
        localStorage.removeItem("pendingInviteToken");
      }
    }

    // Handle return URL (for invite redirects)
    const urlParams = new URLSearchParams(window.location.search);
    const returnUrl = urlParams.get("returnUrl");

    if (returnUrl) {
      console.log("🔄 Redirecting to return URL:", returnUrl);
      showNotification("Login successful! Redirecting...", "success");
      setTimeout(() => {
        window.location.href = decodeURIComponent(returnUrl);
      }, 1000);
    } else {
      // Determine where to redirect based on user type
      const redirectUrl = await determineUserRedirect(response.user);
      console.log("🏠 Redirecting to:", redirectUrl);
      showNotification("Login successful!", "success");
      setTimeout(() => {
        window.location.href = redirectUrl;
      }, 1000);
    }
  } catch (error) {
    console.error("❌ Login failed:", error);
    // Enhanced error reporting for frontend
    let errorMessage = error.message || "Login failed";
    if (error.response && error.response.data && error.response.data.message) {
      errorMessage = error.response.data.message;
    } else if (error.response && error.response.status) {
      errorMessage = `Login failed: Server responded with status ${error.response.status}`;
    }
    showNotification(errorMessage, "error");
  } finally {
    showLoading(false);
  }
}

// Enhanced register function with invite redirect support
async function handleRegister(e) {
  e.preventDefault();

  try {
    showLoading(true);

    const firstName = document.getElementById("registerFirstName").value;
    const lastName = document.getElementById("registerLastName").value;
    const email = document.getElementById("registerEmail").value;
    const password = document.getElementById("registerPassword").value;
    const confirmPassword = document.getElementById(
      "registerConfirmPassword",
    ).value;
    const userType =
      document.querySelector('input[name="userType"]:checked')?.value ||
      "player";

    // Validation
    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      showNotification("Please fill in all fields", "error");
      return;
    }

    if (password !== confirmPassword) {
      showNotification("Passwords do not match", "error");
      return;
    }

    if (password.length < 6) {
      showNotification("Password must be at least 6 characters", "error");
      return;
    }

    console.log("📝 Attempting registration for:", email);

    const userData = {
      firstName,
      lastName,
      email,
      password,
      userType,
    };

    const response = await apiService.register(userData);

    console.log("✅ Registration successful:", response);

    // Store user data
    localStorage.setItem("authToken", response.token);
    localStorage.setItem("currentUser", JSON.stringify(response.user));

    // CRITICAL: Update apiService token so subsequent API calls work
    apiService.setToken(response.token);
    console.log("✅ Token set in apiService");

    // Update global state
    if (typeof AppState !== "undefined") {
      AppState.currentUser = response.user;
      AppState.isLoggedIn = true;
    }

    // Check for pending invite token (auto-join club after signup)
    const pendingInviteToken = localStorage.getItem("pendingInviteToken");

    if (pendingInviteToken) {
      console.log(
        "🎉 Pending invite token found, auto-accepting group invitation...",
      );

      try {
        // Auto-accept the group invitation
        const acceptResponse = await fetch(
          `${apiService.baseURL}/invites/accept/${pendingInviteToken}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${response.token}`,
            },
            body: JSON.stringify({
              acceptTerms: true,
            }),
          },
        );

        if (acceptResponse.ok) {
          const inviteResult = await acceptResponse.json();
          console.log("✅ Auto-accepted group invitation:", inviteResult);

          // Clear the pending invite token
          localStorage.removeItem("pendingInviteToken");

          // Show success message
          showNotification(
            `Welcome to ${inviteResult.club.name}! Your account has been created.`,
            "success",
            5000,
          );

          // Redirect to player dashboard (or admin if role requires)
          const role = inviteResult.membership?.role || "player";
          const redirectUrl = ["admin", "owner", "coach"].includes(
            role.toLowerCase(),
          )
            ? "admin-dashboard.html"
            : "player-dashboard.html";

          setTimeout(() => {
            window.location.href = redirectUrl;
          }, 2000);

          return; // Exit early since we're handling redirect
        } else {
          console.error("❌ Failed to auto-accept invite");
          // Continue with normal flow if auto-accept fails
          localStorage.removeItem("pendingInviteToken");
        }
      } catch (inviteError) {
        console.error("❌ Error auto-accepting invite:", inviteError);
        // Continue with normal flow if auto-accept fails
        localStorage.removeItem("pendingInviteToken");
      }
    }

    // Handle return URL (for invite redirects)
    const urlParams = new URLSearchParams(window.location.search);
    const returnUrl = urlParams.get("returnUrl");

    if (returnUrl) {
      console.log(
        "🔄 Redirecting to return URL after registration:",
        returnUrl,
      );
      showNotification(
        "Registration successful! Redirecting to your invitation...",
        "success",
      );
      setTimeout(() => {
        window.location.href = decodeURIComponent(returnUrl);
      }, 1500);
    } else {
      // Show welcome message and redirect
      const redirectUrl = await determineUserRedirect(response.user);
      console.log("🏠 Redirecting new user to:", redirectUrl);
      showNotification(
        "Welcome to ClubHub! Setting up your account...",
        "success",
      );
      setTimeout(() => {
        window.location.href = redirectUrl;
      }, 1500);
    }
  } catch (error) {
    console.error("❌ Registration failed:", error);
    showNotification(error.message || "Registration failed", "error");
  } finally {
    showLoading(false);
  }
}

// Determine where to redirect user based on their type and data
async function determineUserRedirect(user) {
  const userEmail = (user.email || "").toLowerCase();
  const userType = (
    user.userType ||
    user.account_type ||
    user.accountType ||
    ""
  ).toLowerCase();

  console.log("🚀 Determining redirect for:", {
    email: userEmail,
    type: userType,
    user,
  });

  // 0. EXPLICIT DEMO REDIRECTS - Force correct dashboard for demo accounts
  if (
    userEmail === "demo-admin@clubhub.com" ||
    userEmail === "admin@proclubdemo.com"
  ) {
    console.log("✅ Demo Admin detected → admin-dashboard.html");
    return "admin-dashboard.html";
  }
  if (
    userEmail === "demo-coach@clubhub.com" ||
    userEmail === "coach@proclubdemo.com"
  ) {
    console.log("✅ Demo Coach detected → coach-dashboard.html");
    return "coach-dashboard.html";
  }
  if (userEmail === "superadmin@clubhub.com") {
    console.log("✅ Super Admin detected → super-admin-dashboard.html");
    return "super-admin-dashboard.html";
  }

  // 1. Platform Admin always goes to super admin
  if (user.is_platform_admin || user.isPlatformAdmin) {
    console.log("✅ Platform admin detected → super-admin-dashboard.html");
    return "super-admin-dashboard.html";
  }

  // 2. SMART CONTEXT REDIRECT: Check for membership-specific roles
  try {
    console.log("🔍 Fetching membership context from /auth/context...");
    const context = await apiService.makeRequest("/auth/context");

    console.log("📦 Context response:", context);

    if (context && context.groups && context.groups.length > 0) {
      const currentOrg =
        context.currentGroup || context.groups[0];
      const role = (
        currentOrg.user_role ||
        currentOrg.role ||
        ""
      ).toLowerCase();

      console.log(
        `✅ User has ${context.groups.length} group(s)!`,
      );
      console.log(`📍 Current org: ${currentOrg.name}, Role: ${role}`);

      // Route based on role
      if (["player", "parent", "adult"].includes(role)) {
        console.log("✅ Redirecting to player-dashboard.html");
        return "player-dashboard.html";
      } else if (["coach", "assistant-coach", "staff"].includes(role)) {
        console.log("✅ Redirecting to coach-dashboard.html");
        return "coach-dashboard.html";
      } else if (["owner", "admin", "manager"].includes(role)) {
        console.log("✅ Redirecting to admin-dashboard.html");
        return "admin-dashboard.html";
      } else if (["scout"].includes(role)) {
        console.log("✅ Redirecting to scout-dashboard.html");
        return "scout-dashboard.html";
      }

      // If role is something else but they have an org, default to admin for org accounts
      if (userType === "group" || userType === "admin") {
        console.log(
          "✅ Group account with membership → admin-dashboard.html",
        );
        return "admin-dashboard.html";
      }

      // Fallback to player dashboard if they have orgs but unknown role
      console.log("⚠️ Unknown role but has orgs → player-dashboard.html");
      return "player-dashboard.html";
    } else {
      console.log("ℹ️ No active group memberships found.");
      console.log(
        "⚠️ User is group type but has NO memberships → create-group.html",
      );

      // Only redirect to create-group if they truly have ZERO orgs
      if (userType === "group" || userType === "admin") {
        return "create-group.html";
      }
    }
  } catch (error) {
    console.error("❌ Context check failed during redirect:", error);
    console.error("Error details:", error.message, error.stack);
  }

  // 3. PROFILE-BASED FALLBACK (For new users or failed checks)
  console.log("⚠️ Falling back to profile logic", { userType });

  if (
    userEmail === "demo-coach@clubhub.com" ||
    userType === "coach" ||
    userType === "staff"
  ) {
    console.log("✅ Fallback: coach-dashboard.html");
    return "coach-dashboard.html";
  }

  if (userType === "group" || userType === "admin") {
    console.log("✅ Fallback: admin-dashboard.html");
    return "admin-dashboard.html";
  }

  if (userType === "scout") {
    console.log("✅ Fallback: scout-dashboard.html");
    return "scout-dashboard.html";
  }

  console.log("✅ Final fallback: player-dashboard.html");
  return "player-dashboard.html";
}

// Enhanced logout function
async function handleLogout() {
  try {
    console.log("👋 Logging out user...");

    // Call API logout if available
    if (typeof apiService !== "undefined" && apiService.logout) {
      try {
        await apiService.logout();
      } catch (error) {
        console.warn("API logout failed, continuing with local logout:", error);
      }
    }

    // Clear local storage
    localStorage.removeItem("authToken");
    localStorage.removeItem("currentUser");
    localStorage.removeItem("cachedClubs");
    localStorage.removeItem("cachedEvents");

    // Update global state
    if (typeof AppState !== "undefined") {
      AppState.currentUser = null;
      AppState.isLoggedIn = false;
      AppState.clubs = [];
      AppState.events = [];
    }

    console.log("✅ Logout successful");
    showNotification("Logged out successfully", "success");

    // Redirect to home page
    setTimeout(() => {
      window.location.href = "index.html";
    }, 1000);
  } catch (error) {
    console.error("❌ Logout error:", error);
    // Force logout locally even if API call fails
    localStorage.clear();
    window.location.href = "index.html";
  }
}

// Check authentication status on page load
async function checkAuthStatus() {
  const token = localStorage.getItem("authToken");
  const userData = localStorage.getItem("currentUser");
  const isDemo = localStorage.getItem("isDemoSession") === "true";

  if (isDemo || (token && userData)) {
    try {
      // Robust parsing to catch "undefined" string or corrupted data
      let user = null;
      if (userData && userData !== "undefined" && userData !== "null") {
        user = JSON.parse(userData);
      }
      
      if (!user && isDemo) {
        user = { email: "demo-user@clubhub.com", firstName: "Demo", lastName: "User", userType: "admin" };
        localStorage.setItem("currentUser", JSON.stringify(user));
      }

      if (!user) {
        console.warn("⚠️ No valid user data found, redirecting...");
        localStorage.removeItem("authToken");
        localStorage.removeItem("currentUser");
        return false;
      }

      console.log("✅ User authenticated:", user.email);

      // If user data is missing account_type, fetch fresh data from API
      if (
        user.email &&
        !user.account_type &&
        !user.userType &&
        localStorage.getItem("isDemoSession") !== "true"
      ) {
        console.log("🔄 Refreshing user data from API...");
        try {
          const freshUser = await apiService.getCurrentUser();
          if (freshUser) {
            user = freshUser;
            localStorage.setItem("currentUser", JSON.stringify(user));
            console.log("✅ User data refreshed");
          }
        } catch (error) {
          console.warn("Failed to refresh user data:", error);
        }
      }

      // Update global state
      if (typeof AppState !== "undefined") {
        AppState.currentUser = user;
        AppState.isLoggedIn = true;
      }

      // Update navigation
      updateNavigation(true, user);

      return true;
    } catch (error) {
      console.error("❌ Invalid user data in localStorage:", error);
      // Clear invalid data
      localStorage.removeItem("authToken");
      localStorage.removeItem("currentUser");
      return false;
    }
  }

  console.log("❌ User not authenticated");
  updateNavigation(false);
  return false;
}

// Update navigation based on auth status
function updateNavigation(isLoggedIn, user = null) {
  // SHIELD: Prevent legacy navigation from corrupting the unified premium navigation
  if (window.UNIFIED_NAV_ENABLED) {
    console.log("🛡️ Unified Navigation Shield active: Suppressing legacy navigation update.");
    return;
  }
  const loggedInNav = document.getElementById("loggedInNav");
  const loggedOutNav = document.getElementById("loggedOutNav");

  if (isLoggedIn && user) {
    // Show logged in navigation
    if (loggedInNav) {
      loggedInNav.innerHTML = `
                <div class="user-info">
                    <span>Hello, ${user.firstName || user.first_name || "User"}!</span>
                </div>
                <div class="nav-buttons">
                    ${(() => {
                      const email = (user.email || "").toLowerCase();
                      if (
                        email === "coach@clubhub.com" ||
                        user.role === "coach"
                      ) {
                        return '<button class="btn btn-primary" onclick="window.location.href=\'coach-dashboard.html\'">Dashboard</button>';
                      }
                      if (
                        user.userType === "group" ||
                        user.userType === "admin" ||
                        user.account_type === "group"
                      ) {
                        return '<button class="btn btn-primary" onclick="window.location.href=\'admin-dashboard.html\'">Dashboard</button>';
                      }
                      return '<button class="btn btn-primary" onclick="window.location.href=\'player-dashboard.html\'">Dashboard</button>';
                    })()}
                    <button class="btn btn-secondary" onclick="handleLogout()">Logout</button>
                </div>
            `;
      loggedInNav.style.display = "flex";
    }

    if (loggedOutNav) {
      loggedOutNav.style.display = "none";
    }
  } else {
    // Show logged out navigation
    if (loggedOutNav) {
      loggedOutNav.innerHTML = `
                <button class="btn btn-secondary" onclick="showModal('loginModal')">Login</button>
                <button class="btn btn-primary" onclick="showModal('registerModal')">Sign Up</button>
            `;
      loggedOutNav.style.display = "flex";
    }

    if (loggedInNav) {
      loggedInNav.style.display = "none";
    }
  }
}

// Enhanced initialization with invite support
document.addEventListener("DOMContentLoaded", async function () {
  console.log("🚀 Enhanced login handler loading...");

  // SHIELD: Prevent legacy redirects from hijacking the modern dashboard experience
  if (window.UNIFIED_NAV_ENABLED) {
    console.log("🛡️ Unified Navigation Shield active: Suppressing legacy auth redirects.");
    setupFormEventListeners();
    return;
  }

  // Check authentication status
  const isLoggedIn = await checkAuthStatus();

  // Handle invite redirect if on index page
  const urlParams = new URLSearchParams(window.location.search);
  const returnUrl = urlParams.get("returnUrl");

  if (returnUrl && window.location.pathname.includes("index.html")) {
    console.log("🔗 Invite redirect detected:", returnUrl);

    if (isLoggedIn) {
      // User is already logged in, redirect immediately
      console.log("✅ User already logged in, redirecting to invite...");
      showNotification("Redirecting to your invitation...", "info");
      setTimeout(() => {
        window.location.href = decodeURIComponent(returnUrl);
      }, 1000);
    } else {
      // Show special message about needing to log in for invite
      const messageContainer = document.createElement("div");
      messageContainer.className = "invite-redirect-message";
      messageContainer.style.cssText = `
                background: linear-gradient(135deg, #e3f2fd, #bbdefb);
                border: 2px solid #2196f3;
                border-radius: 12px;
                padding: 20px;
                margin: 20px auto;
                max-width: 600px;
                text-align: center;
                box-shadow: 0 4px 15px rgba(33, 150, 243, 0.2);
            `;

      messageContainer.innerHTML = `
                <h3 style="color: #1976d2; margin: 0 0 10px 0;">🎉 You've been invited to join a club!</h3>
                <p style="color: #1565c0; margin: 10px 0;">Please log in or create an account to accept your group invitation.</p>
                <div style="margin-top: 15px;">
                    <button class="btn btn-primary" onclick="showModal('loginModal')" style="margin-right: 10px;">Login</button>
                    <button class="btn btn-success" onclick="showModal('registerModal')">Create Account</button>
                </div>
            `;

      // Insert after main content
      const mainContent =
        document.querySelector(".hero") || document.querySelector("main");
      if (mainContent) {
        mainContent.insertAdjacentElement("afterend", messageContainer);
      }
    }
  }

  // Setup form event listeners
  setupFormEventListeners();

  // Setup authentication check for protected pages
  setupProtectedPageCheck();

  console.log("✅ Enhanced login handler initialized");
});

// Setup form event listeners
function setupFormEventListeners() {
  // Login form
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", handleLogin);
  }

  // Register form
  const registerForm = document.getElementById("registerForm");
  if (registerForm) {
    registerForm.addEventListener("submit", handleRegister);
  }

  // Password strength indicator
  const registerPassword = document.getElementById("registerPassword");
  if (registerPassword) {
    registerPassword.addEventListener("input", updatePasswordStrength);
  }

  // Confirm password matching
  const confirmPassword = document.getElementById("registerConfirmPassword");
  if (confirmPassword) {
    confirmPassword.addEventListener("input", checkPasswordMatch);
  }
}

// Setup protection for dashboard pages
function setupProtectedPageCheck() {
  // TEMPORARILY DISABLED - causing redirect loop
  // We now have manual toggle, so users can access both dashboards
  console.log("✅ Protected page check disabled - manual toggle enabled");

  /*
    const protectedPages = ['admin-dashboard.html', 'player-dashboard.html'];
    const currentPage = window.location.pathname.split('/').pop();
    
    if (protectedPages.includes(currentPage)) {
        const isLoggedIn = checkAuthStatus();
        
        if (!isLoggedIn) {
            console.log('🔒 Protected page accessed without authentication, redirecting...');
            showNotification('Please log in to access this page', 'error');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
        }
    }
    */
}

// Password strength indicator
function updatePasswordStrength() {
  const password = document.getElementById("registerPassword").value;
  const strengthIndicator = document.getElementById("passwordStrength");

  if (!strengthIndicator) return;

  let strength = 0;
  let feedback = [];

  // Length check
  if (password.length >= 8) {
    strength += 1;
  } else {
    feedback.push("At least 8 characters");
  }

  // Uppercase check
  if (/[A-Z]/.test(password)) {
    strength += 1;
  } else {
    feedback.push("One uppercase letter");
  }

  // Lowercase check
  if (/[a-z]/.test(password)) {
    strength += 1;
  } else {
    feedback.push("One lowercase letter");
  }

  // Number check
  if (/\d/.test(password)) {
    strength += 1;
  } else {
    feedback.push("One number");
  }

  // Special character check
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    strength += 1;
  } else {
    feedback.push("One special character");
  }

  // Update indicator
  let strengthText = "Very Weak";
  let strengthColor = "#dc3545";

  if (strength >= 4) {
    strengthText = "Strong";
    strengthColor = "#28a745";
  } else if (strength >= 3) {
    strengthText = "Good";
    strengthColor = "#ffc107";
  } else if (strength >= 2) {
    strengthText = "Fair";
    strengthColor = "#fd7e14";
  } else if (strength >= 1) {
    strengthText = "Weak";
    strengthColor = "#dc3545";
  }

  strengthIndicator.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px; margin-top: 5px;">
            <div style="flex: 1; height: 4px; background: #e9ecef; border-radius: 2px;">
                <div style="width: ${(strength / 5) * 100}%; height: 100%; background: ${strengthColor}; border-radius: 2px; transition: all 0.3s ease;"></div>
            </div>
            <span style="font-size: 12px; color: ${strengthColor}; font-weight: 600;">${strengthText}</span>
        </div>
        ${feedback.length > 0 ? `<div style="font-size: 12px; color: #6c757d; margin-top: 5px;">Missing: ${feedback.join(", ")}</div>` : ""}
    `;
}

// Check password match
function checkPasswordMatch() {
  const password = document.getElementById("registerPassword").value;
  const confirmPassword = document.getElementById(
    "registerConfirmPassword",
  ).value;
  const matchIndicator = document.getElementById("passwordMatch");

  if (!matchIndicator) return;

  if (confirmPassword.length === 0) {
    matchIndicator.innerHTML = "";
    return;
  }

  if (password === confirmPassword) {
    matchIndicator.innerHTML =
      '<div style="color: #28a745; font-size: 12px; margin-top: 5px;">✅ Passwords match</div>';
  } else {
    matchIndicator.innerHTML =
      '<div style="color: #dc3545; font-size: 12px; margin-top: 5px;">❌ Passwords do not match</div>';
  }
}

// Enhanced modal functions
function showModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = "block";
    document.body.style.overflow = "hidden";

    // Focus first input
    const firstInput = modal.querySelector(
      'input[type="email"], input[type="text"]',
    );
    if (firstInput) {
      setTimeout(() => firstInput.focus(), 100);
    }
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = "none";
    document.body.style.overflow = "auto";

    // Clear form if it exists
    const form = modal.querySelector("form");
    if (form) {
      form.reset();

      // Clear custom indicators
      const indicators = modal.querySelectorAll(
        "#passwordStrength, #passwordMatch",
      );
      indicators.forEach((indicator) => (indicator.innerHTML = ""));
    }
  }
}

/**
 * Quick Demo Login Bypass
 * @param {string} type - superadmin, admin, coach, player
 */

// Enhanced notification system
function showNotification(message, type = "info", duration = 4000) {
  // Remove existing notifications
  const existingNotifications = document.querySelectorAll(".notification");
  existingNotifications.forEach((notification) => notification.remove());

  const notification = document.createElement("div");
  notification.className = `notification notification-${type}`;

  const colors = {
    success: "#28a745",
    error: "#dc3545",
    warning: "#ffc107",
    info: "#007bff",
  };

  const icons = {
    success: "✅",
    error: "❌",
    warning: "⚠️",
    info: "ℹ️",
  };

  notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${colors[type] || colors.info};
        color: white;
        padding: 16px 20px;
        border-radius: 8px;
        font-weight: 600;
        font-size: 14px;
        z-index: 10000;
        max-width: 400px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        transform: translateX(100%);
        transition: transform 0.3s ease;
        display: flex;
        align-items: center;
        gap: 10px;
    `;

  notification.innerHTML = `
        <span>${icons[type] || icons.info}</span>
        <span>${message}</span>
        <button onclick="this.parentElement.remove()" style="
            background: none;
            border: none;
            color: white;
            font-size: 18px;
            cursor: pointer;
            margin-left: auto;
            padding: 0;
            opacity: 0.8;
        ">×</button>
    `;

  document.body.appendChild(notification);

  // Animate in
  setTimeout(() => {
    notification.style.transform = "translateX(0)";
  }, 10);

  // Auto remove
  setTimeout(() => {
    if (notification.parentElement) {
      notification.style.transform = "translateX(100%)";
      setTimeout(() => notification.remove(), 300);
    }
  }, duration);
}

// Loading state management
function showLoading(show = true) {
  const loadingElements = document.querySelectorAll(".loading, #loading");

  if (show) {
    // Disable forms
    const forms = document.querySelectorAll("form");
    forms.forEach((form) => {
      const inputs = form.querySelectorAll("input, button, select, textarea");
      inputs.forEach((input) => (input.disabled = true));
    });

    // Show loading indicators
    loadingElements.forEach((element) => {
      element.style.display = "block";
    });
  } else {
    // Enable forms
    const forms = document.querySelectorAll("form");
    forms.forEach((form) => {
      const inputs = form.querySelectorAll("input, button, select, textarea");
      inputs.forEach((input) => (input.disabled = false));
    });

    // Hide loading indicators
    loadingElements.forEach((element) => {
      element.style.display = "none";
    });
  }
}

// Export functions for global access
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.handleLogout = handleLogout;
window.checkAuthStatus = checkAuthStatus;
window.showModal = showModal;
window.closeModal = closeModal;
window.showNotification = showNotification;
window.showLoading = showLoading;

// Auto-attach form handlers when DOM is ready
document.addEventListener("DOMContentLoaded", function () {
  console.log("🔧 Attaching login/register form handlers...");

  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", handleLogin);
    console.log("✅ Login form handler attached");
  }

  const registerForm = document.getElementById("registerForm");
  if (registerForm) {
    registerForm.addEventListener("submit", handleRegister);
    console.log("✅ Register form handler attached");
  }
});

console.log(
  "✅ Enhanced Login Handler with Invite Redirect Support loaded successfully!",
);
