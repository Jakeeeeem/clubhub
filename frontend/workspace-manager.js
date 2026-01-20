/**
 * Workspace Manager
 * Handles role-based access control and organizational context on the frontend.
 */

class WorkspaceManager {
  constructor() {
    this.context = null;
    this.init();
  }

  async init() {
    try {
      console.log("🚀 Initializing Workspace Manager...");
      this.context = await apiService.getContext();

      if (!this.context || !this.context.currentOrganization) {
        console.warn("⚠️ No active organization context found.");
        console.log("ℹ️ User can still access dashboards with manual toggle");
        // Don't apply branding or role permissions if no org context
        return;
      }

      // Only apply these if we have a valid context
      try {
        this.applyBranding();
      } catch (error) {
        console.error("❌ Branding failed:", error);
      }

      try {
        this.enforceRolePermissions();
      } catch (error) {
        console.error("❌ Role permissions failed:", error);
      }

      try {
        this.setupRedirects();
      } catch (error) {
        console.error("❌ Setup redirects failed:", error);
      }

      console.log(
        `✅ Workspace context applied: ${this.context.currentOrganization.name} (${this.context.currentOrganization.user_role})`,
      );
    } catch (error) {
      console.error("❌ Workspace initialization failed:", error);
      // Don't throw - let the dashboard load anyway
    }
  }

  /**
   * Apply organization-specific branding (Logo, Name)
   */
  applyBranding() {
    const org = this.context.currentOrganization;

    // Update dashboard title/header
    const orgNameDisplays = document.querySelectorAll(".display-org-name");
    orgNameDisplays.forEach((el) => (el.textContent = org.name));

    // Update logo
    const logoImgs = document.querySelectorAll(".display-org-logo");
    if (org.logo_url) {
      logoImgs.forEach((img) => {
        if (img.tagName === "IMG") img.src = org.logo_url;
      });
    }
  }

  /**
   * Hide/Show UI elements based on data-roles attribute
   */
  enforceRolePermissions() {
    if (!this.context || !this.context.currentOrganization) {
      console.error("❌ Cannot enforce permissions: No organization context");
      return;
    }

    const org = this.context.currentOrganization;
    // Support various field names for roles (snake_case, camelCase, or 'role')
    const rawRole = org.user_role || org.role || org.userRole || "";
    const userRole = rawRole.toString().trim().toLowerCase();

    const protectedElements = document.querySelectorAll("[data-roles]");

    console.log(
      `🔐 Enforcing permissions for role: "${userRole}" (raw: "${rawRole}")`,
    );
    console.log(`📋 Found ${protectedElements.length} protected elements`);

    protectedElements.forEach((el) => {
      const allowedRolesStr = el.getAttribute("data-roles") || "";
      const allowedRoles = allowedRolesStr
        .split(",")
        .map((r) => r.trim().toLowerCase());

      // Owner should see EVERYTHING
      const isOwner = userRole === "owner";
      const hasAccess =
        isOwner || (userRole && allowedRoles.includes(userRole));

      const elId = el.id || el.textContent.trim().substring(0, 15);

      if (!hasAccess) {
        el.style.display = "none";
        el.setAttribute("data-hidden-by-role", "true");
        console.log(
          `🚫 Hiding "${elId}" (allowed: [${allowedRoles}], user: "${userRole}")`,
        );
      } else {
        // Only show if it was hidden for roles (don't override other display logic)
        if (
          el.style.display === "none" &&
          el.getAttribute("data-hidden-by-role") === "true"
        ) {
          el.style.display = "";
        } else if (
          el.style.display === "none" &&
          !el.classList.contains("hidden-manual")
        ) {
          // Fallback to default if it was hidden but not manually
          el.style.display = "";
        }
        el.removeAttribute("data-hidden-by-role");
        console.log(
          `✅ Showing "${elId}" (allowed: [${allowedRoles}], user: "${userRole}")`,
        );
      }
    });
  }

  /**
   * Ensure users are on the correct dashboard for their role
   * DISABLED: We now have a manual Club/Player toggle, so users can choose their view
   */
  setupRedirects() {
    // COMMENTED OUT - Manual toggle now controls dashboard switching
    /*
        const path = window.location.pathname;
        const userRole = this.context.currentOrganization.user_role;

        // Redirect Players/Parents away from Admin Dashboard
        if (path.includes('admin-dashboard.html')) {
            if (['player', 'parent', 'viewer'].includes(userRole)) {
                console.log('🚫 Role mismatch. Redirecting to player dashboard.');
                window.location.href = 'player-dashboard.html';
            }
        }

        // Redirect Staff/Admins away from Player Dashboard (optional, usually they can view both)
        if (path.includes('player-dashboard.html')) {
            // Usually we allow everyone to see the player view
        }
        */
    console.log("✅ Manual dashboard toggle enabled - no automatic redirects");
  }
}

// Global initialization
let workspaceManager;
document.addEventListener("DOMContentLoaded", () => {
  // Only initialize if we have an apiService (logged in)
  if (typeof apiService !== "undefined" && localStorage.getItem("authToken")) {
    workspaceManager = new WorkspaceManager();
  }
});
