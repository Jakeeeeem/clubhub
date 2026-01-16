/**
 * Organization Switcher Component
 * Dropdown to switch between organizations (like Stripe)
 */

class OrganizationSwitcher {
  constructor() {
    this.currentOrg = null;
    this.organizations = [];
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
      const response = await apiService.makeRequest('/auth/context');
      if (response.success) {
        this.organizations = response.organizations || [];
        this.currentOrg = response.currentOrganization;
      }
    } catch (error) {
      console.error('Failed to load organizations:', error);
    }
  }

  render() {
    const container = document.getElementById('org-switcher-container');
    if (!container) return;

    // For players with only 1 organization, we might want to hide this to reduce clutter,
    // UNLESS they are an admin/owner who just happens to be viewing their player profile.
    // However, if they only have 1 org total, there is nothing to switch to.
    if (this.organizations && this.organizations.length <= 1) {
        // If they only have 1 org, check if they are an owner/admin of it to decide if we show "Create Org"
        // But generally, for a cleaner UI, we can just hide it or show a static badge.
        // Let's hide it strictly if length is 1 to solve the "extra dropdown" complaint.
        // container.innerHTML = ''; 
        // return;
        // User explicitly complained about "extra dropdown", so let's hide if <= 1.
        if (this.organizations.length <= 1) {
             container.innerHTML = '';
             return;
        }
    }

    const currentOrgName = this.currentOrg?.name || 'No Organization';
    const currentOrgRole = this.currentOrg?.user_role || this.currentOrg?.role || '';

    container.innerHTML = `
      <div class="org-switcher">
        <button class="org-switcher-trigger" id="org-switcher-trigger">
          <div class="org-switcher-current">
            <div class="org-avatar">
              ${this.currentOrg?.logo_url 
                ? `<img src="${this.currentOrg.logo_url}" alt="${currentOrgName}">` 
                : `<span>${currentOrgName.charAt(0)}</span>`
              }
            </div>
            <div class="org-info">
              <div class="org-name">${currentOrgName}</div>
              ${currentOrgRole ? `<div class="org-role">${this.formatRole(currentOrgRole)}</div>` : ''}
            </div>
          </div>
          <svg class="org-switcher-arrow" width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 4L6 8L10 4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>

        <div class="org-switcher-dropdown" id="org-switcher-dropdown">
          <div class="org-switcher-header">
            <span>Switch Organization</span>
          </div>
          <div class="org-switcher-list">
            ${this.organizations.length === 0 
              ? `<div style="padding: 1.5rem; text-align: center; color: var(--text-muted); font-size: 0.9rem;">
                   No organizations yet.<br>Create your first one below!
                 </div>`
              : this.organizations.map(org => this.renderOrgItem(org)).join('')
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
    const isActive = this.currentOrg?.id === org.id;
    return `
      <button 
        class="org-switcher-item ${isActive ? 'active' : ''}" 
        data-org-id="${org.id}"
        ${isActive ? 'disabled' : ''}
      >
        <div class="org-item-avatar">
          ${org.logo_url 
            ? `<img src="${org.logo_url}" alt="${org.name}">` 
            : `<span>${org.name.charAt(0)}</span>`
          }
        </div>
        <div class="org-item-info">
          <div class="org-item-name">${org.name}</div>
          <div class="org-item-role">${this.formatRole(org.role)}</div>
        </div>
        ${isActive ? `
          <svg class="org-item-check" width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 8L6 11L13 4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        ` : ''}
      </button>
    `;
  }

  formatRole(role) {
    const roleMap = {
      'owner': 'Owner',
      'admin': 'Admin',
      'coach': 'Coach',
      'assistant_coach': 'Assistant Coach',
      'player': 'Player',
      'parent': 'Parent',
      'staff': 'Staff',
      'viewer': 'Viewer'
    };
    return roleMap[role] || role;
  }

  attachEventListeners() {
    const trigger = document.getElementById('org-switcher-trigger');
    const dropdown = document.getElementById('org-switcher-dropdown');

    if (!trigger || !dropdown) return;

    // Toggle dropdown
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleDropdown();
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.org-switcher')) {
        this.closeDropdown();
      }
    });

    // Handle organization selection
    dropdown.addEventListener('click', async (e) => {
      const item = e.target.closest('.org-switcher-item');
      if (item && !item.disabled) {
        const orgId = item.dataset.orgId;
        await this.switchOrganization(orgId);
      }
    });
  }

  toggleDropdown() {
    const dropdown = document.getElementById('org-switcher-dropdown');
    if (!dropdown) return;

    this.isOpen = !this.isOpen;
    dropdown.classList.toggle('open', this.isOpen);
    
    const trigger = document.getElementById('org-switcher-trigger');
    if (trigger) {
      trigger.classList.toggle('open', this.isOpen);
    }
  }

  closeDropdown() {
    const dropdown = document.getElementById('org-switcher-dropdown');
    if (dropdown) {
      this.isOpen = false;
      dropdown.classList.remove('open');
      
      const trigger = document.getElementById('org-switcher-trigger');
      if (trigger) {
        trigger.classList.remove('open');
      }
    }
  }

  async switchOrganization(orgId) {
    try {
      showNotification('Switching organization...', 'info');
      
      const response = await apiService.makeRequest('/auth/switch-organization', {
        method: 'POST',
        body: JSON.stringify({ organizationId: orgId })
      });

      if (response.success) {
        showNotification('Organization switched successfully!', 'success');
        
        // Fetch new context to get updated role
        try {
           const context = await apiService.refreshContext();
           if (context && context.currentOrganization) {
               const newRole = context.currentOrganization.role;
               
               // Update local storage user - CRITICAL FIX: Ensure we merge with existing or fetch fresh if missing
               let currentUser = null;
               try {
                   const stored = localStorage.getItem('currentUser');
                   if (stored) currentUser = JSON.parse(stored);
               } catch(e) { console.warn('Local storage parse error', e); }

               // If currentUser is missing or broken (causing the "Login" button issue), recover it from context
               if (!currentUser || !currentUser.id) {
                   if (context.user) {
                       currentUser = context.user;
                   } else {
                       // Fallback - this shouldn't happen if refreshContext worked
                       currentUser = { role: newRole }; 
                   }
               }

               currentUser.role = newRole;
               // Also sync clubId for determining active club
               currentUser.clubId = context.currentOrganization.id;

               localStorage.setItem('currentUser', JSON.stringify(currentUser));
               
               // Redirect based on role
               if (['player', 'parent', 'adult'].includes(newRole)) {
                   window.location.href = 'player-dashboard.html';
               } else if (['coach', 'assistant-coach'].includes(newRole)) {
                   window.location.href = 'coach-dashboard.html';
               } else {
                   window.location.href = 'admin-dashboard.html';
               }
               return;
           }
        } catch (e) {
            console.warn('Failed to refresh context during switch:', e);
        }

        // Fallback
        setTimeout(() => {
          window.location.reload();
        }, 500);
      }
    } catch (error) {
      console.error('Failed to switch organization:', error);
      showNotification('Failed to switch organization', 'error');
    }
  }
}

// Initialize on page load
let orgSwitcher;
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('org-switcher-container');
  if (container) {
    orgSwitcher = new OrganizationSwitcher();
  }
});
