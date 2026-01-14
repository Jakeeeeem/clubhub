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
            console.log('🚀 Initializing Workspace Manager...');
            this.context = await apiService.getContext();
            
            if (!this.context || !this.context.currentOrganization) {
                console.warn('⚠️ No active organization context found.');
                // Optional: redirect to onboarding/org selection if necessary
                return;
            }

            this.applyBranding();
            this.enforceRolePermissions();
            this.setupRedirects();
            
            console.log(`✅ Workspace context applied: ${this.context.currentOrganization.name} (${this.context.currentOrganization.user_role})`);
        } catch (error) {
            console.error('❌ Workspace initialization failed:', error);
        }
    }

    /**
     * Apply organization-specific branding (Logo, Name)
     */
    applyBranding() {
        const org = this.context.currentOrganization;
        
        // Update dashboard title/header
        const orgNameDisplays = document.querySelectorAll('.display-org-name');
        orgNameDisplays.forEach(el => el.textContent = org.name);

        // Update logo
        const logoImgs = document.querySelectorAll('.display-org-logo');
        if (org.logo_url) {
            logoImgs.forEach(img => {
                if (img.tagName === 'IMG') img.src = org.logo_url;
            });
        }
    }

    /**
     * Hide/Show UI elements based on data-roles attribute
     */
    enforceRolePermissions() {
        const userRole = this.context.currentOrganization.user_role;
        const protectedElements = document.querySelectorAll('[data-roles]');

        protectedElements.forEach(el => {
            const allowedRoles = el.getAttribute('data-roles').split(',').map(r => r.trim());
            
            if (!allowedRoles.includes(userRole)) {
                el.style.display = 'none';
                el.setAttribute('data-hidden-by-role', 'true');
            } else {
                // Only show if it wasn't hidden for other reasons
                if (el.style.display === 'none' && !el.classList.contains('hidden-manual')) {
                    el.style.display = '';
                }
            }
        });
    }

    /**
     * Ensure users are on the correct dashboard for their role
     */
    setupRedirects() {
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
    }
}

// Global initialization
let workspaceManager;
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if we have an apiService (logged in)
    if (typeof apiService !== 'undefined' && localStorage.getItem('authToken')) {
        workspaceManager = new WorkspaceManager();
    }
});
