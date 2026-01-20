// NEW PROFILE SWITCHER - Matches Org Switcher Design
// Replace lines 73-123 in player-dashboard.js with this code

// Get active profile info
const activeProfile = PlayerDashboardState.activePlayerId 
  ? PlayerDashboardState.family.find(f => f.id == PlayerDashboardState.activePlayerId)
  : { first_name: firstName, last_name: currentUser.last_name || '', id: null };

const activeInitial = activeProfile.first_name.charAt(0).toUpperCase();
const activeName = activeProfile.first_name;

// Profile Switcher - Matches Org Switcher Design EXACTLY
const profileSwitcher = ` 
  <div class="profile-switcher" style="position: relative;">
    <button class="profile-switcher-trigger" id="profile-switcher-trigger" style="display: flex; align-items: center; gap: 0.75rem; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.15);  cursor: pointer; transition: all 0.2s; color: white; font-size: 0.9rem;">
      <div class="profiel-icon" style="width: 28px; height: 28px; background: var(--primary); border-radius: 6px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.85rem; flex-shrink: 0;">
        ${activeInitial}
      </div>
      <div style="display: flex; flex-direction: column; align-items: flex-start; min-width: 0;">
        <span style="font-weight: 500; font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 120px;">${activeName}</span>
        <span style="font-size: 0.75rem; color: rgba(255,255,255,0.5);">${!PlayerDashboardState.activePlayerId ? 'Parent' : 'Child'}</span>
      </div>
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style="opacity: 0.5; flex-shrink: 0;">
        <path d="M2 4L6 8L10 4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    </button>
    
    <div class="profile-switcher-dropdown" id="profile-switcher-dropdown" style="position: absolute; top: calc(100% + 8px); right: 0; min-width: 280px; background: #1a1a1a; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.6); opacity: 0; visibility: hidden; transform: translateY(-10px); transition: all 0.2s; z-index: 1000; overflow: hidden;">
      <div style="padding: 1rem 1.25rem; border-bottom: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.02);">
        <div style="font-size: 0.75rem; font-weight: 600; text-transform: uppercase; color: rgba(255,255,255,0.4); letter-spacing: 0.5px;">Switch Profile</div>
        <div style="font-size: 0.8rem; color: rgba(255,255,255,0.5); margin-top: 0.25rem;">View different family member data</div>
      </div>
      
      <div class="profile-list" style="max-height: 320px; overflow-y: auto; padding: 0.5rem;">
        <!-- Parent Profile -->
        <button class="profile-item ${!PlayerDashboardState.activePlayerId ? 'active' : ''}" onclick="switchProfile(null)" style="width: 100%; display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem 1rem; background: ${!PlayerDashboardState.activePlayerId ? 'rgba(220,67,67,0.1)' : 'transparent'}; border: ${!PlayerDashboardState.activePlayerId ? '1px solid rgba(220,67,67,0.3)' : '1px solid transparent'}; border-radius: 8px; color: white; cursor: pointer; transition: all 0.2s; text-align: left; margin-bottom: 0.25rem;">
          <div style="width: 36px; height: 36px; background: var(--primary); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 1rem; flex-shrink: 0;">
            ${firstName.charAt(0)}
          </div>
          <div style="flex: 1; min-width: 0;">
            <div style="font-weight: 600; font-size: 0.95rem; color: ${!PlayerDashboardState.activePlayerId ? 'var(--primary)' : 'white'};">${firstName} ${currentUser.last_name || ''}</div>
            <div style="font-size: 0.75rem; color: rgba(255,255,255,0.5); margin-top: 2px;">Parent Account</div>
          </div>
          ${!PlayerDashboardState.activePlayerId ? '<svg width="18" height="18" viewBox="0 0 16 16" fill="none" style="flex-shrink: 0;"><path d="M3 8L6 11L13 4" stroke="var(--primary)" stroke-width="2" stroke-linecap="round"/></svg>' : ''}
        </button>
        
        <!-- Family Members -->
        ${PlayerDashboardState.family.length > 0 ? `
          <div style="padding: 0.5rem 0.5rem 0.25rem; font-size: 0.7rem; font-weight: 600; text-transform: uppercase; color: rgba(255,255,255,0.3); letter-spacing: 0.5px;">Children</div>
        ` : ''}
        ${PlayerDashboardState.family.map(child => `
          <button class="profile-item ${PlayerDashboardState.activePlayerId == child.id ? 'active' : ''}" onclick="switchProfile('${child.id}')" style="width: 100%; display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem 1rem; background: ${PlayerDashboardState.activePlayerId == child.id ? 'rgba(220,67,67,0.1)' : 'transparent'}; border: ${PlayerDashboardState.activePlayerId == child.id ? '1px solid rgba(220,67,67,0.3)' : '1px solid transparent'}; border-radius: 8px; color: white; cursor: pointer; transition: all 0.2s; text-align: left; margin-bottom: 0.25rem;">
            <div style="width: 36px; height: 36px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 1rem; flex-shrink: 0;">
              ${child.first_name.charAt(0)}
            </div>
            <div style="flex: 1; min-width: 0;">
              <div style="font-weight: 600; font-size: 0.95rem; color: ${PlayerDashboardState.activePlayerId == child.id ? 'var(--primary)' : 'white'};">${child.first_name} ${child.last_name}</div>
              <div style="font-size: 0.75rem; color: rgba(255,255,255,0.5); margin-top: 2px;">Age ${child.age || calculateAge(child.date_of_birth)} • ${child.sport || 'No sport'}</div>
            </div>
            ${PlayerDashboardState.activePlayerId == child.id ? '<svg width="18" height="18" viewBox="0 0 16 16" fill="none" style="flex-shrink: 0;"><path d="M3 8L6 11L13 4" stroke="var(--primary)" stroke-width="2" stroke-linecap="round"/></svg>' : ''}
          </button>
        `).join('')}
      </div>
      
      <div style="padding: 0.75rem; border-top: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.02);">
        <button onclick="showPlayerSection('family')" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.65rem; background: rgba(220,67,67,0.15); border: 1px solid rgba(220,67,67,0.3); color: var(--primary); border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 0.85rem; transition: all 0.2s;">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 3V13M3 8H13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          Add Family Member
        </button>
      </div>
    </div>
  </div>
`;
