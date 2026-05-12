/**
 * Group Switcher Component
 * Dropdown to switch between groups (like Stripe)
 */

if (window.__groupSwitcherDefined) {
  console.log("♻️ GroupSwitcher: already loaded, skipping duplicate include.");
} else {
  window.__groupSwitcherDefined = true;
  
  // Inject CSS if not already present
  if (!document.getElementById("group-switcher-css")) {
    const style = document.createElement("style");
    style.id = "group-switcher-css";
    style.textContent = `
      .group-switcher { position: relative; z-index: 1000; font-family: 'Inter', sans-serif; }
      .group-switcher-trigger { 
        display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem 0.85rem; 
        background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.1); 
        border-radius: 12px; cursor: pointer; transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1); 
        backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
      }
      .group-switcher-trigger:hover { background: rgba(255, 255, 255, 0.08); border-color: rgba(255, 255, 255, 0.2); transform: translateY(-1px); }
      .group-switcher-trigger.open { background: rgba(255, 255, 255, 0.12); border-color: var(--primary); box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4); }
      .group-avatar { 
        width: 34px; height: 34px; border-radius: 8px; background: linear-gradient(135deg, var(--primary), #991b1b); 
        display: flex; align-items: center; justify-content: center; font-weight: 800; 
        font-size: 0.85rem; color: white; flex-shrink: 0; box-shadow: 0 4px 12px rgba(220, 67, 67, 0.2);
      }
      .group-avatar img { width: 100%; height: 100%; object-fit: cover; border-radius: inherit; }
      .group-info { flex: 1; text-align: left; min-width: 0; overflow: hidden; display: flex; flex-direction: column; gap: 1px; }
      .group-name { font-size: 0.9rem; font-weight: 700; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin: 0; letter-spacing: -0.2px; }
      .group-role { font-size: 0.65rem; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.8px; font-weight: 800; margin: 0; }
      .group-switcher-dropdown {
        position: absolute; top: calc(100% + 10px); left: 0; width: 320px; 
        background: rgba(15, 15, 18, 0.95); border: 1px solid rgba(255, 255, 255, 0.1); 
        border-radius: 16px; box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8); 
        z-index: 5000; opacity: 0; visibility: hidden; transform: translateY(-12px); 
        transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); overflow: hidden;
        backdrop-filter: blur(30px); -webkit-backdrop-filter: blur(30px);
      }
      .group-switcher-dropdown.open { opacity: 1; visibility: visible; transform: translateY(0); }
      .group-switcher-header { padding: 16px 20px 12px; font-size: 0.7rem; font-weight: 800; color: rgba(255,255,255,0.3); text-transform: uppercase; letter-spacing: 1px; }
      .group-switcher-list { max-height: 400px; overflow-y: auto; padding: 8px; display: flex; flex-direction: column; gap: 4px; }
      .group-switcher-item {
        display: flex; align-items: center; gap: 1rem; padding: 12px 16px; 
        width: 100%; background: transparent; border: 1px solid transparent; border-radius: 12px; 
        color: #fff; cursor: pointer; text-align: left; transition: all 0.2s ease;
      }
      .group-switcher-item:hover { background: rgba(255, 255, 255, 0.05); border-color: rgba(255, 255, 255, 0.05); }
      .group-switcher-item.active { background: rgba(220, 38, 38, 0.08); border-color: rgba(220, 38, 38, 0.2); }
      .group-switcher-item .group-item-avatar { 
        width: 40px; height: 40px; border-radius: 10px; background: rgba(255,255,255,0.05); 
        display: flex; align-items: center; justify-content: center; font-weight: 700; flex-shrink: 0; 
        font-size: 1rem; transition: all 0.2s;
      }
      .group-switcher-item.active .group-item-avatar { background: var(--primary); box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3); }
      .group-switcher-item .group-item-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
      .group-switcher-item .group-item-name { font-size: 0.95rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #fff; }
      .group-switcher-item .group-item-role { font-size: 0.75rem; color: rgba(255,255,255,0.4); font-weight: 500; }
      .group-switcher-footer { padding: 12px; border-top: 1px solid rgba(255,255,255,0.05); background: rgba(255,255,255,0.02); }
      .group-switcher-action { 
        display: flex; align-items: center; justify-content: center; gap: 0.6rem; 
        width: 100%; padding: 0.85rem; background: rgba(255,255,255,0.04); 
        border: 1px dashed rgba(255,255,255,0.2); border-radius: 12px; color: rgba(255,255,255,0.8); 
        font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: all 0.2s;
      }
      .group-switcher-action:hover { background: rgba(220, 38, 38, 0.05); border-color: var(--primary); color: #fff; }
      .group-switcher-arrow { transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1); opacity: 0.5; }
      .group-switcher-trigger.open .group-switcher-arrow { transform: rotate(180deg); opacity: 1; }
      
      /* Sidebar Specific Overrides */
      .pro-sidebar .group-switcher { width: 100%; margin-bottom: 1rem; }
      .pro-sidebar .group-switcher-trigger { width: 100%; background: rgba(0,0,0,0.2); }
      .pro-sidebar .group-switcher-dropdown { left: 0; width: calc(var(--sidebar-width, 280px) - 24px); }

      /* Mobile Header Overrides */
      @media (max-width: 991px) {
        .group-switcher-dropdown { 
          width: calc(100vw - 32px); 
          max-width: 340px; 
          left: 50% !important; 
          transform: translateX(-50%) translateY(-12px); 
        }
        .group-switcher-dropdown.open { transform: translateX(-50%) translateY(0); }
        .group-switcher-trigger { min-width: auto; width: 100%; }
        
        /* When inside sidebar on mobile */
        .pro-sidebar .group-switcher-dropdown {
          left: 0 !important;
          transform: translateY(-12px) !important;
          width: calc(100% - 16px) !important;
          margin: 0 8px;
        }
        .pro-sidebar .group-switcher-dropdown.open {
          transform: translateY(0) !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  window.GroupSwitcher = class GroupSwitcher {
    constructor(container = null) {
      this.currentGroup = null;
      this.groups = [];
      this.allGroups = []; // For filtering/searching
      this.isPlatformAdmin = false;
      this.isOpen = false;
      this.container = container;
      this.init();
      // Expose instance for programmatic toggles (UnifiedNav header toggle)
      try {
        window.__groupSwitcherInstance = this;
      } catch (e) {
        // ignore
      }
    }

    static render(container) {
      if (!container) return;
      if (container.__groupSwitcherInstance) return container.__groupSwitcherInstance;
      const instance = new GroupSwitcher(container);
      container.__groupSwitcherInstance = instance;
      return instance;
    }

    async init() {
      try {
        await this.loadGroups();
      } catch (err) {
        console.error("Switcher: Failed to load groups:", err);
      }
      this.render();
    }

    async loadGroups() {
      try {
        let svc = window.apiService || (typeof apiService !== "undefined" ? apiService : null) || (window.ApiService ? new window.ApiService() : null);
        
        // Wait up to 2 seconds for apiService to be available
        if (!svc) {
            let retries = 0;
            while (!svc && retries < 20) {
                await new Promise(r => setTimeout(r, 100));
                svc = window.apiService || (typeof apiService !== "undefined" ? apiService : null) || (window.ApiService ? new window.ApiService() : null);
                retries++;
            }
        }

        if (!svc) {
            console.warn("Switcher: apiService not available after waiting. Skipping group load to avoid breaking UI.");
            return;
        }

        // Use getContext() which has the full demo-mode fallback built in
        const response = await svc.getContext();
        if (response && response.success) {
          // Determine if user is Platform Admin
          const user = JSON.parse(localStorage.getItem("currentUser") || "{}");
          this.isPlatformAdmin = 
            user.is_platform_admin === true ||
            user.isPlatformAdmin === true ||
            user.role === "superadmin" ||
            user.email === 'demo-admin@clubhub.com' || // Force for demo admin
            !!response.user?.isPlatformAdmin ||
            !!response.user?.is_platform_admin;

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

          // If Platform Admin, fetch ALL organizations (only when not in demo mode)
          const isDemo = false;
          if (this.isPlatformAdmin && !isDemo) {
            try {
              console.log(
                "Switcher: Platform Admin detected, fetching all platform clubs...",
              );
              const allGroupsResponse = await svc.makeRequest(
                "/platform-admin/groups?limit=1000",
              );
              if (allGroupsResponse && allGroupsResponse.groups) {
                console.log(
                  `Switcher: Loaded ${allGroupsResponse.groups.length} platform clubs.`,
                );
                const platformGroups = allGroupsResponse.groups.map((g) => ({
                  id: g.id,
                  name: g.name,
                  role: "platform_admin",
                  logo: g.logo,
                }));
                const existingIds = new Set(groups.map((g) => g.id));
                const uniqueNew = platformGroups.filter((g) => !existingIds.has(g.id));
                groups = [...groups, ...uniqueNew];
              }
            } catch (error) {
              console.warn("Switcher: Failed to load all groups (403 expected if permissions missing):", error);
            }
          } else {
            // ALL users see ALL their groups — the switcher redirects them
            // to the correct dashboard based on their role in the chosen group.
            // No group filtering is applied here.
          }

          this.groups = groups;
          this.allGroups = groups;
          this.currentGroup =
            response.currentGroup || response.currentOrganization;

          // 🛡️ RECOVERY: If groups are still empty but user is authenticated and not in demo, try one more endpoint
          if (this.groups.length === 0 && !isDemo) {
              try {
                  const fallback = await svc.makeRequest("/groups/my");
                  if (fallback && fallback.groups) {
                      this.groups = fallback.groups;
                      this.allGroups = fallback.groups;
                      if (!this.currentGroup) this.currentGroup = this.groups[0];
                  }
              } catch (e) {
                  console.warn("Switcher: Fallback groups fetch failed", e);
              }
          }

          this.render();
        }
      } catch (error) {
        console.error("Failed to load groups:", error);
      }
    }

    render() {
      const container =
        this.container || document.getElementById("group-switcher-container") || document.getElementById("sidebar-switcher-target");
      if (!container) return;

      const currentGroupName = this.currentGroup?.name || "Select Group";
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
              ${currentGroupRole ? `<div class="group-role">${this.formatRole(currentGroupRole)}</div>` : `<div class="group-role">Active Organization</div>`}
            </div>
          </div>
          <svg class="group-switcher-arrow" width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 4L6 8L10 4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
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
                   No organizations found.
                 </div>`
                : this.groups
                    .map((group) => this.renderGroupItem(group))
                    .join("")
            }
          </div>
          ${this.groups.length === 0 ? `
          <div class="group-switcher-footer">
            <button class="group-switcher-action" onclick="window.location.href='create-group.html'">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 3V13M3 8H13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
              Create Group
            </button>
          </div>
          ` : ''}
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
      if (!role) return "Member";
      const roleMap = {
        owner: "Owner",
        admin: "Admin",
        coach: "Coach",
        assistant_coach: "Assistant Coach",
        player: "Player Pro",
        parent: "Parent Hub",
        staff: "Staff",
        viewer: "Viewer",
      };
      return roleMap[role.toLowerCase()] || role;
    }

    attachEventListeners(container) {
      const parent = container || this.container || document;
      this.trigger = parent.querySelector(".group-switcher-trigger");
      this.dropdown = parent.querySelector(".group-switcher-dropdown");
      this.listContainer = parent.querySelector(".group-switcher-list");

      if (!this.trigger || !this.dropdown) return;

      // Toggle dropdown
      if (!this._handleTriggerClick) {
        this._handleTriggerClick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.toggleDropdown();
        };
      }
      this.trigger.removeEventListener("click", this._handleTriggerClick);
      this.trigger.addEventListener("click", this._handleTriggerClick);

      // Close on outside click
      if (!this._handleOutsideClick) {
        this._handleOutsideClick = (e) => {
          if (!e.target.closest(".group-switcher")) {
            this.closeDropdown();
          }
        };
      }
      document.removeEventListener("click", this._handleOutsideClick);
      document.addEventListener("click", this._handleOutsideClick);

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
        this.listContainer.innerHTML = `<div style="padding: 1.5rem; text-align: center; color: var(--text-muted); font-size: 0.9rem;">No matching organizations.</div>`;
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
      // Prevent duplicate/concurrent switches
      if (this._switching) return;
      this._switching = true;

      const notify = (msg, type) => {
        if (typeof showNotification === 'function') showNotification(msg, type);
      };

      try {
        this.closeDropdown();
        notify("Switching group…", "info");

        const svc = window.apiService || (typeof apiService !== 'undefined' ? apiService : null);
        if (!svc) throw new Error("API service unavailable");

        const response = await svc.makeRequest("/auth/switch-group", {
          method: "POST",
          body: JSON.stringify({ organizationId: groupId }),
        });

        if (!response || !response.success) {
          throw new Error(response?.message || "Switch failed");
        }

        // Update local user record
        let user = {};
        try { user = JSON.parse(localStorage.getItem("currentUser") || "{}"); } catch(e) {}

        if (playerId) {
          user.activePlayerId = playerId;
          sessionStorage.setItem("activePlayerId", playerId);
          console.log(`👶 Switching to child context: Player ID ${playerId}`);
        } else {
          delete user.activePlayerId;
          sessionStorage.removeItem("activePlayerId");
          console.log(`👤 Switching group: ${groupId}`);
        }
        user.clubId = groupId;
        user.currentGroupId = groupId;
        localStorage.setItem("currentUser", JSON.stringify(user));

        notify("Group switched!", "success");

        // Use role returned by the API directly — no second round-trip needed
        let newRole = response.role || null;

        if (!newRole) {
          // Fallback: refresh context only if backend didn't return role
          try {
            const context = await svc.refreshContext();
            if (context) {
              const grp = context.currentGroup || context.currentOrganization || {};
              newRole = (grp.user_role || grp.role || context.user?.role || "player");

              // Persist refreshed user
              let cu = {};
              try { cu = JSON.parse(localStorage.getItem("currentUser") || "{}"); } catch(e) {}
              if (context.user) Object.assign(cu, context.user);
              cu.role = newRole;
              cu.clubId = grp.id || groupId;
              cu.groupId = grp.id || groupId;
              localStorage.setItem("currentUser", JSON.stringify(cu));
            }
          } catch (e) {
            console.warn("Context refresh failed after group switch — using fallback role:", e);
          }
        } else {
          // Update stored user with new role immediately
          let cu = {};
          try { cu = JSON.parse(localStorage.getItem("currentUser") || "{}"); } catch(e) {}
          cu.role = newRole;
          cu.clubId = groupId;
          cu.groupId = groupId;
          localStorage.setItem("currentUser", JSON.stringify(cu));
        }

        newRole = newRole || "player";

        // Route to the correct dashboard for this group
        const r = (newRole || "").toLowerCase().replace(/-/g, "_");
        const PLAYER_ROLES  = ["player", "parent", "adult", "member"];
        const COACH_ROLES   = ["coach", "assistant_coach"];
        const ADMIN_ROLES   = ["owner", "admin", "manager", "staff", "platform_admin"];

        let dest;
        if (PLAYER_ROLES.includes(r)) {
          dest = "player-dashboard.html";
        } else if (COACH_ROLES.includes(r)) {
          dest = "coach-dashboard.html";
        } else if (ADMIN_ROLES.includes(r)) {
          dest = "admin-dashboard.html";
        } else {
          // Unknown role → default to player dashboard so everyone can see their groups
          dest = "player-dashboard.html";
        }

        console.log(`🔀 Switching to ${dest} (role: ${r})`);
        window.location.href = dest;

      } catch (error) {
        console.error("Failed to switch group:", error);
        notify("Failed to switch group: " + (error.message || "unknown error"), "error");
        this._switching = false;
      }
    }
  }

  // Robust immediate initialization
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      if (window.UnifiedNav) window.UnifiedNav.renderHeaderSwitcher();
    });
  } else {
    if (window.UnifiedNav) window.UnifiedNav.renderHeaderSwitcher();
  }
}
