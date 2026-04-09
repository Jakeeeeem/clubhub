/**
 * Group Switcher Component
 * Dropdown to switch between groups (like Stripe)
 */

class GroupSwitcher {
  constructor(container = null) {
    this.currentGroup = null;
    this.groups = [];
    this.allGroups = []; // For filtering/searching
    this.isPlatformAdmin = false;
    this.isOpen = false;
    this.container = container;
    this.init();
  }

  static render(container) {
    if (!container) return;
    return new GroupSwitcher(container);
  }

  async init() {
    await this.loadGroups();
    this.render();
    this.attachEventListeners();
  }

  async loadGroups() {
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

        let groups = response.groups || response.organizations || [];
        console.log(
          `Switcher: Found ${groups.length} member groups. Admin: ${this.isPlatformAdmin}`,
        );

        // If Platform Admin, fetch ALL organizations
        if (this.isPlatformAdmin) {
          try {
            console.log(
              "Switcher: Platform Admin detected, fetching all platform clubs...",
            );
            const allGroupsResponse = await apiService.makeRequest(
              "/platform-admin/groups?limit=1000",
            );
            if (allGroupsResponse && allGroupsResponse.groups) {
              console.log(
                `Switcher: Loaded ${allGroupsResponse.groups.length} platform clubs.`,
              );
              // Map to match the format from /auth/context
              groups = allGroupsResponse.groups.map((group) => ({
                id: group.id,
                name: group.name,
                sport: group.sport,
                location: group.location,
                logo_url: group.logo_url,
                user_role: "Platform Admin",
                role: "Platform Admin",
              }));
            }
          } catch (error) {
            console.warn("Switcher: Failed to load all groups:", error);
          }
        } else {
          // For non-admins, filter based on dashboard type
          const path = window.location.pathname;
          if (
            path.includes("admin-dashboard.html") ||
            path.includes("coach-dashboard.html")
          ) {
            groups = groups.filter((group) => {
              const role = (group.user_role || group.role || "").toLowerCase();
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

        this.groups = groups;
        this.allGroups = groups;
        this.currentGroup =
          response.currentGroup || response.currentOrganization;

        this.render();
      }
    } catch (error) {
      console.error("Failed to load groups:", error);
    }
  }

  render() {
    const container = this.container || document.getElementById("group-switcher-container");
    if (!container) return;

    const currentGroupName = this.currentGroup?.name || "No Group";
    const currentGroupRole =
      this.currentGroup?.user_role || this.currentGroup?.role || "";

    container.innerHTML = `
      <div class="group-switcher">
        <button class="group-switcher-trigger">
          <div class="group-switcher-current">
            <div class="group-avatar">
              ${
                this.currentGroup?.logo_url
                  ? `<img src="${this.currentGroup.logo_url}" alt="${currentGroupName}">`
                  : `<span>${currentGroupName.charAt(0)}</span>`
              }
            </div>
            <div class="group-info">
              <div class="group-name">${currentGroupName}</div>
              ${currentGroupRole ? `<div class="group-role">${this.formatRole(currentGroupRole)}</div>` : ""}
            </div>
          </div>
          <svg class="group-switcher-arrow" width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 4L6 8L10 4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>

        <div class="group-switcher-dropdown">
          <div class="group-switcher-header">
            <span>${this.isPlatformAdmin ? "Search All Groups" : "Switch Group"}</span>
          </div>
          
          ${
            this.isPlatformAdmin
              ? `
            <div class="group-switcher-search">
              <input type="text" class="group-search-input" placeholder="Search platform..." autocomplete="off">
            </div>
          `
              : ""
          }

          <div class="group-switcher-list">
            ${
              this.groups.length === 0
                ? `<div style="padding: 1.5rem; text-align: center; color: var(--text-muted); font-size: 0.9rem;">
                   No groups found.
                 </div>`
                : this.groups
                    .map((group) => this.renderGroupItem(group))
                    .join("")
            }
          </div>
          <div class="group-switcher-footer">
            <button class="group-switcher-action" onclick="window.location.href='create-group.html'">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 3V13M3 8H13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
              Create Group
            </button>
          </div>
        </div>
      </div>
    `;

    // Re-attach listeners after rendering
    this.attachEventListeners(container);
  }

  renderGroupItem(group) {
    // Check if active - must match both group ID and player ID (if viewing as child)
    const isActive =
      this.currentGroup?.id === group.id &&
      (group.player_id
        ? this.currentGroup?.player_id === group.player_id
        : !this.currentGroup?.player_id);

    // Determine display role
    let displayRole = this.formatRole(group.user_role || group.role);

    // If this is a child's player context, show the child's name
    if (group.player_id && group.player_name) {
      displayRole = `Player - ${group.player_name}`;
    }

    return `
      <button 
        class="group-switcher-item ${isActive ? "active" : ""}" 
        data-group-id="${group.id}"
        data-player-id="${group.player_id || ""}"
        ${isActive ? "disabled" : ""}
      >
        <div class="group-item-avatar">
          ${
            group.logo_url
              ? `<img src="${group.logo_url}" alt="${group.name}">`
              : `<span>${group.name.charAt(0)}</span>`
          }
        </div>
        <div class="group-item-info">
          <div class="group-item-name">${group.name}</div>
          <div class="group-item-role">${displayRole}</div>
        </div>
        ${
          isActive
            ? `
          <svg class="group-item-check" width="16" height="16" viewBox="0 0 16 16" fill="none">
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

  attachEventListeners(container) {
    const parent = container || this.container || document;
    this.trigger = parent.querySelector(".group-switcher-trigger");
    this.dropdown = parent.querySelector(".group-switcher-dropdown");
    this.listContainer = parent.querySelector(".group-switcher-list");

    if (!this.trigger || !this.dropdown) return;

    // Toggle dropdown
    this.trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggleDropdown();
    });

    // Close on outside click
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".group-switcher")) {
        this.closeDropdown();
      }
    });

    // Handle group selection
    this.dropdown.addEventListener("click", async (e) => {
      const item = e.target.closest(".group-switcher-item");
      if (item && !item.disabled) {
        const groupId = item.dataset.groupId;
        const playerId = item.dataset.playerId || null;
        await this.switchGroup(groupId, playerId);
      }
    });

    // Handle Search for Platform Admins
    if (this.isPlatformAdmin) {
      const searchInput = this.dropdown.querySelector(".group-search-input");
      if (searchInput) {
        searchInput.addEventListener("input", (e) => {
          const query = e.target.value.toLowerCase();
          this.groups = this.allGroups.filter(
            (group) =>
              group.name.toLowerCase().includes(query) ||
              (group.sport && group.sport.toLowerCase().includes(query)),
          );
          this.updateList();
        });

        // Prevent dropdown close when clicking search
        searchInput.addEventListener("click", (e) => e.stopPropagation());
      }
    }
  }

  updateList() {
    if (!this.listContainer) return;

    if (this.groups.length === 0) {
      this.listContainer.innerHTML = `<div style="padding: 1.5rem; text-align: center; color: var(--text-muted); font-size: 0.9rem;">No matching groups.</div>`;
    } else {
      this.listContainer.innerHTML = this.groups
        .map((group) => this.renderGroupItem(group))
        .join("");
    }
  }

  toggleDropdown() {
    if (!this.dropdown) return;

    this.isOpen = !this.isOpen;
    this.dropdown.classList.toggle("open", this.isOpen);

    if (this.trigger) {
      this.trigger.classList.toggle("open", this.isOpen);
    }
  }

  closeDropdown() {
    if (this.dropdown) {
      this.isOpen = false;
      this.dropdown.classList.remove("open");

      if (this.trigger) {
        this.trigger.classList.remove("open");
      }
    }
  }

  async switchGroup(groupId, playerId = null) {
    try {
      showNotification("Switching group...", "info");

      const response = await apiService.makeRequest("/auth/switch-group", {
        method: "POST",
        body: JSON.stringify({ organizationId: groupId }),
      });

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
          console.log(`👤 Switching group: Resetting to default profile`);
        }
        user.clubId = groupId;
        user.currentGroupId = groupId;
        localStorage.setItem("currentUser", JSON.stringify(user));

        showNotification("Group switched successfully!", "success");

        // Fetch new context to get updated role
        try {
          const context = await apiService.refreshContext();
          if (context && context.currentGroup) {
            const newRole =
              context.currentGroup.user_role || context.currentGroup.role;

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
            currentUser.clubId = context.currentGroup.id;

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
      console.error("Failed to switch group:", error);
      showNotification("Failed to switch group", "error");
    }
  }
}

// Initialize on page load
let groupSwitcher;
document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("group-switcher-container");
  if (container) {
    groupSwitcher = new GroupSwitcher(container);
  }
});
