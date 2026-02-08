/**
 * Organization Switcher Component
 * Dropdown to switch between organizations (like Stripe)
 */

class OrganizationSwitcher {
  constructor() {
    this.currentOrg = null;
    this.organizations = [];
    this.allOrganizations = []; // For filtering/searching
    this.isPlatformAdmin = false;
    this.isOpen = false;
    this.init();
  }

  async init() {
    await this.loadOrganizations();
    this.render();
    this.attachEventListeners();
  }

  async loadOrganizations() {
    try {
      const response = await apiService.makeRequest("/auth/context");
      if (response.success) {
        // Determine if user is Platform Admin
        const user = JSON.parse(localStorage.getItem("currentUser") || "{}");
        this.isPlatformAdmin =
          user.is_platform_admin === true ||
          user.isPlatformAdmin === true ||
          user.role === "superadmin" ||
          response.user?.isPlatformAdmin ||
          response.user?.is_platform_admin;

        // Sync back to localStorage if we found out they are admin from response
        if (
          response.user?.isPlatformAdmin ||
          response.user?.is_platform_admin
        ) {
          if (!user.isPlatformAdmin) {
            user.isPlatformAdmin = true;
            localStorage.setItem("currentUser", JSON.stringify(user));
          }
        }

        let organizations = response.organizations || [];
        console.log(
          `Switcher: Found ${organizations.length} member organizations. Admin: ${this.isPlatformAdmin}`,
        );

        // If Platform Admin, fetch ALL organizations
        if (this.isPlatformAdmin) {
          try {
            console.log(
              "Switcher: Platform Admin detected, fetching all platform clubs...",
            );
            const allOrgsResponse = await apiService.makeRequest(
              "/platform-admin/organizations?limit=1000",
            );
            if (allOrgsResponse && allOrgsResponse.organizations) {
              console.log(
                `Switcher: Loaded ${allOrgsResponse.organizations.length} platform clubs.`,
              );
              // Map to match the format from /auth/context
              organizations = allOrgsResponse.organizations.map((org) => ({
                id: org.id,
                name: org.name,
                sport: org.sport,
                location: org.location,
                logo_url: org.logo_url,
                user_role: "Platform Admin",
                role: "Platform Admin",
              }));
            }
          } catch (error) {
            console.warn("Switcher: Failed to load all organizations:", error);
          }
        } else {
          // For non-admins, filter based on dashboard type
          const path = window.location.pathname;
          if (
            path.includes("admin-dashboard.html") ||
            path.includes("coach-dashboard.html")
          ) {
            organizations = organizations.filter((org) => {
              const role = (org.user_role || org.role || "").toLowerCase();
              return [
                "owner",
                "admin",
                "manager",
                "coach",
                "staff",
                "assistant_coach",
              ].includes(role);
            });
          }
        }

        this.organizations = organizations;
        this.allOrganizations = organizations;
        this.currentOrg = response.currentOrganization;

        this.render();
      }
    } catch (error) {
      console.error("Failed to load organizations:", error);
    }
  }

  render() {
    const container = document.getElementById("org-switcher-container");
    if (!container) return;

    // ALWAYS show the org switcher, even if there are no organizations
    // This allows users to see "No Organization" and create one

    const currentOrgName = this.currentOrg?.name || "No Organization";
    const currentOrgRole =
      this.currentOrg?.user_role || this.currentOrg?.role || "";

    container.innerHTML = `
      <div class="org-switcher">
        <button class="org-switcher-trigger" id="org-switcher-trigger">
          <div class="org-switcher-current">
            <div class="org-avatar">
              ${
                this.currentOrg?.logo_url
                  ? `<img src="${this.currentOrg.logo_url}" alt="${currentOrgName}">`
                  : `<span>${currentOrgName.charAt(0)}</span>`
              }
            </div>
            <div class="org-info">
              <div class="org-name">${currentOrgName}</div>
              ${currentOrgRole ? `<div class="org-role">${this.formatRole(currentOrgRole)}</div>` : ""}
            </div>
          </div>
          <svg class="org-switcher-arrow" width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 4L6 8L10 4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>

        <div class="org-switcher-dropdown" id="org-switcher-dropdown">
          <div class="org-switcher-header">
            <span>${this.isPlatformAdmin ? "Search All Clubs" : "Switch Organization"}</span>
          </div>
          
          ${
            this.isPlatformAdmin
              ? `
            <div class="org-switcher-search">
              <input type="text" id="org-search-input" placeholder="Search platform..." autocomplete="off">
            </div>
          `
              : ""
          }

          <div class="org-switcher-list" id="org-switcher-list">
            ${
              this.organizations.length === 0
                ? `<div style="padding: 1.5rem; text-align: center; color: var(--text-muted); font-size: 0.9rem;">
                   No organizations found.
                 </div>`
                : this.organizations
                    .map((org) => this.renderOrgItem(org))
                    .join("")
            }
          </div>
          <div class="org-switcher-footer">
            <button class="org-switcher-action" onclick="window.location.href='create-organization.html'">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 3V13M3 8H13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
              Create Organization
            </button>
          </div>
        </div>
      </div>
    `;
  }

  renderOrgItem(org) {
    // Check if active - must match both org ID and player ID (if viewing as child)
    const isActive =
      this.currentOrg?.id === org.id &&
      (org.player_id
        ? this.currentOrg?.player_id === org.player_id
        : !this.currentOrg?.player_id);

    // Determine display role
    let displayRole = this.formatRole(org.user_role || org.role);

    // If this is a child's player context, show the child's name
    if (org.player_id && org.player_name) {
      displayRole = `Player - ${org.player_name}`;
    }

    return `
      <button 
        class="org-switcher-item ${isActive ? "active" : ""}" 
        data-org-id="${org.id}"
        data-player-id="${org.player_id || ""}"
        ${isActive ? "disabled" : ""}
      >
        <div class="org-item-avatar">
          ${
            org.logo_url
              ? `<img src="${org.logo_url}" alt="${org.name}">`
              : `<span>${org.name.charAt(0)}</span>`
          }
        </div>
        <div class="org-item-info">
          <div class="org-item-name">${org.name}</div>
          <div class="org-item-role">${displayRole}</div>
        </div>
        ${
          isActive
            ? `
          <svg class="org-item-check" width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 8L6 11L13 4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        `
            : ""
        }
      </button>
    `;
  }

  formatRole(role) {
    const roleMap = {
      owner: "Owner",
      admin: "Admin",
      coach: "Coach",
      assistant_coach: "Assistant Coach",
      player: "Player",
      parent: "Parent",
      staff: "Staff",
      viewer: "Viewer",
    };
    return roleMap[role] || role;
  }

  attachEventListeners() {
    const trigger = document.getElementById("org-switcher-trigger");
    const dropdown = document.getElementById("org-switcher-dropdown");

    if (!trigger || !dropdown) return;

    // Toggle dropdown
    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggleDropdown();
    });

    // Close on outside click
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".org-switcher")) {
        this.closeDropdown();
      }
    });

    // Handle organization selection
    dropdown.addEventListener("click", async (e) => {
      const item = e.target.closest(".org-switcher-item");
      if (item && !item.disabled) {
        const orgId = item.dataset.orgId;
        const playerId = item.dataset.playerId || null;
        await this.switchOrganization(orgId, playerId);
      }
    });

    // Handle Search for Platform Admins
    if (this.isPlatformAdmin) {
      const searchInput = document.getElementById("org-search-input");
      if (searchInput) {
        searchInput.addEventListener("input", (e) => {
          const query = e.target.value.toLowerCase();
          this.organizations = this.allOrganizations.filter(
            (org) =>
              org.name.toLowerCase().includes(query) ||
              (org.sport && org.sport.toLowerCase().includes(query)),
          );
          this.updateList();
        });

        // Prevent dropdown close when clicking search
        searchInput.addEventListener("click", (e) => e.stopPropagation());
      }
    }
  }

  updateList() {
    const listContainer = document.getElementById("org-switcher-list");
    if (!listContainer) return;

    if (this.organizations.length === 0) {
      listContainer.innerHTML = `<div style="padding: 1.5rem; text-align: center; color: var(--text-muted); font-size: 0.9rem;">No matching organizations.</div>`;
    } else {
      listContainer.innerHTML = this.organizations
        .map((org) => this.renderOrgItem(org))
        .join("");
    }
  }

  toggleDropdown() {
    const dropdown = document.getElementById("org-switcher-dropdown");
    if (!dropdown) return;

    this.isOpen = !this.isOpen;
    dropdown.classList.toggle("open", this.isOpen);

    const trigger = document.getElementById("org-switcher-trigger");
    if (trigger) {
      trigger.classList.toggle("open", this.isOpen);
    }
  }

  closeDropdown() {
    const dropdown = document.getElementById("org-switcher-dropdown");
    if (dropdown) {
      this.isOpen = false;
      dropdown.classList.remove("open");

      const trigger = document.getElementById("org-switcher-trigger");
      if (trigger) {
        trigger.classList.remove("open");
      }
    }
  }

  async switchOrganization(orgId, playerId = null) {
    try {
      showNotification("Switching organization...", "info");

      const response = await apiService.makeRequest(
        "/auth/switch-organization",
        {
          method: "POST",
          body: JSON.stringify({ organizationId: orgId }),
        },
      );

      if (response.success) {
        // Store player ID in localStorage if viewing as a child
        const user = JSON.parse(localStorage.getItem("currentUser") || "{}");
        if (playerId) {
          user.activePlayerId = playerId;
          console.log(`👶 Switching to child context: Player ID ${playerId}`);
        } else {
          // When manually switching organizations, we should always clear the activePlayerId
          // This ensures we load the default profile (yourself) for the new club context.
          // Preserving a child ID is dangerous because that child likely doesn't exist in the new club.
          delete user.activePlayerId;
          sessionStorage.removeItem("activePlayerId");
          console.log(
            `👤 Switching organization: Resetting to default profile`,
          );
        }
        user.clubId = orgId;
        user.currentOrganizationId = orgId;
        localStorage.setItem("currentUser", JSON.stringify(user));

        showNotification("Organization switched successfully!", "success");

        // Fetch new context to get updated role
        try {
          const context = await apiService.refreshContext();
          if (context && context.currentOrganization) {
            const newRole =
              context.currentOrganization.user_role ||
              context.currentOrganization.role;

            // Update local storage user - CRITICAL FIX: Ensure we merge with existing or fetch fresh if missing
            let currentUser = null;
            try {
              const stored = localStorage.getItem("currentUser");
              if (stored) currentUser = JSON.parse(stored);
            } catch (e) {
              console.warn("Local storage parse error", e);
            }

            // If currentUser is missing or broken (causing the "Login" button issue), recover it from context
            if (!currentUser || !currentUser.id) {
              if (context.user) {
                currentUser = context.user;
              } else {
                // Fallback - this shouldn't happen if refreshContext worked
                currentUser = { role: newRole };
              }
            }

            if (currentUser) currentUser.role = newRole;
            // Also sync clubId for determining active club
            currentUser.clubId = context.currentOrganization.id;

            localStorage.setItem("currentUser", JSON.stringify(currentUser));

            // Redirect based on role
            const redirectRole = (newRole || "").toLowerCase();
            if (["player", "parent", "adult"].includes(redirectRole)) {
              window.location.href = "player-dashboard.html";
            } else if (["coach", "assistant-coach"].includes(redirectRole)) {
              window.location.href = "coach-dashboard.html";
            } else {
              window.location.href = "admin-dashboard.html";
            }
            return;
          }
        } catch (e) {
          console.warn("Failed to refresh context during switch:", e);
        }

        // Fallback
        setTimeout(() => {
          window.location.reload();
        }, 500);
      }
    } catch (error) {
      console.error("Failed to switch organization:", error);
      showNotification("Failed to switch organization", "error");
    }
  }
}

// Initialize on page load
let orgSwitcher;
document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("org-switcher-container");
  if (container) {
    orgSwitcher = new OrganizationSwitcher();
  }
});
