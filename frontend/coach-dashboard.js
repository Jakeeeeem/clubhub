let currentTeams = [];
let tacticalBoardData = {
  formation: "4-4-2",
  players: [],
};

async function initializeCoachDashboard() {
  console.log("ðŸš€ Initializing Coach Dashboard...");

  // Ensure we have dashboard data loaded into AppState
  if (!AppState.staff || AppState.staff.length === 0) {
    console.log("ðŸ“¡ Fetching group data for Coach...");
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
        console.log("âœ… Data loaded into AppState:", {
          staff: AppState.staff.length,
          teams: AppState.teams.length,
          players: AppState.players.length,
        });
      }
    } catch (error) {
      console.error("âŒ Failed to fetch coach dashboard dependencies:", error);
    }
  }

  loadCoachData();
  loadCoachStats();
  setupCoachEventListeners();
  initializeTacticalBoard();
  loadCoachPlayers();

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
  console.log(`ðŸš€ Coach switching to section: ${sectionId}`);

  // Hide all sections
  const sections = document.querySelectorAll(".dashboard-section");
  sections.forEach((section) => {
    section.classList.remove("active");
    section.style.display = "none";
  });

  // Remove active class from all nav items
  const navItems = document.querySelectorAll(
    ".sidebar-nav .nav-item, .sidebar-link, .app-top-tabs .tab-item, .app-bottom-nav .nav-link, .nav-pill, .active-section-tab",
  );
  navItems.forEach((item) => {
    item.classList.remove("active");

    // Check if this item is the one being activated
    const onClick = item.getAttribute("onclick");
    if (onClick && onClick.includes(`'${sectionId}'`)) {
      item.classList.add("active");
    }
  });

  // Show selected section
  const targetSection = document.getElementById(`coach-${sectionId}`);
  if (targetSection) {
    targetSection.classList.add("active");
    targetSection.style.display = "block";
  }

  // Handle section-specific loaders
  try {
    switch (sectionId) {
      case "overview":
        if (typeof loadCoachStats === "function") loadCoachStats();
        if (typeof loadCoachFeed === "function") loadCoachFeed();
        if (typeof loadCoachDailyPlanner === "function") loadCoachDailyPlanner();
        break;
      case "teams":
        if (typeof loadCoachTeams === "function") loadCoachTeams();
        break;
      case "players":
        if (typeof loadCoachPlayers === "function") loadCoachPlayers();
        break;
      case "tournament-manager":
        if (typeof loadCoachTournaments === "function") loadCoachTournaments();
        break;
      case "events":
        if (typeof loadCoachEvents === "function") loadCoachEvents();
        break;
      case "feed":
        if (typeof loadCommunityFeed === "function") loadCommunityFeed();
        break;
      case "messenger":
        if (typeof loadMessengerConversations === "function") loadMessengerConversations();
        break;
      case "tactical-board":
        if (typeof initializeTacticalBoard === "function") initializeTacticalBoard();
        break;
      case "profile":
        if (typeof loadCoachProfile === "function") loadCoachProfile();
        break;
    }
  } catch (err) {
    console.error(`Error loading section ${sectionId}:`, err);
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
    console.error("âŒ Failed to update coach profile:", error);
    showNotification("Failed to update profile", "error");
  }
}

async function loadCoachPlayers() {
  const container = document.getElementById("coach-players-list");
  const tacticalPinsContainer = document.getElementById("availablePlayerPins");
  
  if (!container && !tacticalPinsContainer) return;

  try {
    const { players } = await apiService.get("/api/coach/squad");
    
    // 1. Populate squad list
    if (container) {
      container.innerHTML = players.map(p => `
        <div class="player-row">
          <div class="player-av">${(p.first_name || 'P').charAt(0)}</div>
          <div style="flex:1;">
            <div style="font-weight:600;">${p.first_name} ${p.last_name}</div>
            <div style="font-size:0.75rem; color:var(--text-muted);">${p.position || 'Unknown'}</div>
          </div>
          <button class="btn btn-secondary btn-small" onclick="viewPlayerProfile('${p.id}')">View</button>
        </div>
      `).join('');
    }

    // 2. Populate tactical pins
    if (tacticalPinsContainer) {
      tacticalPinsContainer.innerHTML = players.map(p => `
        <div class="player-pin-source" draggable="true" 
             data-label="${p.last_name || p.first_name}"
             style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:10px; padding:0.6rem 0.4rem; font-size:0.75rem; text-align:center; cursor:grab; transition:all 0.2s; color:rgba(255,255,255,0.8); font-weight:700;">
          ${(p.first_name || 'P').charAt(0)}${(p.last_name || '').charAt(0)}
        </div>
      `).join('');

      // Add event listeners to new pins
      tacticalPinsContainer.querySelectorAll('.player-pin-source').forEach(pin => {
          pin.addEventListener('dragstart', (e) => {
              e.dataTransfer.setData('text/plain', JSON.stringify({
                  source: 'tray',
                  type: 'player',
                  label: pin.dataset.label
              }));
          });
          pin.addEventListener('mouseover', () => pin.style.borderColor = 'rgba(255,255,255,0.3)');
          pin.addEventListener('mouseout', () => pin.style.borderColor = 'rgba(255,255,255,0.08)');
      });
    }
  } catch (err) {
    console.error("Squad load error:", err);
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
          '<p style="padding: 2rem; opacity: 0.6;">Please select a group to view tournaments.</p>';
      return;
    }

    const tournaments = await apiService.makeRequest(
      `/events?organizationId=${orgId}&eventType=tournament`,
    );

    if (!tournaments || tournaments.length === 0) {
      if (grid)
        grid.innerHTML = `
                <div style="text-align: center; padding: 3rem; grid-column: 1 / -1;">
                    <p style="color: var(--text-muted);">No active tournaments found for this group.</p>
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
                        <div style="width: 48px; height: 48px; background: #dc2626; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">ðŸ†</div>
                        <span class="status-badge" style="background: rgba(220, 38, 38, 0.1); color: #dc2626; border: 1px solid rgba(220, 38, 38, 0.2);">${t.status || "Active"}</span>
                    </div>
                    <h4>${t.title}</h4>
                    <p style="color: var(--text-muted); font-size: 0.85rem; margin: 0.5rem 0;">${formatDate(t.event_date)}</p>
                    <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 0.75rem; color: var(--text-muted);">Competition Details</span>
                        <i style="color: #dc2626;">â†’</i>
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
                                    <span class="team-name">${m.home_team || "TBD"} ${m.team_id && currentTeams.some((t) => t.id === m.team_id) ? "â­" : ""}</span>
                                    <span class="match-score">${played ? m.home_score : "-"}</span>
                                </div>
                                <div class="match-team ${awayWon ? "winner" : ""}">
                                    <span class="team-name">${m.away_team || "TBD"} ${m.away_team_id && currentTeams.some((t) => t.id === m.away_team_id) ? "â­" : ""}</span>
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
                    ${m.status === "live" ? "â— LIVE" : m.status}
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

  // Get groups coach is part of
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
      // Fetch products for all groups
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
                    <span style="font-size: 2.5rem;">ðŸ“¦</span>
                </div>
                <h4>${product.name}</h4>
                <p style="color: #dc2626; font-weight: bold; font-size: 1.1rem; margin: 0.5rem 0;">Â£${parseFloat(product.price).toFixed(2)}</p>
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
    `Do you want to purchase ${name} for Â£${parseFloat(price).toFixed(2)}?`,
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
  const totalTeamsAlt = document.getElementById("coachTotalTeams");
  if (totalTeamsAlt) totalTeamsAlt.textContent = teamsCount;
  
  const totalPlayersAlt = document.getElementById("coachTotalPlayers");
  if (totalPlayersAlt) totalPlayersAlt.textContent = totalPlayers;

  if (typeof loadRecentMatches === "function") loadRecentMatches();
  if (typeof loadCoachDailyPlanner === "function") loadCoachDailyPlanner();
}

/**
 * Loads the premium coach activity feed
 */
async function loadCoachFeed() {
  const container = document.getElementById("coachFeedContainer");
  if (!container) return;

  try {
    const feedItems = await apiService.getFeedItems().catch(() => []);
    
    let html = "";
    
    // Initial welcome item
    html += `
      <div class="premium-feed-item">
        <div class="feed-header">
          <div class="author-info">
            <div class="author-avatar" style="background: var(--accent-cyan);">CH</div>
            <div>
              <div style="font-weight: 700;">ClubHub System</div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">Platform Update â€¢ Today</div>
            </div>
          </div>
        </div>
        <div class="feed-content">
          <p>Welcome to the premium Coach Hub. Your activity feed now consolidates all team updates, scouting alerts, and platform announcements in one place.</p>
        </div>
      </div>
    `;

    if (feedItems.length > 0) {
      html += feedItems.map(item => `
        <div class="premium-feed-item">
          <div class="feed-header">
            <div class="author-info">
              <div class="author-avatar" style="background: var(--primary);">${(item.author || "P").charAt(0)}</div>
              <div>
                <div style="font-weight: 700;">${escapeHTML(item.author || "Member")}</div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">${formatDate(item.date)}</div>
              </div>
            </div>
          </div>
          <div class="feed-content">
            <h4 style="margin: 0 0 0.5rem 0;">${escapeHTML(item.title)}</h4>
            <p>${escapeHTML(item.content || item.summary)}</p>
          </div>
        </div>
      `).join('');
    } else {
      html += `
        <div style="padding: 3rem; text-align: center; opacity: 0.5;">
          <p>No recent activity. Start by sharing an update with your teams.</p>
        </div>
      `;
    }

    container.innerHTML = html;
  } catch (err) {
    console.error("Coach feed error:", err);
    container.innerHTML = '<p style="color: var(--text-muted);">Activity feed unavailable.</p>';
  }
}

/**
 * Loads the daily schedule for coaches
 */
function loadCoachDailyPlanner() {
  const container = document.getElementById("coachDailyPlannerContainer");
  if (!container) return;

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  
  const sessions = (AppState.events || [])
    .filter(e => e.event_date === todayStr || e.date === todayStr)
    .sort((a, b) => (a.event_time || "").localeCompare(b.event_time || ""));

  if (sessions.length === 0) {
    container.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem;">No sessions scheduled for today.</p>';
    return;
  }

  container.innerHTML = sessions.map(session => {
    const time = session.event_time ? session.event_time.slice(0, 5) : (session.time || "TBA");
    const typeLabel = session.event_type || session.type || "Event";
    
    return `
      <div class="planner-day-row">
        <div class="day-indicator" style="background: rgba(255,255,255,0.03);">
          <div class="day-number" style="font-size: 0.9rem;">${time}</div>
        </div>
        <div class="event-details">
          <div class="event-title" style="font-size: 0.9rem;">${escapeHTML(session.title)}</div>
          <div style="font-size: 0.75rem; color: var(--primary); font-weight: 600; text-transform: uppercase;">${typeLabel}</div>
        </div>
      </div>
    `;
  }).join('');
}

function createCoachPost() {
  const content = document.getElementById("coachPostInput")?.value;
  if (!content) return;
  
  showNotification("Announcement shared with your squads!", "success");
  document.getElementById("coachPostInput").value = "";
  // In real app, re-fetch or prepend
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
  if (!container) return;

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
  if (!teamFilter) return;

  // Populate team filter
  teamFilter.innerHTML =
    '<option value="">All Teams</option>' +
    currentTeams
      .map((team) => `<option value="${team.id}">${team.name}</option>`)
      .join("");

  filterCoachPlayers();
}

function filterCoachPlayers() {
  const teamFilterEl = document.getElementById("teamFilter");
  const playerSearchEl = document.getElementById("playerSearchCoach");
  const tableBody = document.getElementById("coachPlayersTableBody");

  if (!tableBody) return;

  const teamFilter = teamFilterEl ? teamFilterEl.value : "";
  const searchTerm = playerSearchEl ? playerSearchEl.value.toLowerCase() : "";

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

  if (players.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:2rem; opacity:0.5;">No players found</td></tr>';
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
                <td data-label="Player Name">${pFirstName} ${pLastName}</td>
                <td data-label="Team">${player.team_name || "Assigned"}</td>
                <td data-label="Position">${player.position || player.team_position || "Not set"}</td>
                <td data-label="Age">${age}</td>
                <td data-label="Attendance">
                    <span class="status-badge status-${(player.attendance_rate || player.attendance || 85) > 80 ? "paid" : (player.attendance_rate || player.attendance || 85) > 60 ? "pending" : "overdue"}">
                        ${player.attendance_rate || player.attendance || 85}%
                    </span>
                </td>
                <td data-label="Actions">
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
    const container = document.getElementById("coachEventsListContainer");
    if (!container) return;

    const teamEvents = AppState.events.filter((e) =>
        currentTeams.some((t) => t.id === e.team_id || t.id === e.teamId)
    );

    // Sort: Upcoming (closest first) then Past (newest first)
    teamEvents.sort((a, b) => new Date(a.date || a.event_date) - new Date(b.date || b.event_date));

    // Populate team selector for new events
    const teamSelect = document.getElementById("eventTeamSelect");
    if (teamSelect && currentTeams.length > 0) {
        teamSelect.innerHTML = currentTeams
            .map((team) => `<option value="${team.id}">${team.name}</option>`)
            .join("");
    }

    if (teamEvents.length === 0) {
        container.innerHTML = `
            <div class="glass-card" style="padding: 3rem; text-align: center; border-style: dashed;">
                <p style="color: var(--text-muted); font-size: 0.9rem;">No events scheduled for your teams yet.</p>
                <button class="btn btn-primary btn-small" style="margin-top: 1rem;" onclick="openModal('addEventModal')">+ Add First Event</button>
            </div>
        `;
        return;
    }

    container.innerHTML = teamEvents.map((event) => {
        const team = currentTeams.find((t) => t.id === (event.team_id || event.teamId));
        const eventDate = new Date(event.date || event.event_date);
        const isUpcoming = eventDate > new Date();
        const type = (event.type || 'training').toLowerCase();
        
        let statusBadge = 'upcoming';
        if (!isUpcoming) statusBadge = 'completed';
        // Simple logic for "Live": if date is today and time is close (not implemented for simplicity, just badges)

        return `
            <div class="event-card-pro" id="event-${event.id}">
                <div class="event-type-strip event-type-${type}"></div>
                <div class="event-header-pro">
                    <div>
                        <div class="event-title-pro">${event.title}</div>
                        <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.2rem;">
                            ${team ? team.name : "Club Event"}
                        </div>
                    </div>
                    <span class="event-badge-pro badge-${statusBadge}">${statusBadge}</span>
                </div>

                <div class="event-stats-grid">
                    <div class="stat-item-pro">
                        <span class="stat-label-pro">Schedule</span>
                        <span class="stat-value-pro">${formatDate(eventDate)} @ ${event.time || event.event_time || 'TBD'}</span>
                    </div>
                    <div class="stat-item-pro">
                        <span class="stat-label-pro">Location</span>
                        <span class="stat-value-pro">${event.location || 'Home Grounds'}</span>
                    </div>
                    ${event.opponent ? `
                    <div class="stat-item-pro">
                        <span class="stat-label-pro">Opponent</span>
                        <span class="stat-value-pro">${event.opponent}</span>
                    </div>
                    ` : ""}
                </div>

                <div class="event-footer-pro">
                    ${type === "match" && !isUpcoming
                        ? `<button class="btn btn-small btn-primary" onclick="recordMatchResult('${event.id}')">Record Result</button>`
                        : `<button class="btn btn-small btn-secondary" onclick="manageEventPlayers('${event.id}')">Roster</button>`
                    }
                    <button class="btn btn-small btn-secondary" onclick="editEvent('${event.id}')">Edit</button>
                    <button class="btn btn-small btn-text" style="color: var(--text-muted); margin-left: auto;" onclick="deleteEvent('${event.id}')">ðŸ—‘ï¸</button>
                </div>
            </div>
        `;
    }).join("");
}

async function handleCreateEvent(e) {
  e.preventDefault();
  const form = e.target;
  const formData = new FormData(form);

  const payload = {
    title: formData.get('eventTitle'),
    type: formData.get('eventType'),
    event_date: formData.get('eventDate'),
    event_time: formData.get('eventTime'),
    location: formData.get('teamEventLocation') || formData.get('location') || '',
    opponent: formData.get('teamEventOpponent') || formData.get('opponent') || '',
    team_id: formData.get('eventTeamId'),
    recurrence: formData.get('recurring') || 'none',
    organization_id: AppState.currentUser.currentOrganizationId || AppState.currentUser.clubId
  };

  const notify = formData.get('notifyPlayers') === 'on';

  try {
    showLoading(true);
    const result = await apiService.createEvent(payload);
    
    if (notify && result && result.id) {
       await apiService.makeRequest(`/api/events/${result.id}/notify`, { method: 'POST' });
       showNotification("Event created and players notified!", "success");
    } else {
       showNotification("Team event created successfully!", "success");
    }

    closeModal("addEventModal");
    form.reset();

    // Refresh data
    if (typeof initializeCoachDashboard === 'function') {
      await initializeCoachDashboard();
    } else {
      loadCoachEvents();
    }
  } catch (err) {
    console.error("Event expansion error:", err);
    showNotification("Critical Error: " + err.message, "error");
  } finally {
    showLoading(false);
  }
}

async function deleteEvent(eventId) {
    if (!confirm("Are you sure you want to delete this event? For recurring events, this will only delete this single instance.")) return;
    
    try {
        showLoading(true);
        await apiService.makeRequest(`/api/events/${eventId}`, { method: 'DELETE' });
        showNotification("Event deleted", "success");
        if (typeof initializeCoachDashboard === 'function') {
            await initializeCoachDashboard();
        }
    } catch (err) {
        showNotification("Failed to delete: " + err.message, "error");
    } finally {
        showLoading(false);
    }
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
    showNotification("Cannot save: Group context missing", "error");
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
  const modalId = "resultModal";
  const modal = document.getElementById(modalId);
  if (!modal) return;

  document.getElementById("resultEventId").value = eventId;
  document.getElementById("homeScore").value = event.home_score || 0;
  document.getElementById("awayScore").value = event.away_score || 0;
  document.getElementById("matchNotes").value = event.match_notes || "";

  const teamId = event.team_id || event.teamId;
  const team = currentTeams.find((t) => t.id === teamId);

  const tbody = document.getElementById("playerStatsTableBody");
  tbody.innerHTML = "";

  if (team) {
    const teamPlayers = AppState.players.filter(
      (p) => p.team_id === teamId || (p.team_assignments && p.team_assignments.some((a) => a.team_id === teamId))
    );

    if (teamPlayers.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center" style="padding: 2rem; color: var(--text-muted);">No squad members found for ${team.name}</td></tr>`;
    } else {
      teamPlayers.forEach((player) => {
        const row = document.createElement("tr");
        row.className = "player-stat-row";
        row.dataset.playerId = player.id;
        row.style.borderBottom = "1px solid rgba(255,255,255,0.03)";

        row.innerHTML = `
            <td data-label="Player" style="padding: 0.75rem 0.5rem;">
                <div style="font-weight:600;">${player.first_name} ${player.last_name}</div>
                <div style="font-size:0.75rem; color:var(--text-muted);">${player.position || "Player"}</div>
            </td>
            <td data-label="Rating" style="text-align:center;"><input type="number" class="stat-input" name="rating" min="1" max="10" placeholder="-" style="width: 45px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: white; border-radius: 4px; text-align: center;"></td>
            <td data-label="Goals" style="text-align:center;"><input type="number" class="stat-input" name="goals" min="0" placeholder="0" style="width: 45px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: white; border-radius: 4px; text-align: center;"></td>
            <td data-label="Assists" style="text-align:center;"><input type="number" class="stat-input" name="assists" min="0" placeholder="0" style="width: 45px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: white; border-radius: 4px; text-align: center;"></td>
            <td data-label="Cards" style="text-align:center;">
                <select class="stat-input" name="cards" style="width: 70px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: white; border-radius: 4px; font-size: 0.8rem;">
                    <option value="none">-</option>
                    <option value="yellow">Yellow</option>
                    <option value="red">Red</option>
                    <option value="both">Y+R</option>
                </select>
            </td>
            <td data-label="Min" style="text-align:center;"><input type="number" class="stat-input" name="minutes" min="0" max="120" value="90" style="width: 50px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: white; border-radius: 4px; text-align: center;"></td>
        `;
        tbody.appendChild(row);
      });
    }
  } else {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center" style="padding: 2rem;">Team context missing</td></tr>`;
  }

  modal.style.display = "flex";
}

async function handleSaveResult(e) {
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
    if (typeof loadCoachDashboard === 'function') loadCoachDashboard(); // Refresh data
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

async function manageEventPlayers(eventId) {
  const modal = document.getElementById('manageRosterModal');
  const loading = document.getElementById('rosterLoading');
  const container = document.getElementById('rosterListContainer');
  const body = document.getElementById('rosterListBody');
  const title = document.getElementById('rosterModalTitle');
  
  if (!modal) return;
  modal.style.display = 'flex';
  loading.style.display = 'block';
  container.style.display = 'none';
  window.currentRosterEventId = eventId;

  const event = AppState.events.find(e => e.id === eventId);
  if (event && title) {
    title.textContent = `Attendance: ${event.title}`;
  }

  try {
    // We expect the backend to return a list of responses with availability status
    const responses = await apiService.makeRequest(`/api/events/${eventId}/availability`);
    loading.style.display = 'none';
    container.style.display = 'block';

    if (!responses || responses.length === 0) {
      body.innerHTML = '<tr><td colspan="3" style="padding:2rem; text-align:center; color:var(--text-muted);">No responses yet. Invitations sent.</td></tr>';
      return;
    }

    body.innerHTML = responses.map(r => {
        const status = (r.availability || 'pending').toLowerCase();
        const statusClass = status === 'yes' ? 'paid' : status === 'no' ? 'overdue' : 'pending';
        const statusLabel = status === 'yes' ? 'CONFIRMED' : status === 'no' ? 'DECLINED' : 'PENDING';

        return `
          <tr style="border-bottom: 1px solid rgba(255,255,255,0.03);">
            <td data-label="Player" style="padding: 1.25rem 1rem;">
              <div style="font-weight:600; color:#fff;">${r.first_name || r.firstName} ${r.last_name || r.lastName}</div>
              <div style="font-size:0.75rem; color:var(--text-muted); opacity:0.7;">${r.position || 'Player'}</div>
            </td>
            <td data-label="Status" style="padding: 1rem; text-align: center;">
              <span class="status-badge status-${statusClass}" style="padding: 0.4rem 0.8rem; border-radius: 6px; font-size: 0.7rem; font-weight: 700;">
                ${statusLabel}
              </span>
            </td>
            <td data-label="Notes / Reason" style="padding: 1rem;">
              <div style="font-size:0.85rem; color:${status === 'no' ? '#f87171' : '#f1f5f9'}; line-height: 1.4;">
                ${r.notes || (status === 'no' ? '<span style="opacity:0.5; font-style: italic;">No reason provided</span>' : '-')}
              </div>
              <div style="font-size:0.7rem; color:var(--text-muted); margin-top:0.35rem; opacity:0.6;">
                ${r.updated_at ? new Date(r.updated_at).toLocaleString([], {day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit'}) : 'No update yet'}
              </div>
            </td>
          </tr>
        `;
    }).join('');
  } catch (err) {
    console.error("Roster load error:", err);
    loading.innerHTML = `<div style="padding:2rem;"><p style="color:#f87171;">Error: ${err.message}</p><button class="btn btn-secondary btn-small" onclick="manageEventPlayers('${eventId}')">Retry</button></div>`;
  }
}

async function nudgeUnresponsive() {
  const eventId = window.currentRosterEventId;
  if (!eventId) return;
  
  try {
    showLoading(true);
    const result = await apiService.makeRequest(`/api/events/${eventId}/nudge`, { method: 'POST' });
    showNotification(result.message || "Unresponsive players nudged!", "success");
  } catch (err) {
    showNotification("Failed to nudge: " + err.message, "error");
  } finally {
    showLoading(false);
  }
}

async function editEvent(eventId) {
  const event = AppState.events.find(e => e.id === eventId);
  if (!event) return;

  const modal = document.getElementById('editEventModal');
  const form = document.getElementById('editEventForm');
  if (!modal || !form) return;

  // Populate fields
  form.eventId.value = event.id;
  form.eventTitle.value = event.title;
  form.eventDate.value = new Date(event.date || event.event_date).toISOString().split('T')[0];
  form.eventTime.value = event.time || event.event_time;
  form.location.value = event.location || '';
  
  // Show series option if it's a recurring event
  const seriesOption = document.getElementById('seriesOption');
  if (event.recurrence_id || event.recurring !== 'none') {
    seriesOption.style.display = 'block';
    form.recurrenceId.value = event.recurrence_id || '';
  } else {
    seriesOption.style.display = 'none';
  }

  modal.style.display = 'flex';
}

async function handleUpdateEvent(e) {
  e.preventDefault();
  const formData = new FormData(e.target);
  const eventId = formData.get('eventId');
  
  const updateData = {
    title: formData.get('eventTitle'),
    event_date: formData.get('eventDate'),
    event_time: formData.get('eventTime'),
    location: formData.get('location'),
    updateSeries: formData.get('updateSeries') === 'on'
  };

  try {
    showLoading(true);
    await apiService.makeRequest(`/events/${eventId}`, {
      method: "PUT",
      body: JSON.stringify(updateData),
    });

    showNotification(updateData.updateSeries ? "Event series updated!" : "Event updated!", "success");
    closeModal('editEventModal');
    
    // Refresh data
    if (typeof initializeCoachDashboard === 'function') {
      await initializeCoachDashboard();
    } else {
      window.location.reload();
    }
  } catch (err) {
    showNotification("Failed to update: " + err.message, "error");
  } finally {
    showLoading(false);
  }
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
  container.innerHTML =
    '<div class="stat-card">Loading community feed...</div>';

  try {
    const items = await apiService.getFeedItems();

    if (!items || items.length === 0) {
      container.innerHTML =
        '<div class="empty-state"><h4>No updates found</h4><p>Check back later for new announcements and blogs.</p></div>';
      return;
    }

    container.innerHTML = items
      .map(
        (item) => `
      <div class="glass-card community-card" style="margin-bottom: 2rem; overflow: hidden; padding: 0;">
        ${item.image ? `<div class="community-image-wrapper"><img src="${item.image}" alt="${item.title}" class="community-image"></div>` : ""}
        <div style="padding: 1.5rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <div class="feed-avatar" style="width: 32px; height: 32px; font-size: 0.8rem; background: var(--builder-accent); display:flex; align-items:center; justify-content:center; border-radius:50%;">${item.author?.charAt(0) || "A"}</div>
              <div>
                <div style="font-weight: 600; font-size: 0.9rem;">${item.author || "Club Admin"}</div>
                <div style="font-size: 0.7rem; color: var(--text-muted);">${formatDate(item.date)}</div>
              </div>
            </div>
            <span class="feed-tag">${item.type || "Update"}</span>
          </div>
          <h2 style="font-family: var(--font-heading); font-size: 1.5rem; margin-bottom: 1rem;">${item.title}</h2>
          <div style="color: var(--text-muted); line-height: 1.6; margin-bottom: 1.5rem;">${item.content}</div>
          <div style="display: flex; gap: 1.5rem; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 1rem;">
            <button class="btn-text" style="font-size: 0.85rem;">â¤ï¸ ${item.likes || 12}</button>
            <button class="btn-text" style="font-size: 0.85rem;">ðŸ’¬ ${item.comments || 5}</button>
            <button class="btn-text" style="font-size: 0.85rem; margin-left: auto;">ðŸ”— Share</button>
          </div>
        </div>
      </div>
    `,
      )
      .join("");
  } catch (err) {
    console.error("Feed load failed:", err);
    container.innerHTML =
      '<p class="error-text">Error loading community feed.</p>';
  }
}


// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// SQUAD MESSENGER â€” delegates to the shared squad-messenger.js module
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// SQUAD MESSENGER â€” delegates to the shared squad-messenger.js module
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

let _messengerMounted = false;

async function loadMessengerConversations() {
  if (!window.SquadMessenger) {
    console.error("[Coach] SquadMessenger module not loaded");
    return;
  }

  // Mount the UI only once
  if (!_messengerMounted) {
    SquadMessenger.mount("coach-messenger-mount");
    _messengerMounted = true;
  }

  // Load messages and contacts
  await SquadMessenger.load();
}

/** DASHBOARD ENGINE STUBS **/
function loadCoachFeed() { console.log("Feed module standby"); }
function loadCoachDailyPlanner() { console.log("Planner module standby"); }
function loadCommunityFeed() { console.log("Community feed standby"); }
function loadCoachTournaments() { console.log("Tournament manager standby"); }

function initializeTacticalBoard() {
  console.log("Tactical Board initializing...");
  const pitch = document.getElementById('activePitchArea');
  if (pitch) {
    pitch.innerHTML = `
      <div style="height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; color:rgba(255,255,255,0.2); text-align:center; padding:2rem;">
        <span style="font-size:3rem; margin-bottom:1rem;">📋</span>
        <p>Tactical Board Engine Ready</p>
        <button class="btn btn-primary btn-small" style="margin-top:1rem;" onclick="location.reload()">Start Session</button>
      </div>
    `;
  }
}

function openNewMessage() {
  // Show a simple prompt to start a new conversation by user name/email
  const email = prompt("Enter player email or name to start a conversation:");
  if (!email) return;
  showNotification("Feature coming soon: search and start new DMs from your squad list.", "info");
}
