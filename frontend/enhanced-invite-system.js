async function generateShareableInviteLink() {
    try {
        showLoading(true);
        
        if (!AppState.clubs || AppState.clubs.length === 0) {
            showNotification('Please create a club profile first', 'error');
            return;
        }
        
        const clubId = AppState.clubs[0].id;
        const clubName = AppState.clubs[0].name;
        
        // Create a general invite that can be used by anyone
        const inviteData = {
            email: 'public@invite.link', // Special email for public invites
            firstName: '',
            lastName: '',
            clubRole: 'player',
            message: `Join ${clubName} - a great sports club for players of all levels!`,
            clubId: clubId,
            isPublic: true // Flag for public invites
        };
        
        const response = await apiService.generateClubInvite(inviteData);
        
        closeModal('enhancedInviteModal');
        
        // Show success modal with invite link
        showInviteSentModal(response.inviteLink, inviteData.email);
        
        showNotification('Invite sent successfully!', 'success');
        
    } catch (error) {
        console.error('Failed to send invite:', error);
        showNotification('Failed to send invite: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// Show invite sent confirmation modal
function showInviteSentModal(inviteLink, email) {
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
                        <li>The player will receive the invitation</li>
                        <li>They can click the link to join your club</li>
                        <li>Once they accept, they'll appear in your players list</li>
                        <li>You can then assign them to teams and manage their details</li>
                    </ul>
                </div>
                
                <div style="display: flex; gap: 1rem; justify-content: center; margin-top: 2rem;">
                    <button class="btn btn-success" onclick="enhancedInvitePlayer(); closeModal('inviteSentModal')">
                        📧 Send Another Invite
                    </button>
                    <button class="btn btn-secondary" onclick="closeModal('inviteSentModal')">
                        Close
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Copy sent invite link
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

// Enhanced listings functionality
function createListingModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.id = 'createListingModal';
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 700px;">
            <div class="modal-header">
                <h2>📋 Create Club Listing</h2>
                <button class="close" onclick="closeModal('createListingModal')">&times;</button>
            </div>
            <div class="modal-body">
                <form id="createListingForm">
                    <div class="form-group">
                        <label for="listingTitle">Listing Title *</label>
                        <input type="text" id="listingTitle" required placeholder="e.g., Looking for Football Players, Training Camp Available">
                    </div>
                    
                    <div class="form-group">
                        <label for="listingType">Listing Type *</label>
                        <select id="listingType" required>
                            <option value="">Select type...</option>
                            <option value="player-recruitment">Player Recruitment</option>
                            <option value="coach-needed">Coach Needed</option>
                            <option value="training-available">Training Available</option>
                            <option value="tournament">Tournament</option>
                            <option value="camps">Holiday Camps</option>
                            <option value="trials">Trials</option>
                            <option value="equipment">Equipment Sale</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="listingDescription">Description *</label>
                        <textarea id="listingDescription" rows="4" required placeholder="Describe what you're offering or looking for..."></textarea>
                    </div>
                    
                    <div class="form-group">
                        <label for="listingLocation">Location</label>
                        <input type="text" id="listingLocation" placeholder="Training ground address or general area">
                    </div>
                    
                    <div class="form-group">
                        <label for="listingAgeGroup">Age Group</label>
                        <select id="listingAgeGroup">
                            <option value="">Any age</option>
                            <option value="U8">Under 8</option>
                            <option value="U10">Under 10</option>
                            <option value="U12">Under 12</option>
                            <option value="U14">Under 14</option>
                            <option value="U16">Under 16</option>
                            <option value="U18">Under 18</option>
                            <option value="Senior">Senior (18+)</option>
                            <option value="Veterans">Veterans (35+)</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="listingPrice">Price (if applicable)</label>
                        <input type="number" id="listingPrice" min="0" step="0.01" placeholder="0.00">
                    </div>
                    
                    <div class="form-group">
                        <label for="listingContactEmail">Contact Email *</label>
                        <input type="email" id="listingContactEmail" required placeholder="contact@example.com">
                    </div>
                    
                    <div class="form-group">
                        <label for="listingContactPhone">Contact Phone</label>
                        <input type="tel" id="listingContactPhone" placeholder="+44 7xxx xxx xxx">
                    </div>
                    
                    <div class="form-group">
                        <label for="listingExpiryDate">Expires On</label>
                        <input type="date" id="listingExpiryDate" min="${new Date().toISOString().split('T')[0]}">
                    </div>
                    
                    <div style="background: #fff3cd; padding: 1rem; border-radius: 8px; margin: 1rem 0;">
                        <h4 style="margin: 0 0 0.5rem 0;">📢 Listing Benefits:</h4>
                        <ul style="margin: 0; padding-left: 1.5rem;">
                            <li>Visible to all ClubHub users</li>
                            <li>Searchable by location and sport</li>
                            <li>Direct contact from interested players/coaches</li>
                            <li>Automatic expiry to keep listings fresh</li>
                        </ul>
                    </div>
                    
                    <div style="display: flex; gap: 1rem; margin-top: 2rem;">
                        <button type="submit" class="btn btn-primary" style="flex: 1;">📋 Create Listing</button>
                        <button type="button" class="btn btn-secondary" onclick="closeModal('createListingModal')">Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Set default expiry date (30 days from now)
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);
    document.getElementById('listingExpiryDate').value = expiryDate.toISOString().split('T')[0];
    
    // Set default contact email
    if (AppState.currentUser?.email) {
        document.getElementById('listingContactEmail').value = AppState.currentUser.email;
    }
    
    // Setup form handler
    document.getElementById('createListingForm').addEventListener('submit', handleCreateListing);
}

// Handle create listing
async function handleCreateListing(e) {
    e.preventDefault();
    
    try {
        showLoading(true);
        
        const listingData = {
            title: document.getElementById('listingTitle').value,
            type: document.getElementById('listingType').value,
            description: document.getElementById('listingDescription').value,
            location: document.getElementById('listingLocation').value,
            ageGroup: document.getElementById('listingAgeGroup').value,
            price: parseFloat(document.getElementById('listingPrice').value) || 0,
            contactEmail: document.getElementById('listingContactEmail').value,
            contactPhone: document.getElementById('listingContactPhone').value,
            expiryDate: document.getElementById('listingExpiryDate').value,
            clubId: AppState.clubs[0]?.id
        };
        
        // Mock API call - replace with real API when available
        console.log('Creating listing:', listingData);
        
        closeModal('createListingModal');
        showNotification('Listing created successfully!', 'success');
        
        // Refresh listings display
        loadListings();
        
    } catch (error) {
        console.error('Failed to create listing:', error);
        showNotification('Failed to create listing: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// Load listings function
function loadListings() {
    const listingsContainer = document.getElementById('listingsContainer');
    if (!listingsContainer) return;
    
    // Mock listings data - replace with real API call
    const mockListings = [
        {
            id: '1',
            title: 'Looking for Football Players - All Levels Welcome',
            type: 'player-recruitment',
            description: 'Elite Football Academy is looking for passionate football players of all skill levels. We offer professional coaching, regular matches, and a supportive team environment.',
            location: 'Manchester, UK',
            ageGroup: 'U16',
            price: 0,
            contactEmail: 'coach@elitefc.com',
            contactPhone: '+44 7123 456789',
            createdAt: '2024-01-15',
            expiryDate: '2024-02-15',
            clubName: 'Elite Football Academy'
        },
        {
            id: '2',
            title: 'Summer Football Camp - Book Now!',
            type: 'camps',
            description: 'Join our exciting summer football camp! Professional coaching, skill development, and fun activities for young players.',
            location: 'London, UK',
            ageGroup: 'U12',
            price: 150,
            contactEmail: 'camps@londonfc.com',
            contactPhone: '+44 7987 654321',
            createdAt: '2024-01-10',
            expiryDate: '2024-03-01',
            clubName: 'London Sports Academy'
        }
    ];
    
    if (mockListings.length === 0) {
        listingsContainer.innerHTML = `
            <div class="empty-state">
                <h4>No listings yet</h4>
                <p>Create your first listing to attract players or promote events</p>
                <button class="btn btn-primary" onclick="createListingModal()">Create First Listing</button>
            </div>
        `;
        return;
    }
    
    listingsContainer.innerHTML = mockListings.map(listing => `
        <div class="card">
            <div style="display: flex; justify-content: between; align-items: start; margin-bottom: 1rem;">
                <h4 style="margin: 0; flex: 1;">${listing.title}</h4>
                <span class="status-badge status-active">${listing.type.replace('-', ' ')}</span>
            </div>
            <p><strong>Club:</strong> ${listing.clubName}</p>
            <p><strong>Location:</strong> ${listing.location}</p>
            <p><strong>Age Group:</strong> ${listing.ageGroup}</p>
            ${listing.price > 0 ? `<p><strong>Price:</strong> ${formatCurrency(listing.price)}</p>` : ''}
            <p>${listing.description}</p>
            <p style="font-size: 0.9rem; color: #666;">
                <strong>Contact:</strong> ${listing.contactEmail}
                ${listing.contactPhone ? ` | ${listing.contactPhone}` : ''}
            </p>
            <p style="font-size: 0.8rem; color: #999;">
                Posted: ${formatDate(listing.createdAt)} | Expires: ${formatDate(listing.expiryDate)}
            </p>
            <div class="item-actions">
                <button class="btn btn-small btn-secondary" onclick="editListing('${listing.id}')">Edit</button>
                <button class="btn btn-small btn-danger" onclick="deleteListing('${listing.id}')">Delete</button>
                <button class="btn btn-small btn-primary" onclick="shareListing('${listing.id}')">Share</button>
            </div>
        </div>
    `).join('');
}

// Listing management functions
function editListing(listingId) {
    console.log('Edit listing:', listingId);
    showNotification('Edit listing feature coming soon!', 'info');
}

function deleteListing(listingId) {
    if (confirm('Are you sure you want to delete this listing?')) {
        console.log('Delete listing:', listingId);
        showNotification('Listing deleted successfully!', 'success');
        loadListings();
    }
}

function shareListing(listingId) {
    console.log('Share listing:', listingId);
    showNotification('Listing sharing feature coming soon!', 'info');
}

// Enhanced document management
function createDocumentUploadModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.id = 'uploadDocumentModal';
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
            <div class="modal-header">
                <h2>📄 Upload Document</h2>
                <button class="close" onclick="closeModal('uploadDocumentModal')">&times;</button>
            </div>
            <div class="modal-body">
                <form id="uploadDocumentForm">
                    <div class="form-group">
                        <label for="documentTitle">Document Title *</label>
                        <input type="text" id="documentTitle" required placeholder="e.g., Club Handbook, Training Schedule">
                    </div>
                    
                    <div class="form-group">
                        <label for="documentType">Document Type *</label>
                        <select id="documentType" required>
                            <option value="">Select type...</option>
                            <option value="handbook">Club Handbook</option>
                            <option value="schedule">Schedule</option>
                            <option value="rules">Rules & Regulations</option>
                            <option value="safety">Safety Guidelines</option>
                            <option value="forms">Forms</option>
                            <option value="policies">Policies</option>
                            <option value="newsletter">Newsletter</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="documentAccess">Access Level *</label>
                        <select id="documentAccess" required>
                            <option value="players">Players Only</option>
                            <option value="staff">Staff Only</option>
                            <option value="all">All Members</option>
                            <option value="public">Public</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="documentDescription">Description</label>
                        <textarea id="documentDescription" rows="3" placeholder="Brief description of the document..."></textarea>
                    </div>
                    
                    <div class="form-group">
                        <label for="documentFile">Upload File *</label>
                        <input type="file" id="documentFile" required accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png">
                        <small style="color: #666; font-size: 0.9rem;">
                            Supported formats: PDF, Word documents, text files, images (Max 10MB)
                        </small>
                    </div>
                    
                    <div style="background: #e8f5e8; padding: 1rem; border-radius: 8px; margin: 1rem 0;">
                        <h4 style="margin: 0 0 0.5rem 0;">📋 Document Features:</h4>
                        <ul style="margin: 0; padding-left: 1.5rem;">
                            <li>Secure cloud storage</li>
                            <li>Access control by member type</li>
                            <li>Download tracking</li>
                            <li>Version history</li>
                        </ul>
                    </div>
                    
                    <div style="display: flex; gap: 1rem; margin-top: 2rem;">
                        <button type="submit" class="btn btn-primary" style="flex: 1;">📄 Upload Document</button>
                        <button type="button" class="btn btn-secondary" onclick="closeModal('uploadDocumentModal')">Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Setup form handler
    document.getElementById('uploadDocumentForm').addEventListener('submit', handleDocumentUpload);
}

// Handle document upload
async function handleDocumentUpload(e) {
    e.preventDefault();
    
    try {
        showLoading(true);
        
        const fileInput = document.getElementById('documentFile');
        const file = fileInput.files[0];
        
        if (!file) {
            showNotification('Please select a file to upload', 'error');
            return;
        }
        
        if (file.size > 10 * 1024 * 1024) { // 10MB limit
            showNotification('File size must be less than 10MB', 'error');
            return;
        }
        
        const documentData = {
            title: document.getElementById('documentTitle').value,
            type: document.getElementById('documentType').value,
            accessLevel: document.getElementById('documentAccess').value,
            description: document.getElementById('documentDescription').value,
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            clubId: AppState.clubs[0]?.id
        };
        
        // Mock upload - replace with real API call
        console.log('Uploading document:', documentData);
        
        closeModal('uploadDocumentModal');
        showNotification('Document uploaded successfully!', 'success');
        
        // Refresh documents display
        loadDocuments();
        
    } catch (error) {
        console.error('Failed to upload document:', error);
        showNotification('Failed to upload document: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// Load documents function
function loadDocuments() {
    const documentsTableBody = document.getElementById('documentsTableBody');
    if (!documentsTableBody) return;
    
    // Mock documents data - replace with real API call
    const mockDocuments = [
        {
            id: '1',
            title: 'Club Handbook 2024',
            type: 'handbook',
            accessLevel: 'all',
            uploadDate: '2024-01-15',
            fileName: 'club-handbook-2024.pdf',
            fileSize: '2.5MB'
        },
        {
            id: '2',
            title: 'Training Schedule - Spring 2024',
            type: 'schedule',
            accessLevel: 'players',
            uploadDate: '2024-01-20',
            fileName: 'training-schedule-spring.pdf',
            fileSize: '1.2MB'
        },
        {
            id: '3',
            title: 'Safety Guidelines',
            type: 'safety',
            accessLevel: 'all',
            uploadDate: '2024-01-10',
            fileName: 'safety-guidelines.pdf',
            fileSize: '800KB'
        }
    ];
    
    if (mockDocuments.length === 0) {
        documentsTableBody.innerHTML = '<tr><td colspan="5">No documents uploaded yet</td></tr>';
        return;
    }
    
    documentsTableBody.innerHTML = mockDocuments.map(doc => `
        <tr>
            <td>${doc.title}</td>
            <td>${doc.type}</td>
            <td>${formatDate(doc.uploadDate)}</td>
            <td><span class="status-badge status-${doc.accessLevel}">${doc.accessLevel}</span></td>
            <td>
                <button class="btn btn-small btn-primary" onclick="downloadDocument('${doc.id}')">Download</button>
                <button class="btn btn-small btn-secondary" onclick="editDocument('${doc.id}')">Edit</button>
                <button class="btn btn-small btn-danger" onclick="deleteDocument('${doc.id}')">Delete</button>
            </td>
        </tr>
    `).join('');
}

// Document management functions
function downloadDocument(documentId) {
    console.log('Download document:', documentId);
    showNotification('Document download started!', 'success');
}

function editDocument(documentId) {
    console.log('Edit document:', documentId);
    showNotification('Edit document feature coming soon!', 'info');
}

function deleteDocument(documentId) {
    if (confirm('Are you sure you want to delete this document?')) {
        console.log('Delete document:', documentId);
        showNotification('Document deleted successfully!', 'success');
        loadDocuments();
    }
}

// Show modal with shareable invite link
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
                        <button class="btn btn-primary" onclick="copyShareableLink()" style="padding: 0.75rem 1rem;">
                            📋 Copy
                        </button>
                    </div>
                </div>
                
                <div style="background: #e8f5e8; padding: 1.5rem; border-radius: 8px; margin: 1rem 0;">
                    <h4 style="margin: 0 0 1rem 0; color: #155724;">📱 Share Options:</h4>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                        <button class="btn btn-success" onclick="shareViaWhatsApp('${inviteLink}', '${clubName}')" style="width: 100%;">
                            📱 WhatsApp
                        </button>
                        <button class="btn btn-primary" onclick="shareViaEmail('${inviteLink}', '${clubName}')" style="width: 100%;">
                            📧 Email
                        </button>
                        <button class="btn btn-info" onclick="shareViaSocial('${inviteLink}', '${clubName}')" style="width: 100%;">
                            📢 Social Media
                        </button>
                        <button class="btn btn-secondary" onclick="generateQRCode('${inviteLink}')" style="width: 100%;">
                            📱 QR Code
                        </button>
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
                    <button class="btn btn-primary" onclick="copyShareableLink()" style="padding: 1rem 2rem;">
                        📋 Copy Link Again
                    </button>
                    <button class="btn btn-secondary" onclick="closeModal('shareableInviteLinkModal')" style="padding: 1rem 2rem;">
                        Close
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Copy shareable link to clipboard
async function copyShareableLink() {
    const linkInput = document.getElementById('shareableInviteLink');
    if (!linkInput) return;
    
    try {
        await navigator.clipboard.writeText(linkInput.value);
        showNotification('Invite link copied to clipboard!', 'success');
        
        // Visual feedback
        linkInput.style.background = '#d4edda';
        setTimeout(() => {
            linkInput.style.background = '#f8f9fa';
        }, 1000);
        
    } catch (error) {
        // Fallback for older browsers
        linkInput.select();
        document.execCommand('copy');
        showNotification('Invite link copied to clipboard!', 'success');
    }
}

// Share via WhatsApp
function shareViaWhatsApp(inviteLink, clubName) {
    const message = `🏆 You're invited to join ${clubName}!\n\nClick this link to join our sports club:\n${inviteLink}\n\nLooking forward to having you on the team! ⚽`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
}

// Share via Email
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

// Share via Social Media
function shareViaSocial(inviteLink, clubName) {
    const text = `🏆 Join ${clubName}! Great sports club looking for new players. Click here to join: ${inviteLink}`;
    
    if (navigator.share) {
        navigator.share({
            title: `Join ${clubName}`,
            text: text,
            url: inviteLink
        }).catch(console.error);
    } else {
        // Fallback - copy to clipboard
        navigator.clipboard.writeText(text).then(() => {
            showNotification('Social media post copied to clipboard!', 'success');
        });
    }
}

// Generate QR Code
function generateQRCode(inviteLink) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.id = 'qrCodeModal';
    
    // Using QR Server API for QR code generation
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
                    <button class="btn btn-primary" onclick="downloadQRCode('${qrCodeUrl}')">
                        💾 Download QR Code
                    </button>
                    <button class="btn btn-secondary" onclick="closeModal('qrCodeModal')" style="margin-left: 1rem;">
                        Close
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Download QR Code
function downloadQRCode(qrCodeUrl) {
    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = 'club-invite-qr-code.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification('QR Code downloaded!', 'success');
}

// Enhanced invite player function with email option
async function enhancedInvitePlayer() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.id = 'enhancedInviteModal';
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
            <div class="modal-header">
                <h2>📧 Invite Players to Club</h2>
                <button class="close" onclick="closeModal('enhancedInviteModal')">&times;</button>
            </div>
            <div class="modal-body">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 2rem;">
                    <div style="padding: 1.5rem; border: 2px solid #007bff; border-radius: 8px; text-align: center;">
                        <h3 style="color: #007bff; margin: 0 0 1rem 0;">📧 Email Invite</h3>
                        <p style="margin-bottom: 1.5rem;">Send invite to specific email address</p>
                        <button class="btn btn-primary" onclick="showEmailInviteForm()" style="width: 100%;">
                            Send Email Invite
                        </button>
                    </div>
                    
                    <div style="padding: 1.5rem; border: 2px solid #28a745; border-radius: 8px; text-align: center;">
                        <h3 style="color: #28a745; margin: 0 0 1rem 0;">🔗 Shareable Link</h3>
                        <p style="margin-bottom: 1.5rem;">Generate link for multiple players</p>
                        <button class="btn btn-success" onclick="generateShareableInviteLink(); closeModal('enhancedInviteModal')" style="width: 100%;">
                            Generate Shareable Link
                        </button>
                    </div>
                </div>
                
                <div id="emailInviteForm" style="display: none;">
                    <h3>📧 Send Email Invite</h3>
                    <form id="specificEmailInviteForm">
                        <div class="form-group">
                            <label for="specificInviteEmail">Email Address *</label>
                            <input type="email" id="specificInviteEmail" required placeholder="player@example.com">
                        </div>
                        <div class="form-group">
                            <label for="specificInviteFirstName">First Name</label>
                            <input type="text" id="specificInviteFirstName" placeholder="John">
                        </div>
                        <div class="form-group">
                            <label for="specificInviteLastName">Last Name</label>
                            <input type="text" id="specificInviteLastName" placeholder="Smith">
                        </div>
                        <div class="form-group">
                            <label for="specificInviteRole">Role</label>
                            <select id="specificInviteRole">
                                <option value="player">Player</option>
                                <option value="coach">Coach</option>
                                <option value="staff">Staff</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="specificInviteMessage">Personal Message (Optional)</label>
                            <textarea id="specificInviteMessage" rows="3" placeholder="Welcome to our club! We'd love to have you join our team..."></textarea>
                        </div>
                        <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
                            <button type="submit" class="btn btn-primary" style="flex: 1;">📧 Send Invite</button>
                            <button type="button" class="btn btn-secondary" onclick="hideEmailInviteForm()">Cancel</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Setup form handler
    document.getElementById('specificEmailInviteForm').addEventListener('submit', handleSpecificEmailInvite);
}

// Show email invite form
function showEmailInviteForm() {
    document.getElementById('emailInviteForm').style.display = 'block';
}

// Hide email invite form
function hideEmailInviteForm() {
    document.getElementById('emailInviteForm').style.display = 'none';
    document.getElementById('specificEmailInviteForm').reset();
}

// Handle specific email invite
async function handleSpecificEmailInvite(e) {
    e.preventDefault();
    
    try {
        showLoading(true);
        
        const inviteData = {
            email: document.getElementById('specificInviteEmail').value,
            firstName: document.getElementById('specificInviteFirstName').value,
            lastName: document.getElementById('specificInviteLastName').value,
            clubRole: document.getElementById('specificInviteRole').value,
            message: document.getElementById('specificInviteMessage').value
        };
        
        const response = await apiService.generateClubInvite(inviteData);
        
        closeModal('enhancedInviteModal');
        showInviteSentModal(response.inviteLink, inviteData.email);
        showNotification('Invite sent successfully!', 'success');
        
    } catch (error) {
        console.error('Failed to send invite:', error);
        showNotification('Failed to send invite: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// Export all functions for global access
window.generateShareableInviteLink = generateShareableInviteLink;
window.copyShareableLink = copyShareableLink;
window.shareViaWhatsApp = shareViaWhatsApp;
window.shareViaEmail = shareViaEmail;
window.shareViaSocial = shareViaSocial;
window.generateQRCode = generateQRCode;
window.downloadQRCode = downloadQRCode;
window.enhancedInvitePlayer = enhancedInvitePlayer;
window.showEmailInviteForm = showEmailInviteForm;
window.hideEmailInviteForm = hideEmailInviteForm;
window.copySentInviteLink = copySentInviteLink;
window.createListingModal = createListingModal;
window.loadListings = loadListings;
window.editListing = editListing;
window.deleteListing = deleteListing;
window.shareListing = shareListing;
window.createDocumentUploadModal = createDocumentUploadModal;
window.loadDocuments = loadDocuments;
window.downloadDocument = downloadDocument;
window.editDocument = editDocument;
window.deleteDocument = deleteDocument;

console.log('✅ Enhanced invite system with shareable links loaded!');