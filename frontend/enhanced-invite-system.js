let InviteSystemState = {
  currentUser: null,
  currentClub: null,
  activeInvites: [],
  sentInvites: [],
  isInitialized: false,
};

// Initialize the invite system
document.addEventListener("DOMContentLoaded", function () {
  console.log("📧 Initializing Enhanced Invite System...");
  setTimeout(initializeInviteSystem, 500);
});

function initializeInviteSystem() {
  InviteSystemState.currentUser =
    AppState?.currentUser ||
    JSON.parse(localStorage.getItem("currentUser") || "null");
  InviteSystemState.currentClub = AppState?.clubs?.[0] || null;
  InviteSystemState.isInitialized = true;

  // Check if user is on invite page
  if (window.location.pathname.includes("invite.html")) {
    handleInvitePage();
  }

  console.log("✅ Enhanced Invite System initialized");
}

// =========================== EMAIL INVITE FUNCTIONS ===========================

async function enhancedInvitePlayer() {
  // Check if user has a club
  if (
    !InviteSystemState.currentClub &&
    (!AppState.clubs || AppState.clubs.length === 0)
  ) {
    showNotification(
      "Please create a club profile first before sending invites",
      "error",
    );
    return;
  }

  const modal = document.createElement("div");
  modal.className = "modal";
  modal.style.display = "block";
  modal.id = "enhancedInviteModal";

  modal.innerHTML = `
      <div class="modal-content" style="max-width: 650px; border-radius: 16px; overflow: hidden; padding: 0; border: 1px solid var(--border-color);">
          <div class="modal-header" style="background: var(--surface-card); padding: 1.5rem 2rem; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
               <div>
                  <h2 style="margin: 0; font-size: 1.5rem; color: var(--text-main);">Invite Players</h2>
                  <p style="margin: 4px 0 0 0; color: var(--text-muted); font-size: 0.9rem;">Add new members to <strong>${InviteSystemState.currentClub?.name || AppState.clubs?.[0]?.name || "Your Club"}</strong></p>
               </div>
               <button class="close" onclick="closeModal('enhancedInviteModal')" style="background: var(--surface-hover); width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: none; cursor: pointer; color: var(--text-muted);">&times;</button>
          </div>
          
          <div class="modal-body" style="padding: 2rem;">
              
              <!-- Invite Type Selection -->
              <div id="inviteTypeSelection">
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 2rem;">
                      <div class="selection-card" style="padding: 2rem; background: var(--surface-hover); border: 1px solid var(--border-color); border-radius: 12px; text-align: center; cursor: pointer; transition: all 0.2s;" 
                           onclick="showEmailInviteForm()" 
                           onmouseover="this.style.borderColor='var(--primary)'; this.style.background='var(--primary-light-10)'" 
                           onmouseout="this.style.borderColor='var(--border-color)'; this.style.background='var(--surface-hover)'">
                          <div style="width: 48px; height: 48px; background: rgba(59, 130, 246, 0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem auto;">
                              <span style="font-size: 1.5rem;">📧</span>
                          </div>
                          <h3 style="color: var(--text-main); margin: 0 0 0.5rem 0; font-size: 1.1rem;">Email Invite</h3>
                          <p style="margin-bottom: 0; color: var(--text-secondary); font-size: 0.9rem;">Send a direct invitation to a specific email address.</p>
                      </div>
                      
                      <div class="selection-card" style="padding: 2rem; background: var(--surface-hover); border: 1px solid var(--border-color); border-radius: 12px; text-align: center; cursor: pointer; transition: all 0.2s;" 
                           onclick="generateShareableInviteLink()"
                           onmouseover="this.style.borderColor='var(--success)'; this.style.background='var(--success-light-10)'" 
                           onmouseout="this.style.borderColor='var(--border-color)'; this.style.background='var(--surface-hover)'">
                           <div style="width: 48px; height: 48px; background: rgba(16, 185, 129, 0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem auto;">
                              <span style="font-size: 1.5rem;">🔗</span>
                          </div>
                          <h3 style="color: var(--text-main); margin: 0 0 0.5rem 0; font-size: 1.1rem;">Shareable Link</h3>
                          <p style="margin-bottom: 0; color: var(--text-secondary); font-size: 0.9rem;">Generate a specialized link to share via WhatsApp or Social.</p>
                      </div>
                  </div>
              </div>
              
              <!-- Enhanced Email Invite Form -->
              <div id="emailInviteForm" style="display: none;">
                  <div style="margin-bottom: 2rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border-color); display: flex; gap: 1rem; align-items: center;">
                       <button onclick="hideEmailInviteForm()" style="background: none; border: none; cursor: pointer; font-size: 1.2rem; color: var(--text-muted); display: flex; align-items: center;">←</button>
                       <h3 style="margin: 0; color: var(--text-main); font-size: 1.25rem;">Send Email Invitation</h3>
                  </div>

                  <form id="emailInviteFormElement">
                      <div class="form-group" style="margin-bottom: 1.5rem;">
                          <label for="inviteEmail" style="display: block; color: var(--text-muted); font-size: 0.9rem; margin-bottom: 0.5rem;">Email Address *</label>
                          <input type="email" id="inviteEmail" required placeholder="player@example.com" style="width: 100%; padding: 0.875rem; background: var(--background-base); border: 1px solid var(--border-color); border-radius: 8px; color: var(--text-main); font-size: 1rem;">
                      </div>
                      
                      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
                          <div class="form-group">
                              <label for="inviteFirstName" style="display: block; color: var(--text-muted); font-size: 0.9rem; margin-bottom: 0.5rem;">First Name *</label>
                              <input type="text" id="inviteFirstName" required placeholder="John" style="width: 100%; padding: 0.875rem; background: var(--background-base); border: 1px solid var(--border-color); border-radius: 8px; color: var(--text-main); font-size: 1rem;">
                          </div>
                          <div class="form-group">
                              <label for="inviteLastName" style="display: block; color: var(--text-muted); font-size: 0.9rem; margin-bottom: 0.5rem;">Last Name *</label>
                              <input type="text" id="inviteLastName" required placeholder="Smith" style="width: 100%; padding: 0.875rem; background: var(--background-base); border: 1px solid var(--border-color); border-radius: 8px; color: var(--text-main); font-size: 1rem;">
                          </div>
                      </div>
                      
                      <div class="form-group" style="margin-bottom: 1.5rem;">
                          <label for="inviteDateOfBirth" style="display: block; color: var(--text-muted); font-size: 0.9rem; margin-bottom: 0.5rem;">Date of Birth *</label>
                          <input type="date" id="inviteDateOfBirth" required 
                                 max="2010-12-31" min="1950-01-01"
                                 style="width: 100%; padding: 0.875rem; background: var(--background-base); border: 1px solid var(--border-color); border-radius: 8px; color: var(--text-main); font-family: sans-serif;"> <!-- Font fix for input type date -->
                      </div>
                      
                      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
                          <div class="form-group">
                              <label for="inviteRole" style="display: block; color: var(--text-muted); font-size: 0.9rem; margin-bottom: 0.5rem;">Role</label>
                              <select id="inviteRole" style="width: 100%; padding: 0.875rem; background: var(--background-base); border: 1px solid var(--border-color); border-radius: 8px; color: var(--text-main); font-size: 1rem;">
                                  <option value="player">Player</option>
                                  <option value="coach">Coach</option>
                                  <option value="staff">Staff</option>
                              </select>
                          </div>
                          <div class="form-group">
                              <label for="inviteTeam" style="display: block; color: var(--text-muted); font-size: 0.9rem; margin-bottom: 0.5rem;">Assign to Team (optional)</label>
                              <select id="inviteTeam" style="width: 100%; padding: 0.875rem; background: var(--background-base); border: 1px solid var(--border-color); border-radius: 8px; color: var(--text-main); font-size: 1rem;">
                                  <option value="">No team assignment</option>
                              </select>
                          </div>
                      </div>

                      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
                          <div class="form-group">
                              <label for="invitePaymentPlan" style="display: block; color: var(--text-muted); font-size: 0.9rem; margin-bottom: 0.5rem;">Payment Plan (optional)</label>
                              <select id="invitePaymentPlan" style="width: 100%; padding: 0.875rem; background: var(--background-base); border: 1px solid var(--border-color); border-radius: 8px; color: var(--text-main); font-size: 1rem;">
                                  <option value="">No payment plan / Skip</option>
                                  ${(AppState.paymentPlans || [])
                                    .map(
                                      (plan) => `
                                      <option value="${plan.id}">${plan.name} - £${Number(plan.price || 0).toFixed(2)}</option>
                                  `,
                                    )
                                    .join("")}
                              </select>
                          </div>
                          <div class="form-group">
                              <label for="invitePlanPrice" style="display: block; color: var(--text-muted); font-size: 0.9rem; margin-bottom: 0.5rem;">Custom Price (optional)</label>
                              <input type="number" id="invitePlanPrice" step="0.01" min="0" placeholder="Select a plan first" disabled
                                     style="width: 100%; padding: 0.875rem; background: var(--background-base); border: 1px solid var(--border-color); border-radius: 8px; color: var(--text-main); font-size: 1rem;">
                          </div>
                      </div>
                      
                      <div class="form-group" style="margin-bottom: 2rem;">
                          <label for="inviteMessage" style="display: block; color: var(--text-muted); font-size: 0.9rem; margin-bottom: 0.5rem;">Personal Message</label>
                          <textarea id="inviteMessage" rows="3" placeholder="Welcome to our club! We'd love to have you join our team..." style="width: 100%; padding: 0.875rem; background: var(--background-base); border: 1px solid var(--border-color); border-radius: 8px; color: var(--text-main); font-size: 1rem; resize: vertical;"></textarea>
                      </div>
                      
                      <div style="display: flex; gap: 1rem; border-top: 1px solid var(--border-color); padding-top: 1.5rem;">
                          <button type="submit" class="btn btn-primary" style="flex: 1; justify-content: center;">Send Invitation</button>
                          <button type="button" class="btn btn-secondary" onclick="hideEmailInviteForm()">Cancel</button>
                      </div>
                  </form>
              </div>
          </div>
      </div>
  `;

  document.body.appendChild(modal);

  // Add form submission handler
  const formElement = document.getElementById("emailInviteFormElement");
  formElement.addEventListener("submit", handleEmailInviteSubmission);

  // Add plan sync logic
  const planSelect = document.getElementById("invitePaymentPlan");
  const priceInput = document.getElementById("invitePlanPrice");
  if (planSelect && priceInput) {
    planSelect.addEventListener("change", function () {
      const hasPlan = !!this.value;
      priceInput.disabled = !hasPlan;
      if (!hasPlan) {
        priceInput.value = "";
        priceInput.placeholder = "Select a plan first";
      } else {
        priceInput.placeholder = "Leave blank to use plan default";
      }
    });
  }
}

function showEmailInviteForm() {
  document.getElementById("inviteTypeSelection").style.display = "none";
  document.getElementById("emailInviteForm").style.display = "block";
}

function hideEmailInviteForm() {
  document.getElementById("emailInviteForm").style.display = "none";
  document.getElementById("inviteTypeSelection").style.display = "block";
  document.getElementById("emailInviteFormElement").reset();
}

async function handleEmailInviteSubmission(e) {
  e.preventDefault();

  try {
    showLoading(true);

    const inviteData = {
      email: document.getElementById("inviteEmail").value,
      firstName: document.getElementById("inviteFirstName").value,
      lastName: document.getElementById("inviteLastName").value,
      dateOfBirth: document.getElementById("inviteDateOfBirth").value, // 🔥 NEW
      clubRole: document.getElementById("inviteRole").value,
      teamId: document.getElementById("inviteTeam").value || null, // 🔥 NEW
      message: document.getElementById("inviteMessage").value,
      clubId: InviteSystemState.currentClub?.id || AppState.clubs?.[0]?.id,
      isPublic: false,
      sendEmail: true,
      paymentPlanId: document.getElementById("invitePaymentPlan").value || null,
      planPrice: document.getElementById("invitePlanPrice").value
        ? Number(document.getElementById("invitePlanPrice").value)
        : null,
    };

    console.log("📧 Sending enhanced email invite:", inviteData);

    const response = await apiService.generateClubInvite(inviteData);

    closeModal("enhancedInviteModal");
    showInviteSentModal(
      response.inviteLink,
      inviteData.email,
      response.emailSent,
    );
    showNotification("Email invite sent successfully!", "success");

    // Track sent invite
    InviteSystemState.sentInvites.push({
      ...response,
      sentAt: new Date().toISOString(),
      email: inviteData.email,
    });
  } catch (error) {
    console.error("❌ Failed to send email invite:", error);
    showNotification("Failed to send invite: " + error.message, "error");
  } finally {
    showLoading(false);
  }
}

// =========================== SHAREABLE LINK FUNCTIONS ===========================

async function generateShareableInviteLink() {
  try {
    showLoading(true);

    const currentClub = InviteSystemState.currentClub || AppState?.clubs?.[0];
    console.log("🏢 Current club:", currentClub);

    if (!currentClub) {
      showNotification("Please create a club profile first", "error");
      return;
    }

    const inviteData = {
      isPublic: true,
      clubRole: "player",
      message: `Join ${currentClub.name} - a great sports club!`,
    };

    console.log("📧 Sending invite data:", inviteData);

    const response = await apiService.generateClubInvite(inviteData);

    closeModal("enhancedInviteModal");
    showShareableInviteLinkModal(response.inviteLink, currentClub.name);
    showNotification(
      "Shareable invite link generated successfully!",
      "success",
    );
  } catch (error) {
    console.error("❌ Full error object:", error);

    // Log validation details if available
    if (error.message.includes("400")) {
      console.log("🔍 This is a validation error - checking API response...");
    }

    showNotification(
      "Failed to generate invite link: " + error.message,
      "error",
    );
  } finally {
    showLoading(false);
  }
}

// =========================== MODAL DISPLAY FUNCTIONS ===========================

function showInviteSentModal(inviteLink, email, emailSent = false) {
  const modal = document.createElement("div");
  modal.className = "modal";
  modal.style.display = "block";
  modal.id = "inviteSentModal";

  modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px; border-radius: 16px; overflow: hidden; padding: 0; border: 1px solid var(--border-color);">
            <div class="modal-header" style="background: var(--surface-card); padding: 1.5rem 2rem; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
                 <h2 style="margin: 0; font-size: 1.5rem; color: var(--text-main);">Invite Sent</h2>
                 <button class="close" onclick="closeModal('inviteSentModal')" style="background: var(--surface-hover); width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: none; cursor: pointer; color: var(--text-muted);">&times;</button>
            </div>
            
            <div class="modal-body" style="padding: 2rem;">
                <div style="text-align: center; margin-bottom: 2rem;">
                    <div style="width: 64px; height: 64px; background: rgba(16, 185, 129, 0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem auto;">
                         <span style="font-size: 2rem;">📧</span>
                    </div>
                    <h3 style="color: var(--text-main); margin-bottom: 0.5rem; font-size: 1.25rem;">Invitation Sent!</h3>
                    <p style="color: var(--text-secondary);">An invitation has been sent to <strong style="color: var(--text-main);">${email}</strong></p>
                    ${emailSent ? '<span class="status-badge" style="background: rgba(16, 185, 129, 0.1); color: #10B981; border: 1px solid rgba(16, 185, 129, 0.2); margin-top: 0.5rem; display: inline-block;">Email sent successfully</span>' : '<span class="status-badge" style="background: rgba(251, 191, 36, 0.1); color: #fbbf24; border: 1px solid rgba(251, 191, 36, 0.2); margin-top: 0.5rem; display: inline-block;">Email queued for delivery</span>'}
                </div>
                
                <div style="background: var(--surface-hover); padding: 1.5rem; border-radius: 12px; margin-bottom: 2rem;">
                    <label style="display: block; color: var(--text-muted); font-size: 0.85rem; margin-bottom: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em;">Share this link directly</label>
                    <div style="display: flex; gap: 0.75rem;">
                        <input type="text" id="sentInviteLink" value="${inviteLink}" readonly 
                               style="flex: 1; padding: 0.875rem; background: var(--background-base); border: 1px solid var(--border-color); border-radius: 8px; color: var(--text-main); font-family: monospace; font-size: 0.95rem;">
                        <button class="btn btn-primary" onclick="copySentInviteLink()" style="white-space: nowrap;">📋 Copy</button>
                    </div>
                </div>
                
                <div style="border-left: 4px solid var(--primary); padding-left: 1rem; margin-bottom: 2rem;">
                    <h4 style="margin: 0 0 0.5rem 0; color: var(--text-main); font-size: 1rem;">What happens next?</h4>
                    <p style="color: var(--text-secondary); font-size: 0.95rem; line-height: 1.5; margin: 0;">
                        The player will receive the email, join via the link, and appear in your roster automatically.
                    </p>
                </div>
                
                <div style="display: flex; gap: 1rem; border-top: 1px solid var(--border-color); padding-top: 1.5rem;">
                    <button class="btn btn-primary" style="flex: 1;" onclick="enhancedInvitePlayer(); closeModal('inviteSentModal')">Send Another Invite</button>
                    <button class="btn btn-secondary" onclick="closeModal('inviteSentModal')">Close</button>
                </div>
            </div>
        </div>
    `;

  document.body.appendChild(modal);
}

function showShareableInviteLinkModal(inviteLink, clubName) {
  const modal = document.createElement("div");
  modal.className = "modal";
  modal.style.display = "block";
  modal.id = "shareableInviteLinkModal";

  modal.innerHTML = `
        <div class="modal-content" style="max-width: 700px; border-radius: 16px; overflow: hidden; padding: 0; border: 1px solid var(--border-color);">
             <div class="modal-header" style="background: var(--surface-card); padding: 1.5rem 2rem; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
                 <div style="display: flex; flex-direction: column; gap: 4px;">
                    <h2 style="margin: 0; font-size: 1.5rem; color: var(--text-main);">Shareable Invite Link</h2>
                    <p style="margin: 0; color: var(--text-muted); font-size: 0.9rem;">Anyone with this link can join <strong>${clubName}</strong></p>
                 </div>
                 <button class="close" onclick="closeModal('shareableInviteLinkModal')" style="background: var(--surface-hover); width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: none; cursor: pointer; color: var(--text-muted);">&times;</button>
            </div>
            
            <div class="modal-body" style="padding: 2rem;">
                
                <div style="background: var(--surface-hover); padding: 1.5rem; border-radius: 12px; margin-bottom: 2rem; border: 1px solid var(--border-color);">
                    <label style="display: block; color: var(--text-muted); font-size: 0.85rem; margin-bottom: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em;">Your Invite Link</label>
                    <div style="display: flex; gap: 0.75rem;">
                        <input type="text" id="shareableInviteLink" value="${inviteLink}" readonly 
                               style="flex: 1; padding: 0.875rem; background: var(--background-base); border: 1px solid var(--border-color); border-radius: 8px; color: var(--text-main); font-family: monospace; font-size: 0.95rem;">
                        <button class="btn btn-primary" onclick="copyShareableLink()" style="white-space: nowrap;">📋 Copy</button>
                    </div>
                </div>
                
                <div style="margin-bottom: 2rem;">
                     <h4 style="margin: 0 0 1rem 0; color: var(--text-main); font-size: 1rem;">Share via</h4>
                     <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.5rem;">
                        <button class="btn btn-secondary" onclick="shareViaWhatsApp('${inviteLink}', '${clubName}')" style="flex-direction: column; gap: 0.8rem; padding: 1.25rem; height: auto;">
                            <span style="font-size: 1.75rem;">📱</span>
                            <span style="font-size: 0.9rem;">WhatsApp</span>
                        </button>
                        <button class="btn btn-secondary" onclick="shareViaEmail('${inviteLink}', '${clubName}')" style="flex-direction: column; gap: 0.8rem; padding: 1.25rem; height: auto;">
                            <span style="font-size: 1.75rem;">📧</span>
                            <span style="font-size: 0.9rem;">Email</span>
                        </button>
                        <button class="btn btn-secondary" onclick="shareViaSocial('${inviteLink}', '${clubName}')" style="flex-direction: column; gap: 0.8rem; padding: 1.25rem; height: auto;">
                            <span style="font-size: 1.75rem;">📢</span>
                            <span style="font-size: 0.9rem;">Social</span>
                        </button>
                        <button class="btn btn-secondary" onclick="generateQRCode('${inviteLink}')" style="flex-direction: column; gap: 0.8rem; padding: 1.25rem; height: auto;">
                            <span style="font-size: 1.75rem;">🏁</span>
                            <span style="font-size: 0.9rem;">QR Code</span>
                        </button>
                    </div>
                </div>
                
                <div style="background: rgba(59, 130, 246, 0.05); border: 1px solid rgba(59, 130, 246, 0.1); padding: 1.25rem; border-radius: 12px; display: flex; gap: 1rem; align-items: flex-start;">
                    <div style="font-size: 1.5rem;">ℹ️</div>
                    <div>
                        <h4 style="margin: 0 0 0.5rem 0; color: var(--text-main); font-size: 1rem;">How it works</h4>
                        <p style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.5; margin: 0;">
                            Players clicking this link can instantly create an account and join your roster. This single link works for multiple players.
                        </p>
                    </div>
                </div>
                
                 <div style="display: flex; justify-content: flex-end; margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid var(--border-color);">
                     <button class="btn btn-secondary" onclick="closeModal('shareableInviteLinkModal')" style="min-width: 100px;">Close</button>
                 </div>
            </div>
        </div>
    `;

  document.body.appendChild(modal);
}

// =========================== INVITE PAGE HANDLING ===========================

async function handleInvitePage() {
  console.log("📧 Handling invite page...");

  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get("token");

  if (!token) {
    showExpiredInvite("No invitation token provided");
    return;
  }

  try {
    // Check authentication status
    const authToken = localStorage.getItem("authToken");
    const userData = localStorage.getItem("currentUser");

    if (!authToken || !userData) {
      console.log("❌ User not logged in, showing login prompt");
      showNotLoggedIn();
      return;
    }

    const currentUser = JSON.parse(userData);
    console.log("✅ User is logged in:", currentUser.email);

    // Load invite details
    await loadInviteDetails(token);
  } catch (error) {
    console.error("❌ Failed to handle invite page:", error);
    showExpiredInvite("Failed to load invitation details");
  }
}

async function loadInviteDetails(token) {
  try {
    console.log("📄 Loading invite details for token:", token);

    const response = await fetch(`/api/invites/details/${token}`);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Invitation not found");
    }

    const inviteData = await response.json();
    console.log("✅ Invite details loaded:", inviteData);

    displayInviteDetails(inviteData);
  } catch (error) {
    console.error("❌ Failed to load invite:", error);
    showExpiredInvite(error.message);
  }
}

function displayInviteDetails(inviteData) {
  document.getElementById("loading").style.display = "none";
  document.getElementById("inviteContent").style.display = "block";

  // Populate club information
  document.getElementById("clubName").textContent = inviteData.club.name;
  document.getElementById("clubLocation").textContent =
    inviteData.club.location || "Not specified";
  document.getElementById("clubSport").textContent =
    inviteData.club.sport || "Not specified";
  document.getElementById("clubDescription").textContent =
    inviteData.club.description || "No description available";

  // Populate invite information
  document.getElementById("clubRole").textContent = capitalizeFirst(
    inviteData.invite.clubRole,
  );
  document.getElementById("inviterName").textContent = inviteData.inviter.name;
  document.getElementById("expiresAt").textContent = formatDate(
    inviteData.invite.expiresAt,
  );

  // Show team assignment if exists
  if (inviteData.invite.teamName) {
    document.getElementById("teamName").textContent =
      inviteData.invite.teamName;
    document.getElementById("teamAssignment").style.display = "block";
  }

  // Show personal message if exists
  if (inviteData.invite.personalMessage) {
    document.getElementById("personalMessage").textContent =
      inviteData.invite.personalMessage;
    document.getElementById("personalMessageSection").style.display = "block";
  }

  // For non-public invites, check email match
  const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
  if (
    !inviteData.invite.isPublic &&
    currentUser.email !== inviteData.invite.email
  ) {
    showError(
      `This invitation was sent to ${inviteData.invite.email}. Please log in with that email address.`,
    );
    return;
  }

  // Show decline button only for non-public invites
  if (!inviteData.invite.isPublic) {
    document.getElementById("declineBtn").style.display = "inline-block";
  }

  // Setup terms checkbox
  const termsCheckbox = document.getElementById("acceptTerms");
  termsCheckbox.addEventListener("change", function () {
    document.getElementById("acceptBtn").disabled = !this.checked;
  });

  console.log("💌 Invite details displayed successfully");
}

// =========================== INVITE ACCEPTANCE ===========================

async function acceptInvite() {
  if (!document.getElementById("acceptTerms").checked) {
    showError("Please accept the terms and conditions to join the club");
    return;
  }

  try {
    setLoadingState(true);

    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("token");

    console.log("✅ Accepting club invitation...");

    const response = await fetch(`/api/invites/accept/${token}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("authToken")}`,
      },
      body: JSON.stringify({
        acceptTerms: true,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to accept invitation");
    }

    const result = await response.json();
    console.log("✅ Club invitation accepted:", result);

    showSuccess(result.club.name);

    // Update local storage if user data has changed
    if (result.updatedUser) {
      localStorage.setItem("currentUser", JSON.stringify(result.updatedUser));
    }
  } catch (error) {
    console.error("❌ Failed to accept invite:", error);
    showError(error.message);
  } finally {
    setLoadingState(false);
  }
}

async function declineInvite() {
  if (confirm("Are you sure you want to decline this invitation?")) {
    try {
      setLoadingState(true);

      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get("token");

      console.log("❌ Declining club invitation...");

      const response = await fetch(`/api/invites/decline/${token}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason: "User declined",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to decline invitation");
      }

      // Show decline confirmation
      document.getElementById("inviteContent").innerHTML = `
                <div style="text-align: center; padding: 3rem;">
                    <h3 style="color: #dc3545; margin-bottom: 1rem;">Invitation Declined</h3>
                    <p>You have declined the invitation to join the club.</p>
                    <button class="btn btn-secondary" onclick="window.location.href='index.html'" style="margin-top: 1rem;">
                        Return to ClubHub
                    </button>
                </div>
            `;
    } catch (error) {
      console.error("❌ Failed to decline invite:", error);
      showError(error.message);
    } finally {
      setLoadingState(false);
    }
  }
}

// =========================== UI HELPER FUNCTIONS ===========================

function setLoadingState(loading) {
  const acceptBtn = document.getElementById("acceptBtn");
  const declineBtn = document.getElementById("declineBtn");

  if (loading) {
    acceptBtn.disabled = true;
    acceptBtn.textContent = "Processing...";
    if (declineBtn) declineBtn.disabled = true;
  } else {
    acceptBtn.disabled = !document.getElementById("acceptTerms").checked;
    acceptBtn.textContent = "✅ Accept & Join Club";
    if (declineBtn) declineBtn.disabled = false;
  }
}

function showSuccess(clubName) {
  document.getElementById("successClubName").textContent = clubName;
  document.getElementById("successMessage").style.display = "block";
  document
    .getElementById("inviteContent")
    .querySelector(".invite-details").style.display = "none";

  // Auto-redirect after 5 seconds
  setTimeout(() => {
    window.location.href = "player-dashboard.html";
  }, 5000);
}

function showError(message) {
  document.getElementById("errorText").textContent = message;
  document.getElementById("errorMessage").style.display = "block";
}

function hideError() {
  document.getElementById("errorMessage").style.display = "none";
}

function showExpiredInvite(message) {
  document.getElementById("loading").style.display = "none";
  document.getElementById("expiredMessage").textContent = message;
  document.getElementById("expiredInvite").style.display = "block";
}

function showNotLoggedIn() {
  document.getElementById("loading").style.display = "none";
  document.getElementById("notLoggedIn").style.display = "block";
}

function redirectToLogin() {
  const currentUrl = encodeURIComponent(window.location.href);
  window.location.href = `index.html?returnUrl=${currentUrl}`;
}

// =========================== COPY & SHARE FUNCTIONS ===========================

async function copySentInviteLink() {
  const linkInput = document.getElementById("sentInviteLink");
  if (!linkInput) return;

  try {
    await navigator.clipboard.writeText(linkInput.value);
    showNotification("Invite link copied!", "success");
  } catch (error) {
    linkInput.select();
    document.execCommand("copy");
    showNotification("Invite link copied!", "success");
  }
}

async function copyShareableLink() {
  const linkInput = document.getElementById("shareableInviteLink");
  if (!linkInput) return;

  try {
    await navigator.clipboard.writeText(linkInput.value);
    showNotification("Invite link copied to clipboard!", "success");

    linkInput.style.background = "#d4edda";
    setTimeout(() => {
      linkInput.style.background = "#f8f9fa";
    }, 1000);
  } catch (error) {
    linkInput.select();
    document.execCommand("copy");
    showNotification("Invite link copied to clipboard!", "success");
  }
}

function shareViaWhatsApp(inviteLink, clubName) {
  const message = `🏆 You're invited to join ${clubName}!\n\nClick this link to join our sports club:\n${inviteLink}\n\nLooking forward to having you on the team! ⚽`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
  window.open(whatsappUrl, "_blank");
}

function shareViaEmail(inviteLink, clubName) {
  const subject = `Join ${clubName} - Sports Club Invitation`;
  const body = `Hi there!

You're invited to join ${clubName}, our sports club!

We'd love to have you as part of our team. Click the link below to join:

${inviteLink}

What you'll get:
• Access to training sessions and matches
• Professional coaching and development
• A supportive team environment
• Regular events and competitions

Simply click the link, create your account, and you'll be part of the team!

Looking forward to seeing you on the field!

Best regards,
${clubName} Team`;

  const emailUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.open(emailUrl);
}

function shareViaSocial(inviteLink, clubName) {
  const text = `🏆 Join ${clubName}! Great sports club looking for new players. Click here to join: ${inviteLink}`;

  if (navigator.share) {
    navigator
      .share({
        title: `Join ${clubName}`,
        text: text,
        url: inviteLink,
      })
      .catch(console.error);
  } else {
    navigator.clipboard.writeText(text).then(() => {
      showNotification("Social media post copied to clipboard!", "success");
    });
  }
}

function generateQRCode(inviteLink) {
  const modal = document.createElement("div");
  modal.className = "modal";
  modal.style.display = "block";
  modal.id = "qrCodeModal";

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(inviteLink)}`;

  modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px; text-align: center;">
            <div class="modal-header">
                <h2>📱 QR Code for Club Invite</h2>
                <button class="close" onclick="closeModal('qrCodeModal')">&times;</button>
            </div>
            <div class="modal-body">
                <p>Players can scan this QR code to join your club:</p>
                <div style="margin: 2rem 0;">
                    <img src="${qrCodeUrl}" alt="QR Code" style="max-width: 100%; border: 2px solid #ddd; border-radius: 8px;">
                </div>
                <p style="font-size: 0.9rem; color: #666;">
                    Print this QR code and display it at your club, training ground, or events!
                </p>
                <div style="margin-top: 1.5rem;">
                    <button class="btn btn-primary" onclick="downloadQRCode('${qrCodeUrl}')">💾 Download QR Code</button>
                    <button class="btn btn-secondary" onclick="closeModal('qrCodeModal')" style="margin-left: 1rem;">Close</button>
                </div>
            </div>
        </div>
    `;

  document.body.appendChild(modal);
}

function downloadQRCode(qrCodeUrl) {
  const link = document.createElement("a");
  link.href = qrCodeUrl;
  link.download = "club-invite-qr-code.png";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showNotification("QR Code downloaded!", "success");
}

// =========================== UTILITY FUNCTIONS ===========================

function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// =========================== GLOBAL EXPORTS ===========================

// Make functions globally available
window.enhancedInvitePlayer = enhancedInvitePlayer;
window.generateShareableInviteLink = generateShareableInviteLink;
window.showEmailInviteForm = showEmailInviteForm;
window.hideEmailInviteForm = hideEmailInviteForm;
window.handleEmailInviteSubmission = handleEmailInviteSubmission;
window.acceptInvite = acceptInvite;
window.declineInvite = declineInvite;
window.redirectToLogin = redirectToLogin;
window.hideError = hideError;
window.copySentInviteLink = copySentInviteLink;
window.copyShareableLink = copyShareableLink;
window.shareViaWhatsApp = shareViaWhatsApp;
window.shareViaEmail = shareViaEmail;
window.shareViaSocial = shareViaSocial;
window.generateQRCode = generateQRCode;
window.downloadQRCode = downloadQRCode;

console.log(
  "✅ Enhanced Invite System with Email Integration loaded successfully!",
);
