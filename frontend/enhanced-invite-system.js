let InviteSystemState = {
    currentUser: null,
    currentClub: null,
    activeInvites: [],
    sentInvites: [],
    isInitialized: false
};

// Initialize the invite system
document.addEventListener('DOMContentLoaded', function() {
    console.log('📧 Initializing Enhanced Invite System...');
    setTimeout(initializeInviteSystem, 500);
});

function initializeInviteSystem() {
    InviteSystemState.currentUser = AppState?.currentUser || JSON.parse(localStorage.getItem('currentUser') || 'null');
    InviteSystemState.currentClub = AppState?.clubs?.[0] || null;
    InviteSystemState.isInitialized = true;
    
    // Check if user is on invite page
    if (window.location.pathname.includes('invite.html')) {
        handleInvitePage();
    }
    
    console.log('✅ Enhanced Invite System initialized');
}

// =========================== EMAIL INVITE FUNCTIONS ===========================

async function enhancedInvitePlayer() {
    // Check if user has a club
    if (!InviteSystemState.currentClub && (!AppState.clubs || AppState.clubs.length === 0)) {
        showNotification('Please create a club profile first before sending invites', 'error');
        return;
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.id = 'enhancedInviteModal';
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 700px;">
            <div class="modal-header">
                <h2>📧 Invite Players to ${InviteSystemState.currentClub?.name || AppState.clubs?.[0]?.name || 'Your Club'}</h2>
                <button class="close" onclick="closeModal('enhancedInviteModal')">&times;</button>
            </div>
            <div class="modal-body">
                <!-- Invite Type Selection -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 2rem;">
                    <div style="padding: 1.5rem; border: 2px solid #007bff; border-radius: 8px; text-align: center; cursor: pointer;" onclick="showEmailInviteForm()">
                        <h3 style="color: #007bff; margin: 0 0 1rem 0;">📧 Email Invite</h3>
                        <p style="margin-bottom: 1.5rem;">Send invite directly to email address</p>
                        <div class="btn btn-primary" style="width: 100%; pointer-events: none;">Send Email Invite</div>
                    </div>
                    
                    <div style="padding: 1.5rem; border: 2px solid #28a745; border-radius: 8px; text-align: center; cursor: pointer;" onclick="generateShareableInviteLink()">
                        <h3 style="color: #28a745; margin: 0 0 1rem 0;">🔗 Shareable Link</h3>
                        <p style="margin-bottom: 1.5rem;">Generate link for multiple players</p>
                        <div class="btn btn-success" style="width: 100%; pointer-events: none;">Generate Link</div>
                    </div>
                </div>
                
                <!-- Email Invite Form -->
                <div id="emailInviteForm" style="display: none;">
                    <h3>📧 Send Email Invite</h3>
                    <form id="emailInviteFormElement">
                        <div class="form-group">
                            <label for="inviteEmail">Email Address *</label>
                            <input type="email" id="inviteEmail" required placeholder="player@example.com">
                        </div>
                        <div class="form-group">
                            <label for="inviteFirstName">First Name</label>
                            <input type="text" id="inviteFirstName" placeholder="John">
                        </div>
                        <div class="form-group">
                            <label for="inviteLastName">Last Name</label>
                            <input type="text" id="inviteLastName" placeholder="Smith">
                        </div>
                        <div class="form-group">
                            <label for="inviteRole">Role</label>
                            <select id="inviteRole">
                                <option value="player">Player</option>
                                <option value="coach">Coach</option>
                                <option value="staff">Staff</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="inviteMessage">Personal Message</label>
                            <textarea id="inviteMessage" rows="3" placeholder="Welcome to our club! We'd love to have you join our team..."></textarea>
                        </div>
                        <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
                            <button type="submit" class="btn btn-primary" style="flex: 1;">📧 Send Email Invite</button>
                            <button type="button" class="btn btn-secondary" onclick="hideEmailInviteForm()">Cancel</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add form submission handler
    document.getElementById('emailInviteFormElement').addEventListener('submit', handleEmailInviteSubmission);
}

function showEmailInviteForm() {
    document.getElementById('emailInviteForm').style.display = 'block';
}

function hideEmailInviteForm() {
    document.getElementById('emailInviteForm').style.display = 'none';
    document.getElementById('emailInviteFormElement').reset();
}

async function handleEmailInviteSubmission(e) {
    e.preventDefault();
    
    try {
        showLoading(true);
        
        const inviteData = {
            email: document.getElementById('inviteEmail').value,
            firstName: document.getElementById('inviteFirstName').value,
            lastName: document.getElementById('inviteLastName').value,
            clubRole: document.getElementById('inviteRole').value,
            message: document.getElementById('inviteMessage').value,
            clubId: InviteSystemState.currentClub?.id || AppState.clubs?.[0]?.id,
            isPublic: false,
            sendEmail: true
        };
        
        console.log('📧 Sending email invite:', inviteData);
        
        const response = await apiService.generateClubInvite(inviteData);
        
        closeModal('enhancedInviteModal');
        showInviteSentModal(response.inviteLink, inviteData.email, response.emailSent);
        showNotification('Email invite sent successfully!', 'success');
        
        // Track sent invite
        InviteSystemState.sentInvites.push({
            ...response,
            sentAt: new Date().toISOString(),
            email: inviteData.email
        });
        
    } catch (error) {
        console.error('❌ Failed to send email invite:', error);
        showNotification('Failed to send invite: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// =========================== SHAREABLE LINK FUNCTIONS ===========================

async function generateShareableInviteLink() {
    try {
        showLoading(true);
        
        if (!InviteSystemState.currentClub && (!AppState.clubs || AppState.clubs.length === 0)) {
            showNotification('Please create a club profile first', 'error');
            return;
        }
        
        const clubId = InviteSystemState.currentClub?.id || AppState.clubs?.[0]?.id;
        const clubName = InviteSystemState.currentClub?.name || AppState.clubs?.[0]?.name;
        
        console.log('🔗 Generating shareable invite link for club:', clubName);
        
        const inviteData = {
            email: null,
            firstName: '',
            lastName: '',
            clubRole: 'player',
            message: `Join ${clubName} - a great sports club for players of all levels!`,
            clubId: clubId,
            isPublic: true,
            sendEmail: false
        };
        
        const response = await apiService.generateClubInvite(inviteData);
        console.log('✅ Shareable invite generated:', response);
        
        closeModal('enhancedInviteModal');
        showShareableInviteLinkModal(response.inviteLink, clubName);
        showNotification('Shareable invite link generated successfully!', 'success');
        
    } catch (error) {
        console.error('❌ Failed to generate shareable invite link:', error);
        showNotification('Failed to generate invite link: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// =========================== MODAL DISPLAY FUNCTIONS ===========================

function showInviteSentModal(inviteLink, email, emailSent = false) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.id = 'inviteSentModal';
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
            <div class="modal-header">
                <h2>✅ Invite Sent Successfully!</h2>
                <button class="close" onclick="closeModal('inviteSentModal')">&times;</button>
            </div>
            <div class="modal-body">
                <div style="text-align: center; margin-bottom: 2rem;">
                    <div style="font-size: 4rem; margin-bottom: 1rem;">📧</div>
                    <h3 style="color: #28a745;">Invitation Sent!</h3>
                    <p>An invitation has been sent to <strong>${email}</strong></p>
                    ${emailSent ? '<p style="color: #28a745;">✅ Email sent successfully</p>' : '<p style="color: #856404;">⚠️ Email queued for delivery</p>'}
                </div>
                
                <div style="background: #f8f9fa; padding: 1.5rem; border-radius: 8px; margin: 1rem 0;">
                    <h4>Share this link directly:</h4>
                    <div style="display: flex; gap: 0.5rem; margin-top: 1rem;">
                        <input type="text" id="sentInviteLink" value="${inviteLink}" readonly 
                               style="flex: 1; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px; font-family: monospace; font-size: 0.9rem;">
                        <button class="btn btn-primary" onclick="copySentInviteLink()">📋 Copy</button>
                    </div>
                </div>
                
                <div style="background: #e8f5e8; padding: 1.5rem; border-radius: 8px; margin: 1rem 0;">
                    <h4>What happens next?</h4>
                    <ul style="margin: 0.5rem 0; padding-left: 1.5rem;">
                        <li>The player will receive the invitation email</li>
                        <li>They can click the link to join your club</li>
                        <li>Once they accept, they'll appear in your players list</li>
                        <li>You can then assign them to teams and manage their details</li>
                    </ul>
                </div>
                
                <div style="display: flex; gap: 1rem; justify-content: center; margin-top: 2rem;">
                    <button class="btn btn-success" onclick="enhancedInvitePlayer(); closeModal('inviteSentModal')">📧 Send Another Invite</button>
                    <button class="btn btn-secondary" onclick="closeModal('inviteSentModal')">Close</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function showShareableInviteLinkModal(inviteLink, clubName) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.id = 'shareableInviteLinkModal';
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 700px;">
            <div class="modal-header">
                <h2>🔗 Shareable Club Invite Link</h2>
                <button class="close" onclick="closeModal('shareableInviteLinkModal')">&times;</button>
            </div>
            <div class="modal-body">
                <div style="text-align: center; margin-bottom: 2rem;">
                    <h3 style="color: #28a745;">✅ Invite Link Generated!</h3>
                    <p>Share this link with multiple players to invite them to <strong>${clubName}</strong></p>
                </div>
                
                <div style="background: #f8f9fa; padding: 1.5rem; border-radius: 8px; margin: 1rem 0;">
                    <label style="font-weight: bold; margin-bottom: 0.5rem; display: block;">Shareable Invite Link:</label>
                    <div style="display: flex; gap: 0.5rem;">
                        <input type="text" id="shareableInviteLink" value="${inviteLink}" readonly 
                               style="flex: 1; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px; font-family: monospace; font-size: 0.9rem;">
                        <button class="btn btn-primary" onclick="copyShareableLink()" style="padding: 0.75rem 1rem;">📋 Copy</button>
                    </div>
                </div>
                
                <div style="background: #e8f5e8; padding: 1.5rem; border-radius: 8px; margin: 1rem 0;">
                    <h4 style="margin: 0 0 1rem 0; color: #155724;">📱 Share Options:</h4>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                        <button class="btn btn-success" onclick="shareViaWhatsApp('${inviteLink}', '${clubName}')" style="width: 100%;">📱 WhatsApp</button>
                        <button class="btn btn-primary" onclick="shareViaEmail('${inviteLink}', '${clubName}')" style="width: 100%;">📧 Email</button>
                        <button class="btn btn-info" onclick="shareViaSocial('${inviteLink}', '${clubName}')" style="width: 100%;">📢 Social Media</button>
                        <button class="btn btn-secondary" onclick="generateQRCode('${inviteLink}')" style="width: 100%;">📱 QR Code</button>
                    </div>
                </div>
                
                <div style="background: #fff3cd; padding: 1.5rem; border-radius: 8px; margin: 1rem 0;">
                    <h4 style="margin: 0 0 1rem 0; color: #856404;">ℹ️ How it works:</h4>
                    <ul style="margin: 0; padding-left: 1.5rem; color: #856404;">
                        <li>Players click the link and are taken to the invite page</li>
                        <li>They can create an account or log in with existing account</li>
                        <li>Once logged in, they automatically join your club</li>
                        <li>You'll see them appear in your player list</li>
                        <li>This link can be used by multiple players</li>
                    </ul>
                </div>
                
                <div style="display: flex; gap: 1rem; justify-content: center; margin-top: 2rem;">
                    <button class="btn btn-primary" onclick="copyShareableLink()" style="padding: 1rem 2rem;">📋 Copy Link Again</button>
                    <button class="btn btn-secondary" onclick="closeModal('shareableInviteLinkModal')" style="padding: 1rem 2rem;">Close</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// =========================== INVITE PAGE HANDLING ===========================

async function handleInvitePage() {
    console.log('📧 Handling invite page...');
    
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (!token) {
        showExpiredInvite('No invitation token provided');
        return;
    }
    
    try {
        // Check authentication status
        const authToken = localStorage.getItem('authToken');
        const userData = localStorage.getItem('currentUser');
        
        if (!authToken || !userData) {
            console.log('❌ User not logged in, showing login prompt');
            showNotLoggedIn();
            return;
        }
        
        const currentUser = JSON.parse(userData);
        console.log('✅ User is logged in:', currentUser.email);
        
        // Load invite details
        await loadInviteDetails(token);
        
    } catch (error) {
        console.error('❌ Failed to handle invite page:', error);
        showExpiredInvite('Failed to load invitation details');
    }
}

async function loadInviteDetails(token) {
    try {
        console.log('📄 Loading invite details for token:', token);
        
        const response = await fetch(`/api/invites/details/${token}`);
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Invitation not found');
        }

        const inviteData = await response.json();
        console.log('✅ Invite details loaded:', inviteData);
        
        displayInviteDetails(inviteData);

    } catch (error) {
        console.error('❌ Failed to load invite:', error);
        showExpiredInvite(error.message);
    }
}

function displayInviteDetails(inviteData) {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('inviteContent').style.display = 'block';

    // Populate club information
    document.getElementById('clubName').textContent = inviteData.club.name;
    document.getElementById('clubLocation').textContent = inviteData.club.location || 'Not specified';
    document.getElementById('clubSport').textContent = inviteData.club.sport || 'Not specified';
    document.getElementById('clubDescription').textContent = inviteData.club.description || 'No description available';
    
    // Populate invite information
    document.getElementById('clubRole').textContent = capitalizeFirst(inviteData.invite.clubRole);
    document.getElementById('inviterName').textContent = inviteData.inviter.name;
    document.getElementById('expiresAt').textContent = formatDate(inviteData.invite.expiresAt);

    // Show team assignment if exists
    if (inviteData.invite.teamName) {
        document.getElementById('teamName').textContent = inviteData.invite.teamName;
        document.getElementById('teamAssignment').style.display = 'block';
    }

    // Show personal message if exists
    if (inviteData.invite.personalMessage) {
        document.getElementById('personalMessage').textContent = inviteData.invite.personalMessage;
        document.getElementById('personalMessageSection').style.display = 'block';
    }

    // For non-public invites, check email match
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    if (!inviteData.invite.isPublic && currentUser.email !== inviteData.invite.email) {
        showError(`This invitation was sent to ${inviteData.invite.email}. Please log in with that email address.`);
        return;
    }

    // Show decline button only for non-public invites
    if (!inviteData.invite.isPublic) {
        document.getElementById('declineBtn').style.display = 'inline-block';
    }

    // Setup terms checkbox
    const termsCheckbox = document.getElementById('acceptTerms');
    termsCheckbox.addEventListener('change', function() {
        document.getElementById('acceptBtn').disabled = !this.checked;
    });

    console.log('💌 Invite details displayed successfully');
}

// =========================== INVITE ACCEPTANCE ===========================

async function acceptInvite() {
    if (!document.getElementById('acceptTerms').checked) {
        showError('Please accept the terms and conditions to join the club');
        return;
    }

    try {
        setLoadingState(true);
        
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');

        console.log('✅ Accepting club invitation...');

        const response = await fetch(`/api/invites/accept/${token}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify({
                acceptTerms: true
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to accept invitation');
        }

        const result = await response.json();
        console.log('✅ Club invitation accepted:', result);
        
        showSuccess(result.club.name);

        // Update local storage if user data has changed
        if (result.updatedUser) {
            localStorage.setItem('currentUser', JSON.stringify(result.updatedUser));
        }

    } catch (error) {
        console.error('❌ Failed to accept invite:', error);
        showError(error.message);
    } finally {
        setLoadingState(false);
    }
}

async function declineInvite() {
    if (confirm('Are you sure you want to decline this invitation?')) {
        try {
            setLoadingState(true);
            
            const urlParams = new URLSearchParams(window.location.search);
            const token = urlParams.get('token');

            console.log('❌ Declining club invitation...');

            const response = await fetch(`/api/invites/decline/${token}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    reason: 'User declined'
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to decline invitation');
            }

            // Show decline confirmation
            document.getElementById('inviteContent').innerHTML = `
                <div style="text-align: center; padding: 3rem;">
                    <h3 style="color: #dc3545; margin-bottom: 1rem;">Invitation Declined</h3>
                    <p>You have declined the invitation to join the club.</p>
                    <button class="btn btn-secondary" onclick="window.location.href='index.html'" style="margin-top: 1rem;">
                        Return to ClubHub
                    </button>
                </div>
            `;

        } catch (error) {
            console.error('❌ Failed to decline invite:', error);
            showError(error.message);
        } finally {
            setLoadingState(false);
        }
    }
}

// =========================== UI HELPER FUNCTIONS ===========================

function setLoadingState(loading) {
    const acceptBtn = document.getElementById('acceptBtn');
    const declineBtn = document.getElementById('declineBtn');
    
    if (loading) {
        acceptBtn.disabled = true;
        acceptBtn.textContent = 'Processing...';
        if (declineBtn) declineBtn.disabled = true;
    } else {
        acceptBtn.disabled = !document.getElementById('acceptTerms').checked;
        acceptBtn.textContent = '✅ Accept & Join Club';
        if (declineBtn) declineBtn.disabled = false;
    }
}

function showSuccess(clubName) {
    document.getElementById('successClubName').textContent = clubName;
    document.getElementById('successMessage').style.display = 'block';
    document.getElementById('inviteContent').querySelector('.invite-details').style.display = 'none';
    
    // Auto-redirect after 5 seconds
    setTimeout(() => {
        window.location.href = 'player-dashboard.html';
    }, 5000);
}

function showError(message) {
    document.getElementById('errorText').textContent = message;
    document.getElementById('errorMessage').style.display = 'block';
}

function hideError() {
    document.getElementById('errorMessage').style.display = 'none';
}

function showExpiredInvite(message) {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('expiredMessage').textContent = message;
    document.getElementById('expiredInvite').style.display = 'block';
}

function showNotLoggedIn() {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('notLoggedIn').style.display = 'block';
}

function redirectToLogin() {
    const currentUrl = encodeURIComponent(window.location.href);
    window.location.href = `index.html?returnUrl=${currentUrl}`;
}

// =========================== COPY & SHARE FUNCTIONS ===========================

async function copySentInviteLink() {
    const linkInput = document.getElementById('sentInviteLink');
    if (!linkInput) return;
    
    try {
        await navigator.clipboard.writeText(linkInput.value);
        showNotification('Invite link copied!', 'success');
    } catch (error) {
        linkInput.select();
        document.execCommand('copy');
        showNotification('Invite link copied!', 'success');
    }
}

async function copyShareableLink() {
    const linkInput = document.getElementById('shareableInviteLink');
    if (!linkInput) return;
    
    try {
        await navigator.clipboard.writeText(linkInput.value);
        showNotification('Invite link copied to clipboard!', 'success');
        
        linkInput.style.background = '#d4edda';
        setTimeout(() => {
            linkInput.style.background = '#f8f9fa';
        }, 1000);
        
    } catch (error) {
        linkInput.select();
        document.execCommand('copy');
        showNotification('Invite link copied to clipboard!', 'success');
    }
}

function shareViaWhatsApp(inviteLink, clubName) {
    const message = `🏆 You're invited to join ${clubName}!\n\nClick this link to join our sports club:\n${inviteLink}\n\nLooking forward to having you on the team! ⚽`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
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
        navigator.share({
            title: `Join ${clubName}`,
            text: text,
            url: inviteLink
        }).catch(console.error);
    } else {
        navigator.clipboard.writeText(text).then(() => {
            showNotification('Social media post copied to clipboard!', 'success');
        });
    }
}

function generateQRCode(inviteLink) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.id = 'qrCodeModal';
    
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
    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = 'club-invite-qr-code.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification('QR Code downloaded!', 'success');
}

// =========================== UTILITY FUNCTIONS ===========================

function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
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

console.log('✅ Enhanced Invite System with Email Integration loaded successfully!');