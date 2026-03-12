let currentTeams = [];
let tacticalBoardData = {
  formation: "4-4-2",
  players: [],
};

async function initializeCoachDashboard() {
  console.log("🚀 Initializing Coach Dashboard...");

  // Ensure we have dashboard data loaded into AppState
  if (!AppState.staff || AppState.staff.length === 0) {
    console.log("📡 Fetching group data for Coach...");
    try {
      const activeClubId =
        AppState.currentUser?.clubId ||
        AppState.currentUser?.currentOrganizationId;
      const dashboardData = await apiService.getCoachDashboardData(
        AppState.currentUser?.id,
      );
      if (dashboardData) {
        AppState.clubs = dashboardData.clubs || [];
        AppState.players = dashboardData.players || [];
        AppState.staff = dashboardData.staff || [];
        AppState.events = dashboardData.events || [];
        AppState.teams = dashboardData.teams || [];
        AppState.payments = dashboardData.payments || [];
        AppState.statistics =
          dashboardData.stats || dashboardData.statistics || {};
        console.log("✅ Data loaded into AppState:", {
          staff: AppState.staff.length,
          teams: AppState.teams.length,
          players: AppState.players.length,
        });
      }
    } catch (error) {
      console.error("❌ Failed to fetch coach dashboard dependencies:", error);
    }
  }

  loadCoachData();
  loadCoachStats();
  setupCoachEventListeners();
  initializeTacticalBoard();

  // Also load recent matches/upcoming if functions exist
  if (typeof loadRecentMatches === "function") loadRecentMatches();
  if (typeof loadUpcomingEvents === "function") loadUpcomingEvents();
}

function setupCoachEventListeners() {
  // Form submissions
  document
    .getElementById("createTeamForm")
    .addEventListener("submit", handleCreateTeam);
  document
    .getElementById("addTeamEventForm")
    .addEventListener("submit", handleAddTeamEvent);
  document
    .getElementById("matchResultForm")
    .addEventListener("submit", handleMatchResult);
}

function loadCoachData() {
  // Load teams this coach manages
  const coachStaff = AppState.staff.find(
    (s) => s.email === AppState.currentUser.email,
  );
  if (coachStaff) {
    currentTeams =
      AppState.teams?.filter(
        (t) => t.coach_id === coachStaff.id || t.coachId === coachStaff.id,
      ) || [];
  }
}

// Section Navigation
function showCoachSection(sectionId) {
  console.log(`🚀 Coach switching to section: ${sectionId}`);

  // Hide all sections
  const sections = document.querySelectorAll(".dashboard-section");
  sections.forEach((section) => {
    section.classList.remove("active");
    section.style.display = "none";
  });

  // Remove active class from all nav items (sidebar + mobile)
  const navItems = document.querySelectorAll(
    ".sidebar-nav .nav-item, .app-top-tabs .tab-item, .app-bottom-nav .nav-link"
  );
  navItems.forEach((item) => {
    item.classList.remove("active");
    
    // Check if this item is the one being activated (matching sectionId in onclick)
    if (item.getAttribute('onclick') && item.getAttribute('onclick').includes(`'${sectionId}'`)) {
      item.classList.add('active');
    }
  });

  // Show selected section
  const targetSection = document.getElementById(`coach-${sectionId}`);
  if (targetSection) {
    targetSection.classList.add("active");
    targetSection.style.display = "block";
  } else {
    console.error(`❌ Section 'coach-${sectionId}' not found!`);
  }

  // Handle section-specific loaders
  switch (sectionId) {
    case "overview":
      loadCoachStats();
      break;
    case "teams":
      loadCoachTeams();
      break;
    case "players":
      loadCoachPlayers();
      break;
    case "events":
      loadCoachEvents();
      break;
    case "item-shop":
      if (typeof loadCoachProducts === "function") loadCoachProducts();
      break;
    case "feed":
      loadCommunityFeed();
      break;
    case "messenger":
      loadMessengerConversations();
      break;
    case "tactical-board":
      if (typeof initializeTacticalBoard === 'function') initializeTacticalBoard();
      break;
    case "profile":
      loadCoachProfile();
      break;
    case "tournament-manager":
      loadCoachTournaments();
      break;
  }

  // Close sidebar on mobile
  if (window.innerWidth <= 768) {
    const sidebar = document.querySelector(".sidebar");
    if (sidebar) sidebar.classList.remove("open");
  }
}

function openCreateModal() {
  const modal = document.getElementById("quickActionModal");
  if (modal) modal.style.display = "block";
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.style.display = "none";
}

function loadCoachProfile() {
  const user = JSON.parse(localStorage.getItem("currentUser"));
  if (!user) return;

  const fields = {
    "coach-prof-firstName": user.firstName || user.first_name || "",
    "coach-prof-lastName": user.lastName || user.last_name || "",
    "coach-prof-email": user.email || "",
    "coach-prof-phone": user.phone || "",
    "coach-prof-bio": user.bio || "",
  };

  for (const [id, val] of Object.entries(fields)) {
    const el = document.getElementById(id);
    if (el) el.value = val;
  }
}

async function saveCoachProfile() {
  try {
    const updatedData = {
      firstName: document.getElementById("coach-prof-firstName").value,
      lastName: document.getElementById("coach-prof-lastName").value,
      phone: document.getElementById("coach-prof-phone").value,
      bio: document.getElementById("coach-prof-bio").value,
    };

    const response = await apiService.makeRequest("/auth/profile", {
      method: "PUT",
      body: JSON.stringify(updatedData),
    });

    if (response.success) {
      // Update local storage
      const user = JSON.parse(localStorage.getItem("currentUser"));
      const updatedUser = { ...user, ...updatedData };
      localStorage.setItem("currentUser", JSON.stringify(updatedUser));

      showNotification("Profile updated successfully!", "success");
    }
  } catch (error) {
    console.error("❌ Failed to update coach profile:", error);
    showNotification("Failed to update profile", "error");
  }
}

async function loadCoachTournaments() {
  const container = document.getElementById("coach-tournament-manager");
  if (!container) return;

  const listView = document.getElementById("coachTournamentListView");
  const detailView = document.getElementById("coachTournamentDetailView");
  const grid = document.getElementById("coachTournamentListContainer");

  if (listView) listView.style.display = "block";
  if (detailView) detailView.style.display = "none";

  try {
    if (grid) grid.innerHTML = "<p>Loading competitions...</p>";

    const orgId =
      AppState.currentUser?.clubId ||
      (await apiService.getContext())?.currentGroup?.id;

    if (!orgId) {
      if (grid)
        grid.innerHTML =
          '<p style="padding: 2rem; opacity: 0.6;">Please select a club to view tournaments.</p>';
      return;
    }

    const tournaments = await apiService.makeRequest(
      `/events?organizationId=${orgId}&eventType=tournament`,
    );

    if (!tournaments || tournaments.length === 0) {
      if (grid)
        grid.innerHTML = `
                <div style="text-align: center; padding: 3rem; grid-column: 1 / -1;">
                    <p style="color: var(--text-muted);">No active tournaments found for this club.</p>
                </div>
            `;
      return;
    }

    if (grid) {
      grid.innerHTML = tournaments
        .map(
          (t) => `
                <div class="card tournament-card" style="background: rgba(255,255,255,0.03); cursor: pointer; transition: transform 0.2s;" onclick="viewCoachTournament('${t.id}')">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                        <div style="width: 48px; height: 48px; background: #dc2626; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">🏆</div>
                        <span class="status-badge" style="background: rgba(220, 38, 38, 0.1); color: #dc2626; border: 1px solid rgba(220, 38, 38, 0.2);">${t.status || "Active"}</span>
                    </div>
                    <h4>${t.title}</h4>
                    <p style="color: var(--text-muted); font-size: 0.85rem; margin: 0.5rem 0;">${formatDate(t.event_date)}</p>
                    <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 0.75rem; color: var(--text-muted);">Competition Details</span>
                        <i style="color: #dc2626;">→</i>
                    </div>
                </div>
            `,
        )
        .join("");
    }
  } catch (err) {
    console.error("Load coach tournaments error:", err);
    if (grid)
      grid.innerHTML = `<p style="color: var(--primary);">Error connecting to tournament service.</p>`;
  }
}

window.viewCoachTournament = async function (tournamentId) {
  const listView = document.getElementById("coachTournamentListView");
  const detailView = document.getElementById("coachTournamentDetailView");
  if (!listView || !detailView) return;

  try {
    showLoading(true);
    listView.style.display = "none";
    detailView.style.display = "block";

    const data = await apiService.getTournamentDetails(tournamentId);
    if (!data) throw new Error("Could not fetch details");

    document.getElementById("coachDetailTournamentName").textContent =
      data.tournament.title;

    renderCoachBracket(data.matches || []);
    renderCoachFixtures(data.matches || []);
    renderCoachStandings(data.standings || []);

    const firstTab = detailView.querySelector(".nav-item");
    if (firstTab) switchCoachTournamentTab(firstTab, "bracket");
  } catch (err) {
    console.error("View coach tournament error:", err);
    showNotification("Failed to load competition details", "error");
    closeCoachTournamentDetail();
  } finally {
    showLoading(false);
  }
};

window.closeCoachTournamentDetail = function () {
  const listView = document.getElementById("coachTournamentListView");
  const detailView = document.getElementById("coachTournamentDetailView");
  if (listView) listView.style.display = "block";
  if (detailView) detailView.style.display = "none";
};

window.switchCoachTournamentTab = function (btn, tabId) {
  const nav = btn.parentElement;
  nav
    .querySelectorAll(".nav-item")
    .forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");

  const container = document.getElementById("coachTournamentDetailView");
  container
    .querySelectorAll(".coach-tournament-tab")
    .forEach((t) => (t.style.display = "none"));

  const target = document.getElementById(`coach-tab-${tabId}`);
  if (target) target.style.display = "block";
};

function renderCoachBracket(matches) {
  const container = document.getElementById("coachTournamentBracketVisual");
  if (!container) return;

  let bracketMatches = matches.filter(
    (m) => m.round_number !== null && m.round_number !== undefined,
  );
  if (bracketMatches.length === 0) bracketMatches = matches;

  if (bracketMatches.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding: 4rem; opacity: 0.3;">
            <p>Brackets are finalized by administrators before the knockout stage begins.</p>
        </div>`;
    return;
  }

  const rounds = {};
  bracketMatches.forEach((m) => {
    const rk = m.round_number ?? 1;
    if (!rounds[rk]) rounds[rk] = [];
    rounds[rk].push(m);
  });

  const sortedRoundNums = Object.keys(rounds)
    .map(Number)
    .sort((a, b) => a - b);
  const totalRounds = sortedRoundNums.length;

  container.innerHTML = `
        <div class="bracket-tree">
            ${sortedRoundNums
              .map((roundNum, idx) => {
                const label =
                  totalRounds > 1 && idx === totalRounds - 1
                    ? "Final"
                    : totalRounds > 2 && idx === totalRounds - 2
                      ? "Semi Finals"
                      : `Round ${roundNum}`;

                return `
                <div class="bracket-round">
                    <h4 class="bracket-round-label">${label}</h4>
                    ${rounds[roundNum]
                      .map((m, mIdx) => {
                        const played = m.played || m.status === "completed";
                        const homeWon =
                          played &&
                          parseInt(m.home_score) > parseInt(m.away_score);
                        const awayWon =
                          played &&
                          parseInt(m.away_score) > parseInt(m.home_score);
                        const isUpper = mIdx % 2 === 0;

                        return `
                        <div class="bracket-match-container ${idx < totalRounds - 1 ? (isUpper ? "upper" : "lower") : ""}">
                            <div class="bracket-match" style="border-left: 3px solid ${played ? "#dc2626" : "rgba(255,255,255,0.1)"};">
                                <div class="match-team ${homeWon ? "winner" : ""}">
                                    <span class="team-name">${m.home_team || "TBD"} ${m.team_id && currentTeams.some((t) => t.id === m.team_id) ? "⭐" : ""}</span>
                                    <span class="match-score">${played ? m.home_score : "-"}</span>
                                </div>
                                <div class="match-team ${awayWon ? "winner" : ""}">
                                    <span class="team-name">${m.away_team || "TBD"} ${m.away_team_id && currentTeams.some((t) => t.id === m.away_team_id) ? "⭐" : ""}</span>
                                    <span class="match-score">${played ? m.away_score : "-"}</span>
                                </div>
                            </div>
                        </div>
                        `;
                      })
                      .join("")}
                </div>
            `;
              })
              .join("")}
        </div>
    `;
}

function renderCoachFixtures(matches) {
  const container = document.getElementById("coachTournamentFixturesList");
  if (!container) return;

  if (!matches || matches.length === 0) {
    container.innerHTML =
      "<p style='text-align:center; padding:2rem; opacity:0.5;'>Tournament schedule pending.</p>";
    return;
  }

  container.innerHTML = matches
    .map(
      (m) => `
        <div class="fixture-item" style="display: flex; align-items: center; padding: 1.25rem; border-bottom: 1px solid rgba(255,255,255,0.05); background: ${m.status === "live" ? "rgba(220, 38, 38, 0.05)" : "transparent"};">
            <div style="flex: 1; text-align: right; font-weight: 600;">${m.home_team || "TBD"}</div>
            <div style="padding: 0 1.5rem; text-align: center; min-width: 100px;">
                <div style="font-size: 1.2rem; font-weight: 800; background: rgba(0,0,0,0.2); padding: 0.4rem 0.8rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
                    ${m.status === "completed" || m.status === "live" ? `${m.home_score} - ${m.away_score}` : "VS"}
                </div>
                <div style="font-size: 0.65rem; color: ${m.status === "live" ? "#dc2626" : "var(--text-muted)"}; margin-top: 6px; font-weight: 700; text-transform: uppercase;">
                    ${m.status === "live" ? "● LIVE" : m.status}
                </div>
            </div>
            <div style="flex: 1; text-align: left; font-weight: 600;">${m.away_team || "TBD"}</div>
            <div style="margin-left: 1rem;">
                ${
                  m.status !== "completed" &&
                  currentTeams.some(
                    (t) => t.id === m.team_id || t.id === m.away_team_id,
                  )
                    ? `<button class="btn btn-small btn-primary" onclick="recordMatchResult('${m.id}')">Update</button>`
                    : ""
                }
            </div>
        </div>
    `,
    )
    .join("");
}

function renderCoachStandings(standings) {
  const container = document.getElementById(
    "coachTournamentStandingsContainer",
  );
  if (!container) return;

  if (!standings || Object.keys(standings).length === 0) {
    container.innerHTML =
      "<p style='text-align:center; padding: 4rem; opacity: 0.4;'>Group standings will appear here once the league phase transitions logic is finalized.</p>";
    return;
  }

  const sorted = Object.values(standings).sort(
    (a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf,
  );

  container.innerHTML = `
        <div class="table-responsive">
            <table class="table">
                <thead>
                    <tr>
                        <th style="width: 40px;">#</th>
                        <th>Team</th>
                        <th style="text-align: center;">P</th>
                        <th style="text-align: center;">W</th>
                        <th style="text-align: center;">D</th>
                        <th style="text-align: center;">L</th>
                        <th style="text-align: center;">GD</th>
                        <th style="text-align: center; color: #dc2626;">PtsLocal</th>
                    </tr>
                </thead>
                <tbody>
                    ${sorted
                      .map(
                        (s, idx) => `
                        <tr style="${currentTeams.some((t) => t.name === s.name) ? "background: rgba(220,38,38,0.05); border-left: 2px solid #dc2626;" : ""}">
                            <td style="opacity: 0.5;">${idx + 1}</td>
                            <td style="font-weight: 700;">${s.name} ${currentTeams.some((t) => t.name === s.name) ? "(Your Team)" : ""}</td>
                            <td style="text-align: center;">${s.p}</td>
                            <td style="text-align: center;">${s.w}</td>
                            <td style="text-align: center;">${s.d}</td>
                            <td style="text-align: center;">${s.l}</td>
                            <td style="text-align: center;">${s.gd > 0 ? "+" : ""}${s.gd}</td>
                            <td style="text-align: center; font-weight: 800; color: #dc2626;">${s.pts}</td>
                        </tr>
                    `,
                      )
                      .join("")}
                </tbody>
            </table>
        </div>
    `;
}

async function loadCoachProducts() {
  const container = document.getElementById("shopProducts");
  if (!container) return;

  const clubFilter = document.getElementById("shopClubFilter");

  // Get clubs coach is part of
  const coachClubs = AppState.clubs || [];

  if (clubFilter && clubFilter.options.length <= 1) {
    coachClubs.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.name;
      clubFilter.appendChild(opt);
    });
  }

  try {
    const selectedClubId = clubFilter?.value || null;
    let products = [];

    if (selectedClubId) {
      products = await apiService.getProducts(selectedClubId);
    } else {
      // Fetch products for all clubs
      const productPromises = coachClubs.map((c) =>
        apiService.getProducts(c.id),
      );
      const results = await Promise.all(productPromises);
      products = results.flat();
    }

    if (!products || products.length === 0) {
      container.innerHTML =
        '<div class="card"><p>No products available in the shop</p></div>';
      return;
    }

    container.innerHTML = products
      .map(
        (product) => `
            <div class="card product-card">
                <div style="height: 120px; background: rgba(255,255,255,0.05); border-radius: 8px; margin-bottom: 1rem; display: flex; align-items: center; justify-content: center;">
                    <span style="font-size: 2.5rem;">📦</span>
                </div>
                <h4>${product.name}</h4>
                <p style="color: #dc2626; font-weight: bold; font-size: 1.1rem; margin: 0.5rem 0;">£${parseFloat(product.price).toFixed(2)}</p>
                <p style="font-size: 0.85rem; opacity: 0.8; margin-bottom: 1rem; height: 3em; overflow: hidden;">${product.description || "No description"}</p>
                <button class="btn btn-primary btn-small" style="width: 100%" onclick="buyCoachProduct('${product.id}', ${product.price}, '${product.name}')">Buy Now</button>
            </div>
        `,
      )
      .join("");
  } catch (error) {
    console.error("Failed to load shop products:", error);
    container.innerHTML =
      '<p style="color:#ef4444">Failed to load shop products</p>';
  }
}

async function buyCoachProduct(productId, price, name) {
  const confirmed = await showConfirm(
    `Do you want to purchase ${name} for £${parseFloat(price).toFixed(2)}?`,
    "Purchase Confirmation",
    "confirm",
  );
  if (!confirmed) return;

  try {
    await apiService.purchaseProduct(productId, {
      quantity: 1,
      coachId: AppState.currentUser?.id,
    });
    showNotification(`Successfully purchased ${name}!`, "success");
  } catch (error) {
    console.error("Purchase failed:", error);
    showNotification("Purchase failed: " + error.message, "error");
  }
}

// Coach Statistics
function loadCoachStats() {
  const stats = AppState.statistics || {};
  const teams = currentTeams || [];

  const teamsCount = teams.length;
  const totalPlayers = AppState.players?.length || 0;
  const upcomingSessions = stats.upcomingSessions ?? 0;

  // Update stats
  const teamsCountEl = document.getElementById("managedTeamsCount");
  const playersCountEl = document.getElementById("totalPlayersCount");
  const eventsCountEl = document.getElementById("upcomingSessionsCount");

  if (teamsCountEl) teamsCountEl.textContent = teamsCount;
  if (playersCountEl) playersCountEl.textContent = totalPlayers;
  if (eventsCountEl) eventsCountEl.textContent = upcomingSessions;

  // Some versions use different IDs - check for those too
  if (document.getElementById("coachTotalTeams"))
    document.getElementById("coachTotalTeams").textContent = teams.length;
  if (document.getElementById("coachTotalPlayers"))
    document.getElementById("coachTotalPlayers").textContent = totalPlayers;

  loadRecentMatches();
  loadTodaySchedule();
}

function loadRecentMatches() {
  const recentMatches = (AppState.events || [])
    .filter((e) => e.event_type === "match" && e.match_result)
    .slice(0, 5);

  // Check for correct container ID based on HTML
  const container =
    document.getElementById("groupsContainer") ||
    document.getElementById("recentMatches");
  if (!container) return;
  container.innerHTML = recentMatches
    .map(
      (match) => `
        <div class="item-list-item">
            <div class="item-info">
                <h4>vs ${match.opponent || "TBD"}</h4>
                <p>${formatDate(match.event_date || match.date)} - Score: ${match.home_score}-${match.away_score}</p>
            </div>
            <span class="status-badge status-${match.match_result === "win" ? "paid" : match.match_result === "draw" ? "pending" : "overdue"}">
                ${(match.match_result || "N/A").toUpperCase()}
            </span>
        </div>
    `,
    )
    .join("");
}

function loadTodaySchedule() {
  const today = new Date().toISOString().split("T")[0];
  const todayEvents = AppState.events.filter((e) => e.date === today);

  const container = document.getElementById("todaySchedule");

  if (todayEvents.length === 0) {
    container.innerHTML = "<p>No events scheduled for today</p>";
    return;
  }

  container.innerHTML = todayEvents
    .map(
      (event) => `
        <div class="item-list-item">
            <div class="item-info">
                <h4>${event.title}</h4>
                <p>${event.time} - ${event.type}</p>
            </div>
            <span class="status-badge status-active">${event.type}</span>
        </div>
    `,
    )
    .join("");
}

// Teams Management
function loadCoachTeams() {
  const container = document.getElementById("coachTeamsContainer");

  if (currentTeams.length === 0) {
    container.innerHTML =
      '<div class="card"><p>No teams assigned yet. Create a team to get started.</p></div>';
    return;
  }

  container.innerHTML = currentTeams
    .map(
      (team) => `
        <div class="team-card">
            <h4>${team.name}</h4>
            <p><strong>Age Group:</strong> ${team.age_group || team.ageGroup || "N/A"}</p>
            <p><strong>Sport:</strong> ${team.sport}</p>
            
            <div class="team-stats">
                <div class="team-stat">
                    <span class="team-stat-number">${team.player_count ?? (team.players?.length || 0)}</span>
                    <span class="team-stat-label">Players</span>
                </div>
                <div class="team-stat">
                    <span class="team-stat-number">${team.wins || 0}</span>
                    <span class="team-stat-label">Wins</span>
                </div>
                <div class="team-stat">
                    <span class="team-stat-number">${team.events?.length || 0}</span>
                    <span class="team-stat-label">Events</span>
                </div>
            </div>
            
            <div class="item-actions">
                <button class="btn btn-small btn-primary" onclick="manageTeam('${team.id}')">Manage</button>
                <button class="btn btn-small btn-secondary" onclick="viewTeamStats('${team.id}')">Stats</button>
                <button class="btn btn-small btn-secondary" onclick="assignPlayers('${team.id}')">Players</button>
            </div>
        </div>
    `,
    )
    .join("");
}

async function handleCreateTeam(e) {
  e.preventDefault();

  const coachStaff = AppState.staff.find(
    (s) => s.email === AppState.currentUser.email,
  );
  if (!coachStaff) {
    showNotification("You must be linked as staff to create teams", "error");
    return;
  }

  const teamData = {
    name: document.getElementById("teamName").value,
    age_group: document.getElementById("teamAgeGroup").value,
    sport: document.getElementById("teamSport").value,
    description: document.getElementById("teamDescription").value,
    coach_id: coachStaff.id,
    club_id: coachStaff.club_id || coachStaff.clubId,
  };

  try {
    showLoading(true);
    const result = await apiService.makeRequest("/teams", {
      method: "POST",
      body: JSON.stringify(teamData),
    });

    if (result) {
      if (!AppState.teams) AppState.teams = [];
      AppState.teams.push(result);
      currentTeams.push(result);

      closeModal("createTeamModal");
      loadCoachTeams();
      loadCoachStats();
      document.getElementById("createTeamForm").reset();
      showNotification("Team created successfully!", "success");
    }
  } catch (error) {
    console.error("Failed to create team:", error);
    showNotification("Failed to create team: " + error.message, "error");
  } finally {
    showLoading(false);
  }
}

// Players Management
function loadCoachPlayers() {
  const teamFilter = document.getElementById("teamFilter");

  // Populate team filter
  teamFilter.innerHTML =
    '<option value="">All Teams</option>' +
    currentTeams
      .map((team) => `<option value="${team.id}">${team.name}</option>`)
      .join("");

  filterCoachPlayers();
}

function filterCoachPlayers() {
  const teamFilter = document.getElementById("teamFilter").value;
  const searchTerm = document
    .getElementById("playerSearchCoach")
    .value.toLowerCase();

  const teamIds = currentTeams.map((t) => t.id);
  let players = AppState.players || [];

  if (teamFilter) {
    players = players.filter(
      (p) =>
        p.team_id === teamFilter ||
        (p.team_assignments &&
          p.team_assignments.some((a) => a.team_id === teamFilter)),
    );
  } else {
    players = players.filter(
      (p) =>
        teamIds.includes(p.team_id) ||
        (p.team_assignments &&
          p.team_assignments.some((a) => teamIds.includes(a.team_id))),
    );
  }

  // Apply search filter
  if (searchTerm) {
    players = players.filter((player) =>
      `${player.first_name || player.firstName} ${player.last_name || player.lastName}`
        .toLowerCase()
        .includes(searchTerm),
    );
  }

  const tableBody = document.getElementById("coachPlayersTableBody");

  if (players.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="6">No players found</td></tr>';
    return;
  }

  tableBody.innerHTML = players
    .map((player) => {
      const pFirstName = player.first_name || player.firstName || "";
      const pLastName = player.last_name || player.lastName || "";
      const pDOB = player.date_of_birth || player.dateOfBirth;
      const age = pDOB
        ? new Date().getFullYear() - new Date(pDOB).getFullYear()
        : "N/A";

      return `
            <tr>
                <td>${pFirstName} ${pLastName}</td>
                <td>${player.team_name || "Assigned"}</td>
                <td>${player.position || player.team_position || "Not set"}</td>
                <td>${age}</td>
                <td>
                    <span class="status-badge status-${(player.attendance_rate || player.attendance || 85) > 80 ? "paid" : (player.attendance_rate || player.attendance || 85) > 60 ? "pending" : "overdue"}">
                        ${player.attendance_rate || player.attendance || 85}%
                    </span>
                </td>
                <td>
                    <button class="btn btn-small btn-primary" onclick="viewPlayerStats('${player.id}')">Stats</button>
                    <button class="btn btn-small btn-secondary" onclick="editPlayerPosition('${player.id}')">Edit</button>
                </td>
            </tr>
        `;
    })
    .join("");
}

// Events Management
function loadCoachEvents() {
  const teamEvents = AppState.events.filter((e) =>
    currentTeams.some((t) => t.id === e.team_id || t.id === e.teamId),
  );

  // Populate team selector for new events
  const teamSelect = document.getElementById("eventTeamSelect");
  teamSelect.innerHTML = currentTeams
    .map((team) => `<option value="${team.id}">${team.name}</option>`)
    .join("");

  const container = document.getElementById("coachEventsContainer");

  if (teamEvents.length === 0) {
    container.innerHTML =
      '<div class="card"><p>No team events scheduled</p></div>';
    return;
  }

  container.innerHTML = teamEvents
    .map((event) => {
      const team = currentTeams.find((t) => t.id === event.teamId);
      const isUpcoming = new Date(event.date) > new Date();

      return `
            <div class="event-card">
                <h4>${event.title}</h4>
                <div class="event-meta">
                    <span><strong>Team:</strong> ${team ? team.name : "Unknown"}</span>
                    <span><strong>Date:</strong> ${formatDate(event.date)} at ${event.time}</span>
                    <span><strong>Location:</strong> ${event.location}</span>
                    ${event.opponent ? `<span><strong>Opponent:</strong> ${event.opponent}</span>` : ""}
                </div>
                <div class="event-actions">
                    ${
                      event.type === "match" && !isUpcoming
                        ? `<button class="btn btn-small btn-primary" onclick="recordMatchResult('${event.id}')">Record Result</button>`
                        : ""
                    }
                    <button class="btn btn-small btn-secondary" onclick="manageEventPlayers('${event.id}')">Manage Players</button>
                    <button class="btn btn-small btn-secondary" onclick="editEvent('${event.id}')">Edit</button>
                </div>
            </div>
        `;
    })
    .join("");
}

function handleAddTeamEvent(e) {
  e.preventDefault();

  const newEvent = {
    id: generateId(),
    title: document.getElementById("teamEventTitle").value,
    type: document.getElementById("teamEventType").value,
    date: document.getElementById("teamEventDate").value,
    time: document.getElementById("teamEventTime").value,
    location: document.getElementById("teamEventLocation").value,
    opponent: document.getElementById("teamEventOpponent").value,
    teamId: document.getElementById("eventTeamSelect").value,
    createdBy: AppState.currentUser.id,
    createdDate: new Date().toISOString(),
  };

  AppState.events.push(newEvent);
  saveToStorage();

  closeModal("addTeamEventModal");
  loadCoachEvents();
  loadCoachStats();

  // Reset form
  document.getElementById("addTeamEventForm").reset();

  showNotification("Team event added successfully!", "success");
}

// Tactical Board
// Tactical Board & Lineup Planner
function initializeTacticalBoard() {
  const board = document.getElementById("tacticalBoard");
  if (!board) return;

  // Clear board but keep SVG markings from HTML if any (they are outside tacticalBoard now)
  board.innerHTML = "";

  setFormation();
  loadAvailablePlayers();
}

function setFormation() {
  const formation = document.getElementById("formationSelect").value;
  const board = document.getElementById("tacticalBoard");
  if (!board) return;

  // Clear existing players
  board.innerHTML = "";

  const positions = TacticalLogic.getFormationPositions(formation);

  positions.forEach((pos, index) => {
    const playerEl = document.createElement("div");
    playerEl.className = "player-position";
    playerEl.style.left = `${pos.x}%`;
    playerEl.style.top = `${pos.y}%`;
    playerEl.style.transform = "translate(-50%, -50%)";
    playerEl.dataset.index = index;
    playerEl.dataset.role = pos.role;
    playerEl.textContent = pos.role;

    // Label for player name
    const label = document.createElement("div");
    label.className = "player-label";
    label.textContent = "Empty";
    playerEl.appendChild(label);

    // Click to select for assignment
    playerEl.onclick = () => selectPosition(playerEl);

    board.appendChild(playerEl);
  });
}

function selectPosition(el) {
  document
    .querySelectorAll(".player-position")
    .forEach((p) => p.classList.remove("selected"));
  el.classList.add("selected");
  window.selectedPositionEl = el;
}

function loadAvailablePlayers() {
  const container = document.getElementById("availablePlayers");
  if (!container) return;

  const players = AppState.players || [];

  if (players.length === 0) {
    container.innerHTML =
      '<p style="color:var(--text-muted); font-size: 0.8rem;">No players found in database.</p>';
    return;
  }

  container.innerHTML = players
    .map(
      (player) => `
        <div class="available-player" onclick="assignPlayerToSelected('${player.id}', '${player.first_name || player.firstName}', '${player.last_name || player.lastName}')" data-player-id="${player.id}">
            <div class="user-avatar" style="width:30px; height:30px; font-size:0.7rem; border-radius:8px;">
                ${(player.first_name || player.firstName || "P").charAt(0)}
            </div>
            <div style="display:flex; flex-direction:column;">
                <span style="font-weight:600;">${player.first_name || player.firstName} ${player.last_name || player.lastName}</span>
                <span style="font-size:0.7rem; opacity:0.6;">${player.position || "Player"}</span>
            </div>
        </div>
    `,
    )
    .join("");
}

function filterRoster() {
  const term = document.getElementById("rosterSearch").value.toLowerCase();
  const items = document.querySelectorAll(".available-player");

  items.forEach((item) => {
    const text = item.textContent.toLowerCase();
    item.style.display = text.includes(term) ? "flex" : "none";
  });
}

function assignPlayerToSelected(id, first, last) {
  if (!window.selectedPositionEl) {
    showNotification("Please select a position on the pitch first", "error");
    return;
  }

  const playerEl = window.selectedPositionEl;
  const label = playerEl.querySelector(".player-label");

  // Update visual
  playerEl.textContent = first.charAt(0) + last.charAt(0);
  playerEl.appendChild(label); // keep label
  label.textContent = `${first} ${last.charAt(0)}.`;

  playerEl.style.background =
    "radial-gradient(circle at 30% 30%, #4ade80 0%, #16a34a 100%)";
  playerEl.classList.remove("selected");
  window.selectedPositionEl = null;

  showNotification(
    `Assigned ${first} ${last} to ${playerEl.dataset.role}`,
    "success",
  );
}

async function saveFormation() {
  const formation = document.getElementById("formationSelect").value;
  const board = document.getElementById("tacticalBoard");
  const players = Array.from(board.querySelectorAll(".player-position")).map(
    (p) => ({
      role: p.dataset.role,
      label: p.querySelector(".player-label").textContent,
      x: parseFloat(p.style.left),
      y: parseFloat(p.style.top),
      playerId: p.dataset.playerId || null,
    }),
  );

  const orgId =
    AppState.currentOrgId ||
    (await window.apiService.getContext())?.currentOrganization?.id;
  if (!orgId) {
    showNotification("Cannot save: Organization context missing", "error");
    return;
  }

  try {
    const payload = {
      organization_id: orgId,
      team_id: AppState.currentTeamId || null,
      name: `Strategy ${new Date().toLocaleDateString()}`,
      formation: formation,
      lineup: players,
      is_default: true,
    };

    const result = await window.apiService.saveTacticalFormation(payload);
    if (result) {
      showNotification("Strategy saved securely to the cloud!", "success");
    }
  } catch (err) {
    console.error("Save failed:", err);
    showNotification("Failed to save strategy: " + err.message, "error");
  }
}

// Match Result & Stats Management
function recordMatchResult(eventId) {
  const event = AppState.events.find((e) => e.id === eventId);
  if (!event) return;

  // Set basic info
  document.getElementById("resultEventId").value = eventId;
  document.getElementById("homeScore").value = event.home_score || 0;
  document.getElementById("awayScore").value = event.away_score || 0;
  document.getElementById("matchNotes").value = event.match_notes || "";

  // Find relevant team to get players
  // Events usually have team_id. If not, try to find team by name or context
  const teamId = event.team_id || event.teamId;
  const team = currentTeams.find((t) => t.id === teamId);

  const tbody = document.getElementById("playerStatsTableBody");
  tbody.innerHTML = "";

  if (team) {
    // Get players for this team
    const teamPlayers = AppState.players.filter(
      (p) =>
        p.team_id === teamId ||
        (p.team_assignments &&
          p.team_assignments.some((a) => a.team_id === teamId)),
    );

    if (teamPlayers.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center">No players found for this team. Add players to team first.</td></tr>`;
    } else {
      teamPlayers.forEach((player) => {
        const row = document.createElement("tr");
        row.className = "player-stat-row";
        row.dataset.playerId = player.id;

        // Try to find existing stats if editing (not implemented fully in backend yet, but good for future)
        row.innerHTML = `
                    <td>
                        <div class="player-info">
                            <span class="player-name">${player.first_name} ${player.last_name}</span>
                            <small class="text-muted" style="display:block; font-size:0.75em;">${player.position || "N/A"}</small>
                        </div>
                    </td>
                    <td><input type="number" class="stat-input" name="rating" min="1" max="10" placeholder="-" style="width: 50px;"></td>
                    <td><input type="number" class="stat-input" name="goals" min="0" placeholder="0" style="width: 50px;"></td>
                    <td><input type="number" class="stat-input" name="assists" min="0" placeholder="0" style="width: 50px;"></td>
                    <td>
                        <select class="stat-input" name="cards" style="width: 80px; padding: 5px;">
                            <option value="none">-</option>
                            <option value="yellow">Yellow</option>
                            <option value="red">Red</option>
                             <option value="both">Y + R</option>
                        </select>
                    </td>
                    <td><input type="number" class="stat-input" name="minutes" min="0" max="120" value="90" style="width: 60px;"></td>
                `;
        tbody.appendChild(row);
      });
    }
  } else {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center">Team information missing for this event.</td></tr>`;
  }

  // Show modal
  document.getElementById("resultModal").style.display = "block";
}

async function submitMatchResult(e) {
  e.preventDefault();
  const eventId = document.getElementById("resultEventId").value;
  const homeScore = parseInt(document.getElementById("homeScore").value) || 0;
  const awayScore = parseInt(document.getElementById("awayScore").value) || 0;
  const notes = document.getElementById("matchNotes").value;

  const result =
    homeScore > awayScore ? "win" : homeScore < awayScore ? "loss" : "draw";

  // Gather player stats
  const playerStats = [];
  document.querySelectorAll(".player-stat-row").forEach((row) => {
    const playerId = row.dataset.playerId;
    const rating = row.querySelector('[name="rating"]').value;
    const goals = parseInt(row.querySelector('[name="goals"]').value) || 0;
    const assists = parseInt(row.querySelector('[name="assists"]').value) || 0;
    const cardVal = row.querySelector('[name="cards"]').value;
    const minutes = parseInt(row.querySelector('[name="minutes"]').value) || 0;

    // Only include if they played or have stats
    if (
      rating ||
      goals > 0 ||
      assists > 0 ||
      cardVal !== "none" ||
      minutes > 0
    ) {
      playerStats.push({
        playerId,
        rating: rating ? parseInt(rating) : null,
        goals,
        assists,
        yellowCards: cardVal === "yellow" || cardVal === "both" ? 1 : 0,
        redCards: cardVal === "red" || cardVal === "both" ? 1 : 0,
        minutesPlayed: minutes,
      });
    }
  });

  try {
    showLoading(true);
    await apiService.makeRequest(`/events/${eventId}/result`, {
      method: "POST",
      body: JSON.stringify({
        home_score: homeScore,
        away_score: awayScore,
        result,
        notes,
        playerStats,
      }),
    });

    showNotification("Match result and stats saved successfully!", "success");
    closeModal("resultModal");
    initializeCoachDashboard(); // Refresh data
  } catch (error) {
    console.error("Failed to save match result:", error);
    showNotification("Error saving result: " + error.message, "error");
  } finally {
    showLoading(false);
  }
}

function formatDate(date) {
  return new Date(date).toLocaleDateString();
}

// Coach Management Functions
function manageTeam(teamId) {
  showCoachSection("players");
  const filter = document.getElementById("teamFilter");
  if (filter) {
    filter.value = teamId;
    filterCoachPlayers();
  }
}

function viewTeamStats(teamId) {
  showNotification("Detailed team statistics coming soon!", "info");
}

function assignPlayers(teamId) {
  showNotification("Player assignment feature coming soon!", "info");
}

function viewPlayerStats(playerId) {
  showNotification("Player performance analytics coming soon!", "info");
}

function editPlayerPosition(playerId) {
  showNotification("Edit player position feature coming soon!", "info");
}

// function recordMatchResult(eventId) - DUPLICATE REMOVED

function manageEventPlayers(eventId) {
  showNotification("Event attendance management coming soon!", "info");
}

function editEvent(eventId) {
  showNotification("Edit event feature coming soon!", "info");
}

function filterEvents() {
  loadCoachEvents();
}

// Make functions globally available
window.showCoachSection = showCoachSection;
window.manageTeam = manageTeam;
window.viewTeamStats = viewTeamStats;
window.assignPlayers = assignPlayers;
window.viewPlayerStats = viewPlayerStats;
window.editPlayerPosition = editPlayerPosition;
window.recordMatchResult = recordMatchResult;
window.manageEventPlayers = manageEventPlayers;
window.editEvent = editEvent;
window.setFormation = setFormation;
window.clearBoard = clearBoard;
window.saveFormation = saveFormation;
window.loadCoachProducts = loadCoachProducts;
window.buyCoachProduct = buyCoachProduct;
window.filterCoachPlayers = filterCoachPlayers;
window.filterEvents = filterEvents;
window.handleMatchResult = handleMatchResult;
window.submitMatchResult = submitMatchResult;
window.initializeCoachDashboard = initializeCoachDashboard;
window.loadCommunityFeed = loadCommunityFeed;
window.loadMessengerConversations = loadMessengerConversations;
window.openMessageThread = openMessageThread;
window.postToCommunityAsCoach = postToCommunityAsCoach;

// --- Community: Premium Feed & Messenger Functions ---
async function loadCommunityFeed() {
  const container = document.getElementById("communityFeedContainer");
  if (!container) return;
  container.innerHTML = '<div class="stat-card">Loading community feed...</div>';

  try {
    const items = await apiService.getFeedItems();
    
    if (!items || items.length === 0) {
      container.innerHTML = '<div class="empty-state"><h4>No updates found</h4><p>Check back later for new announcements and blogs.</p></div>';
      return;
    }

    container.innerHTML = items.map(item => `
      <div class="glass-card community-card" style="margin-bottom: 2rem; overflow: hidden; padding: 0;">
        ${item.image ? `<div class="community-image-wrapper"><img src="${item.image}" alt="${item.title}" class="community-image"></div>` : ''}
        <div style="padding: 1.5rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <div class="feed-avatar" style="width: 32px; height: 32px; font-size: 0.8rem; background: var(--builder-accent); display:flex; align-items:center; justify-content:center; border-radius:50%;">${item.author?.charAt(0) || 'A'}</div>
              <div>
                <div style="font-weight: 600; font-size: 0.9rem;">${item.author || 'Club Admin'}</div>
                <div style="font-size: 0.7rem; color: var(--text-muted);">${formatDate(item.date)}</div>
              </div>
            </div>
            <span class="feed-tag">${item.type || 'Update'}</span>
          </div>
          <h2 style="font-family: var(--font-heading); font-size: 1.5rem; margin-bottom: 1rem;">${item.title}</h2>
          <div style="color: var(--text-muted); line-height: 1.6; margin-bottom: 1.5rem;">${item.content}</div>
          <div style="display: flex; gap: 1.5rem; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 1rem;">
            <button class="btn-text" style="font-size: 0.85rem;">❤️ ${item.likes || 12}</button>
            <button class="btn-text" style="font-size: 0.85rem;">💬 ${item.comments || 5}</button>
            <button class="btn-text" style="font-size: 0.85rem; margin-left: auto;">🔗 Share</button>
          </div>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error("Feed load failed:", err);
    container.innerHTML = '<p class="error-text">Error loading community feed.</p>';
  }
}

async function loadMessengerConversations() {
  const listContainer = document.getElementById("messengerListItems");
  if (!listContainer) return;

  try {
    const messages = await apiService.getMessages();
    
    if (!messages || messages.length === 0) {
      listContainer.innerHTML = '<div style="padding: 3rem; text-align: center; color: var(--text-muted);">No messages found.</div>';
      return;
    }

    listContainer.innerHTML = messages.map(m => `
      <div class="message-item ${m.unread ? 'unread' : ''}" onclick="openMessageThread('${m.id}')" id="msg-item-${m.id}" style="padding:1rem; cursor:pointer; border-bottom:1px solid rgba(255,255,255,0.05); display:flex; gap:1rem; align-items:center;">
        <div class="message-avatar" style="width:40px; height:40px; border-radius:50%; background:var(--primary); display:flex; align-items:center; justify-content:center; font-weight:700;">
          ${m.sender?.charAt(0) || 'U'}
        </div>
        <div class="message-info" style="flex:1;">
          <div class="message-header" style="display:flex; justify-content:space-between;">
            <span class="message-sender" style="font-weight:600; font-size:0.9rem;">${m.sender}</span>
            <span class="message-time" style="font-size:0.7rem; color:var(--text-muted);">${formatDate(m.timestamp)}</span>
          </div>
          <div class="message-preview" style="font-size:0.8rem; color:var(--text-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${m.content}</div>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error("Messages load failed:", err);
    listContainer.innerHTML = '<p class="error-text">Error loading messages.</p>';
  }
}

async function openMessageThread(messageId) {
  const viewContainer = document.getElementById("messageViewContainer");
  if (!viewContainer) return;

  // Highlight active
  document.querySelectorAll('.message-item').forEach(el => el.classList.remove('active'));
  const activeItem = document.getElementById(`msg-item-${messageId}`);
  if (activeItem) activeItem.classList.add('active');

  try {
    const messages = await apiService.getMessages();
    const thread = messages.find(m => m.id === messageId);
    
    if (!thread) return;

    viewContainer.innerHTML = `
      <div class="message-thread" style="display:flex; flex-direction:column; height:100%;">
        <div class="thread-header" style="padding:1.5rem; border-bottom:1px solid rgba(255,255,255,0.05); display:flex; justify-content:space-between; align-items:center;">
          <div style="display: flex; align-items: center; gap: 1rem;">
            <div class="message-avatar" style="width: 40px; height: 40px; border-radius:50%; background: rgba(255,255,255,0.1); display:flex; align-items:center; justify-content:center; font-weight:700;">${thread.sender?.charAt(0) || 'U'}</div>
            <div>
              <div style="font-weight: 700;">${thread.sender}</div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">Active Conversation</div>
            </div>
          </div>
        </div>
        
        <div class="thread-messages" style="flex:1; padding:1.5rem; overflow-y:auto;">
          <div class="message-bubble received" style="background:rgba(255,255,255,0.05); padding:1rem; border-radius:12px; max-width:80%; margin-bottom:1rem;">
            ${thread.content}
            <div style="font-size: 0.7rem; opacity: 0.6; margin-top: 0.4rem; text-align: left;">
              ${thread.timestamp ? new Date(thread.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
            </div>
          </div>
        </div>

        <div class="thread-input-area" style="padding:1.5rem; border-top:1px solid rgba(255,255,255,0.05); display:flex; gap:1rem;">
          <input type="text" class="chat-input" placeholder="Type a message..." style="flex: 1; padding:0.8rem; border-radius:12px; background:rgba(255,255,255,0.03); border:1px solid var(--border-color); color:white;">
          <button class="btn btn-primary" onclick="showNotification('Reply sent (Demo mode)', 'success')">Send</button>
        </div>
      </div>
    `;
  } catch (err) {
    console.error("Thread load failed:", err);
  }
}

async function postToCommunityAsCoach() {
  const textarea = document.getElementById("coachNewPostContent");
  const content = textarea?.value?.trim();
  if (!content) return;

  try {
    await apiService.postToFeed(null, { content });
    textarea.value = "";
    showNotification("Post shared to community!", "success");
    loadCommunityFeed();
  } catch (err) {
    console.error("Post failed:", err);
    showNotification("Failed to post: " + err.message, "error");
  }
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}
