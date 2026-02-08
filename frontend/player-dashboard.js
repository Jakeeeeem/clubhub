let PlayerDashboardState = {
  activeSection: "overview", // Added from instruction
  activePlayerId: null,
  player: null,
  attendance: null,
  clubs: [],
  teams: [],
  events: [],
  payments: [],
  bookings: [],
  applications: [],
  invitations: [],
  documents: [],
  players: [],
  plans: [],
  currentPlan: null,
  notifications: [],
  family: [], // Added from instruction
  upcomingEvents: [], // Added from instruction
  availableClubs: [],
  stripe: {
    linked: false,
    payouts_enabled: false,
    details_submitted: false,
    account_id: null,
  },
  isLoading: false,
};

// Initialize AppState from localStorage if not already set
if (!window.AppState) {
  const storedUser = localStorage.getItem("currentUser");
  if (storedUser) {
    try {
      window.AppState = {
        currentUser: JSON.parse(storedUser),
        isLoggedIn: true,
      };
      console.log("✅ AppState initialized from localStorage");
    } catch (error) {
      console.error("Failed to parse currentUser from localStorage:", error);
    }
  }
}

function setupNavButtons() {
  const navContainer = document.getElementById("loggedInNav");
  if (!navContainer) return;

  // Initialize AppState from localStorage if not already set
  if (!window.AppState || !window.AppState.currentUser) {
    const storedUser = localStorage.getItem("currentUser");
    if (storedUser) {
      try {
        window.AppState = {
          currentUser: JSON.parse(storedUser),
          isLoggedIn: true,
        };
        console.log(
          "✅ AppState initialized from localStorage in setupNavButtons",
        );
      } catch (error) {
        console.error("Failed to parse currentUser from localStorage:", error);
      }
    }
  }

  // Check again after initialization attempt
  if (!window.AppState || !window.AppState.currentUser) {
    console.warn("AppState.currentUser not ready yet, showing login button");
    navContainer.innerHTML =
      '<button class="btn btn-primary" onclick="window.location.href=\'index.html\'">Login</button>';
    return;
  }

  const currentUser = window.AppState.currentUser;
  const firstName = currentUser.first_name || currentUser.firstName || "User";
  const lastInitial = (
    currentUser.last_name ||
    currentUser.lastName ||
    ""
  ).charAt(0);
  const initials = (firstName.charAt(0) + lastInitial).toUpperCase();
  const unreadCount = PlayerDashboardState.notifications.filter(
    (n) => !n.is_read,
  ).length;

  // Admin dashboard structure:
  // [Org Switcher] [Name] [Avatar] [Logout]
  // Player dashboard needs:
  // [Org Switcher] [Bell] [Family Switcher] [Name] [Avatar] [Logout]

  const orgSwitcherContainer = document.getElementById(
    "org-switcher-container",
  );

  // Family switcher - Re-enabled for Player dashboard
  const profileSwitcher = true
    ? `
    <div class="profile-switcher" style="position: relative; margin-right: 0.5rem;">
      <button class="profile-switcher-trigger" id="profile-switcher-trigger" style="display: flex; align-items: center; gap: 0.75rem; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.2); color: white; border-radius: 10px; padding: 8px 16px; font-size: 0.9rem; cursor: pointer; transition: all 0.2s; min-width: 160px; justify-content: space-between;">
        <div style="display: flex; align-items: center; gap: 0.6rem;">
          <div class="profile-avatar" style="width: 28px; height: 28px; border-radius: 50%; background: var(--primary); display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 700; flex-shrink: 0; box-shadow: 0 0 10px var(--primary-glow);">
            ${!PlayerDashboardState.activePlayerId ? firstName.charAt(0) : PlayerDashboardState.family.find((f) => f.id == PlayerDashboardState.activePlayerId)?.first_name?.charAt(0) || "F"}
          </div>
          <span style="font-weight: 600;">${!PlayerDashboardState.activePlayerId ? "Main Profile" : PlayerDashboardState.family.find((f) => f.id == PlayerDashboardState.activePlayerId)?.first_name || "Family"}</span>
        </div>
        <svg width="14" height="14" viewBox="0 0 12 12" fill="none" style="opacity: 0.8; margin-left: 4px;">
          <path d="M2 4L6 8L10 4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>
      
      <div class="profile-switcher-dropdown" id="profile-switcher-dropdown" style="position: absolute; top: calc(100% + 8px); right: 0; min-width: 300px; background: #1e1e1e; border: 1px solid rgba(255,255,255,0.1); border-radius: 14px; box-shadow: 0 8px 32px rgba(0,0,0,0.6); opacity: 0; visibility: hidden; transform: translateY(-10px); transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); z-index: 1000; overflow: hidden; backdrop-filter: blur(20px);">
        <div style="padding: 0.75rem 1rem; border-bottom: 1px solid rgba(255,255,255,0.1); font-size: 0.75rem; font-weight: 600; text-transform: uppercase; color: rgba(255,255,255,0.5);">
          Switch Profile
        </div>
        <div class="profile-list" style="max-height: 400px; overflow-y: auto;">
          <button class="profile-item ${!PlayerDashboardState.activePlayerId ? "active" : ""}" onclick="switchProfile(null)" style="width: 100%; display: flex; align-items: center; gap: 1rem; padding: 0.75rem 1rem; background: ${!PlayerDashboardState.activePlayerId ? "rgba(220,67,67,0.1)" : "transparent"}; border: none; color: white; cursor: pointer; transition: background 0.2s; text-align: left;">
            <div style="width: 36px; height: 36px; border-radius: 50%; background: var(--primary); display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1rem; flex-shrink: 0;">
              ${firstName.charAt(0)}
            </div>
            <div style="flex: 1;">
              <div style="font-weight: 600; font-size: 0.95rem;">${firstName} ${currentUser.last_name || ""}</div>
              <div style="font-size: 0.8rem; color: rgba(255,255,255,0.5);">Main Profile</div>
            </div>
            ${!PlayerDashboardState.activePlayerId ? '<div style="color: var(--primary);"><svg width="18" height="18" viewBox="0 0 16 16" fill="none"><path d="M3 8L6 11L13 4" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg></div>' : ""}
          </button>
          ${PlayerDashboardState.family
            .map((child) => {
              const childAge = child.age || calculateAge(child.date_of_birth);
              const hasClub = child.club_id && child.club_name;
              const clubName = child.club_name || "No Club";
              const clubInitial = clubName.charAt(0).toUpperCase();
              const isActive = PlayerDashboardState.activePlayerId == child.id;

              return `
            <button class="profile-item ${isActive ? "active" : ""}" 
                    onclick="${hasClub ? `switchToChildProfile('${child.id}', '${child.club_id}')` : ""}" 
                    style="width: 100%; display: flex; align-items: center; gap: 1rem; padding: 0.85rem 1rem; background: ${isActive ? "rgba(220,67,67,0.1)" : "transparent"}; border: none; color: ${hasClub ? "white" : "rgba(255,255,255,0.4)"}; cursor: ${hasClub ? "pointer" : "not-allowed"}; transition: background 0.2s; text-align: left; opacity: ${hasClub ? "1" : "0.6"};"
                    ${hasClub ? "" : "disabled"}>
              <div style="width: 36px; height: 36px; border-radius: 50%; background: ${hasClub ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" : "rgba(255,255,255,0.1)"}; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1rem; flex-shrink: 0;">
                ${child.first_name.charAt(0)}
              </div>
              <div style="flex: 1; overflow: hidden;">
                <div style="font-weight: 600; font-size: 0.95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${child.first_name} ${child.last_name}</div>
                <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 4px;">
                  <div style="display: inline-flex; align-items: center; gap: 0.4rem; background: ${hasClub ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)"}; padding: 0.2rem 0.5rem; border-radius: 4px; max-width: 65%; overflow: hidden;">
                    ${
                      hasClub
                        ? `<span style="width: 14px; height: 14px; background: var(--primary); border-radius: 3px; display: flex; align-items: center; justify-content: center; font-size: 0.65rem; font-weight: 800; flex-shrink: 0;">${clubInitial}</span>
                           <span style="font-size: 0.75rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${clubName}</span>`
                        : `<span style="font-size: 0.75rem;">⚠️ No Club</span>`
                    }
                  </div>
                  ${hasClub ? `<span style="font-size: 0.75rem; color: rgba(255,255,255,0.6); font-weight: 500; white-space: nowrap; margin-left: 8px;">Age ${childAge}</span>` : ""}
                </div>
              </div>
              ${isActive && hasClub ? '<div style="color: var(--primary);"><svg width="18" height="18" viewBox="0 0 16 16" fill="none"><path d="M3 8L6 11L13 4" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg></div>' : ""}
            </button>
          `;
            })
            .join("")}
        </div>
        <div style="padding: 0.75rem; border-top: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.1);">
          <button onclick="showPlayerSection('family')" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.75rem; background: rgba(220,67,67,0.1); border: 1px solid rgba(220,67,67,0.3); color: var(--primary); border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 0.85rem; transition: all 0.2s;">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 3V13M3 8H13" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
            </svg>
            Add Family Member
          </button>
        </div>
      </div>
    </div>
  `
    : "";

  navContainer.innerHTML = `
    <div class="user-info" style="display: flex; align-items: center; gap: 1.5rem;">
      <!-- Placeholder for Org Switcher if we move it -->
      <div id="moved-org-switcher"></div>

      <div class="notification-wrapper" style="position: relative;">
        <button class="notification-bell ${unreadCount > 0 ? "has-unread" : ""}" onclick="toggleNotifications()" style="background: none; border: none; color: white; cursor: pointer; display: flex; align-items: center;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
          ${unreadCount > 0 ? `<span class="unread-badge" style="position: absolute; top: -5px; right: -5px; background: red; color: white; font-size: 10px; border-radius: 50%; width: 16px; height: 16px; display: flex; align-items: center; justify-content: center;">${unreadCount}</span>` : ""}
        </button>
        <div id="notificationDropdown" class="notification-dropdown">
          <div class="dropdown-header">
            <h3>Notifications</h3>
            <button onclick="markAllNotificationsRead()" class="btn-text">Mark all read</button>
          </div>
          <div id="notificationList" class="notification-list">
            <!-- Populated by JS -->
          </div>
        </div>
      </div>
      
      ${profileSwitcher}

      <span class="user-name" style="font-weight: 600; font-size: 0.95rem;">Hello, ${firstName}!</span>
      <div class="user-avatar" style="width: 44px; height: 44px; border-radius: 50%; background: var(--primary); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.1rem; box-shadow: 0 0 15px var(--primary-glow);">${initials}</div>
      <button class="btn btn-secondary btn-small" onclick="logout()" style="padding: 0.5rem 1rem; font-weight: 600;">Logout</button>
    </div>
  `;

  // Move Org Switcher into this flex container for perfect alignment
  const movedContainer = document.getElementById("moved-org-switcher");
  if (orgSwitcherContainer && movedContainer) {
    movedContainer.appendChild(orgSwitcherContainer);
    // Force re-render/init if class exists
    if (typeof OrganizationSwitcher !== "undefined") {
      orgSwitcherContainer.style.display = "block";
    }
  }

  // Setup profile switcher dropdown toggle
  const profileTrigger = document.getElementById("profile-switcher-trigger");
  const profileDropdown = document.getElementById("profile-switcher-dropdown");

  if (profileTrigger && profileDropdown) {
    profileTrigger.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = profileDropdown.style.opacity === "1";

      if (isOpen) {
        profileDropdown.style.opacity = "0";
        profileDropdown.style.visibility = "hidden";
        profileDropdown.style.transform = "translateY(-10px)";
      } else {
        profileDropdown.style.opacity = "1";
        profileDropdown.style.visibility = "visible";
        profileDropdown.style.transform = "translateY(0)";
      }
    });

    // Close on outside click
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".profile-switcher")) {
        profileDropdown.style.opacity = "0";
        profileDropdown.style.visibility = "hidden";
        profileDropdown.style.transform = "translateY(-10px)";
      }
    });

    // Add hover effects to profile items
    const profileItems = profileDropdown.querySelectorAll(".profile-item");
    profileItems.forEach((item) => {
      item.addEventListener("mouseenter", function () {
        if (!this.classList.contains("active")) {
          this.style.background = "rgba(255,255,255,0.05)";
        }
      });
      item.addEventListener("mouseleave", function () {
        if (!this.classList.contains("active")) {
          this.style.background = "transparent";
        }
      });
    });
  }
}

/**
 * Switch to a child's profile and auto-switch organization if needed
 * @param {string} childId - The child player ID
 * @param {string} childClubId - The club ID the child belongs to
 */
async function switchToChildProfile(childId, childClubId) {
  console.log(
    `🔄 Switching to child profile: ${childId} in club: ${childClubId}`,
  );

  // CRITICAL: Save to both storages BEFORE any potential redirect/reload
  PlayerDashboardState.activePlayerId = childId;
  sessionStorage.setItem("activePlayerId", childId);

  const user = JSON.parse(localStorage.getItem("currentUser") || "{}");
  user.activePlayerId = childId;
  localStorage.setItem("currentUser", JSON.stringify(user));
  if (window.AppState) window.AppState.currentUser = user;

  try {
    showLoading(true);

    // Get current organization context
    const currentOrgId =
      apiService.context?.currentOrganization?.id ||
      JSON.parse(localStorage.getItem("currentUser") || "{}").clubId;

    // Check if we need to switch organizations
    if (childClubId && childClubId !== currentOrgId) {
      console.log(
        `🔀 Child is in different club. Switching from ${currentOrgId} to ${childClubId}`,
      );

      // Use the organization switcher to change context
      if (typeof window.switchOrganization === "function") {
        // This will refresh the page with the new organization context
        await window.switchOrganization(childClubId);
        // After page refresh, the child will be selected automatically
        return;
      } else {
        // Fallback: manually update context and refresh
        const user = JSON.parse(localStorage.getItem("currentUser") || "{}");
        user.clubId = childClubId;
        user.currentOrganizationId = childClubId;
        localStorage.setItem("currentUser", JSON.stringify(user));

        // Refresh context
        await apiService.refreshContext();

        showNotification(`Switched to ${childClubId} organization`, "info");
      }
    }

    // Reload data for this child
    await loadPlayerDataWithFallback();
    await loadFamilyMembers();

    // Refresh the current section
    showPlayerSection(PlayerDashboardState.activeSection || "overview");

    // Update nav buttons to reflect new profile
    setupNavButtons();

    showNotification("Switched to child's profile", "success");
  } catch (err) {
    console.error("Failed to switch to child profile:", err);
    showNotification("Failed to switch profile: " + err.message, "error");
  } finally {
    showLoading(false);
  }
}

async function switchProfile(id) {
  console.log("🔄 Switching profile to:", id);
  PlayerDashboardState.activePlayerId = id || null;

  const user = JSON.parse(localStorage.getItem("currentUser") || "{}");
  if (!id) {
    sessionStorage.removeItem("activePlayerId");
    delete user.activePlayerId;
  } else {
    sessionStorage.setItem("activePlayerId", id);
    user.activePlayerId = id;
  }
  localStorage.setItem("currentUser", JSON.stringify(user));
  if (window.AppState) window.AppState.currentUser = user;

  try {
    showLoading(true);
    await loadPlayerDataWithFallback();
    showPlayerSection(PlayerDashboardState.activeSection);
    setupNavButtons(); // Refresh dropdown
    showNotification("Profile switched successfully", "success");
  } catch (err) {
    console.error("Failed to switch profile:", err);
    showNotification("Failed to switch profile: " + err.message, "error");
  } finally {
    showLoading(false);
  }
}

window.switchProfile = switchProfile;
window.switchToChildProfile = switchToChildProfile;

async function initializePlayerDashboard() {
  console.log("Initializing player dashboard...");
  try {
    // Ensure AppState exists globally
    if (!window.AppState) {
      window.AppState = {
        currentUser: null,
        userType: null,
        clubs: [],
        players: [],
        staff: [],
        events: [],
        bookings: [],
        teams: [],
        notifications: [],
      };
    }

    // Load user from localStorage
    const storedUser = safeGetCurrentUser();
    if (storedUser) {
      window.AppState.currentUser = storedUser;
      window.AppState.userType =
        localStorage.getItem("userType") || storedUser.account_type;
    }

    // Restore active profile from storage
    const savedPlayerId =
      sessionStorage.getItem("activePlayerId") ||
      window.AppState.currentUser?.activePlayerId;

    if (savedPlayerId) {
      PlayerDashboardState.activePlayerId = savedPlayerId;
      sessionStorage.setItem("activePlayerId", savedPlayerId);
      console.log("📋 Restored active profile:", savedPlayerId);
    }

    // Initial setup of nav buttons
    setupNavButtons();

    showLoading(true);

    wirePlayersFilterTabs();
    wireStripeButtons();
    wirePlanButtons();
    wireAccountModal();
    wireFormEventListeners();
    wireFamilyListeners();

    await loadPlayerDataWithFallback();

    loadPlayerOverview();
    loadPlayerClubs();
    loadPlayerTeams();
    loadPlayerFinances();
    loadClubFinder();
    loadEventFinder();
    loadPlayerDocuments();
    loadNotifications();

    // Load family members early so the switcher has names
    await refreshFamilyData().catch((e) =>
      console.warn("Family load failed:", e),
    );

    const additionalPromises = [
      loadPlayersList().catch((e) =>
        console.warn("Failed to load players list:", e),
      ),
      refreshStripeStatus().catch((e) =>
        console.warn("Failed to load Stripe status:", e),
      ),
      loadPaymentPlans().catch((e) =>
        console.warn("Failed to load payment plans:", e),
      ),
      loadCurrentPlan().catch((e) =>
        console.warn("Failed to load current plan:", e),
      ),
    ];

    await Promise.allSettled(additionalPromises);

    // Refresh nav buttons after all data is loaded
    setupNavButtons();

    console.log("Player dashboard initialized successfully");
  } catch (err) {
    console.error("Failed to initialize player dashboard:", err);
    showNotification(
      "Dashboard loaded with some limitations: " + err.message,
      "warning",
    );
  } finally {
    showLoading(false);
  }
}

function wireFormEventListeners() {
  const applyClubForm = document.getElementById("applyClubForm");
  if (applyClubForm) {
    applyClubForm.addEventListener("submit", handleClubApplication);
  }

  const availabilityForm = document.getElementById("availabilityForm");
  if (availabilityForm) {
    availabilityForm.addEventListener("submit", handleAvailabilitySubmission);
  }
}

async function loadPlayerDataWithFallback() {
  const pid = PlayerDashboardState.activePlayerId;
  console.log(`📡 Fetching player data for: ${pid || "Self (Main Profile)"}`);
  try {
    if (typeof apiService === "undefined") {
      throw new Error("API service not available");
    }

    try {
      const dashboardData = await apiService.getPlayerDashboardData(
        PlayerDashboardState.activePlayerId,
      );
      console.log("Loaded unified dashboard data:", dashboardData);

      PlayerDashboardState.player = dashboardData.player || null;
      PlayerDashboardState.attendance = dashboardData.attendance ?? null;
      PlayerDashboardState.clubs = dashboardData.clubs || [];
      PlayerDashboardState.teams = dashboardData.teams || [];
      PlayerDashboardState.events = dashboardData.events || [];
      PlayerDashboardState.payments = dashboardData.payments || [];
      PlayerDashboardState.bookings = dashboardData.bookings || [];
      PlayerDashboardState.applications = dashboardData.applications || [];
      PlayerDashboardState.invitations = dashboardData.invitations || [];
      return;
    } catch (e) {
      console.warn("Unified dashboard failed, trying individual calls:", e);
    }

    const promises = [
      apiService
        .getEvents()
        .then((v) => (PlayerDashboardState.events = v || []))
        .catch(() => (PlayerDashboardState.events = [])),
      apiService
        .getClubs()
        .then((v) => (PlayerDashboardState.clubs = v || []))
        .catch(() => (PlayerDashboardState.clubs = [])),
      apiService
        .getTeams()
        .then((v) => (PlayerDashboardState.teams = v || []))
        .catch(() => (PlayerDashboardState.teams = [])),
      apiService
        .getPayments()
        .then((v) => (PlayerDashboardState.payments = v || []))
        .catch(() => (PlayerDashboardState.payments = [])),
      apiService
        .getUserBookings()
        .then((v) => (PlayerDashboardState.bookings = v || []))
        .catch(() => (PlayerDashboardState.bookings = [])),
    ];

    await Promise.allSettled(promises);

    console.log("Data loaded:", {
      events: PlayerDashboardState.events.length,
      clubs: PlayerDashboardState.clubs.length,
      teams: PlayerDashboardState.teams.length,
      payments: PlayerDashboardState.payments.length,
      bookings: PlayerDashboardState.bookings.length,
    });
  } catch (err) {
    console.error("Failed to load player data:", err);
    PlayerDashboardState.clubs = [];
    PlayerDashboardState.teams = [];
    PlayerDashboardState.events = [];
    PlayerDashboardState.payments = [];
    PlayerDashboardState.bookings = [];
    throw err;
  }
}

function loadPlayerOverview() {
  updateText("playerClubs", PlayerDashboardState.clubs.length);
  updateText("playerTeams", PlayerDashboardState.teams.length);

  const upcomingCount = PlayerDashboardState.events.filter(
    (e) => e.event_date && new Date(e.event_date) > new Date(),
  ).length;
  updateText("playerEvents", upcomingCount);

  updateText(
    "playerAttendance",
    PlayerDashboardState.attendance != null
      ? PlayerDashboardState.attendance + "%"
      : "0",
  );

  loadUpcomingEvents();
  loadRecentActivity();
  loadPerformanceSummary();
}

function loadUpcomingEvents() {
  const el = byId("playerUpcomingEvents");
  if (!el) return;

  const now = new Date();
  const list = PlayerDashboardState.events
    .filter((e) => e.event_date && new Date(e.event_date) > now)
    .sort((a, b) => new Date(a.event_date) - new Date(b.event_date))
    .slice(0, 5);

  if (list.length === 0) {
    el.innerHTML = "<p>No upcoming events</p>";
    return;
  }

  const eventsHTML = list
    .map((event) => {
      const eventTime = event.event_time
        ? " at " + escapeHTML(event.event_time)
        : "";
      return (
        '<div class="item-list-item">' +
        '<div class="item-info">' +
        "<h4>" +
        escapeHTML(event.title || "Event") +
        "</h4>" +
        "<p>" +
        formatDate(event.event_date) +
        eventTime +
        "</p>" +
        "<p>Price: " +
        formatCurrency(event.price || 0) +
        "</p>" +
        "</div>" +
        '<div class="item-actions">' +
        '<button class="btn btn-small btn-primary" onclick="bookEvent(\'' +
        event.id +
        "')\">Book</button>" +
        "</div>" +
        "</div>"
      );
    })
    .join("");

  el.innerHTML = eventsHTML;
}

function loadRecentActivity() {
  const el = byId("playerRecentActivity");
  if (!el) return;

  const list = (PlayerDashboardState.bookings || []).slice(0, 3);

  if (list.length === 0) {
    el.innerHTML = "<p>No recent activity</p>";
    return;
  }

  const activitiesHTML = list
    .map(
      (b) =>
        '<div class="item-list-item">' +
        '<div class="item-info">' +
        "<h4>" +
        escapeHTML(b.title || "Event") +
        "</h4>" +
        "<p>" +
        formatDate(b.event_date) +
        " - " +
        escapeHTML(b.booking_status || "N/A") +
        "</p>" +
        "</div>" +
        '<span class="status-badge status-' +
        escapeHTML(b.booking_status || "unknown") +
        '">' +
        escapeHTML(b.booking_status || "Unknown") +
        "</span>" +
        "</div>",
    )
    .join("");

  el.innerHTML = activitiesHTML;
}

function loadPerformanceSummary() {
  const matches = (PlayerDashboardState.bookings || []).filter(
    (b) => b.event_type === "match",
  ).length;
  const trainings = (PlayerDashboardState.bookings || []).filter(
    (b) => b.event_type === "training",
  ).length;

  updateText("playerMatchesPlayed", matches);
  updateText("playerAverageRating", "4.2");
  updateText("playerTrainingSessions", trainings);
  updateText(
    "playerPosition",
    PlayerDashboardState.player?.position || "Not Set",
  );
}

function loadPlayerClubs() {
  const grid = byId("playerClubsContainer");
  if (!grid) return;

  let invitationsHTML = "";
  if (
    PlayerDashboardState.invitations &&
    PlayerDashboardState.invitations.length > 0
  ) {
    invitationsHTML = `
      <div class="invitations-section" style="margin-bottom: 2.5rem; background: rgba(220, 38, 38, 0.03); border: 1px solid rgba(220, 38, 38, 0.15); border-radius: 16px; padding: 1.5rem;">
        <h3 style="margin-bottom: 1.5rem; color: var(--primary); display: flex; align-items: center; gap: 0.75rem; font-size: 1.1rem;">
          <span style="font-size: 1.3rem;">✉️</span> Pending Invitations
          <span style="background: var(--primary); color: white; border-radius: 20px; padding: 2px 10px; font-size: 0.75rem; font-weight: 700;">${PlayerDashboardState.invitations.length}</span>
        </h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem;">
          ${PlayerDashboardState.invitations
            .map(
              (inv) => `
            <div class="card" style="margin: 0; border: 1px dashed var(--primary); background: rgba(220, 38, 38, 0.05); box-shadow: none;">
              <div style="display: flex; justify-content: space-between; align-items: center; gap: 1rem;">
                <div style="display: flex; align-items: center; gap: 1rem; overflow: hidden;">
                  <div style="width: 40px; height: 40px; border-radius: 10px; background: var(--primary); color: white; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.2rem; flex-shrink: 0;">
                    ${(inv.club_name || "C").charAt(0).toUpperCase()}
                  </div>
                  <div style="overflow: hidden;">
                    <h4 style="margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 0.95rem;">${escapeHTML(inv.club_name)}</h4>
                    <p style="margin: 2px 0 0; font-size: 0.75rem; color: var(--text-muted); font-weight: 500;">Invitation Received</p>
                  </div>
                </div>
                <div style="display: flex; gap: 0.5rem; flex-shrink: 0;">
                  <button class="btn btn-small btn-primary" style="padding: 0.4rem 0.8rem; font-size: 0.75rem;" onclick="acceptInvitation('${inv.organization_id}')">Accept</button>
                  <button class="btn btn-small btn-secondary" style="padding: 0.4rem 0.8rem; font-size: 0.75rem; border: 1px solid rgba(255,255,255,0.1);" onclick="declineInvitation('${inv.organization_id}')">No</button>
                </div>
              </div>
            </div>
          `,
            )
            .join("")}
        </div>
      </div>
    `;
  }

  if (!PlayerDashboardState.clubs.length && !invitationsHTML) {
    grid.innerHTML =
      '<div class="empty-state">' +
      "<h4>No clubs joined yet</h4>" +
      "<p>Find and apply to clubs to get started</p>" +
      '<button class="btn btn-primary" onclick="showPlayerSection(\'club-finder\')">Find Clubs</button>' +
      "</div>";
    const staffBody = byId("clubStaffTableBody");
    if (staffBody)
      staffBody.innerHTML =
        '<tr><td colspan="4">No staff information available</td></tr>';
    return;
  }

  // Clear grid class
  grid.classList.remove("card-grid");

  let clubsHeader =
    PlayerDashboardState.clubs.length > 0
      ? `<h3 style="margin-bottom: 1.2rem; font-size: 1.1rem; display: flex; align-items: center; gap: 0.75rem;">
      <span style="font-size: 1.3rem;">🏰</span> Your Active Clubs
    </h3>`
      : "";

  grid.innerHTML = invitationsHTML + clubsHeader;

  if (!PlayerDashboardState.clubs.length) return;

  const clubsHTML = `
    <div class="table-responsive">
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 40%;">Club Details</th>
            <th>Sport</th>
            <th>Location</th>
            <th>Members</th>
            <th style="text-align: right;">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${PlayerDashboardState.clubs
            .map(
              (c) => `
          <tr onclick="viewClubDetails('${c.id}')" style="cursor: pointer;">
            <td>
              <div class="team-info-cell">
                <div class="team-icon" style="background: rgba(220, 38, 38, 0.1); color: var(--primary);">
                  ${(c.name || "C").charAt(0).toUpperCase()}
                </div>
                <div class="team-name-group">
                  <span class="team-name">${escapeHTML(c.name)}</span>
                  <span class="team-meta" style="max-width: 250px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    ${escapeHTML(c.description || "No description")}
                  </span>
                </div>
              </div>
            </td>
            <td>
              <span class="status-badge" style="text-transform: capitalize; background: rgba(255, 255, 255, 0.05); border: 1px solid var(--border-color); color: var(--text-main);">
                ${escapeHTML(c.sport || "Multi-sport")}
              </span>
            </td>
            <td>${escapeHTML(c.location || "Online / Remote")}</td>
            <td>${Number(c.member_count || 0)}</td>
            <td>
              <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                <button class="btn btn-small btn-primary" onclick="event.stopPropagation(); viewClubEvents('${c.id}')">Events</button>
                <button class="btn btn-small btn-secondary" onclick="event.stopPropagation(); viewClubDetails('${c.id}')">Details</button>
              </div>
            </td>
          </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;

  grid.innerHTML += clubsHTML;

  const staffBody = byId("clubStaffTableBody");
  if (staffBody) {
    const rows = [];
    PlayerDashboardState.clubs.forEach((c) => {
      (c.staff || []).forEach((s) => {
        rows.push(
          "<tr>" +
            "<td>" +
            escapeHTML((s.first_name || "") + " " + (s.last_name || "")) +
            "</td>" +
            "<td>" +
            escapeHTML(s.role || "") +
            "</td>" +
            "<td>" +
            escapeHTML(s.email || "N/A") +
            "</td>" +
            "<td>" +
            escapeHTML(c.name) +
            "</td>" +
            "</tr>",
        );
      });
    });
    staffBody.innerHTML = rows.length
      ? rows.join("")
      : '<tr><td colspan="4">No staff information available</td></tr>';
  }
}

function loadPlayerTeams() {
  const grid = byId("playerTeamsContainer");
  if (!grid) return;

  // Ensure grid container classes logic
  grid.classList.remove("card-grid");

  if (!PlayerDashboardState.teams.length) {
    // Show empty table logic to satisfy "table ui" requirement
    grid.innerHTML = `
    <div class="table-responsive">
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 35%;">Team Name</th>
            <th>Role / Position</th>
            <th>Coach</th>
            <th>Age Group</th>
            <th style="text-align: right;">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colspan="5" style="text-align: center; padding: 2rem;">
              <p style="color: var(--text-muted); margin-bottom: 1rem;">No teams joined yet</p>
              <button class="btn btn-primary btn-small" onclick="showPlayerSection('club-finder')">Find Clubs to Join</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    `;
    const container = byId("teamEventsContainer");
    if (container) container.innerHTML = "<p>No team events found</p>";
    return;
  }

  // Remove default card grid class if present (though this container is usually naked)
  grid.classList.remove("card-grid");

  const teamsHTML = `
    <div class="table-responsive">
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 35%;">Team Name</th>
            <th>Role / Position</th>
            <th>Coach</th>
            <th>Age Group</th>
            <th style="text-align: right;">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${PlayerDashboardState.teams
            .map((t) => {
              const coachName = t.coach
                ? escapeHTML(t.coach.name || "")
                : "Not Assigned";

              return `
            <tr onclick="viewTeamDetails('${t.id}')" style="cursor: pointer;">
              <td>
                <div class="team-info-cell">
                   <div class="team-icon" style="background: rgba(59, 130, 246, 0.1); color: #3b82f6;">
                      ${(t.name || "T").charAt(0).toUpperCase()}
                   </div>
                   <div class="team-name-group">
                      <span class="team-name">${escapeHTML(t.name)}</span>
                      <span class="team-meta">${escapeHTML(t.sport || "Multi-sport")}</span>
                   </div>
                </div>
              </td>
              <td>
                 <div style="display:flex; flex-direction:column; gap:2px;">
                    <span style="font-weight:500;">${escapeHTML(t.player_position || "Player")}</span>
                    <span style="font-size:0.75rem; color:var(--text-muted);">#${escapeHTML(t.jersey_number || "N/A")}</span>
                 </div>
              </td>
              <td>${coachName}</td>
              <td>${escapeHTML(t.age_group || "-")}</td>
              <td>
                <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                  <button class="btn btn-small btn-primary" onclick="event.stopPropagation(); viewTeamEvents('${t.id}')">Events</button>
                  <button class="btn btn-small btn-secondary" onclick="event.stopPropagation(); viewTeamDetails('${t.id}')">View</button>
                </div>
              </td>
            </tr>
            `;
            })
            .join("")}
        </tbody>
      </table>
    </div>
  `;

  grid.innerHTML = teamsHTML;
  loadTeamEvents();
}

function loadTeamEvents() {
  const container = byId("teamEventsContainer");
  if (!container) return;

  const teamIds = PlayerDashboardState.teams.map((t) => t.id);
  const events = PlayerDashboardState.events.filter((e) =>
    teamIds.includes(e.team_id),
  );

  if (events.length === 0) {
    container.innerHTML = "<p>No team events found</p>";
    return;
  }

  // Sort by date
  events.sort((a, b) => new Date(a.event_date) - new Date(b.event_date));

  container.innerHTML = events
    .map((e) => {
      const isUpcoming = new Date(e.event_date) >= new Date();
      if (!isUpcoming) return "";

      return `
      <div class="card" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem; border-left: 4px solid var(--accent-color); margin-bottom: 0.5rem;">
          <div>
              <h4 style="margin:0;">${escapeHTML(e.title)} <span style="font-size:0.8rem; opacity:0.7;">(${escapeHTML(e.event_type || "Event")})</span></h4>
              <p style="margin:0.2rem 0;">📅 ${formatDate(e.event_date)} at ${e.event_time ? e.event_time.slice(0, 5) : "TBA"} | 📍 ${escapeHTML(e.location || "TBA")}</p>
          </div>
          <div style="display: flex; gap: 0.5rem;">
              <button class="btn btn-small btn-primary" onclick="submitAvailability('${e.id}')">Availability</button>
              <button class="btn btn-small btn-success" style="background:#28a745; border-color:#28a745;" onclick="checkInEvent('${e.id}')">📍 I'm Here</button>
              <button class="btn btn-small btn-secondary" onclick="viewEventDetails('${e.id}')">Details</button>
          </div>
      </div>
    `;
    })
    .join("");
}

function loadPlayerFinances() {
  const payments = PlayerDashboardState.payments || [];
  const totalDue = payments
    .filter((p) => p.payment_status === "pending")
    .reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const totalPaid = payments
    .filter((p) => p.payment_status === "paid")
    .reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const nextPayment = payments.find((p) => p.payment_status === "pending");

  updateText("totalDue", formatCurrency(totalDue));
  updateText("totalPaid", formatCurrency(totalPaid));
  updateText(
    "nextPayment",
    nextPayment ? formatCurrency(nextPayment.amount) : "£0",
  );
  updateText("paymentStatus", totalDue > 0 ? "Outstanding" : "Up to Date");

  loadPaymentHistory();
  loadOutstandingPayments();
}

function loadPaymentHistory() {
  const body = byId("paymentHistoryTableBody");
  if (!body) return;

  const payments = PlayerDashboardState.payments || [];

  if (payments.length === 0) {
    body.innerHTML = '<tr><td colspan="5">No payment history found</td></tr>';
    return;
  }

  const paymentsHTML = payments
    .map((p) => {
      const actionButton =
        p.payment_status === "pending"
          ? '<button class="btn btn-small btn-primary" onclick="payNow(\'' +
            p.id +
            "', " +
            Number(p.amount) +
            ", '" +
            escapeHTML(p.description || "Payment") +
            "')\">Pay Now</button>"
          : '<span style="color:#28a745;">Paid</span>';

      return (
        "<tr>" +
        "<td>" +
        formatDate(p.due_date) +
        "</td>" +
        "<td>" +
        escapeHTML(p.description || "") +
        "</td>" +
        "<td>" +
        formatCurrency(p.amount) +
        "</td>" +
        '<td><span class="status-badge status-' +
        escapeHTML(p.payment_status || "unknown") +
        '">' +
        escapeHTML(p.payment_status || "unknown") +
        "</span></td>" +
        "<td>" +
        actionButton +
        "</td>" +
        "</tr>"
      );
    })
    .join("");

  body.innerHTML = paymentsHTML;
}

function loadOutstandingPayments() {
  const container = byId("outstandingPayments");
  if (!container) return;

  const outstanding = (PlayerDashboardState.payments || []).filter(
    (p) => p.payment_status === "pending",
  );

  if (outstanding.length === 0) {
    container.innerHTML = "<p>No outstanding payments</p>";
    return;
  }

  const paymentsHTML = outstanding
    .map(
      (p) =>
        '<div class="payment-item" style="border:1px solid #000000ff;padding:1rem;margin:.5rem 0;border-radius:8px;background:#fff8f0;">' +
        "<h4>" +
        escapeHTML(p.description || "Payment") +
        "</h4>" +
        "<p><strong>Amount:</strong> " +
        formatCurrency(p.amount) +
        "</p>" +
        "<p><strong>Due Date:</strong> " +
        formatDate(p.due_date) +
        "</p>" +
        '<button class="btn btn-primary" onclick="payNow(\'' +
        p.id +
        "', " +
        Number(p.amount) +
        ", '" +
        escapeHTML(p.description || "Payment") +
        "')\">Pay Now</button>" +
        "</div>",
    )
    .join("");

  container.innerHTML = paymentsHTML;
}

async function payNow(paymentId, amount, description) {
  console.log("Processing payment:", paymentId, amount, description);
  try {
    if (typeof createPaymentModal === "function") {
      const onSuccess = async (paymentResult) => {
        try {
          await apiService.confirmPayment(paymentResult.id, paymentId);
          showNotification("Payment successful!", "success");
          await reloadPaymentsSection();
        } catch (e) {
          console.error("Confirm payment failed:", e);
          showNotification(
            "Payment successful but confirmation failed: " + e.message,
            "error",
          );
        }
      };
      const onError = (e) => {
        console.error("Payment failed:", e);
        showNotification("Payment failed: " + e.message, "error");
      };
      createPaymentModal(amount, description, onSuccess, onError, paymentId);
    } else {
      const url =
        "payment.html?paymentId=" +
        paymentId +
        "&amount=" +
        amount +
        "&description=" +
        encodeURIComponent(description);
      window.open(url, "_blank");
    }
  } catch (err) {
    console.error("payNow error:", err);
    showNotification("Failed to process payment: " + err.message, "error");
  }
}

async function reloadPaymentsSection() {
  try {
    const payments = await apiService.getPayments();
    PlayerDashboardState.payments = payments || [];
    loadPlayerFinances();
  } catch (e) {
    console.warn("Failed to reload payments:", e);
  }
}

function wirePlayersFilterTabs() {
  const tabs = document.querySelectorAll(".filter-tab");
  tabs.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabs.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const filter = btn.getAttribute("data-filter");
      renderPlayersList(filter);
    });
  });
}

async function loadPlayersList() {
  try {
    let players = [];
    PlayerDashboardState.clubs.forEach((c) => {
      if (Array.isArray(c.players)) {
        players = players.concat(
          c.players.map((p) => ({
            ...p,
            club_id: c.id,
            club_name: c.name,
          })),
        );
      }
    });

    if (!players.length && typeof apiService.getPlayers === "function") {
      const apiPlayers = await apiService.getPlayers().catch(() => []);
      players = (apiPlayers || []).map((p) => ({ ...p }));
    }

    PlayerDashboardState.players = uniqueByKey(
      players,
      (p) => "" + (p.id || p.email || p.user_id || Math.random()),
    );
    renderPlayersList("all");
  } catch (e) {
    console.warn("Failed to load players list:", e);
    PlayerDashboardState.players = [];
    renderPlayersList("all");
  }
}

function renderPlayersList(filterKey = "all") {
  const container = byId("playersListContainer");
  if (!container) return;

  const list = PlayerDashboardState.players || [];
  let filtered = list;

  const isAssigned = (p) =>
    !!(p.team_id || (Array.isArray(p.teams) && p.teams.length));
  const isOnPlan = (p) =>
    !!(p.plan_id || p.on_plan === true || p.payment_plan === true);
  // =========================== SHOP METHODS ===========================

  async function loadShop() {
    const container = document.getElementById("shopProductsContainer");
    if (!container) return; // Not in shop view or elements missing

    try {
      container.innerHTML =
        '<div class="loading-spinner">Loading shop items...</div>';

      // Get active club ID (simplified logic)
      // Ideally should be user's primary club or selectable
      const clubId = AppState.currentUser?.clubId || AppState.clubs?.[0]?.id;

      if (!clubId) {
        container.innerHTML = "<p>Please join a club to access the shop.</p>";
        return;
      }

      const products = await apiService.makeRequest(
        `/products?clubId=${clubId}`,
      );

      if (!products || products.length === 0) {
        container.innerHTML =
          "<p>No items available in the shop currently.</p>";
        return;
      }

      container.innerHTML = products
        .map((product) => {
          const customFields = product.custom_fields || [];
          let customFieldsHtml = "";

          if (customFields.length > 0) {
            customFieldsHtml = `<div class="product-custom-fields" style="margin: 1rem 0; padding: 0.5rem; background: rgba(255,255,255,0.05); border-radius: 4px;">`;
            customFieldsHtml += customFields
              .map((field, idx) => {
                const fieldId = `field_${product.id}_${idx}`;
                let inputHtml = "";
                if (field.type === "select" && field.options) {
                  inputHtml = `<select id="${fieldId}" class="shop-input" required>
                                        <option value="">Select ${field.label}</option>
                                        ${field.options.map((opt) => `<option value="${opt}">${opt}</option>`).join("")}
                                     </select>`;
                } else {
                  inputHtml = `<input type="${field.type === "number" ? "number" : "text"}" id="${fieldId}" class="shop-input" placeholder="${field.label}" required>`;
                }
                return `
                        <div class="shop-field-group" style="margin-bottom: 0.5rem;">
                            <label style="display:block; font-size: 0.8rem; margin-bottom: 0.2rem;">${field.label}</label>
                            ${inputHtml}
                        </div>
                    `;
              })
              .join("");
            customFieldsHtml += `</div>`;
          }

          return `
                <div class="card product-card" style="display: flex; flex-direction: column; gap: 0.5rem;">
                    <div style="height: 150px; background: #333; border-radius: 4px; display: flex; align-items: center; justify-content: center; overflow: hidden;">
                        ${product.image_url ? `<img src="${product.image_url}" style="width:100%; height:100%; object-fit: cover;">` : '<span style="font-size: 2rem;">🛍️</span>'}
                    </div>
                    <h4>${product.name}</h4>
                    <p style="font-size: 0.9rem; opacity: 0.8;">${product.description || ""}</p>
                    <div style="margin-top: auto;">
                         <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                            <span style="font-weight: bold; font-size: 1.1rem;">£${product.price}</span>
                            <span style="font-size: 0.8rem; color: ${product.stock_quantity > 0 ? "#4caf50" : "#f44336"};">
                                ${product.stock_quantity > 0 ? `${product.stock_quantity} in stock` : "Out of Stock"}
                            </span>
                         </div>
                         ${customFieldsHtml}
                         <button class="btn btn-primary" style="width: 100%;" 
                                 onclick="handleShopPurchase('${product.id}')" 
                                 ${product.stock_quantity <= 0 ? "disabled" : ""}>
                             ${product.stock_quantity > 0 ? "Buy Now" : "Sold Out"}
                         </button>
                    </div>
                </div>
            `;
        })
        .join("");

      // Store products in AppState for reference in purchase handler
      AppState.shopProducts = products;
    } catch (error) {
      console.error("Failed to load shop:", error);
      container.innerHTML =
        '<p style="color: #f44336;">Failed to load shop items. Please try again later.</p>';
    }
  }

  async function handleShopPurchase(productId) {
    try {
      const product = AppState.shopProducts?.find((p) => p.id === productId);
      if (!product) return;

      // Collect Custom Fields Data
      const customizationDetails = {};
      const customFields = product.custom_fields || [];

      for (let idx = 0; idx < customFields.length; idx++) {
        const field = customFields[idx];
        const element = document.getElementById(`field_${productId}_${idx}`);
        if (element) {
          if (!element.value) {
            showNotification(
              `Please provide a value for ${field.label}`,
              "error",
            );
            element.focus();
            return;
          }
          customizationDetails[field.label] = element.value;
        }
      }

      if (
        !confirm(`Confirm purchase of ${product.name} for £${product.price}?`)
      )
        return;

      showLoading(true);

      // Simple purchase flow (expand to Stripe later)
      // Using existing /purchase endpoint which expects paymentIntentId but we might be skipping payment for demo or using cash/later
      // Or we trigger Stripe Intent here. For now, assuming direct order creation.

      await apiService.makeRequest("/products/purchase", {
        method: "POST",
        body: JSON.stringify({
          productId,
          quantity: 1,
          customization_details: customizationDetails,
          // paymentIntentId: 'manual_or_later' // Backend accepts null
        }),
      });

      showNotification("Order placed successfully!", "success");
      loadShop(); // Refresh stock
    } catch (error) {
      console.error("Purchase failed:", error);
      showNotification("Purchase failed: " + error.message, "error");
    } finally {
      showLoading(false);
    }
  }

  // Expose to window
  window.loadShop = loadShop;
  window.handleShopPurchase = handleShopPurchase;

  const isOverdue = (p) => {
    if (p.overdue === true || p.has_overdue === true) return true;
    const you = safeGetCurrentUser();
    if (you && (p.email || "").toLowerCase() === you.email?.toLowerCase()) {
      const now = new Date();
      return (PlayerDashboardState.payments || []).some(
        (pay) =>
          pay.payment_status === "pending" && new Date(pay.due_date) < now,
      );
    }
    return false;
  };

  switch (filterKey) {
    case "on-plan":
      filtered = list.filter(isOnPlan);
      break;
    case "not-on-plan":
      filtered = list.filter((p) => !isOnPlan(p));
      break;
    case "assigned":
      filtered = list.filter(isAssigned);
      break;
    case "unassigned":
      filtered = list.filter((p) => !isAssigned(p));
      break;
    case "overdue":
      filtered = list.filter(isOverdue);
      break;
    case "all":
    default:
      filtered = list;
  }

  if (filtered.length === 0) {
    container.innerHTML = "<p>No players found for this filter.</p>";
    return;
  }

  const playersHTML = filtered
    .map((p) => {
      const clubInfo = p.club_name
        ? "<p><strong>Club:</strong> " + escapeHTML(p.club_name) + "</p>"
        : "";
      const teamInfo = p.team_name
        ? "<p><strong>Team:</strong> " + escapeHTML(p.team_name) + "</p>"
        : "";
      const overdueText = isOverdue(p) ? "• Overdue" : "";
      const playerName =
        (
          (p.first_name || p.firstName || "") +
          " " +
          (p.last_name || p.lastName || "")
        ).trim() ||
        p.name ||
        "Player";

      return (
        '<div class="card">' +
        "<h4>" +
        escapeHTML(playerName) +
        "</h4>" +
        "<p><strong>Email:</strong> " +
        escapeHTML(p.email || "N/A") +
        "</p>" +
        clubInfo +
        teamInfo +
        "<p><strong>Status:</strong> " +
        (isAssigned(p) ? "Assigned" : "Not assigned") +
        " • " +
        (isOnPlan(p) ? "On plan" : "Not on plan") +
        " " +
        overdueText +
        "</p>" +
        "</div>"
      );
    })
    .join("");

  container.innerHTML = playersHTML;
}

function loadClubFinder() {
  const container = byId("availableClubsContainer");
  if (!container) return;

  // If we already have clubs loaded, just display them
  if (
    PlayerDashboardState.availableClubs &&
    PlayerDashboardState.availableClubs.length > 0
  ) {
    displayClubs(PlayerDashboardState.availableClubs);
  } else {
    // Initial fetch if empty
    refreshClubData();
  }
}

function displayClubs(clubs) {
  const container = byId("availableClubsContainer");
  if (!container) return;

  // Remove card-grid class if present to allow table to take full width
  container.classList.remove("card-grid");

  if (!(clubs || []).length) {
    container.innerHTML =
      '<div class="empty-state">' +
      "<h4>No clubs available</h4>" +
      "<p>Check back later for new clubs</p>" +
      '<button class="btn btn-primary" onclick="refreshClubData()">Refresh</button>' +
      "</div>";
    return;
  }

  container.innerHTML = `
    <div class="table-responsive">
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 35%;">Club Name</th>
            <th>Sport</th>
            <th>Location</th>
            <th>Members</th>
            <th style="text-align: right;">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${clubs
            .map(
              (club) => `
            <tr onclick="viewClubDetails('${club.id}')" style="cursor: pointer;">
              <td>
                <div class="team-info-cell">
                  <div class="team-icon" style="background: rgba(255, 51, 51, 0.1); color: var(--primary);">
                    ${(club.name || "C").charAt(0).toUpperCase()}
                  </div>
                  <div class="team-name-group">
                    <span class="team-name">${escapeHTML(club.name)}</span>
                    <span class="team-meta" style="max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHTML(club.description || "No description")}</span>
                  </div>
                </div>
              </td>
              <td>
                 <span class="status-badge" style="background: rgba(255, 255, 255, 0.05); color: var(--text-main); border: 1px solid var(--border-color); text-transform: capitalize;">
                    ${escapeHTML(club.sport || "General")}
                 </span>
              </td>
              <td>${escapeHTML(club.location || "Not specified")}</td>
              <td>${Number(club.member_count || 0)}</td>
              <td>
                <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                  <button class="btn btn-small btn-primary" onclick="event.stopPropagation(); applyToClub('${club.id}', '${escapeHTML((club.name || "").replace(/"/g, "&quot;"))}')">Apply</button>
                  <button class="btn btn-small btn-secondary" onclick="event.stopPropagation(); viewClubDetails('${club.id}')">View</button>
                </div>
              </td>
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function loadEventFinder() {
  const container = byId("availablePlayerEventsContainer");
  if (!container) return;
  displayEvents(PlayerDashboardState.events);
}

function displayEvents(events) {
  const container = byId("availablePlayerEventsContainer");
  if (!container) return;

  // Remove card-grid class
  container.classList.remove("card-grid");

  if (!(events || []).length) {
    container.innerHTML =
      '<div class="empty-state">' +
      "<h4>No events found</h4>" +
      "<p>Try adjusting your search criteria or check back later</p>" +
      '<button class="btn btn-primary" onclick="refreshEventData()">Refresh Events</button>' +
      "</div>";
    return;
  }

  container.innerHTML = `
    <div class="table-responsive">
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 30%;">Event Details</th>
            <th>Date & Time</th>
            <th>Location</th>
            <th style="text-align: center;">Fee / Spots</th>
            <th style="text-align: right;">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${events
            .map((event) => {
              const eventTime = event.event_time
                ? event.event_time.slice(0, 5)
                : "TBA";
              const spots = event.spots_available ?? "Unl.";
              const price = Number(event.price || 0);

              return `
            <tr onclick="viewEventDetails('${event.id}')" style="cursor: pointer;">
              <td>
                <div class="event-info-cell">
                  <div class="team-icon" style="background: rgba(124, 58, 237, 0.1); color: var(--neon-purple);">
                    ${event.event_type === "match" ? "⚽" : event.event_type === "training" ? "🏃" : "🎯"}
                  </div>
                  <div class="event-name-group">
                    <span class="event-name">${escapeHTML(event.title)}</span>
                    <span class="event-meta" style="text-transform: capitalize;">${escapeHTML(event.event_type || "Event")}</span>
                  </div>
                </div>
              </td>
              <td>
                <div style="display:flex; flex-direction:column;">
                   <span style="font-weight:500;">${formatDate(event.event_date)}</span>
                   <span style="font-size:0.75rem; color:var(--text-muted);">${eventTime}</span>
                </div>
              </td>
              <td>${escapeHTML(event.location || "TBA")}</td>
              <td style="text-align: center;">
                 <div style="display:flex; flex-direction:column; align-items:center;">
                    <span style="color: ${price > 0 ? "#fbbf24" : "#4ade80"}; font-weight: 600;">
                        ${price > 0 ? formatCurrency(price) : "Free"}
                    </span>
                    <span style="font-size: 0.75rem; opacity: 0.7;">${spots} spots</span>
                 </div>
              </td>
              <td style="text-align: right;">
                 <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                    <button class="btn btn-small btn-primary" onclick="event.stopPropagation(); bookEvent('${event.id}')">Book</button>
                    <button class="btn btn-small btn-success" style="background:#28a745; border-color:#28a745;" onclick="event.stopPropagation(); checkInEvent('${event.id}')">📍 I'm Here</button>
                    <button class="btn btn-small btn-secondary" onclick="event.stopPropagation(); viewEventDetails('${event.id}')">View</button>
                 </div>
              </td>
            </tr>
            `;
            })
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function loadPlayerDocuments() {
  const body = byId("playerDocumentsTableBody");
  if (!body) return;

  const docs = [
    {
      id: "1",
      name: "Club Handbook",
      type: "PDF",
      club_name: "Elite Football Academy",
      updated_at: "2024-01-15",
    },
    {
      id: "2",
      name: "Training Schedule",
      type: "PDF",
      club_name: "Elite Football Academy",
      updated_at: "2024-01-20",
    },
    {
      id: "3",
      name: "Safety Guidelines",
      type: "PDF",
      club_name: "Elite Football Academy",
      updated_at: "2024-01-10",
    },
  ];

  const docsHTML = docs
    .map(
      (d) =>
        "<tr>" +
        "<td>" +
        escapeHTML(d.name) +
        "</td>" +
        "<td>" +
        escapeHTML(d.type) +
        "</td>" +
        "<td>" +
        escapeHTML(d.club_name) +
        "</td>" +
        "<td>" +
        formatDate(d.updated_at) +
        "</td>" +
        "<td>" +
        '<button class="btn btn-small btn-primary" onclick="downloadDocument(\'' +
        d.id +
        "')\">Download</button>" +
        '<button class="btn btn-small btn-secondary" onclick="viewDocument(\'' +
        d.id +
        "')\">View</button>" +
        "</td>" +
        "</tr>",
    )
    .join("");

  body.innerHTML = docsHTML;
}

function wireStripeButtons() {
  const onboardBtn = byId("stripeOnboardBtn");
  const manageBtn = byId("stripeManageBtn");
  const refreshBtn = byId("stripeRefreshBtn");

  if (onboardBtn) onboardBtn.addEventListener("click", onboardStripe);
  if (manageBtn) manageBtn.addEventListener("click", manageStripe);
  if (refreshBtn) refreshBtn.addEventListener("click", refreshStripeStatus);
}

async function onboardStripe() {
  try {
    const res = await apiService.getStripeOnboardLink();
    if (res?.url) {
      window.location.href = res.url;
    } else {
      throw new Error("Onboarding link not returned");
    }
  } catch (e) {
    console.error("Stripe onboard error:", e);
    showNotification(
      "Failed to start Stripe onboarding: " + e.message,
      "error",
    );
  }
}

async function manageStripe() {
  try {
    const res = await apiService.getStripeManageLink();
    if (res?.url) {
      window.open(res.url, "_blank");
    } else {
      throw new Error("Account management link not returned");
    }
  } catch (e) {
    console.error("Stripe manage error:", e);
    showNotification("Failed to open Stripe dashboard: " + e.message, "error");
  }
}

async function refreshStripeStatus() {
  try {
    const res = await apiService.getStripeConnectStatus();
    PlayerDashboardState.stripe = {
      linked: !!res?.linked,
      payouts_enabled: !!res?.payouts_enabled,
      details_submitted: !!res?.details_submitted,
      account_id: res?.account_id || null,
    };
    renderStripeStatus();
  } catch (e) {
    console.warn("Stripe status error:", e);
    renderStripeStatus(true);
  }
}

function renderStripeStatus(error = false) {
  const info = byId("stripeAccountInfo");
  const manageBtn = byId("stripeManageBtn");

  if (error) {
    if (info)
      info.innerHTML =
        '<p style="color:#b00020">Unable to fetch Stripe status.</p>';
    if (manageBtn) manageBtn.disabled = true;
    return;
  }

  const s = PlayerDashboardState.stripe;
  const parts = [
    "<strong>Linked:</strong> " + (s.linked ? "Yes" : "No"),
    "<strong>Details submitted:</strong> " +
      (s.details_submitted ? "Yes" : "No"),
    "<strong>Payouts enabled:</strong> " + (s.payouts_enabled ? "Yes" : "No"),
  ];
  if (s.account_id)
    parts.push("<strong>Account ID:</strong> " + escapeHTML(s.account_id));

  if (info) info.innerHTML = "<p>" + parts.join(" • ") + "</p>";
  if (manageBtn) manageBtn.disabled = !s.linked;
}

function wirePlanButtons() {
  const assignBtn = byId("assignPlanBtn");
  if (assignBtn) assignBtn.addEventListener("click", assignOrUpdatePlan);
}

async function loadPaymentPlans() {
  try {
    const res = await apiService.makeRequest("/payments/plans", {
      method: "GET",
    });
    PlayerDashboardState.plans = Array.isArray(res) ? res : res?.plans || [];
    renderPlanSelector();
  } catch (e) {
    console.warn("Failed to load plans:", e);
    PlayerDashboardState.plans = [];
    renderPlanSelector();
  }
}

function renderPlanSelector() {
  const sel = byId("planSelector");
  if (!sel) return;
  const plans = PlayerDashboardState.plans || [];

  if (plans.length === 0) {
    sel.innerHTML = '<option value="">No plans available</option>';
  } else {
    const optionsHTML = plans
      .map((p) => {
        const interval = p.interval ? "/" + escapeHTML(p.interval) : "";
        return (
          '<option value="' +
          escapeAttr(p.id || p.plan_id) +
          '">' +
          escapeHTML(p.name || "Plan") +
          " — " +
          formatCurrency(p.amount || p.price || 0) +
          " " +
          interval +
          "</option>"
        );
      })
      .join("");
    sel.innerHTML = '<option value="">Select a plan</option>' + optionsHTML;
  }

  const start = byId("planStartDate");
  if (start && !start.value) {
    start.valueAsDate = new Date();
  }
}

async function loadCurrentPlan() {
  try {
    const res = await apiService
      .makeRequest("/payments/plan/current", { method: "GET" })
      .catch(() => null);
    PlayerDashboardState.currentPlan = res?.plan || res || null;
  } catch {
    PlayerDashboardState.currentPlan = null;
  } finally {
    renderCurrentPlan();
  }
}

function renderCurrentPlan() {
  const el = byId("currentPlanInfo");
  if (!el) return;

  const cp = PlayerDashboardState.currentPlan;
  if (!cp) {
    el.innerHTML = "<p>No plan assigned.</p>";
    return;
  }

  const interval = cp.interval ? "/" + escapeHTML(cp.interval) : "";
  const startDate = cp.start_date
    ? "<p><strong>Started:</strong> " + formatDate(cp.start_date) + "</p>"
    : "";
  const status = cp.status
    ? "<p><strong>Status:</strong> " + escapeHTML(cp.status) + "</p>"
    : "";

  el.innerHTML =
    '<div class="info">' +
    "<p><strong>Current plan:</strong> " +
    escapeHTML(cp.name || "Plan") +
    "</p>" +
    "<p><strong>Amount:</strong> " +
    formatCurrency(cp.amount || cp.price || 0) +
    " " +
    interval +
    "</p>" +
    startDate +
    status +
    "</div>";
}

async function assignOrUpdatePlan() {
  const planId = byId("planSelector")?.value;
  const startDate = byId("planStartDate")?.value;

  if (!planId) {
    showNotification("Please select a plan.", "warning");
    return;
  }

  try {
    await apiService.makeRequest("/payments/plan/assign", {
      method: "POST",
      body: JSON.stringify({ planId: planId, startDate: startDate }),
    });
    showNotification("Plan assigned/updated successfully!", "success");
    await loadCurrentPlan();
    await reloadPaymentsSection();
  } catch (e) {
    console.error("Assign plan error:", e);
    showNotification(
      "Failed to assign plan: " + (e.message || "Unknown error"),
      "error",
    );
  }
}

function wireAccountModal() {
  const form = byId("accountForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const payload = {
        firstName: byId("accFirstName")?.value || undefined,
        lastName: byId("accLastName")?.value || undefined,
        location: byId("accLocation")?.value || undefined,
        primarySport: byId("accSport")?.value || undefined,
        bio: byId("accBio")?.value || undefined,
      };
      const cleaned = Object.fromEntries(
        Object.entries(payload).filter(([, v]) => v !== undefined),
      );

      await apiService.updateUserProfile(cleaned);
      showNotification("Account updated!", "success");

      closeModal("accountModal");
      await loadPlayerDataWithFallback();
      loadPlayerOverview();
    } catch (err) {
      console.error("Profile update error:", err);
      showNotification("Failed to update account: " + err.message, "error");
    }
  });

  const you = safeGetCurrentUser();
  if (you) {
    const firstNameEl = byId("accFirstName");
    const lastNameEl = byId("accLastName");
    if (firstNameEl) firstNameEl.value = you.firstName || you.first_name || "";
    if (lastNameEl) lastNameEl.value = you.lastName || you.last_name || "";
  }
}

async function bookEvent(eventId) {
  console.log("Booking event:", eventId);
  const event = (PlayerDashboardState.events || []).find(
    (e) => e.id === eventId,
  );
  if (!event) return showNotification("Event not found", "error");

  try {
    if (Number(event.price || 0) > 0) {
      if (typeof createPaymentModal === "function") {
        const onSuccess = async (paymentResult) => {
          try {
            await apiService.bookEvent(eventId);
            await apiService.confirmPayment(paymentResult.id, null);
            showNotification("Event booked successfully!", "success");
            await loadPlayerDataWithFallback();
            loadPlayerOverview();
          } catch (e) {
            console.error("Booking after payment failed:", e);
            showNotification(
              "Payment ok, booking failed: " + e.message,
              "error",
            );
          }
        };
        const onError = (e) =>
          showNotification("Payment failed: " + e.message, "error");
        createPaymentModal(
          Number(event.price),
          event.title,
          onSuccess,
          onError,
        );
      } else {
        const url =
          "payment.html?amount=" +
          Number(event.price) +
          "&description=" +
          encodeURIComponent(event.title) +
          "&eventId=" +
          event.id;
        window.open(url, "_blank");
      }
    } else {
      await apiService.bookEvent(eventId);
      showNotification("Event booked successfully!", "success");
      await loadPlayerDataWithFallback();
      loadPlayerOverview();
    }
  } catch (e) {
    console.error("bookEvent error:", e);
    showNotification("Failed to book event: " + e.message, "error");
  }
}

function submitAvailability(eventId) {
  const eventIdEl = byId("availabilityEventId");
  if (eventIdEl) eventIdEl.value = eventId;
  showModal("availabilityModal");
}

async function checkInEvent(eventId) {
  if (!navigator.geolocation) {
    showNotification("Geolocation is not supported by your browser", "error");
    return;
  }

  showNotification("Verifying location...", "info");

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      try {
        const { latitude, longitude } = position.coords;

        await apiService.makeRequest(`/events/${eventId}/checkin`, {
          method: "POST",
          body: JSON.stringify({ latitude, longitude }),
        });

        showNotification("✅ Checked in successfully!", "success");
        loadPlayerOverview(); // Refresh
      } catch (error) {
        console.error("Check-in error:", error);
        showNotification(
          error.message || "Check-in failed. Are you at the venue?",
          "error",
        );
      }
    },
    (error) => {
      showNotification("Failed to get location. Please enable GPS.", "error");
    },
  );
}

// ========================================
// POLLS & VOTING ✅
// ========================================
async function loadPolls() {
  const container = document.getElementById("pollsContainer");
  if (!container) return;

  try {
    container.innerHTML = '<p class="loading-text">Loading polls...</p>';

    // Get organization ID from first club (players are usually in one org context)
    const orgId =
      PlayerDashboardState.clubs?.[0]?.organization_id ||
      PlayerDashboardState.player?.organization_id;

    if (!orgId) {
      container.innerHTML = "<p>Join a club to participate in polls.</p>";
      return;
    }

    const polls = await apiService.makeRequest(
      `/polls?organizationId=${orgId}`,
    );
    displayPolls(polls);
  } catch (error) {
    console.error("Load polls error:", error);
    container.innerHTML =
      '<p style="color: #dc3545;">Error loading polls. Please try again later.</p>';
  }
}

function displayPolls(polls) {
  const container = document.getElementById("pollsContainer");
  if (!container) return;

  if (!polls || polls.length === 0) {
    container.innerHTML =
      '<p style="text-align: center; color: var(--text-muted); padding: 2rem;">No active polls found.</p>';
    return;
  }

  container.innerHTML = polls
    .map((poll) => {
      const options =
        typeof poll.options === "string"
          ? JSON.parse(poll.options)
          : poll.options;
      const totalVotes =
        poll.results?.reduce((sum, r) => sum + parseInt(r.count), 0) || 0;

      return `
            <div class="card" style="border: 1px solid var(--border-color); padding: 1.5rem;">
                <h4 style="margin-bottom: 0.5rem;">${escapeHTML(poll.title)}</h4>
                <p style="opacity: 0.7; font-size: 0.9rem; margin-bottom: 1.5rem;">${escapeHTML(poll.description || "")}</p>
                <div class="poll-options" style="display: flex; flex-direction: column; gap: 0.75rem;">
                    ${options
                      .map((opt) => {
                        const voteData = poll.results?.find(
                          (r) => r.selection === opt,
                        );
                        const count = voteData ? parseInt(voteData.count) : 0;
                        const percent =
                          totalVotes > 0 ? (count / totalVotes) * 100 : 0;
                        const isUserVote = poll.userVote === opt;

                        return `
                            <div class="poll-option-row" onclick="voteOnPoll('${poll.id}', '${escapeAttr(opt)}')" 
                                 style="cursor: pointer; position: relative; background: rgba(255,255,255,0.03); border-radius: 8px; overflow: hidden; border: 1px solid ${isUserVote ? "var(--primary)" : "rgba(255,255,255,0.1)"}; transition: all 0.2s ease;">
                                <div class="poll-bar" style="position: absolute; left: 0; top: 0; bottom: 0; width: ${percent}%; background: ${isUserVote ? "var(--primary)" : "rgba(255,255,255,0.05)"}; opacity: 0.2; pointer-events: none;"></div>
                                <div style="position: relative; z-index: 1; padding: 0.75rem 1rem; display: flex; justify-content: space-between; align-items: center;">
                                    <span style="display: flex; align-items: center; gap: 0.5rem;">
                                        ${isUserVote ? '<span style="color: var(--primary);">✅</span>' : ""}
                                        ${escapeHTML(opt)}
                                    </span>
                                    <span style="font-weight: bold; font-family: monospace;">${Math.round(percent)}%</span>
                                </div>
                            </div>
                        `;
                      })
                      .join("")}
                </div>
                <div style="margin-top: 1.5rem; display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem; opacity: 0.5;">
                    <span>Total Votes: ${totalVotes}</span>
                    <span>Status: ${poll.status || "Active"}</span>
                </div>
            </div>
        `;
    })
    .join("");
}

async function voteOnPoll(pollId, selection) {
  try {
    await apiService.makeRequest(`/polls/${pollId}/vote`, {
      method: "POST",
      body: JSON.stringify({ selection }),
    });

    // Silently reload polls to show updated results
    loadPolls();
  } catch (error) {
    console.error("Vote error:", error);
    if (error.message.includes("already voted")) {
      showNotification("You have already voted in this poll.", "info");
    } else {
      showNotification("Failed to cast vote: " + error.message, "error");
    }
  }
}

// Expose to window
window.voteOnPoll = voteOnPoll;
window.loadPolls = loadPolls;

window.checkInEvent = checkInEvent;

async function handleAvailabilitySubmission(e) {
  e.preventDefault();
  try {
    const eventId = byId("availabilityEventId").value;
    const availability = document.querySelector(
      'input[name="availability"]:checked',
    )?.value;
    const notes = byId("availabilityNotes").value;

    if (!availability)
      return showNotification("Please select your availability", "error");

    await apiService.makeRequest("/events/" + eventId + "/availability", {
      method: "POST",
      body: JSON.stringify({ availability: availability, notes: notes }),
    });

    closeModal("availabilityModal");
    showNotification("Availability submitted successfully!", "success");
    e.target.reset();
  } catch (err) {
    console.error("Availability submit error:", err);
    showNotification("Failed to submit availability: " + err.message, "error");
  }
}

function applyToClub(clubId, clubName) {
  const clubIdEl = byId("applyClubId");
  if (clubIdEl) clubIdEl.value = clubId;
  const title = document.querySelector("#applyClubModal .modal-header h2");
  if (title) title.textContent = "Apply to " + clubName;
  showModal("applyClubModal");
}

async function handleClubApplication(e) {
  e.preventDefault();
  try {
    const clubId = byId("applyClubId").value;
    const message = byId("applicationMessage").value;
    const position = byId("appPlayerPosition").value;
    const experience = byId("playerExperience").value;
    const availability = Array.from(
      document.querySelectorAll('input[name="availability"]:checked'),
    ).map((cb) => cb.value);

    await apiService.makeRequest("/clubs/" + clubId + "/apply", {
      method: "POST",
      body: JSON.stringify({
        message: message,
        preferredPosition: position,
        experienceLevel: experience,
        availability: availability,
      }),
    });

    closeModal("applyClubModal");
    e.target.reset();
    showNotification("Application submitted successfully!", "success");
  } catch (err) {
    console.error("Club application error:", err);
    showNotification("Failed to submit application: " + err.message, "error");
  }
}

function filterPlayerEvents() {
  const search = (byId("eventSearchInput")?.value || "").toLowerCase();
  const type = byId("playerEventTypeFilter")?.value || "";
  const dateFrom = byId("playerEventDateFilter")?.value || "";

  let events = [...(PlayerDashboardState.events || [])];
  if (search) {
    events = events.filter(
      (e) =>
        (e.title || "").toLowerCase().includes(search) ||
        (e.description || "").toLowerCase().includes(search) ||
        (e.location || "").toLowerCase().includes(search),
    );
  }
  if (type) events = events.filter((e) => (e.event_type || "") === type);
  if (dateFrom) events = events.filter((e) => (e.event_date || "") >= dateFrom);

  displayEvents(events);
}

function filterClubs() {
  const search = (byId("clubSearchInput")?.value || "").toLowerCase();
  const type = byId("clubTypeFilter")?.value || "";
  const sport = byId("clubSportFilter")?.value || "";

  let clubs = [...(PlayerDashboardState.clubs || [])];

  // 🧪 DUMMY TEST CLUBS INJECTION (Requested for testing)
  if (search.includes("club")) {
    const dummyClubs = [
      {
        id: "dummy-1",
        name: "Elite Performance Club",
        sport: "football",
        location: "London",
        description: "A premier test club for testing search functionality.",
        member_count: 120,
        types: ["club"],
      },
      {
        id: "dummy-2",
        name: "The Tennis Club Specialists",
        sport: "tennis",
        location: "Manchester",
        description: "Test club focused on tennis activities and events.",
        member_count: 85,
        types: ["club", "event"],
      },
      {
        id: "dummy-3",
        name: "Global Sport Club United",
        sport: "basketball",
        location: "Birmingham",
        description: "Multi-sport club for all ages.",
        member_count: 210,
        types: ["club"],
      },
    ];
    dummyClubs.forEach((dc) => {
      if (!clubs.some((c) => c.name === dc.name)) clubs.push(dc);
    });
  }

  if (search) {
    clubs = clubs.filter(
      (c) =>
        (c.name || "").toLowerCase().includes(search) ||
        (c.location || "").toLowerCase().includes(search) ||
        (c.description || "").toLowerCase().includes(search),
    );
  }
  if (type)
    clubs = clubs.filter(
      (c) => Array.isArray(c.types) && c.types.includes(type),
    );
  if (sport) clubs = clubs.filter((c) => (c.sport || "") === sport);

  displayClubs(clubs);
}

function viewClubDetails(clubId) {
  const club =
    (PlayerDashboardState.clubs || []).find((c) => c.id === clubId) ||
    (PlayerDashboardState.availableClubs || []).find((c) => c.id === clubId);
  if (!club) return showNotification("Club not found", "error");

  removeIfExists("clubDetailsModal");
  const modal = document.createElement("div");
  modal.className = "modal";
  modal.id = "clubDetailsModal";
  modal.style.display = "block";

  // Pre-calculate conditional sections
  const philosophySection = club.philosophy
    ? `
      <div style="margin-bottom: 1.5rem;">
        <h4 style="margin-bottom: 0.5rem; color: var(--text-main); font-size: 0.95rem; text-transform: uppercase; letter-spacing: 0.05em;">Philosophy</h4>
        <p style="color: var(--text-secondary); line-height: 1.6;">${escapeHTML(club.philosophy)}</p>
      </div>`
    : "";

  const websiteSection = club.website
    ? `
      <div style="margin-bottom: 1.5rem;">
         <a href="${escapeAttr(club.website)}" target="_blank" style="color: var(--primary); text-decoration: none; display: inline-flex; align-items: center; gap: 0.5rem; font-weight: 500;">
            Wait, visit website ↗
         </a>
      </div>`
    : "";

  modal.innerHTML = `
    <div class="modal-content" style="max-width: 600px; border-radius: 16px; overflow: hidden; padding: 0; border: 1px solid var(--border-color);">
        <div class="modal-header" style="background: var(--surface-card); padding: 1.5rem 2rem; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; flex-direction: column; gap: 4px;">
                <h2 style="margin: 0; font-size: 1.75rem; font-weight: 700;">${escapeHTML(club.name)}</h2>
                <span class="status-badge" style="align-self: flex-start; background: rgba(59, 130, 246, 0.1); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.2); margin-top: 0.5rem;">
                    ${escapeHTML(club.sport || "Multi-sport")}
                </span>
            </div>
            <button class="close" onclick="closeModal('clubDetailsModal')" style="background: var(--surface-hover); width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: none; cursor: pointer; color: var(--text-muted);">&times;</button>
        </div>

        <div class="modal-body" style="padding: 2rem;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 2rem;">
                <div>
                    <span style="display: block; color: var(--text-muted); font-size: 0.85rem; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;">Location</span>
                    <span style="font-weight: 500; font-size: 1.1rem; color: var(--text-main); display: flex; align-items: center; gap: 0.5rem;">
                        📍 ${escapeHTML(club.location || "Not specified")}
                    </span>
                </div>
                <div>
                    <span style="display: block; color: var(--text-muted); font-size: 0.85rem; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;">Community</span>
                    <span style="font-weight: 500; font-size: 1.1rem; color: var(--text-main); display: flex; align-items: center; gap: 0.5rem;">
                        👥 ${Number(club.member_count || 0)} Members
                    </span>
                </div>
            </div>

            <div style="margin-bottom: 2rem;">
                <h4 style="margin-bottom: 0.75rem; color: var(--text-main); font-size: 0.95rem; text-transform: uppercase; letter-spacing: 0.05em;">About</h4>
                <p style="color: var(--text-secondary); line-height: 1.6;">${escapeHTML(club.description || "No description available.")}</p>
            </div>

            ${philosophySection}
            ${websiteSection}

            <div style="display: flex; gap: 1rem; margin-top: 2.5rem; padding-top: 1.5rem; border-top: 1px solid var(--border-color);">
                <button class="btn btn-primary" style="flex: 1; padding: 0.875rem;" onclick="applyToClub('${club.id}', '${escapeAttr(club.name)}')">Apply to Join Club</button>
                <button class="btn btn-secondary" style="padding: 0.875rem 1.5rem;" onclick="closeModal('clubDetailsModal')">Close</button>
            </div>
        </div>
    </div>
  `;
  document.body.appendChild(modal);
}

function viewEventDetails(eventId) {
  const event = (PlayerDashboardState.events || []).find(
    (e) => e.id === eventId,
  );
  if (!event) return showNotification("Event not found", "error");

  removeIfExists("eventDetailsModal");
  const modal = document.createElement("div");
  modal.className = "modal";
  modal.id = "eventDetailsModal";
  modal.style.display = "block";

  const eventTime = event.event_time ? event.event_time.slice(0, 5) : "TBA";
  const price = Number(event.price || 0);
  const spotsLine =
    event.spots_available !== undefined
      ? `${event.spots_available || 0} spots left`
      : "Open Availability";

  modal.innerHTML = `
    <div class="modal-content" style="max-width: 600px; border-radius: 16px; overflow: hidden; padding: 0; border: 1px solid var(--border-color);">
        <div class="modal-header" style="background: var(--surface-card); padding: 1.5rem 2rem; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; flex-direction: column; gap: 4px;">
                <h2 style="margin: 0; font-size: 1.75rem; font-weight: 700;">${escapeHTML(event.title)}</h2>
                <span class="status-badge" style="align-self: flex-start; background: rgba(16, 185, 129, 0.1); color: #10B981; border: 1px solid rgba(16, 185, 129, 0.2); margin-top: 0.5rem;">
                    ${escapeHTML(event.event_type || "Event")}
                </span>
            </div>
            <button class="close" onclick="closeModal('eventDetailsModal')" style="background: var(--surface-hover); width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: none; cursor: pointer; color: var(--text-muted);">&times;</button>
        </div>

        <div class="modal-body" style="padding: 2rem;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 2rem;">
                 <div>
                    <span style="display: block; color: var(--text-muted); font-size: 0.85rem; margin-bottom: 0.5rem; text-transform: uppercase;">Date & Time</span>
                    <span style="display: block; font-weight: 500; font-size: 1.1rem; color: var(--text-main); margin-bottom: 0.25rem;">${formatDate(event.event_date)}</span>
                    <span style="display: block; color: var(--text-secondary);">${eventTime}</span>
                 </div>
                 
                 <div>
                    <span style="display: block; color: var(--text-muted); font-size: 0.85rem; margin-bottom: 0.5rem; text-transform: uppercase;">Price & Access</span>
                    <span style="display: block; font-weight: 500; font-size: 1.1rem; color: ${price > 0 ? "#fbbf24" : "#4ade80"}; margin-bottom: 0.25rem;">${price > 0 ? formatCurrency(price) : "Free Entry"}</span>
                    <span style="display: block; color: var(--text-secondary);">${spotsLine}</span>
                 </div>
            </div>

            <div style="margin-bottom: 2rem;">
                <span style="display: block; color: var(--text-muted); font-size: 0.85rem; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;">Location</span>
                <span style="font-weight: 500; font-size: 1.1rem; color: var(--text-main); display: flex; align-items: center; gap: 0.5rem;">
                    📍 ${escapeHTML(event.location || "Location to be announced")}
                </span>
            </div>

            <div style="margin-bottom: 2rem;">
                <h4 style="margin-bottom: 0.75rem; color: var(--text-main); font-size: 0.95rem; text-transform: uppercase; letter-spacing: 0.05em;">About this Event</h4>
                <div style="color: var(--text-secondary); line-height: 1.6;">
                    ${escapeHTML(event.description || "No additional details provided.")}
                </div>
            </div>

            <div style="display: flex; gap: 1rem; margin-top: 2.5rem; padding-top: 1.5rem; border-top: 1px solid var(--border-color);">
                <button class="btn btn-primary" style="flex: 1; padding: 0.875rem;" onclick="submitAvailability('${event.id}')">
                    Book Spot ${price > 0 ? `(${formatCurrency(price)})` : ""}
                </button>
                <button class="btn btn-secondary" style="padding: 0.875rem 1.5rem;" onclick="closeModal('eventDetailsModal')">Close</button>
            </div>
        </div>
    </div>
  `;
  document.body.appendChild(modal);
}

function viewTeamDetails(teamId) {
  const team = (PlayerDashboardState.teams || []).find((t) => t.id === teamId);
  if (!team) return showNotification("Team not found", "error");

  removeIfExists("teamDetailsModal");
  const modal = document.createElement("div");
  modal.className = "modal";
  modal.id = "teamDetailsModal";
  modal.style.display = "block";

  const coachInfo = team.coach
    ? "<p><strong>Coach:</strong> " +
      escapeHTML(team.coach.name || "") +
      " (" +
      escapeHTML(team.coach.email || "") +
      ")</p>"
    : "<p><strong>Coach:</strong> Not assigned</p>";

  modal.innerHTML =
    '<div class="modal-content" style="max-width:600px;">' +
    '<div class="modal-header">' +
    "<h2>" +
    escapeHTML(team.name) +
    "</h2>" +
    '<button class="close" onclick="closeModal(\'teamDetailsModal\')">&times;</button>' +
    "</div>" +
    '<div class="modal-body">' +
    "<p><strong>Age Group:</strong> " +
    escapeHTML(team.age_group || "Not specified") +
    "</p>" +
    "<p><strong>Sport:</strong> " +
    escapeHTML(team.sport || "Not specified") +
    "</p>" +
    "<p><strong>Your Position:</strong> " +
    escapeHTML(team.player_position || "Not assigned") +
    "</p>" +
    "<p><strong>Your Jersey Number:</strong> " +
    escapeHTML(team.jersey_number || "Not assigned") +
    "</p>" +
    coachInfo +
    "<p><strong>Description:</strong> " +
    escapeHTML(team.description || "No description available") +
    "</p>" +
    '<div style="margin-top:1rem;">' +
    '<button class="btn btn-primary" onclick="viewTeamEvents(\'' +
    team.id +
    "'); closeModal('teamDetailsModal')\">View Team Events</button>" +
    '<button class="btn btn-secondary" onclick="closeModal(\'teamDetailsModal\')">Close</button>' +
    "</div>" +
    "</div>" +
    "</div>";
  document.body.appendChild(modal);
}

function viewClubEvents(clubId) {
  const list = (PlayerDashboardState.events || []).filter(
    (e) => e.club_id === clubId,
  );
  if (!list.length)
    return showNotification("No events found for this club", "info");
  showPlayerSection("event-finder");
  displayEvents(list);
}

function viewTeamEvents(teamId) {
  const list = (PlayerDashboardState.events || []).filter(
    (e) => e.team_id === teamId,
  );
  if (!list.length)
    return showNotification("No events found for this team", "info");
  showPlayerSection("event-finder");
  displayEvents(list);
}

async function refreshEventData() {
  try {
    showLoading(true);
    const events = await apiService.getEvents();
    PlayerDashboardState.events = events || [];
    displayEvents(PlayerDashboardState.events);
    showNotification("Events refreshed successfully!", "success");
  } catch (e) {
    showNotification("Failed to refresh events: " + e.message, "error");
  } finally {
    showLoading(false);
  }
}

async function refreshClubData() {
  try {
    showLoading(true);
    const clubs = await apiService.getClubs();
    PlayerDashboardState.availableClubs = clubs || [];
    displayClubs(PlayerDashboardState.availableClubs);
    showNotification("Clubs refreshed successfully!", "success");
  } catch (e) {
    showNotification("Failed to refresh clubs: " + e.message, "error");
  } finally {
    showLoading(false);
  }
}

function showPlayerSection(sectionId) {
  document
    .querySelectorAll(".dashboard-section")
    .forEach((s) => s.classList.remove("active"));

  // Remove active class from all nav buttons in grouped nav
  document
    .querySelectorAll(".dashboard-nav-grouped button")
    .forEach((b) => b.classList.remove("active"));

  const target = byId("player-" + sectionId);
  if (target) target.classList.add("active");

  // Find and highlight active button & parent dropdown
  const btn = document.querySelector(
    ".dashboard-nav-grouped button[onclick*=\"showPlayerSection('" +
      sectionId +
      "')\"]",
  );

  if (btn) {
    btn.classList.add("active");
    // Highlight parent if in dropdown
    const container = btn.closest(".nav-dropdown-container");
    if (container) {
      const trigger = container.querySelector(".dropdown-trigger");
      if (trigger) trigger.classList.add("active");
    }
  }

  switch (sectionId) {
    case "venue-booking":
      if (typeof loadPlayerVenues === "function") loadPlayerVenues();
      break;
    case "league-management":
      if (typeof loadPlayerLeagues === "function") loadPlayerLeagues();
      break;
    case "training-manager":
      if (typeof loadPlayerTraining === "function") loadPlayerTraining();
      break;
    case "tournament-manager":
      if (typeof loadPlayerTournaments === "function") loadPlayerTournaments();
      break;
    case "overview":
      loadPlayerOverview();
      break;
    case "my-clubs":
      loadPlayerClubs();
      break;
    case "family":
      loadFamilyMembers();
      break;
    case "teams":
      loadPlayerTeams();
      break;
    case "finances":
      loadPlayerFinances();
      break;
    case "polls":
      loadPolls();
      break;
    case "players":
      const activeFilter =
        document.querySelector(".filter-tab.active")?.dataset.filter || "all";
      renderPlayersList(activeFilter);
      break;
    case "club-finder":
      loadClubFinder();
      break;
    case "event-finder":
      loadEventFinder();
      break;
    case "documents":
      loadPlayerDocuments();
      break;
    case "shop":
      loadShop();
      break;
    case "profile":
      loadPersonalProfile();
      break;
    case "venue-booking":
      loadVenueBooking();
      break;
    case "league-management":
      loadLeagues();
      break;
    case "training-manager":
      loadTraining();
      break;
    case "tournament-manager":
      loadTournaments();
      break;
    default:
      console.warn("Unknown section:", sectionId);
  }
}

function loadPersonalProfile() {
  const pid = PlayerDashboardState.activePlayerId;
  const player = PlayerDashboardState.player;
  const user = window.AppState?.currentUser;

  console.log("👤 Loading personal profile. Player data:", player);

  if (!player && !pid && user) {
    // If no player record yet for main user, at least show user info
    byId("prof-firstName").value = user.first_name || user.firstName || "";
    byId("prof-lastName").value = user.last_name || user.lastName || "";
    byId("prof-email").value = user.email || "";
    return;
  }

  if (player) {
    byId("prof-firstName").value = player.first_name || "";
    byId("prof-lastName").value = player.last_name || "";
    byId("prof-email").value = player.email || "";
    byId("prof-phone").value = player.phone || "";
    byId("prof-dob").value = player.date_of_birth
      ? player.date_of_birth.substring(0, 10)
      : "";
    byId("prof-position").value = player.position || "";
  }
}

async function savePlayerProfile() {
  const pid = PlayerDashboardState.activePlayerId;
  const formData = {
    first_name: byId("prof-firstName").value,
    last_name: byId("prof-lastName").value,
    phone: byId("prof-phone").value,
    date_of_birth: byId("prof-dob").value,
    position: byId("prof-position").value,
  };

  showLoading(true);
  try {
    if (pid) {
      await apiService.updatePlayer(pid, formData);
    } else {
      // Update main user profile (this endpoint might need careful handling if it's users table)
      await apiService.makeRequest("/auth/profile-personal", {
        method: "PUT",
        body: JSON.stringify(formData),
      });
    }
    showNotification("Profile updated successfully", "success");
    await loadPlayerDataWithFallback();
  } catch (error) {
    console.error("Save profile error:", error);
    showNotification("Failed to save profile: " + error.message, "error");
  } finally {
    showLoading(false);
  }
}

async function loadVenueBooking() {
  const container = byId("player-venue-booking");
  if (!container) return;

  try {
    showLoading(true);
    const venues = await apiService.makeRequest("/venues").catch(() => []);

    if (!venues || venues.length === 0) {
      container.innerHTML = `
          <div class="card">
              <h3 style="margin-bottom: 1rem;">🏟️ Venue Booking</h3>
              <p style="color: var(--text-muted); margin-bottom: 2rem;">No venues are currently available for booking in your area.</p>
              <button class="btn btn-secondary" onclick="showPlayerSection('overview')">Back to Overview</button>
          </div>
        `;
    } else {
      container.innerHTML = `
          <div class="card">
              <h3 style="margin-bottom: 1rem;">🏟️ Available Venues</h3>
              <div class="venue-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.5rem; margin-top: 1rem;">
                  ${venues
                    .map(
                      (v) => `
                      <div class="venue-card" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 1.5rem; transition: transform 0.2s;">
                          <div style="font-size: 1.5rem; margin-bottom: 1rem;">🏟️</div>
                          <h4 style="margin-bottom: 0.5rem;">${v.name}</h4>
                          <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.5rem;">${v.location || "Unknown location"}</p>
                          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem;">
                              <span style="font-weight: 600; color: var(--primary);">£${v.hourly_rate}/hr</span>
                              <button class="btn btn-primary btn-small" onclick="window.location.href='venue-booking.html'">Book Now</button>
                          </div>
                      </div>
                  `,
                    )
                    .join("")}
              </div>
          </div>
        `;
    }
  } catch (e) {
    console.error(e);
  } finally {
    showLoading(false);
  }
}

function loadLeagues() {
  const container = byId("player-league-management");
  if (!container) return;
  container.innerHTML = `
    <div class="card">
        <h3 style="margin-bottom: 1rem;">🏆 League Management</h3>
        <p style="color: var(--text-muted); margin-bottom: 2rem;">League tables and fixtures will be available here soon.</p>
    </div>
  `;
}

function loadTraining() {
  const container = byId("player-training-manager");
  if (!container) return;
  container.innerHTML = `
    <div class="card">
        <h3 style="margin-bottom: 1rem;">🎯 Training Manager</h3>
        <p style="color: var(--text-muted); margin-bottom: 2rem;">Your training schedules and performance metrics will appear here.</p>
    </div>
  `;
}

function loadTournaments() {
  const container = byId("player-tournament-manager");
  if (!container) return;
  container.innerHTML = `
    <div class="card">
        <h3 style="margin-bottom: 1rem;">⚔️ Tournament Manager</h3>
        <p style="color: var(--text-muted); margin-bottom: 2rem;">Tournament registrations and brackets will be available here.</p>
    </div>
  `;
}

async function loadPlayerProducts() {
  const container = byId("shopProducts");
  if (!container) return;

  const clubFilter = byId("shopClubFilter");
  if (clubFilter && clubFilter.options.length <= 1) {
    // Fill filter with user's clubs
    PlayerDashboardState.clubs.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.name;
      clubFilter.appendChild(opt);
    });
  }

  showLoading(true);
  try {
    const selectedClubId = clubFilter?.value || null;
    let products = [];

    if (selectedClubId) {
      products = await apiService.getProducts(selectedClubId);
    } else {
      // Fetch products for all clubs if none selected
      const productPromises = PlayerDashboardState.clubs.map((c) =>
        apiService.getProducts(c.id),
      );
      const results = await Promise.all(productPromises);
      products = results.flat();
    }

    // Save to state for easy access in buyProduct
    PlayerDashboardState.products = products;

    if (!products || products.length === 0) {
      container.innerHTML =
        '<div class="empty-state"><h4>No products available</h4><p>Check back later for club merchandise</p></div>';
      return;
    }

    container.innerHTML = products
      .map(
        (product) => `
      <div class="card product-card">
        <div style="height: 150px; background: rgba(0,0,0,0.05); border-radius: 8px; margin-bottom: 1rem; display: flex; align-items: center; justify-content: center;">
          <span style="font-size: 3rem;">📦</span>
        </div>
        <h4>${escapeHTML(product.name)}</h4>
        <p style="color: var(--primary); font-weight: bold; font-size: 1.2rem; margin: 0.5rem 0;">£${parseFloat(product.price).toFixed(2)}</p>
        <p style="font-size: 0.9rem; opacity: 0.8; margin-bottom: 1rem; height: 3em; overflow: hidden;">${escapeHTML(product.description || "No description")}</p>
        <button class="btn btn-primary btn-block" onclick="buyProduct('${product.id}', ${product.price}, '${escapeHTML(product.name)}')">Buy Now</button>
      </div>
    `,
      )
      .join("");
  } catch (error) {
    console.error("Failed to load shop products:", error);
    container.innerHTML =
      '<p style="color:#dc3545">Failed to load shop products</p>';
  } finally {
    showLoading(false);
  }
}

async function buyProduct(productId, price, name) {
  const product = PlayerDashboardState.products.find((p) => p.id === productId);
  const customFields = product?.custom_fields
    ? typeof product.custom_fields === "string"
      ? JSON.parse(product.custom_fields)
      : product.custom_fields
    : [];

  const handlePurchase = (customization_details = null) => {
    const onSuccess = async (paymentResult) => {
      try {
        showLoading(true);
        await apiService.purchaseProduct(productId, {
          quantity: 1,
          paymentIntentId: paymentResult.id,
          customization_details: customization_details,
        });

        showNotification(`Successfully purchased ${name}!`, "success");
        await loadPlayerProducts(); // Refresh stock
      } catch (error) {
        console.error("Purchase confirmation failed:", error);
        showNotification(
          "Purchase confirmation failed: " + error.message,
          "error",
        );
      } finally {
        showLoading(false);
      }
    };

    const onError = (error) => {
      console.error("Payment failed:", error);
      showNotification("Payment failed: " + error.message, "error");
    };

    createPaymentModal(Number(price), name, onSuccess, onError);
  };

  if (customFields && customFields.length > 0) {
    // Show customization modal
    const container = byId("productQuestionsContainer");
    if (container) {
      container.innerHTML = customFields
        .map(
          (field, idx) => `
        <div class="form-group" style="margin-bottom: 1rem;">
          <label>${escapeHTML(field)}</label>
          <input type="text" name="q_${idx}" required class="custom-answer-input" data-question="${escapeHTML(field)}">
        </div>
      `,
        )
        .join("");

      const form = byId("productCustomizationForm");
      form.onsubmit = (e) => {
        e.preventDefault();
        const answers = {};
        const inputs = form.querySelectorAll(".custom-answer-input");
        inputs.forEach((input) => {
          answers[input.dataset.question] = input.value;
        });
        closeModal("productCustomizationModal");
        handlePurchase(answers);
      };

      showModal("productCustomizationModal");
    } else {
      handlePurchase();
    }
  } else {
    handlePurchase();
  }
}

function byId(id) {
  return document.getElementById(id);
}

function updateText(id, val) {
  const el = byId(id);
  if (el) el.textContent = val;
}

function formatCurrency(amount, currency = "GBP") {
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: currency,
    }).format(Number(amount) || 0);
  } catch {
    return "£" + Number(amount || 0).toFixed(2);
  }
}

function formatDate(dateString) {
  if (!dateString) return "—";
  const d = new Date(dateString);
  if (isNaN(d)) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function escapeHTML(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(s) {
  return escapeHTML(s).replace(/"/g, "&quot;");
}

function uniqueByKey(arr, keyFn) {
  const map = new Map();
  for (const item of arr) {
    const k = keyFn(item);
    if (!map.has(k)) map.set(k, item);
  }
  return Array.from(map.values());
}

function removeIfExists(id) {
  const el = byId(id);
  if (el) el.remove();
}

function safeGetCurrentUser() {
  try {
    const raw = localStorage.getItem("currentUser");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function accessStripeAccount() {
  console.log("Accessing Stripe dashboard...");
  const stripeUrl = "https://dashboard.stripe.com/";
  window.open(stripeUrl, "_blank");
}

// Make it globally available
window.accessStripeAccount = accessStripeAccount;

async function loadNotifications() {
  try {
    const notifications = await apiService.getNotifications();
    PlayerDashboardState.notifications = notifications;

    // Update the bell icon and unread count
    setupNavButtons();

    const listEl = document.getElementById("notificationList");
    if (!listEl) return;

    if (notifications.length === 0) {
      listEl.innerHTML = '<p class="empty-state">No notifications</p>';
      return;
    }

    listEl.innerHTML = notifications
      .map(
        (n) => `
      <div class="notification-item ${!n.is_read ? "unread" : ""}" onclick="handleNotificationClick('${n.id}', '${n.action_url}')">
        <h4>${escapeHTML(n.title)}</h4>
        <p>${escapeHTML(n.message)}</p>
        <span class="notification-time">${formatDate(n.created_at)}</span>
      </div>
    `,
      )
      .join("");
  } catch (error) {
    console.warn("Failed to load notifications:", error);
  }
}

function toggleNotifications() {
  const dropdown = document.getElementById("notificationDropdown");
  if (dropdown) {
    dropdown.classList.toggle("active");
  }
}

async function markAllNotificationsRead() {
  try {
    await apiService.markAllNotificationsAsRead();
    await loadNotifications();
  } catch (error) {
    showNotification("Failed to mark notifications as read", "error");
  }
}

async function handleNotificationClick(id, actionUrl) {
  try {
    await apiService.markNotificationAsRead(id);
    if (actionUrl && actionUrl !== "null" && actionUrl) {
      window.location.href = actionUrl;
    } else {
      await loadNotifications();
    }
  } catch (error) {
    console.warn("Notification handling error:", error);
  }
}

// Expose these to window so onclick works
window.toggleNotifications = toggleNotifications;
window.markAllNotificationsRead = markAllNotificationsRead;
window.handleNotificationClick = handleNotificationClick;

// Close dropdown when clicking outside
window.addEventListener("click", (e) => {
  const wrapper = document.querySelector(".notification-wrapper");
  const dropdown = document.getElementById("notificationDropdown");
  if (
    wrapper &&
    !wrapper.contains(e.target) &&
    dropdown &&
    dropdown.classList.contains("active")
  ) {
    dropdown.classList.remove("active");
  }
});

async function exportUserData() {
  try {
    const token = localStorage.getItem("authToken");
    const response = await fetch(`${apiService.baseUrl}/auth/gdpr/export`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) throw new Error("Failed to export data");

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "clubhub-data-export.json";
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    showNotification("Data export started", "success");
  } catch (error) {
    showNotification("Failed to export data", "error");
  }
}

async function deleteUserAccount() {
  if (
    !confirm(
      "CRITICAL: This will permanently delete your account and ALL associated data. This action CANNOT be undone. Are you absolutely sure?",
    )
  ) {
    return;
  }

  const finalConfirm = prompt(
    'Please type "DELETE" to confirm account erasure:',
  );
  if (finalConfirm !== "DELETE") {
    showNotification("Account deletion cancelled", "info");
    return;
  }

  try {
    const token = localStorage.getItem("authToken");
    const response = await fetch(`${apiService.baseUrl}/auth/gdpr/delete`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.ok) {
      showNotification("Account deleted successfully. Goodbye.", "success");
      setTimeout(() => logout(), 2000);
    } else {
      throw new Error("Deletion failed");
    }
  } catch (error) {
    showNotification("Failed to delete account", "error");
  }
}

/* Family Management Logic */
async function refreshFamilyData() {
  if (!apiService.getFamilyMembers) {
    apiService.getFamilyMembers = async () => {
      return await apiService.makeRequest("/players/family", { method: "GET" });
    };
  }
  const family = await apiService.getFamilyMembers();
  PlayerDashboardState.family = family || [];
  return PlayerDashboardState.family;
}

function loadFamilyMembers() {
  const grid = document.getElementById("familyGrid");
  if (!grid) return;

  // Show loading state
  grid.innerHTML =
    '<div class="stat-card loading-card">Loading family members...</div>';

  refreshFamilyData()
    .then((family) => {
      if (!family || !family.length) {
        grid.innerHTML =
          '<div class="stat-card" style="text-align: center; padding: 3rem;"><h3>No children added yet</h3><p>Click "+ Add Child" to create a profile for your child.</p></div>';
        return;
      }

      grid.innerHTML = `
        <div class="table-container" style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 12px; overflow: hidden;">
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 30%;">Full Name</th>
                <th>Age</th>
                <th>Sport / Position</th>
                <th>Club</th>
                <th style="text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${family
                .map((child) => {
                  const childAge =
                    child.age || calculateAge(child.date_of_birth);
                  const initial = (child.first_name || "C")[0];
                  return `
                  <tr>
                    <td>
                      <div style="display: flex; align-items: center; gap: 1rem;">
                        <div style="width: 36px; height: 36px; background: var(--primary); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.9rem;">
                          ${initial}
                        </div>
                        <div style="display: flex; flex-direction: column;">
                          <span style="font-weight: 600; color: white;">${escapeHTML(child.first_name)} ${escapeHTML(child.last_name)}</span>
                          <span style="font-size: 0.7rem; color: #aaa;">ID: ${child.id.substring(0, 8)}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style="color: #ddd;">${childAge} years</span>
                    </td>
                    <td>
                      <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <span style="color: #ddd;">${child.sport || "Multi-sport"}</span>
                        <span style="font-size: 0.75rem; color: #666;">•</span>
                        <span style="color: #aaa; font-size: 0.85rem;">${child.position || "Any"}</span>
                      </div>
                    </td>
                    <td>
                      ${
                        child.club_name
                          ? `
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                          <div style="width: 12px; height: 12px; border-radius: 3px; background: var(--primary);"></div>
                          <span style="color: #ddd;">${child.club_name}</span>
                        </div>
                      `
                          : `
                        <span style="color: #555; font-style: italic;">No club assigned</span>
                      `
                      }
                    </td>
                    <td style="text-align: right;">
                      <div style="display: flex; justify-content: flex-end; gap: 0.5rem;">
                        <button class="btn-icon" title="View Profile" onclick="viewChildDetails('${child.id}')">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        </button>
                        <button class="btn-icon" title="Edit" onclick="editChildProfile('${child.id}')">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button class="btn-icon" title="Delete" style="color: #ff4444;" onclick="deleteChildProfile('${child.id}')">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                `;
                })
                .join("")}
            </tbody>
          </table>
        </div>
      `;
    })
    .catch((err) => {
      console.error(err);
      grid.innerHTML = '<p class="error">Failed to load family members</p>';
    });
}

function openAddChildModal() {
  if (window.showModal) window.showModal("addChildModal");
  else {
    const m = document.getElementById("addChildModal");
    if (m) m.style.display = "block";
  }
}

function closeAddChildModal() {
  if (window.closeModal) window.closeModal("addChildModal");
  else {
    const m = document.getElementById("addChildModal");
    if (m) m.style.display = "none";
  }
  setTimeout(resetChildModal, 300); // Reset after close animation
}

function resetChildModal() {
  const form = document.getElementById("addChildForm");
  if (form) {
    form.reset();
    delete form.dataset.mode;
    delete form.dataset.id;
    const modal = document.getElementById("addChildModal");
    if (modal) {
      modal.querySelector("h2").innerText = "Add Child Profile";
      const btn = modal.querySelector('button[type="submit"]');
      if (btn) btn.innerText = "Create Profile";
    }
  }
}

function editChildProfile(id) {
  const child = (PlayerDashboardState.family || []).find((c) => c.id === id);
  if (!child) return;

  const form = document.getElementById("addChildForm");
  if (!form) return;

  form.firstName.value = child.first_name;
  form.lastName.value = child.last_name;
  form.dateOfBirth.value = child.date_of_birth.split("T")[0];
  if (form.position) form.position.value = child.position || "";

  // Add edit mode
  form.dataset.mode = "edit";
  form.dataset.id = id;

  const modal = document.getElementById("addChildModal");
  modal.querySelector("h2").innerText = "Edit Child Profile";
  modal.querySelector('button[type="submit"]').innerText = "Save Changes";

  openAddChildModal();
}

function wireFamilyListeners() {
  const form = document.getElementById("addChildForm");
  if (form) {
    // Remove existing listeners to avoid duplicates
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);

    newForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const formData = new FormData(newForm);
      const data = Object.fromEntries(formData.entries());

      const isEdit = newForm.dataset.mode === "edit";
      const endpoint = isEdit
        ? `/players/child/${newForm.dataset.id}`
        : "/players/child";
      const method = isEdit ? "PUT" : "POST";

      try {
        if (typeof showLoading === "function") showLoading(true);
        await apiService.makeRequest(endpoint, {
          method: method,
          body: JSON.stringify(data),
        });
        showNotification(
          isEdit ? "Profile updated!" : "Child profile created!",
          "success",
        );
        closeAddChildModal();
        loadFamilyMembers(); // Always reload list

        // If detail view is open for this child, refresh it
        if (
          isEdit &&
          PlayerDashboardState.activeChildId === newForm.dataset.id
        ) {
          viewChildDetails(newForm.dataset.id);
        }
      } catch (err) {
        console.error(err);
        showNotification(err.message || "Operation failed", "error");
      } finally {
        if (typeof showLoading === "function") showLoading(false);
      }
    });
  }
}

// Global exports
window.loadFamilyMembers = loadFamilyMembers;
window.openAddChildModal = openAddChildModal;
window.closeAddChildModal = closeAddChildModal;
window.editChildProfile = editChildProfile;

/* Child Detail & History Logic */
function viewChildDetails(id) {
  const child = (PlayerDashboardState.family || []).find((c) => c.id === id);
  if (!child) return;

  PlayerDashboardState.activeChildId = id;

  // Switch views
  document.getElementById("player-family").style.display = "none";
  const detailView = document.getElementById("child-detail-view");
  detailView.style.display = "block";

  // Populate Header
  document.getElementById("cv-name").textContent =
    `${child.first_name} ${child.last_name}`;
  document.getElementById("cv-avatar").textContent = (child.first_name ||
    "C")[0];
  document.getElementById("cv-subtitle").textContent =
    child.position || "No Position";

  // Populate CV Grid
  document.getElementById("cv-age").textContent = child.age || "-";
  document.getElementById("cv-gender").textContent = child.gender || "-";
  document.getElementById("cv-location").textContent = child.location || "-";
  document.getElementById("cv-sport").textContent = child.sport || "-";
  document.getElementById("cv-bio").textContent = child.bio || "No bio added.";

  // Load History
  loadChildHistory(id);
}

function closeChildDetails() {
  document.getElementById("child-detail-view").style.display = "none";
  document.getElementById("player-family").style.display = "grid"; // Grid or Block depending on CSS? Assuming Grid for now as original was stats-grid
  // Actually #player-family might be block, but familyGrid inside is grid.
  // The tabs hide/show logic usually sets .dashboard-section to block.
  document.getElementById("player-family").style.display = "block";
  PlayerDashboardState.activeChildId = null;
}

function editCurrentChild() {
  if (PlayerDashboardState.activeChildId) {
    editChildProfile(PlayerDashboardState.activeChildId);
  }
}

async function loadChildHistory(playerId) {
  const list = document.getElementById("cv-history-list");
  list.innerHTML = "<p>Loading history...</p>";

  try {
    const history = await apiService.makeRequest(
      `/players/${playerId}/history`,
    );
    if (!history || !history.length) {
      list.innerHTML = '<p class="text-muted">No history recorded.</p>';
      return;
    }

    list.innerHTML = history
      .map(
        (item) => `
            <div class="card" style="padding: 1rem; border-left: 4px solid var(--primary);">
                <div style="display: flex; justify-content: space-between;">
                    <h4 style="margin: 0;">${escapeHTML(item.club_name)} - ${escapeHTML(item.team_name)}</h4>
                    <button class="btn-text" onclick="deleteHistory('${item.id}')" style="color: #ff4444;">&times;</button>
                </div>
                <p style="font-size: 0.9rem; color: #888; margin: 0.5rem 0;">
                    ${item.start_date ? new Date(item.start_date).getFullYear() : "?"} - 
                    ${item.end_date ? new Date(item.end_date).getFullYear() : "Present"}
                </p>
                <p style="margin: 0; color: #ddd;">${escapeHTML(item.achievements || "")}</p>
            </div>
        `,
      )
      .join("");
  } catch (err) {
    console.error(err);
    list.innerHTML = '<p class="error">Failed to load history</p>';
  }
}

function openAddHistoryModal() {
  if (window.showModal) window.showModal("addHistoryModal");
  else document.getElementById("addHistoryModal").style.display = "block";
}

function closeAddHistoryModal() {
  if (window.closeModal) window.closeModal("addHistoryModal");
  else document.getElementById("addHistoryModal").style.display = "none";
  document.getElementById("addHistoryForm").reset();
}

async function deleteHistory(historyId) {
  if (!confirm("Delete this history entry?")) return;
  try {
    await apiService.makeRequest(`/players/history/${historyId}`, {
      method: "DELETE",
    });
    loadChildHistory(PlayerDashboardState.activeChildId);
  } catch (err) {
    showNotification("Failed to delete history", "error");
  }
}

function wireHistoryListeners() {
  const form = document.getElementById("addHistoryForm");
  if (form) {
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);

    newForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!PlayerDashboardState.activeChildId) return;

      const formData = new FormData(newForm);
      const data = Object.fromEntries(formData.entries());

      try {
        await apiService.makeRequest(
          `/players/${PlayerDashboardState.activeChildId}/history`,
          {
            method: "POST",
            body: JSON.stringify(data),
          },
        );
        showNotification("History entry added", "success");
        closeAddHistoryModal();
        loadChildHistory(PlayerDashboardState.activeChildId);
      } catch (err) {
        showNotification("Failed to add history", "error");
      }
    });
  }
}

// Additional exports
window.viewChildDetails = viewChildDetails;
window.closeChildDetails = closeChildDetails;
window.editCurrentChild = editCurrentChild;
window.openAddHistoryModal = openAddHistoryModal;
window.closeAddHistoryModal = closeAddHistoryModal;
window.deleteHistory = deleteHistory;

// Initialize extra listeners
document.addEventListener("DOMContentLoaded", wireHistoryListeners);

/* End Child Detail Logic */

// Global exports
window.loadFamilyMembers = loadFamilyMembers;
window.openAddChildModal = openAddChildModal;
// ========================================
// PARENT/CHILD ACCOUNT MANAGEMENT ✅
// ========================================

// Add family to state
PlayerDashboardState.family = [];

function handleSportChange(sport) {
  const container = document.getElementById("dynamicSportFields");
  if (!container) return;

  let html = "";
  switch (sport) {
    case "Football":
    case "Rugby":
      html = `
                <div class="form-group">
                    <label>Position</label>
                    <select name="position">
                        <option value="">Select Position</option>
                        <option value="Goalkeeper">Goalkeeper</option>
                        <option value="Defender">Defender</option>
                        <option value="Midfielder">Midfielder</option>
                        <option value="Forward">Forward</option>
                    </select>
                </div>
            `;
      break;
    case "Cricket":
      html = `
                <div class="form-group">
                    <label>Batting Style</label>
                    <select name="battingStyle">
                        <option value="Right-hand">Right-hand</option>
                        <option value="Left-hand">Left-hand</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Bowling Style</label>
                    <input type="text" name="bowlingStyle" placeholder="e.g. Right-arm fast">
                </div>
            `;
      break;
    case "Athletics":
      html = `
                <div class="form-group">
                    <label>Primary Event</label>
                    <input type="text" name="event" placeholder="e.g. 100m, Long Jump">
                </div>
            `;
      break;
    default:
      html = "";
  }
  container.innerHTML = html;
}
window.handleSportChange = handleSportChange;

async function wireFamilyListeners() {
  await loadFamilyMembers();
}

async function loadFamilyMembers() {
  try {
    const family = await apiService.makeRequest("/players/family");
    PlayerDashboardState.family = family || [];
    renderFamilyGrid();
    setupNavButtons(); // Refresh profile switcher
  } catch (error) {
    console.error("Load family error:", error);
    PlayerDashboardState.family = [];
    renderFamilyGrid();
  }
}

function renderFamilyGrid() {
  const grid = document.getElementById("familyGrid");
  if (!grid) return;

  if (PlayerDashboardState.family.length === 0) {
    grid.innerHTML = `
            <div class="stat-card" style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
                <h4>No child profiles yet</h4>
                <p style="color: var(--text-muted); margin: 1rem 0;">Add your children to manage their sports activities</p>
                <button class="btn btn-primary" onclick="openAddChildModal()">+ Add First Child</button>
            </div>
        `;
    return;
  }

  grid.innerHTML = PlayerDashboardState.family
    .map((child) => {
      const age = child.age || calculateAge(child.date_of_birth);
      return `
            <div class="stat-card" style="position: relative;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                    <div>
                        <h4 style="margin: 0;">${escapeHTML(child.first_name)} ${escapeHTML(child.last_name)}</h4>
                        <p style="color: var(--text-muted); margin: 0.25rem 0;">Age ${age}</p>
                    </div>
                    <button class="btn btn-small btn-secondary" onclick="switchProfile('${child.id}')">
                        View
                    </button>
                </div>
                <div style="font-size: 0.875rem; color: var(--text-muted);">
                    <p style="margin: 0.25rem 0;">📍 ${escapeHTML(child.location || "No location")}</p>
                    <p style="margin: 0.25rem 0;">⚽ ${escapeHTML(child.sport || "No sport")}</p>
                    <p style="margin: 0.25rem 0;">🎯 ${escapeHTML(child.position || "No position")}</p>
                </div>
                <div style="display: flex; gap: 0.5rem; margin-top: 1rem;">
                    <button class="btn btn-small btn-secondary" onclick="editChildProfile('${child.id}')" style="flex: 1;">Edit</button>
                    <button class="btn btn-small btn-danger" onclick="deleteChildProfile('${child.id}')" style="flex: 1;">Delete</button>
                </div>
            </div>
        `;
    })
    .join("");
}

function openAddChildModal() {
  const modal = document.createElement("div");
  modal.className = "modal active";
  modal.id = "addChildModal";
  modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h3>Add Child Profile</h3>
                <button class="modal-close" onclick="closeAddChildModal()">&times;</button>
            </div>
            <form id="addChildForm" onsubmit="handleAddChild(event)">
                <div class="form-group">
                    <label>First Name *</label>
                    <input type="text" name="firstName" required>
                </div>
                <div class="form-group">
                    <label>Last Name *</label>
                    <input type="text" name="lastName" required>
                </div>
                <div class="form-group">
                    <label>Date of Birth *</label>
                    <input type="date" name="dateOfBirth" required>
                </div>
                <div class="form-group">
                    <label>Gender</label>
                    <select name="gender">
                        <option value="">Select...</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Sport</label>
                    <input type="text" name="sport" placeholder="e.g., Football">
                </div>
                <div class="form-group">
                    <label>Position</label>
                    <input type="text" name="position" placeholder="e.g., Forward">
                </div>
                <div class="form-group">
                    <label>Location</label>
                    <input type="text" name="location" placeholder="e.g., London">
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="closeAddChildModal()">Cancel</button>
                    <button type="submit" class="btn btn-primary">Add Child</button>
                </div>
            </form>
        </div>
    `;
  document.body.appendChild(modal);
}

function closeAddChildModal() {
  const modal = document.getElementById("addChildModal");
  if (modal) modal.remove();
}

async function handleAddChild(event) {
  event.preventDefault();
  const form = event.target;
  const formData = new FormData(form);

  try {
    showLoading(true);

    await apiService.makeRequest("/players/child", {
      method: "POST",
      body: JSON.stringify({
        firstName: formData.get("firstName"),
        lastName: formData.get("lastName"),
        dateOfBirth: formData.get("dateOfBirth"),
        gender: formData.get("gender"),
        sport: formData.get("sport"),
        position: formData.get("position"),
        location: formData.get("location"),
      }),
    });

    showNotification("Child profile added successfully!", "success");
    closeAddChildModal();
    await loadFamilyMembers();
  } catch (error) {
    console.error("Add child error:", error);
    showNotification(error.message || "Failed to add child profile", "error");
  } finally {
    showLoading(false);
  }
}

async function editChildProfile(childId) {
  const child = PlayerDashboardState.family.find((c) => c.id === childId);
  if (!child) return;

  const modal = document.createElement("div");
  modal.className = "modal active";
  modal.id = "editChildModal";
  modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h3>Edit Child Profile</h3>
                <button class="modal-close" onclick="closeEditChildModal()">&times;</button>
            </div>
            <form id="editChildForm" onsubmit="handleEditChild(event, '${childId}')">
                <div class="form-group">
                    <label>First Name *</label>
                    <input type="text" name="firstName" value="${escapeHTML(child.first_name)}" required>
                </div>
                <div class="form-group">
                    <label>Last Name *</label>
                    <input type="text" name="lastName" value="${escapeHTML(child.last_name)}" required>
                </div>
                <div class="form-group">
                    <label>Date of Birth *</label>
                    <input type="date" name="dateOfBirth" value="${child.date_of_birth}" required>
                </div>
                <div class="form-group">
                    <label>Gender</label>
                    <select name="gender">
                        <option value="">Select...</option>
                        <option value="male" ${child.gender === "male" ? "selected" : ""}>Male</option>
                        <option value="female" ${child.gender === "female" ? "selected" : ""}>Female</option>
                        <option value="other" ${child.gender === "other" ? "selected" : ""}>Other</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Sport</label>
                    <input type="text" name="sport" value="${escapeHTML(child.sport || "")}">
                </div>
                <div class="form-group">
                    <label>Position</label>
                    <input type="text" name="position" value="${escapeHTML(child.position || "")}">
                </div>
                <div class="form-group">
                    <label>Location</label>
                    <input type="text" name="location" value="${escapeHTML(child.location || "")}">
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="closeEditChildModal()">Cancel</button>
                    <button type="submit" class="btn btn-primary">Save Changes</button>
                </div>
            </form>
        </div>
    `;
  document.body.appendChild(modal);
}

function closeEditChildModal() {
  const modal = document.getElementById("editChildModal");
  if (modal) modal.remove();
}

async function handleEditChild(event, childId) {
  event.preventDefault();
  const form = event.target;
  const formData = new FormData(form);

  try {
    showLoading(true);

    await apiService.makeRequest(`/players/child/${childId}`, {
      method: "PUT",
      body: JSON.stringify({
        firstName: formData.get("firstName"),
        lastName: formData.get("lastName"),
        dateOfBirth: formData.get("dateOfBirth"),
        gender: formData.get("gender"),
        sport: formData.get("sport"),
        position: formData.get("position"),
        location: formData.get("location"),
      }),
    });

    showNotification("Child profile updated successfully!", "success");
    closeEditChildModal();
    await loadFamilyMembers();
  } catch (error) {
    console.error("Edit child error:", error);
    showNotification(
      error.message || "Failed to update child profile",
      "error",
    );
  } finally {
    showLoading(false);
  }
}

async function deleteChildProfile(childId) {
  const child = PlayerDashboardState.family.find((c) => c.id === childId);
  if (!child) return;

  if (
    !confirm(
      `Are you sure you want to delete ${child.first_name}'s profile? This cannot be undone.`,
    )
  ) {
    return;
  }

  try {
    showLoading(true);

    await apiService.makeRequest(`/players/child/${childId}`, {
      method: "DELETE",
    });

    showNotification("Child profile deleted successfully", "success");
    await loadFamilyMembers();
  } catch (error) {
    console.error("Delete child error:", error);
    showNotification(
      error.message || "Failed to delete child profile",
      "error",
    );
  } finally {
    showLoading(false);
  }
}

// Expose functions
window.wireFamilyListeners = wireFamilyListeners;
window.loadFamilyMembers = loadFamilyMembers;
window.openAddChildModal = openAddChildModal;
window.editChildProfile = editChildProfile;

window.exportUserData = exportUserData;
window.deleteUserAccount = deleteUserAccount;
window.toggleNotifications = toggleNotifications;
window.markAllNotificationsRead = markAllNotificationsRead;
window.handleNotificationClick = handleNotificationClick;
window.showPlayerSection = showPlayerSection;
window.bookEvent = bookEvent;
window.payNow = payNow;
window.applyToClub = applyToClub;
window.handleClubApplication = handleClubApplication;
window.submitAvailability = submitAvailability;
window.handleAvailabilitySubmission = handleAvailabilitySubmission;
window.filterPlayerEvents = filterPlayerEvents;
window.filterClubs = filterClubs;
window.viewClubDetails = viewClubDetails;
window.viewEventDetails = viewEventDetails;
window.viewTeamDetails = viewTeamDetails;
window.viewClubEvents = viewClubEvents;
window.viewTeamEvents = viewTeamEvents;
window.downloadDocument = function (id) {
  showNotification("Document download coming soon", "info");
};
window.viewDocument = function (id) {
  showNotification("Document viewer coming soon", "info");
};
window.refreshEventData = refreshEventData;
window.refreshClubData = refreshClubData;
window.initializePlayerDashboard = initializePlayerDashboard;
window.accessStripeAccount = accessStripeAccount;
window.loadPaymentPlans = loadPaymentPlans;

console.log("Player Dashboard script loaded successfully");

// ==========================================
// NEW: Venue, Training, League, Tournament Loaders
// ==========================================

async function loadPlayerVenues() {
  const container = byId("player-venue-booking");
  if (!container) return;
  const content = container.querySelector(".card");

  try {
    content.innerHTML = "<p>Loading venues...</p>";
    const venues = await apiService.makeRequest("/venues");

    if (!venues || venues.length === 0) {
      content.innerHTML = `
        <h3>🏟️ Venue Booking</h3>
        <div style="text-align: center; padding: 2rem;">
            <p style="color: var(--text-muted);">No venues available for booking right now.</p>
        </div>
       `;
      return;
    }

    content.innerHTML = `
        <h3>🏟️ Venue Booking</h3>
        <div class="venue-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.5rem; margin-top: 1rem;">
            ${venues
              .map(
                (v) => `
                <div class="venue-card" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 1.25rem; transition: all 0.2s;">
                    ${v.image_url ? `<img src="${v.image_url}" style="width: 100%; height: 140px; object-fit: cover; border-radius: 8px; margin-bottom: 1rem;">` : '<div style="width: 100%; height: 140px; background: rgba(255,255,255,0.05); border-radius: 8px; margin-bottom: 1rem; display: flex; align-items: center; justify-content: center; font-size: 2rem;">🏟️</div>'}
                    <h4 style="margin: 0 0 0.5rem 0;">${v.name}</h4>
                    <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 0.5rem;">${v.location || "No location set"}</p>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem;">
                        <span style="font-weight: 600; color: var(--primary);">£${v.hourly_rate}/hr</span>
                        <button class="btn btn-primary btn-small" onclick="alert('Booking feature coming soon for players!')">Book</button>
                    </div>
                </div>
            `,
              )
              .join("")}
        </div>
    `;
  } catch (error) {
    console.error("Load player venues error:", error);
    content.innerHTML = `<p style="color: red;">Failed to load venues.</p>`;
  }
}

async function loadPlayerTraining() {
  const container = byId("player-training-manager");
  if (!container) return;
  const content = container.querySelector(".card");

  try {
    content.innerHTML = "<p>Loading training sessions...</p>";
    const orgId = localStorage.getItem("currentOrganizationId");
    if (!orgId) {
      content.innerHTML =
        "<p>Please select a club to view training sessions.</p>";
      return;
    }

    const events = await apiService.makeRequest(
      `/events?organizationId=${orgId}&eventType=training`,
    );

    if (!events || events.length === 0) {
      content.innerHTML = `
            <h3>🎯 Training</h3>
            <div style="text-align: center; padding: 2rem;">
                <p style="color: var(--text-muted);">No upcoming training sessions found.</p>
            </div>
        `;
      return;
    }

    content.innerHTML = `
        <h3>🎯 Training Sessions</h3>
        <div class="card-grid" style="margin-top: 1rem;">
            ${events
              .map(
                (e) => `
                <div class="card" style="background: rgba(255,255,255,0.03);">
                    <h4>${e.title}</h4>
                    <p style="color: var(--text-muted); font-size: 0.9rem;">${new Date(e.event_date).toLocaleDateString()} at ${e.start_time ? e.start_time.substring(0, 5) : "TBD"}</p>
                    <p style="font-size: 0.9rem; margin-top: 0.5rem;">${e.location || "No location"}</p>
                    <button class="btn btn-secondary btn-small" style="margin-top: 1rem;" onclick="viewEventDetails('${e.id}')">View Details</button>
                </div>
            `,
              )
              .join("")}
        </div>
     `;
  } catch (error) {
    console.error("Load player training error:", error);
    content.innerHTML = `<p style="color: red;">Failed to load training sessions.</p>`;
  }
}

async function loadPlayerTournaments() {
  const container = byId("player-tournament-manager");
  if (!container) return;
  const content = container.querySelector(".card");

  try {
    content.innerHTML = "<p>Loading tournaments...</p>";
    const orgId = localStorage.getItem("currentOrganizationId");
    if (!orgId) {
      content.innerHTML = "<p>Please select a club first.</p>";
      return;
    }

    const events = await apiService.makeRequest(
      `/events?organizationId=${orgId}&eventType=tournament`,
    );

    if (!events || events.length === 0) {
      content.innerHTML = `
            <h3>⚔️ Tournaments</h3>
            <div style="text-align: center; padding: 2rem;">
                <p style="color: var(--text-muted);">No tournaments scheduled.</p>
            </div>
        `;
      return;
    }

    content.innerHTML = `
        <h3>⚔️ Tournaments</h3>
        <div class="card-grid" style="margin-top: 1rem;">
            ${events
              .map(
                (e) => `
                <div class="card" style="background: rgba(255,255,255,0.03);">
                    <h4>${e.title}</h4>
                    <p style="color: var(--text-muted); font-size: 0.9rem;">${new Date(e.event_date).toLocaleDateString()}</p>
                    <p style="margin-top: 0.5rem;">${e.description || "No description"}</p>
                    <button class="btn btn-primary btn-small" style="margin-top: 1rem;" onclick="viewEventDetails('${e.id}')">Register / View</button>
                </div>
            `,
              )
              .join("")}
        </div>
     `;
  } catch (error) {
    console.error("Load player tournaments error:", error);
    content.innerHTML = `<p style="color: red;">Failed to load tournaments.</p>`;
  }
}

async function loadPlayerLeagues() {
  const container = byId("player-league-management");
  if (!container) return;
  const content = container.querySelector(".card");

  content.innerHTML = `
    <h3>🥇 Leagues</h3>
    <div style="text-align: center; padding: 3rem;">
        <p style="color: var(--text-muted);">League standings and fixtures coming soon.</p>
    </div>
  `;
}

// Expose functions
window.loadPlayerVenues = loadPlayerVenues;
window.loadPlayerTraining = loadPlayerTraining;
window.loadPlayerTournaments = loadPlayerTournaments;
window.loadPlayerLeagues = loadPlayerLeagues;

function calculateAge(dateOfBirth) {
  if (!dateOfBirth) return "N/A";
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
window.calculateAge = calculateAge;

/**
 * Handle accepting a club invitation
 */
async function acceptInvitation(orgId) {
  if (!confirm("Are you sure you want to accept this invitation?")) return;
  try {
    showLoading(true);
    const res = await apiService.makeRequest(`/dashboard/invitations/${orgId}/accept`, {
      method: "POST",
    });
    showNotification(res.message || "Invitation accepted!", "success");
    
    // Reload everything to reflect new membership
    await loadPlayerDataWithFallback();
    loadPlayerClubs();
    loadPlayerOverview();
    
  } catch (err) {
    console.error("Failed to accept invitation:", err);
    showNotification(err.message || "Failed to accept invitation", "error");
  } finally {
    showLoading(false);
  }
}

/**
 * Handle declining a club invitation
 */
async function declineInvitation(orgId) {
  if (!confirm("Are you sure you want to decline this invitation?")) return;
  try {
    showLoading(true);
    const res = await apiService.makeRequest(`/dashboard/invitations/${orgId}/decline`, {
      method: "POST",
    });
    showNotification(res.message || "Invitation declined", "info");
    
    // Reload state
    await loadPlayerDataWithFallback();
    loadPlayerClubs();
    
  } catch (err) {
    console.error("Failed to decline invitation:", err);
    showNotification(err.message || "Failed to decline invitation", "error");
  } finally {
    showLoading(false);
  }
}

// Export to window
window.acceptInvitation = acceptInvitation;
window.declineInvitation = declineInvitation;
