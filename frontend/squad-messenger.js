/**
 * Squad Messenger — Shared Component
 * Provides role-based messaging for Coach, Admin, and Player dashboards.
 *
 * Role rules:
 *   admin/organization : can message anyone in their club
 *   coach              : can message their squad players and admins
 *   player             : can message coaches, admins, and other players; can mass-message squad
 *
 * Usage: Include this file on any dashboard. Call:
 *   SquadMessenger.init('sectionContainerId', contactListTargetId)
 */

// ─────────────────────────────────────────────────────────────────────────────
// SQUAD MESSENGER MODULE
// ─────────────────────────────────────────────────────────────────────────────

const SquadMessenger = {
  state: {
    activeUserId: null,
    activeName: null,
    allMessages: [],
    allContacts: [],
    pollingTimer: null,
    containerId: null,
    drawerOpen: false,
  },

  /**
   * Mount the messenger UI into an existing empty container element.
   * @param {string} containerId - ID of the section container (will have HTML injected)
   */
  mount(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    this.state.containerId = containerId;
    const currentUser = SquadMessenger._currentUser();
    const role = currentUser.userType || currentUser.account_type || 'player';
    const isPlayer = role === 'player';

    container.innerHTML = `
      <div class="sq-messenger" style="position:relative; display:grid; grid-template-columns:minmax(280px,320px) 1fr; gap:0; height:100%; min-height:0; overflow:hidden; border-radius:16px; background:rgba(10,10,12,0.94); border:1px solid rgba(255,255,255,0.08);">

        <!-- LEFT: Contacts / Conversation List -->
        <div class="sq-left" style="background:rgba(8,8,10,0.92); border-right:1px solid rgba(255,255,255,0.08); display:flex; flex-direction:column; min-height:0; height:100%;">

          <!-- Header -->
          <div style="padding:0.85rem 1rem; border-bottom:1px solid rgba(255,255,255,0.08); display:flex; align-items:center; justify-content:space-between; gap:0.5rem;">
            <span style="font-weight:700; font-size:0.95rem;">💬 Messages</span>
            <div style="display:flex; gap:0.5rem;">
              ${isPlayer ? `
                <button class="btn btn-primary btn-small" onclick="SquadMessenger.openNewMessageModal()">+ New</button>
              ` : `
                <button class="btn btn-secondary btn-small" onclick="SquadMessenger.showMassMessage()" title="Broadcast to group">📢 Broadcast</button>
                <button class="btn btn-primary btn-small" onclick="SquadMessenger.openNewMessageModal()">+ New</button>
              `}
            </div>
          </div>

          <!-- Search -->
          <div style="padding:0.6rem 0.75rem;">
            <input type="text" id="sq-search" placeholder="Search conversations..." oninput="SquadMessenger.filterConversations(this.value)"
              style="width:100%; padding:0.45rem 0.75rem; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:8px; color:white; font-size:0.82rem; box-sizing:border-box;">
          </div>

          <!-- Tabs: Conversations | Contacts -->
          <div style="display:flex; border-bottom:1px solid rgba(255,255,255,0.07);">
            <button id="sq-tab-convos" onclick="SquadMessenger.switchTab('convos')"
              style="flex:1; padding:0.6rem; background:rgba(220,38,38,0.08); color:#f87171; border:none; border-bottom:2px solid var(--primary); font-size:0.8rem; font-weight:600; cursor:pointer;">Conversations</button>
            <button id="sq-tab-contacts" onclick="SquadMessenger.switchTab('contacts')"
              style="flex:1; padding:0.6rem; background:transparent; color:rgba(255,255,255,0.4); border:none; border-bottom:2px solid transparent; font-size:0.8rem; font-weight:600; cursor:pointer;">Contacts</button>
          </div>

          <!-- Conversation List -->
          <div id="sq-conversations" style="flex:1; overflow-y:auto; padding:0.4rem;">
            <div style="text-align:center; padding:2rem; color:rgba(255,255,255,0.35); font-size:0.82rem;">Loading conversations...</div>
          </div>

          <!-- Contacts List (hidden by default) -->
          <div id="sq-contacts" style="flex:1; overflow-y:auto; padding:0.4rem; display:none;">
            <div style="text-align:center; padding:2rem; color:rgba(255,255,255,0.35); font-size:0.82rem;">Loading contacts...</div>
          </div>
        </div>

        <!-- RIGHT: Chat Window -->
        <div class="sq-right" style="display:flex; flex-direction:column; background:rgba(255,255,255,0.015); min-height:0; height:100%;">

          <!-- Chat Header -->
          <div id="sq-chat-header" class="sq-chat-header" style="padding:1rem 1.25rem; border-bottom:1px solid rgba(255,255,255,0.07); display:flex; align-items:center; gap:0.75rem; min-height:68px;">
            <button id="sq-convo-toggle-btn" onclick="SquadMessenger.toggleMobileDrawer()" style="display:none; padding:0.55rem 0.9rem; border:none; border-radius:12px; background:rgba(255,255,255,0.08); color:white; font-size:0.82rem; cursor:pointer; white-space:nowrap;">Conversations</button>
            <div id="sq-chat-avatar" style="width:38px; height:38px; border-radius:50%; background:var(--primary); display:flex; align-items:center; justify-content:center; font-weight:700; font-size:0.95rem; flex-shrink:0; opacity:0.3;">?</div>
            <div style="flex:1; min-width:0;">
              <div id="sq-chat-name" style="font-weight:700; font-size:0.95rem; color:rgba(255,255,255,0.4);">Select a conversation</div>
              <div id="sq-chat-sub" style="font-size:0.73rem; color:rgba(255,255,255,0.3);">Choose someone from the panel on the left</div>
            </div>
          </div>

          <!-- Messages Area -->
          <div id="sq-messages" style="flex:1; overflow-y:auto; padding:1.25rem; display:flex; flex-direction:column; gap:0.65rem;">
            <div style="text-align:center; margin:auto; opacity:0.25;">
              <div style="font-size:3rem;">💬</div>
              <p style="font-size:0.82rem; margin-top:0.5rem;">Select a conversation</p>
            </div>
          </div>

          <!-- Input Bar -->
          <div class="sq-input-bar" style="padding:0.85rem 1.25rem; border-top:1px solid rgba(255,255,255,0.07); display:flex; gap:0.65rem; align-items:flex-end; background:rgba(0,0,0,0.15); position:relative; z-index:2;">
            <textarea id="sq-input" placeholder="Type a message... (Enter to send, Shift+Enter for newline)" rows="2"
              onkeydown="SquadMessenger.handleKey(event)"
              style="flex:1; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:14px; color:white; padding:0.85rem 1rem; font-size:0.9rem; resize:none; font-family:inherit; line-height:1.5; outline:none; min-height:48px;"></textarea>
            <button onclick="SquadMessenger.send()"
              style="height:48px; width:48px; border-radius:14px; background:var(--primary); border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; flex-shrink:0; transition:opacity 0.15s; box-shadow: 0 12px 28px rgba(220,38,38,0.28);"
              onmouseover="this.style.opacity=0.85" onmouseout="this.style.opacity=1">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </div>
        </div>
        <div class="sq-drawer-overlay" onclick="SquadMessenger.closeMobileDrawer()" style="display:none; position:absolute; inset:0; background:rgba(0,0,0,0.3); z-index:45; opacity:0; transition:opacity 0.2s ease; pointer-events:none;"></div>
      </div>

      <!-- New Message Modal -->
      <div id="sq-new-modal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.7); z-index:9999; align-items:center; justify-content:center;">
        <div style="background:#1a1a1f; border:1px solid rgba(255,255,255,0.1); border-radius:16px; padding:1.5rem; width:420px; max-width:90vw;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
            <span style="font-weight:700; font-size:1rem;">New Message</span>
            <button onclick="SquadMessenger.closeNewMessageModal()" style="background:none; border:none; color:rgba(255,255,255,0.5); font-size:1.4rem; cursor:pointer; line-height:1;">×</button>
          </div>
          <div id="sq-contact-picker" style="max-height:300px; overflow-y:auto; display:flex; flex-direction:column; gap:4px;">
            <div style="text-align:center; padding:1.5rem; opacity:0.4; font-size:0.85rem;">Loading contacts...</div>
          </div>
        </div>
      </div>

      <!-- Mass Message Modal -->
      <div id="sq-mass-modal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.7); z-index:9999; align-items:center; justify-content:center;">
        <div style="background:#1a1a1f; border:1px solid rgba(255,255,255,0.1); border-radius:16px; padding:1.5rem; width:480px; max-width:90vw;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
            <span style="font-weight:700; font-size:1rem;">📢 Broadcast Message</span>
            <button onclick="SquadMessenger.closeMassModal()" style="background:none; border:none; color:rgba(255,255,255,0.5); font-size:1.4rem; cursor:pointer; line-height:1;">×</button>
          </div>
          <p style="font-size:0.8rem; color:rgba(255,255,255,0.45); margin-bottom:1rem;">Send a message to multiple recipients at once.</p>
          <div id="sq-mass-recipients" style="max-height:200px; overflow-y:auto; display:flex; flex-direction:column; gap:4px; margin-bottom:1rem; border:1px solid rgba(255,255,255,0.07); border-radius:10px; padding:0.5rem;">
            <div style="text-align:center; padding:1rem; opacity:0.4; font-size:0.82rem;">Loading contacts...</div>
          </div>
          <textarea id="sq-mass-content" placeholder="Your broadcast message..." rows="4"
            style="width:100%; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:10px; color:white; padding:0.75rem; font-size:0.9rem; resize:none; font-family:inherit; box-sizing:border-box; margin-bottom:1rem;"></textarea>
          <div style="display:flex; gap:0.75rem; justify-content:flex-end;">
            <button onclick="SquadMessenger.closeMassModal()" class="btn btn-secondary">Cancel</button>
            <button onclick="SquadMessenger.sendMassMessage()" class="btn btn-primary">📢 Send to All Selected</button>
          </div>
        </div>
      </div>
    `;
    // Initialize queued message storage
    this._queuedMessage = null;

    // Mobile responsiveness: wire up the shared mobile-view handler
    try {
      window.addEventListener('resize', this._applyMobileView.bind(this));
      setTimeout(() => this._applyMobileView(), 50);
    } catch (e) { /* ignore */ }
    // Auto-load data so the messenger is ready immediately after mount
    setTimeout(() => { this.load().catch(() => {}); }, 16);
  },

  /** Load all data and render the initial view */
  async load() {
    // Ensure API context (current group/org) is populated so requests include org headers
    try { await apiService.refreshContext(); } catch (e) { /* ignore */ }
    await Promise.all([
      this._fetchMessages(),
      this._fetchContacts(),
    ]);
  },

  async _fetchMessages() {
    try {
      const data = await apiService.makeRequest('/messages');
      const raw = Array.isArray(data) ? data : [];
      // Normalize message shape to expected keys used by the renderer
      this.state.allMessages = raw.map(m => {
        const created = m.created_at || m.createdAt || m.timestamp || m.time || m.date || null;
        // Prefer numeric/id fields for sender/receiver; don't fall back to name strings
        const senderId = (typeof m.sender_id !== 'undefined' && m.sender_id !== null) ? m.sender_id : (typeof m.senderId !== 'undefined' ? m.senderId : null);
        const receiverId = (typeof m.receiver_id !== 'undefined' && m.receiver_id !== null) ? m.receiver_id : (typeof m.receiverId !== 'undefined' ? m.receiverId : null);
        const senderName = m.sender_name || m.sender || m.senderName || '';
        const receiverName = m.receiver_name || m.receiver || m.receiverName || '';
        // Normalize read flag: prefer explicit `read` or `is_read`, then derive from `unread` if present
        let readFlag = false;
        if (typeof m.read !== 'undefined') readFlag = !!m.read;
        else if (typeof m.is_read !== 'undefined') readFlag = !!m.is_read;
        else if (typeof m.unread !== 'undefined') readFlag = !m.unread;
        else readFlag = false;

        return {
          id: m.id || m.message_id || null,
          sender_id: senderId,
          receiver_id: receiverId,
          sender_name: senderName,
          receiver_name: receiverName,
          content: m.content || m.body || m.message || '',
          created_at: created,
          read: readFlag,
          type: m.type || m.message_type || 'direct'
        };
      });
      // Merge in any locally-stored optimistic messages so they survive reloads
      try {
        const stored = JSON.parse(localStorage.getItem('sq_local_messages') || '[]');
        if (Array.isArray(stored) && stored.length) {
          // append stored messages that don't already exist by a simple id/content check
          stored.forEach(s => {
            const exists = this.state.allMessages.some(m => (m.id && s.id && m.id == s.id) || (m.content == s.content && m.created_at == s.created_at));
            if (!exists) this.state.allMessages.push(s);
          });
        }
      } catch (e) {}
      this._renderConversations();
    } catch (err) {
      console.error('[SquadMessenger] Messages load error:', err);
      const el = document.getElementById('sq-conversations');
      if (el) el.innerHTML = '<div style="text-align:center;padding:2rem;color:#f87171;font-size:0.82rem;">Could not load messages.</div>';
    }
  },

  async _fetchContacts() {
    try {
      const currentUser = SquadMessenger._currentUser();
      const role = (currentUser.userType || currentUser.account_type || 'player').toString().toLowerCase();

      let contacts = [];

      // Admin: full access to members & staff
      if (role === 'admin' || role === 'organization' || role === 'owner') {
        try {
          const memRes = await apiService.makeRequest('/members');
          if (memRes) {
            const players = memRes.players || memRes.members || memRes.data || [];
            contacts = contacts.concat((Array.isArray(players) ? players : []).map(p => ({ ...p, _role: 'player' })));
            const staff = memRes.staff || memRes.coaches || memRes.admins || [];
            contacts = contacts.concat((Array.isArray(staff) ? staff : []).map(s => ({ ...s, _role: (s.role || s.userType || 'staff').toLowerCase() })));
          }
        } catch (e) {
          console.warn('[SquadMessenger] Admin contacts fetch failed, continuing:', e);
        }

      // Coach: only their squad players + group admins
      } else if (role === 'coach') {
        try {
          const squadRes = await apiService.makeRequest('/coach/squad');
          if (squadRes && Array.isArray(squadRes.players)) {
            contacts = contacts.concat(squadRes.players.map(p => ({ ...p, _role: 'player' })));
          }
        } catch (e) {
          console.warn('[SquadMessenger] Coach squad fetch failed:', e);
        }

        try {
          const adminRes = await apiService.makeRequest('/members?role=admin');
          const admins = adminRes?.admins || adminRes?.members || [];
          if (Array.isArray(admins)) contacts = contacts.concat(admins.map(a => ({ ...a, _role: 'admin' })));
        } catch (e) {
          console.warn('[SquadMessenger] Coach admin fetch failed:', e);
        }

      // Player: minimal contacts (only used for rendering existing threads) — fetch inbox only
      } else {
        try {
          const staffRes = await apiService.makeRequest('/members?role=coach');
          const coaches = staffRes?.coaches || staffRes?.members || [];
          if (Array.isArray(coaches)) contacts = contacts.concat(coaches.map(c => ({ ...c, _role: 'coach' })));
        } catch (e) {}
        try {
          const adminRes = await apiService.makeRequest('/members?role=admin');
          const admins = adminRes?.admins || adminRes?.members || [];
          if (Array.isArray(admins)) contacts = contacts.concat(admins.map(a => ({ ...a, _role: 'admin' })));
        } catch (e) {}
      }

      // Deduplicate by id, remove self
      const myId = currentUser.id;
      const seen = new Set();
      // Normalize contacts to stable shape before dedupe
      contacts = contacts.map(c => this._normalizeContact(c));
      this.state.allContacts = contacts.filter(c => {
        const id = c.id || c.user_id;
        if (!id || id == myId || seen.has(id)) return false;
        seen.add(id);
        return true;
      });

      this._renderContacts();
      this._renderContactPicker();
      this._renderMassRecipients();
    } catch (err) {
      console.error('[SquadMessenger] Contacts load error:', err);
    }
  },

  // ── RENDER: Conversation list (left panel, "Conversations" tab) ───────────
  _renderConversations() {
    const el = document.getElementById('sq-conversations');
    if (!el) return;
    const myId = SquadMessenger._currentUser().id;
    const msgs = this.state.allMessages;

    // Group by the other party
    const contactMap = {};
    msgs.forEach(msg => {
      const otherId   = msg.sender_id == myId ? msg.receiver_id : msg.sender_id;
      const otherName = msg.sender_id == myId ? (msg.receiver_name || 'Unknown') : (msg.sender_name || 'Unknown');
      const existing  = contactMap[otherId];
      if (!existing || new Date(msg.created_at) > new Date(existing.created_at)) {
        contactMap[otherId] = { ...msg, otherId, otherName };
      }
    });

    const convos = Object.values(contactMap).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    if (convos.length === 0) {
      el.innerHTML = '<div style="text-align:center;padding:2rem;color:rgba(255,255,255,0.3);font-size:0.82rem;">No conversations yet.<br>Start one using the Contacts tab.</div>';
      return;
    }

    el.innerHTML = convos.map(c => this._convItem(c, msgs)).join('');
  },

  _convItem(c, msgs) {
    const unread  = msgs.filter(m => m.sender_id == c.otherId && !m.read).length;
    const initial = (c.otherName || '?').charAt(0).toUpperCase();
    const preview = (c.content || '').substring(0, 42) + (c.content?.length > 42 ? '…' : '');
    const time    = c.created_at ? new Date(c.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '';
    const isActive = c.otherId == this.state.activeUserId;

    return `
      <div class="sq-conv-item" data-userid="${c.otherId}" data-name="${c.otherName.replace(/"/g,'&quot;')}"
        onclick="SquadMessenger.openConversation('${c.otherId}', '${c.otherName.replace(/'/g,"\\'")}', this)"
        style="display:flex; align-items:center; gap:0.75rem; padding:0.75rem 0.85rem; border-radius:14px; cursor:pointer; margin-bottom:0.35rem; transition:background 0.18s ease, transform 0.18s ease; background:${isActive ? 'rgba(220,38,38,0.16)' : 'rgba(255,255,255,0.01)'}; border:1px solid ${isActive ? 'rgba(220,38,38,0.28)' : 'rgba(255,255,255,0.04)'};">
        <div style="width:38px; height:38px; border-radius:50%; background:${isActive ? 'var(--primary)' : 'rgba(255,255,255,0.08)'}; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:0.9rem; flex-shrink:0;">${initial}</div>
        <div style="flex:1; min-width:0;">
          <div style="display:flex; justify-content:space-between; align-items:center; gap:6px;">
            <span style="font-weight:${unread > 0 ? 700 : 600}; font-size:0.92rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:140px;">${c.otherName}</span>
            <span style="font-size:0.68rem; color:rgba(255,255,255,0.35); flex-shrink:0;">${time}</span>
          </div>
          <div style="font-size:0.75rem; color:rgba(255,255,255,0.45); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${preview || 'No messages yet'}</div>
        </div>
        ${unread > 0 ? `<div style="width:20px;height:20px;border-radius:50%;background:var(--primary);display:flex;align-items:center;justify-content:center;font-size:0.66rem;font-weight:800;flex-shrink:0;">${unread}</div>` : ''}
      </div>`;
  },

  // ── RENDER: Contacts tab ─────────────────────────────────────────────────
  _renderContacts() {
    const el = document.getElementById('sq-contacts');
    if (!el) return;
    el.innerHTML = this._contactListHtml(this.state.allContacts, 'SquadMessenger.openConversation');
  },

  _contactListHtml(contacts, clickFn) {
    if (!contacts.length) return '<div style="text-align:center;padding:2rem;color:rgba(255,255,255,0.3);font-size:0.82rem;">No contacts found.</div>';

    const roleLabel = { admin: '🛡 Admin', coach: '👟 Coach', player: '⚽ Player' };
    return contacts.map(c => {
      const id   = c.id || c.user_id;
      const name = `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.name || 'Unknown';
      const init = name.charAt(0).toUpperCase();
      const role = roleLabel[c._role] || c._role || '';
      return `
        <div class="sq-contact-item" onclick="${clickFn}('${id}', '${name.replace(/'/g,"\\'")}', null)"
             style="display:flex; align-items:center; gap:0.75rem; padding:0.75rem 0.85rem; border-radius:14px; cursor:pointer; transition:background 0.18s ease; margin-bottom:0.35rem; background:rgba(255,255,255,0.01); border:1px solid rgba(255,255,255,0.04);"
             onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='rgba(255,255,255,0.01)'">
          <div style="width:36px; height:36px; border-radius:50%; background:rgba(255,255,255,0.08); display:flex; align-items:center; justify-content:center; font-weight:700; font-size:0.9rem; flex-shrink:0;">${init}</div>
          <div style="flex:1; min-width:0;">
            <div style="font-size:0.88rem; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${name}</div>
            <div style="font-size:0.73rem; color:rgba(255,255,255,0.42);">${role}</div>
          </div>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="2" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg>
        </div>`;
    }).join('');
  },

  // ── RENDER: Contact picker (new message modal) ───────────────────────────
  _renderContactPicker() {
    const el = document.getElementById('sq-contact-picker');
    if (!el) return;
    el.innerHTML = this._contactListHtml(this.state.allContacts, 'SquadMessenger._pickContact');
  },

  _pickContact(id, name) {
    // Close modal and set active conversation
    SquadMessenger.closeNewMessageModal();
    console.log('[SquadMessenger] _pickContact selection', { id, name });
    SquadMessenger.openConversation(id, name, null);
    // If a message was queued (typed before picking recipient), send it now
    if (this._queuedMessage) {
      const input = document.getElementById('sq-input');
      if (input) { input.value = this._queuedMessage; }
      this._queuedMessage = null;
      // Small delay to let UI render
      setTimeout(() => SquadMessenger.send(), 50);
    }
    // Switch back to conversations tab
    SquadMessenger.switchTab('convos');
  },

  // ── RENDER: Mass message recipient list ──────────────────────────────────
  _renderMassRecipients() {
    const el = document.getElementById('sq-mass-recipients');
    if (!el) return;
    if (!this.state.allContacts.length) {
      el.innerHTML = '<div style="text-align:center;padding:1rem;opacity:0.4;font-size:0.82rem;">No contacts found.</div>';
      return;
    }
    const roleLabel = { admin: '🛡', coach: '👟', player: '⚽' };
    el.innerHTML = this.state.allContacts.map(c => {
      const id   = c.id || c.user_id;
      const name = `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.name || 'Unknown';
      const role = roleLabel[c._role] || '';
      return `
        <label for="sq-mass-recipient-${id}" style="display:flex; align-items:center; gap:0.65rem; padding:0.5rem 0.4rem; cursor:pointer; border-radius:8px; transition:background 0.15s;"
               onmouseover="this.style.background='rgba(255,255,255,0.03)'" onmouseout="this.style.background='transparent'">
          <input id="sq-mass-recipient-${id}" name="sq-mass-recipient" type="checkbox" value="${id}" style="width:16px; height:16px; accent-color:var(--primary); flex-shrink:0;">
          <span style="font-size:0.83rem; font-weight:600; flex:1;">${role} ${name}</span>
        </label>`;
    }).join('');
  },

  // ── OPEN CONVERSATION ────────────────────────────────────────────────────
  async openConversation(userId, name, element) {
    this.state.activeUserId = userId;
    console.log('[SquadMessenger] openConversation called', { userId, name, contactsLoaded: (this.state.allContacts||[]).length });
    // Resolve name from contacts if not supplied. If contacts not loaded, fetch them.
    let resolvedName = name;
    if (!resolvedName) {
      if (!(this.state.allContacts && this.state.allContacts.length)) {
        try { await this._fetchContacts(); } catch (e) { /* ignore */ }
      }
      const contact = (this.state.allContacts || []).find(c => String(c.id || c.user_id) === String(userId));
      if (contact) resolvedName = (contact.first_name || contact.firstName || contact.name || `${contact.firstName || contact.first_name || ''} ${contact.lastName || contact.last_name || ''}`).trim();
    }
    this.state.activeName = resolvedName || name || '';
    if (window.innerWidth <= 991) this.state.drawerOpen = false;

    // Update chat header
    const avatar = document.getElementById('sq-chat-avatar');
    const chatName = document.getElementById('sq-chat-name');
    const chatSub  = document.getElementById('sq-chat-sub');
    if (avatar)   { avatar.textContent = (this.state.activeName || '?').charAt(0).toUpperCase(); avatar.style.opacity = '1'; }
    if (chatName) { chatName.textContent = (this.state.activeName || ''); chatName.style.color = this.state.activeName ? 'white' : 'rgba(255,255,255,0.4)'; }
    if (chatSub)  chatSub.textContent = `Active in squad — msgs:${(this.state.allMessages||[]).length} activeUser:${this.state.activeUserId || ''}`;

    // Mobile: add a back button to return to conversations list
    try {
      const header = document.getElementById('sq-chat-header');
      if (header) {
        let back = header.querySelector('.sq-back-btn');
        if (!back) {
          back = document.createElement('button');
          back.className = 'sq-back-btn';
          back.style.cssText = 'margin-right:8px;background:none;border:none;color:rgba(255,255,255,0.8);font-size:1.1rem;cursor:pointer;display:none;';
          back.textContent = '←';
          back.onclick = () => { SquadMessenger._closeThreadMobile(); };
          header.insertBefore(back, header.firstChild);
        }
        if (window.innerWidth <= 991) back.style.display = 'inline-flex'; else back.style.display = 'none';
      }
    } catch (e) {}

    // Highlight selection
    document.querySelectorAll('.sq-conv-item, .sq-contact-item').forEach(el => {
      el.style.background = 'transparent';
      el.style.border = '1px solid transparent';
    });
    if (element) {
      element.style.background = 'rgba(220,38,38,0.15)';
      element.style.border = '1px solid rgba(220,38,38,0.3)';
    }

    this._renderThread(userId);
    // Ensure mobile view updates to show thread when needed
    try { this._applyMobileView(); } catch (e) { /* ignore */ }

    // Mark messages as read
    const unread = this.state.allMessages.filter(m => m.sender_id == userId && !m.read);
    if (unread.length) {
      Promise.all(unread.map(m => apiService.makeRequest(`/messages/${m.id}/read`, { method: 'PATCH' }).catch(() => {})))
        .then(() => {
          this.state.allMessages = this.state.allMessages.map(m =>
            m.sender_id == userId ? { ...m, read: true } : m
          );
          this._renderConversations();
        });
    }

    // Start polling
    clearInterval(this.state.pollingTimer);
    this.state.pollingTimer = setInterval(() => this._poll(), 8000);
  },

  _renderThread(userId) {
    const area = document.getElementById('sq-messages');
    if (!area) return;
    const myId = SquadMessenger._currentUser().id;
    console.log('[SquadMessenger] _renderThread', { userId, myId, totalMessages: (this.state.allMessages||[]).length });

    const thread = this.state.allMessages
      .filter(m => (
        // regular messages where either side matches current user
        (m.sender_id == myId && m.receiver_id == userId) ||
        (m.sender_id == userId && m.receiver_id == myId) ||
        // local-only messages created by this client (no sender_id yet)
        (m.__local && String(m.receiver_id) === String(userId))
      ))
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    if (!thread.length) {
      area.innerHTML = `<div style="text-align:center;margin:auto;opacity:0.3;">
        <div style="font-size:2.5rem;">💬</div>
        <p style="font-size:0.8rem;margin-top:0.5rem;">No messages yet. Say hello!</p>
      </div>`;
      return;
    }
    console.log('[SquadMessenger] _renderThread rendering', { threadLength: thread.length });

    area.innerHTML = thread.map(msg => {
      const isMine = msg.sender_id == myId;
      const time   = new Date(msg.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      const senderInitial = (msg.sender_name || '?').charAt(0).toUpperCase();
      return `
        <div class="sq-message-row ${isMine ? 'sent' : 'received'}" style="display:flex; justify-content:${isMine ? 'flex-end' : 'flex-start'}; gap:0.65rem; align-items:flex-end;">
          ${!isMine ? `<div class="sq-message-avatar" style="width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:center;font-size:0.72rem;font-weight:700;flex-shrink:0;">${senderInitial}</div>` : ''}
          <div class="sq-chat-bubble ${isMine ? 'sent' : 'received'}" style="width:auto; min-width:0; max-width:74%; padding:0.85rem 1rem; border-radius:${isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px'}; background:${isMine ? 'linear-gradient(135deg, rgba(216, 61, 61, 0.95), rgba(221, 73, 73, 0.95))' : 'rgba(255,255,255,0.08)'}; color:${isMine ? '#fff' : '#f4f4f8'}; font-size:0.92rem; line-height:1.5; white-space:pre-wrap; word-break:break-word;">
            <div class="sq-chat-content" style="margin-bottom:0.45rem;">${msg.content}</div>
            <div class="sq-chat-time" style="font-size:0.68rem; color:rgba(255,255,255,0.55); text-align:${isMine ? 'right' : 'left'};">${time}</div>
          </div>
        </div>`;
    }).join('');

    area.scrollTop = area.scrollHeight;
  },

  // ── SEND MESSAGE ─────────────────────────────────────────────────────────
  async send() {
    const input   = document.getElementById('sq-input');
    const content = input?.value?.trim();
    if (!content) return;
    // If no conversation selected, open the New Message modal and queue the message
    if (!this.state.activeUserId) {
      // store queued message so it will be sent after recipient picked
      this._queuedMessage = content;
      if (typeof showNotification === 'function') showNotification('Choose a recipient to send this message', 'info');
      this.openNewMessageModal();
      return;
    }

    // Permission checks based on role
    const currentUser = SquadMessenger._currentUser();
    const role = (currentUser.userType || currentUser.account_type || 'player').toString().toLowerCase();
    const myId = currentUser.id;

    // Players: allow new conversations but only to contacts (coaches/admins)
    if (role === 'player') {
      const allowedIds = new Set((this.state.allContacts || []).map(c => (c.id || c.user_id).toString()));
      if (!allowedIds.has(String(this.state.activeUserId))) {
        if (typeof showNotification === 'function') showNotification('Players can only message coaches or admins', 'info');
        return;
      }
    }

    // Coaches can only message their squad players and group admins (contacts list already filtered, but double-check)
    if (role === 'coach') {
      const allowedIds = new Set((this.state.allContacts || []).map(c => (c.id || c.user_id).toString()));
      if (!allowedIds.has(String(this.state.activeUserId))) {
        if (typeof showNotification === 'function') showNotification('You are only allowed to message your squad or group admins', 'info');
        return;
      }
    }

    // Optimistically render the message locally before network round-trip
    const optimisticMsg = {
      id: null,
      sender_id: myId,
      receiver_id: this.state.activeUserId,
      sender_name: `${currentUser.firstName || currentUser.first_name || ''} ${currentUser.lastName || currentUser.last_name || ''}`.trim(),
      receiver_name: this.state.activeName,
      content: content,
      created_at: new Date().toISOString(),
      read: false,
      type: 'direct',
      __local: true
    };
    console.log('[SquadMessenger] send optimistic', { optimisticMsg });
    this.state.allMessages.push(optimisticMsg);
    // persist optimistic messages so they remain after reload
    try {
      const stored = JSON.parse(localStorage.getItem('sq_local_messages') || '[]');
      stored.push(optimisticMsg);
      localStorage.setItem('sq_local_messages', JSON.stringify(stored));
    } catch (e) {}
    input.value = '';
    this._renderThread(this.state.activeUserId);
    this._renderConversations();

    try {
      const result = await apiService.makeRequest('/messages', {
        method: 'POST',
        body: JSON.stringify({ receiverId: this.state.activeUserId, content }),
      });
      const payload = (result && result.data) ? result.data : result || {};
      // Update optimistic message with server-assigned id/timestamp if available
      optimisticMsg.id = payload.id || payload.messageId || optimisticMsg.id;
      optimisticMsg.created_at = payload.created_at || payload.createdAt || payload.timestamp || optimisticMsg.created_at;
      optimisticMsg.__local = false;
      this._renderThread(this.state.activeUserId);
      this._renderConversations();
    } catch (err) {
      console.error('[SquadMessenger] Send error:', err);
      optimisticMsg.__failed = true;
      // keep failed message in local storage
      try {
        const stored = JSON.parse(localStorage.getItem('sq_local_messages') || '[]');
        const idx = stored.findIndex(s => s.created_at === optimisticMsg.created_at && s.content === optimisticMsg.content);
        if (idx === -1) stored.push(optimisticMsg); else stored[idx] = optimisticMsg;
        localStorage.setItem('sq_local_messages', JSON.stringify(stored));
      } catch (e) {}
      if (typeof showNotification === 'function') showNotification('Failed to send message', 'error');
      this._renderThread(this.state.activeUserId);
      this._renderConversations();
    }
  },

  handleKey(event) {
    // Send on Enter (unless Shift is held for newline). Respect IME composition.
    if (event.key === 'Enter') {
      if (event.isComposing) return; // allow IME to compose
      if (event.shiftKey) return; // allow Shift+Enter to insert newline
      event.preventDefault();
      this.send();
    }
  },

  // ── SEND MASS MESSAGE ────────────────────────────────────────────────────
  async sendMassMessage() {
    const content   = document.getElementById('sq-mass-content')?.value?.trim();
    const checkboxes = document.querySelectorAll('#sq-mass-recipients input[type=checkbox]:checked');
    const recipientIds = Array.from(checkboxes).map(c => c.value);

    if (!content) { if (typeof showNotification === 'function') showNotification('Enter a message first', 'info'); return; }
    if (!recipientIds.length) { if (typeof showNotification === 'function') showNotification('Select at least one recipient', 'info'); return; }

    try {
      await Promise.all(recipientIds.map(id =>
        apiService.makeRequest('/messages', {
          method: 'POST',
          body: JSON.stringify({ receiverId: id, content }),
        }).catch(() => {})
      ));
      this.closeMassModal();
      if (typeof showNotification === 'function') showNotification(`Message sent to ${recipientIds.length} recipient(s)`, 'success');
      await this._fetchMessages();
    } catch (err) {
      console.error('[SquadMessenger] Mass send error:', err);
      if (typeof showNotification === 'function') showNotification('Some messages failed to send', 'error');
    }
  },

  // ── POLLING ──────────────────────────────────────────────────────────────
  async _poll() {
    try {
      const data = await apiService.makeRequest('/messages');
      if (!Array.isArray(data)) return;
      this.state.allMessages = data;
      this._renderConversations();
      if (this.state.activeUserId) this._renderThread(this.state.activeUserId);
    } catch (e) { /* silent */ }
  },

  // ── FILTER ───────────────────────────────────────────────────────────────
  filterConversations(query) {
    const q = query.toLowerCase();
    document.querySelectorAll('.sq-conv-item, .sq-contact-item').forEach(el => {
      const name = (el.dataset.name || '').toLowerCase();
      el.style.display = name.includes(q) ? 'flex' : 'none';
    });
  },

  // ── TAB SWITCHING ─────────────────────────────────────────────────────────
  switchTab(tab) {
    const convos   = document.getElementById('sq-conversations');
    const contacts = document.getElementById('sq-contacts');
    const tabConvos   = document.getElementById('sq-tab-convos');
    const tabContacts = document.getElementById('sq-tab-contacts');
    if (!convos || !contacts) return;

    if (tab === 'convos') {
      convos.style.display = 'block';
      contacts.style.display = 'none';
      if (tabConvos)   { tabConvos.style.color = '#f87171'; tabConvos.style.borderBottomColor = 'var(--primary)'; tabConvos.style.background = 'rgba(220,38,38,0.08)'; }
      if (tabContacts) { tabContacts.style.color = 'rgba(255,255,255,0.4)'; tabContacts.style.borderBottomColor = 'transparent'; tabContacts.style.background = 'transparent'; }
    } else {
      convos.style.display = 'none';
      contacts.style.display = 'block';
      if (tabContacts) { tabContacts.style.color = '#f87171'; tabContacts.style.borderBottomColor = 'var(--primary)'; tabContacts.style.background = 'rgba(220,38,38,0.08)'; }
      if (tabConvos)   { tabConvos.style.color = 'rgba(255,255,255,0.4)'; tabConvos.style.borderBottomColor = 'transparent'; tabConvos.style.background = 'transparent'; }
    }
  },

  // ── MODALS ───────────────────────────────────────────────────────────────
  async openNewMessageModal() {
    // Ensure contacts are loaded when opening the New Message modal so programmatic
    // flows (tests, quick selects) can access `state.allContacts` immediately.
    try { await this._fetchContacts(); } catch (e) { /* ignore */ }
    const modal = document.getElementById('sq-new-modal');
    if (modal) modal.style.display = 'flex';
  },
  closeNewMessageModal() {
    const modal = document.getElementById('sq-new-modal');
    if (modal) modal.style.display = 'none';
  },
  async showMassMessage() {
    // Ensure contacts are loaded and recipient list is rendered before showing modal
    try { await this._fetchContacts(); } catch (e) { /* ignore */ }
    // Re-render recipients to ensure checkboxes exist
    try { this._renderMassRecipients(); } catch (e) { /* ignore */ }
    const modal = document.getElementById('sq-mass-modal');
    if (modal) modal.style.display = 'flex';
  },
  closeMassModal() {
    const modal = document.getElementById('sq-mass-modal');
    if (modal) modal.style.display = 'none';
    const content = document.getElementById('sq-mass-content');
    if (content) content.value = '';
    // Uncheck all
    document.querySelectorAll('#sq-mass-recipients input[type=checkbox]').forEach(c => c.checked = false);
  },

  // ── HELPERS ──────────────────────────────────────────────────────────────
  _currentUser() {
    try {
      const raw = JSON.parse(localStorage.getItem('currentUser') || '{}');
      // Normalize shape
      const user = {
        id: raw.id || raw.user_id || raw.userId || null,
        firstName: raw.first_name || raw.firstName || raw.firstName || raw.firstName || raw.first || '',
        lastName: raw.last_name || raw.lastName || raw.lastName || raw.last || '',
        account_type: raw.account_type || raw.accountType || raw.userType || raw.role || null,
        userType: raw.userType || raw.account_type || raw.accountType || raw.role || null,
        email: raw.email || raw.user_email || null,
      };
      // If user appears to be admin by account_type, do not treat activePlayerId as role switch
      const activePlayerId = localStorage.getItem('activePlayerId');
      if (activePlayerId && (user.account_type && ['organization', 'admin', 'owner'].includes(user.account_type))) {
        // preserve admin account type
        return user;
      }
      // If no explicit role, but activePlayerId exists, expose it
      if (!user.account_type && activePlayerId) user.account_type = 'player';
      return user;
    } catch (e) { return {}; }
  },

  _normalizeContact(c) {
    if (!c) return c;
    const id = c.id || c.user_id || c.userId || c.memberId || null;
    const name = (c.first_name || c.firstName || c.name || '').trim();
    const [first_name, ...rest] = name ? name.split(' ') : [''];
    const last_name = rest.join(' ');
    const role = (c._role || c.role || c.userType || c.type || '').toString().toLowerCase();
    return {
      ...c,
      id,
      user_id: id,
      first_name: first_name || (c.first_name || ''),
      last_name: last_name || (c.last_name || ''),
      _role: role || (c._role || ''),
    };
  },

  _closeThreadMobile() {
    // Close active thread on mobile and show conversations list
    this.state.activeUserId = null;
    this.state.activeName = null;
    this.state.drawerOpen = false;
    this._renderConversations();
    this._applyMobileView();
  },

  toggleMobileDrawer() {
    this.state.drawerOpen = !this.state.drawerOpen;
    this._applyMobileView();
  },

  openMobileDrawer() {
    this.state.drawerOpen = true;
    this._applyMobileView();
  },

  closeMobileDrawer() {
    this.state.drawerOpen = false;
    this._applyMobileView();
  },

  stopPolling() {
    clearInterval(this.state.pollingTimer);
  },

  // Apply mobile view rules (exposed so other methods can trigger it)
  _applyMobileView() {
    try {
      const containerId = this.state.containerId;
      if (!containerId) return;
      const root = document.querySelector(`#${containerId} .sq-messenger`);
      if (!root) return;
      const left = root.querySelector('.sq-left');
      const right = root.querySelector('.sq-right');
      const isMobile = window.innerWidth <= 991;
      if (isMobile) {
        root.classList.add('sq-mobile');
        root.style.gridTemplateColumns = '1fr';
        root.style.height = 'auto';
        const overlay = root.querySelector('.sq-drawer-overlay');
        const drawerButton = root.querySelector('#sq-convo-toggle-btn');
        if (drawerButton) drawerButton.style.display = this.state.activeUserId ? 'inline-flex' : 'none';
        if (right) {
          right.style.position = 'relative';
          right.style.zIndex = '1';
          right.style.width = '100%';
          right.style.maxWidth = '100%';
          right.style.height = 'auto';
        }
        if (left) {
          left.style.top = '0';
          left.style.left = '0';
          left.style.height = this.state.activeUserId ? '100%' : 'auto';
          left.style.zIndex = '50';
          if (this.state.activeUserId) {
            left.style.position = 'absolute';
            left.style.width = 'min(320px, 92vw)';
            left.style.maxWidth = '320px';
            left.style.boxShadow = '18px 0 48px rgba(0,0,0,0.45)';
            left.style.background = 'rgba(8,8,10,0.95)';
          } else {
            left.style.position = 'relative';
            left.style.width = '100%';
            left.style.maxWidth = '100%';
            left.style.boxShadow = 'none';
            left.style.background = 'rgba(8,8,10,0.92)';
          }
        }

        if (this.state.activeUserId) {
          if (right) right.style.display = 'flex';
          if (left) {
            left.style.display = this.state.drawerOpen ? 'flex' : 'none';
            left.classList.toggle('drawer-open', this.state.drawerOpen);
          }
          if (overlay) {
            overlay.style.display = this.state.drawerOpen ? 'block' : 'none';
            overlay.style.pointerEvents = this.state.drawerOpen ? 'auto' : 'none';
            overlay.style.opacity = this.state.drawerOpen ? '1' : '0';
          }
        } else {
          if (left) {
            left.style.display = 'flex';
            left.classList.add('drawer-open');
          }
          if (right) right.style.display = 'none';
          if (overlay) {
            overlay.style.display = 'none';
            overlay.style.pointerEvents = 'none';
            overlay.style.opacity = '0';
          }
        }
      } else {
        root.classList.remove('sq-mobile');
        root.style.gridTemplateColumns = 'minmax(280px,320px) 1fr';
        if (left) {
          left.style.display = 'flex';
          left.classList.remove('drawer-open');
          left.style.position = 'static';
          left.style.width = 'auto';
          left.style.maxWidth = 'none';
          left.style.height = '100%';
          left.style.boxShadow = 'none';
          left.style.background = 'rgba(8,8,10,0.92)';
        }
        if (right) right.style.display = 'flex';
        const overlay = root.querySelector('.sq-drawer-overlay');
        if (overlay) {
          overlay.style.display = 'none';
          overlay.style.pointerEvents = 'none';
          overlay.style.opacity = '0';
        }
        const drawerButton = root.querySelector('#sq-convo-toggle-btn');
        if (drawerButton) drawerButton.style.display = 'none';
      }
      // Ensure input visibility
      const input = root.querySelector('#sq-input');
      if (input) input.style.display = 'block';
    } catch (e) { /* ignore */ }
  },

  /**
   * Create a new conversation by sending an initial message to the first participant.
   * This is a convenience wrapper around the messages API so callers can treat
   * conversations as an atomic create + open operation.
   * @param {Array<string>} participants - array of user ids
   * @param {string} initialMessage - initial message text
   */
  async createConversation(participants = [], initialMessage = '') {
    if (!Array.isArray(participants) || !participants.length) throw new Error('participants required');
    const receiverId = participants[0];
    const payload = { receiverId, content: initialMessage };
    try {
      const res = await apiService.sendMessage(payload);
      // If successful, refresh messages and open thread
      await this._fetchMessages();
      this.openConversation(receiverId, null, null);
      return res;
    } catch (err) {
      console.error('[SquadMessenger] createConversation error', err);
      throw err;
    }
  },
};

// Expose globally
window.SquadMessenger = SquadMessenger;

// Stop polling when tab is hidden
document.addEventListener('visibilitychange', () => {
  if (document.hidden) SquadMessenger.stopPolling();
});
