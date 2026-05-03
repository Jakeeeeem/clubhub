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
      <div class="sq-messenger" style="display:grid; grid-template-columns:300px 1fr; gap:0; height:calc(100vh - 180px); border-radius:16px; overflow:hidden; border:1px solid rgba(255,255,255,0.07);">

        <!-- LEFT: Contacts / Conversation List -->
        <div class="sq-left" style="background:rgba(0,0,0,0.3); border-right:1px solid rgba(255,255,255,0.07); display:flex; flex-direction:column;">

          <!-- Header -->
          <div style="padding:1rem 1.25rem; border-bottom:1px solid rgba(255,255,255,0.07); display:flex; align-items:center; justify-content:space-between; gap:0.5rem;">
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
        <div class="sq-right" style="display:flex; flex-direction:column; background:rgba(255,255,255,0.015);">

          <!-- Chat Header -->
          <div id="sq-chat-header" style="padding:1rem 1.5rem; border-bottom:1px solid rgba(255,255,255,0.07); display:flex; align-items:center; gap:1rem; min-height:68px;">
            <div id="sq-chat-avatar" style="width:38px; height:38px; border-radius:50%; background:var(--primary); display:flex; align-items:center; justify-content:center; font-weight:700; font-size:0.95rem; flex-shrink:0; opacity:0.3;">?</div>
            <div style="flex:1;">
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
          <div style="padding:0.85rem 1.25rem; border-top:1px solid rgba(255,255,255,0.07); display:flex; gap:0.65rem; align-items:flex-end; background:rgba(0,0,0,0.15);">
            <textarea id="sq-input" placeholder="Type a message... (Ctrl+Enter to send)" rows="2"
              onkeydown="SquadMessenger.handleKey(event)"
              style="flex:1; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:12px; color:white; padding:0.7rem 1rem; font-size:0.88rem; resize:none; font-family:inherit; line-height:1.5; outline:none;"></textarea>
            <button onclick="SquadMessenger.send()"
              style="height:46px; width:46px; border-radius:12px; background:var(--primary); border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; flex-shrink:0; transition:opacity 0.15s;"
              onmouseover="this.style.opacity=0.85" onmouseout="this.style.opacity=1">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </div>
        </div>
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

    // Auto-load data so the messenger is ready immediately after mount
    setTimeout(() => { this.load().catch(() => {}); }, 16);
  },

  /** Load all data and render the initial view */
  async load() {
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
        const senderName = m.sender_name || m.sender || m.senderName || ((m.senderId || m.sender_id) ? '' : '');
        const receiverName = m.receiver_name || m.receiver || m.receiverName || '';
        const unreadFlag = typeof m.unread !== 'undefined' ? !!m.unread : (typeof m.is_read !== 'undefined' ? !m.is_read : !!m.read);
        return {
          id: m.id || m.message_id || null,
          sender_id: m.sender_id || m.senderId || m.senderId || m.sender || null,
          receiver_id: m.receiver_id || m.receiverId || m.receiverId || m.receiver || null,
          sender_name: senderName,
          receiver_name: receiverName,
          content: m.content || m.body || m.message || '',
          created_at: created,
          read: !unreadFlag,
          type: m.type || m.message_type || 'direct'
        };
      });
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
        style="display:flex; align-items:center; gap:0.65rem; padding:0.65rem 0.75rem; border-radius:10px; cursor:pointer; margin-bottom:2px; transition:background 0.15s;
               background:${isActive ? 'rgba(220,38,38,0.15)' : 'transparent'}; border:1px solid ${isActive ? 'rgba(220,38,38,0.3)' : 'transparent'};">
        <div style="width:34px; height:34px; border-radius:50%; background:${isActive ? 'var(--primary)' : 'rgba(255,255,255,0.1)'}; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:0.82rem; flex-shrink:0;">${initial}</div>
        <div style="flex:1; min-width:0;">
          <div style="display:flex; justify-content:space-between; align-items:center; gap:4px;">
            <span style="font-weight:${unread > 0 ? 700 : 500}; font-size:0.855rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:130px;">${c.otherName}</span>
            <span style="font-size:0.65rem; color:rgba(255,255,255,0.3); flex-shrink:0;">${time}</span>
          </div>
          <div style="font-size:0.73rem; color:rgba(255,255,255,0.4); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${preview || 'No messages yet'}</div>
        </div>
        ${unread > 0 ? `<div style="width:18px;height:18px;border-radius:50%;background:var(--primary);display:flex;align-items:center;justify-content:center;font-size:0.62rem;font-weight:800;flex-shrink:0;">${unread}</div>` : ''}
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
        <div onclick="${clickFn}('${id}', '${name.replace(/'/g,"\\'")}', null)"
             style="display:flex; align-items:center; gap:0.65rem; padding:0.6rem 0.75rem; border-radius:10px; cursor:pointer; transition:background 0.15s; margin-bottom:2px;"
             onmouseover="this.style.background='rgba(255,255,255,0.04)'" onmouseout="this.style.background='transparent'">
          <div style="width:32px; height:32px; border-radius:50%; background:rgba(255,255,255,0.08); display:flex; align-items:center; justify-content:center; font-weight:700; font-size:0.8rem; flex-shrink:0;">${init}</div>
          <div style="flex:1; min-width:0;">
            <div style="font-size:0.85rem; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${name}</div>
            <div style="font-size:0.7rem; color:rgba(255,255,255,0.35);">${role}</div>
          </div>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="2" stroke-linecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
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
        <label style="display:flex; align-items:center; gap:0.65rem; padding:0.5rem 0.4rem; cursor:pointer; border-radius:8px; transition:background 0.15s;"
               onmouseover="this.style.background='rgba(255,255,255,0.03)'" onmouseout="this.style.background='transparent'">
          <input type="checkbox" value="${id}" style="width:16px; height:16px; accent-color:var(--primary); flex-shrink:0;">
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

    // Update chat header
    const avatar = document.getElementById('sq-chat-avatar');
    const chatName = document.getElementById('sq-chat-name');
    const chatSub  = document.getElementById('sq-chat-sub');
    if (avatar)   { avatar.textContent = (this.state.activeName || '?').charAt(0).toUpperCase(); avatar.style.opacity = '1'; }
    if (chatName) { chatName.textContent = (this.state.activeName || ''); chatName.style.color = this.state.activeName ? 'white' : 'rgba(255,255,255,0.4)'; }
    if (chatSub)  chatSub.textContent = `Active in squad — msgs:${(this.state.allMessages||[]).length} activeUser:${this.state.activeUserId || ''}`;

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

    area.innerHTML = thread.map(msg => {
      const isMine = msg.sender_id == myId;
      const time   = new Date(msg.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      return `
        <div style="display:flex; justify-content:${isMine ? 'flex-end' : 'flex-start'}; align-items:flex-end; gap:0.5rem;">
          ${!isMine ? `<div style="width:26px;height:26px;border-radius:50%;background:rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:center;font-size:0.66rem;font-weight:700;flex-shrink:0;">${(msg.sender_name||'?').charAt(0)}</div>` : ''}
          <div style="max-width:68%; padding:0.6rem 0.95rem; border-radius:${isMine ? '14px 14px 3px 14px' : '14px 14px 14px 3px'};
                      background:${isMine ? 'var(--primary)' : 'rgba(255,255,255,0.07)'}; color:white; font-size:0.875rem; line-height:1.5;">
            <div>${msg.content}</div>
            <div style="font-size:0.62rem; color:rgba(255,255,255,0.45); margin-top:3px; text-align:right;">${time}</div>
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

    try {
      const result = await apiService.makeRequest('/messages', {
        method: 'POST',
        body: JSON.stringify({ receiverId: this.state.activeUserId, content }),
      });
      input.value = '';
      const payload = (result && result.data) ? result.data : result || {};
      const created = payload.created_at || payload.createdAt || payload.timestamp || new Date().toISOString();
      const sentMsg = {
        id: payload.id || payload.messageId || null,
        sender_id: (typeof myId !== 'undefined' && myId !== null) ? myId : (payload.sender_id || payload.senderId || null),
        receiver_id: payload.receiver_id || payload.receiverId || this.state.activeUserId,
        sender_name: payload.sender_name || payload.sender || `${currentUser.firstName || currentUser.first_name || ''} ${currentUser.lastName || currentUser.last_name || ''}`.trim(),
        receiver_name: payload.receiver_name || payload.receiver || this.state.activeName,
        content: content || payload.content || payload.message,
        created_at: created,
        read: false,
        type: payload.type || 'direct'
      };
      // mark as local so it appears immediately in the UI even if backend data hasn't caught up
      sentMsg.__local = true;
      this.state.allMessages.push(sentMsg);
      this._renderThread(this.state.activeUserId);
      this._renderConversations();
    } catch (err) {
      console.error('[SquadMessenger] Send error:', err);
      if (typeof showNotification === 'function') showNotification('Failed to send message', 'error');
    }
  },

  handleKey(event) {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
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
  showMassMessage() {
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
    try { return JSON.parse(localStorage.getItem('currentUser') || '{}'); } catch (e) { return {}; }
  },

  stopPolling() {
    clearInterval(this.state.pollingTimer);
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
