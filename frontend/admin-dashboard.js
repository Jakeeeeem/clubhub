document.addEventListener('DOMContentLoaded', function() {
    console.log('🏢 Admin dashboard loading...');
});

// Main initialization function
async function initializeAdminDashboard() {
    console.log('🏢 Initializing admin dashboard...');
    
    try {
        showLoading(true);
        
        // Load data from database via API
        const dashboardData = await apiService.getAdminDashboardData();
        
        // Update AppState with real data from database
        AppState.clubs = dashboardData.clubs || [];
        AppState.players = dashboardData.players || [];
        AppState.staff = dashboardData.staff || [];
        AppState.events = dashboardData.events || [];
        AppState.teams = dashboardData.teams || [];
        AppState.payments = dashboardData.payments || [];
        
        // Load all sections with real data
        loadClubData();
        loadDashboardStats();
        loadPlayers();
        loadStaff();
        loadEvents();
        loadTeams();
        loadFinances();
        setupEventListeners();
        
        console.log('✅ Admin dashboard initialized successfully with database data');
        
    } catch (error) {
        console.error('❌ Failed to initialize admin dashboard:', error);
        showNotification('Failed to load dashboard data', 'error');
    } finally {
        showLoading(false);
    }
}

function setupEventListeners() {
    // Form submissions
    const clubProfileForm = document.getElementById('clubProfileForm');
    const addPlayerForm = document.getElementById('addPlayerForm');
    const addStaffForm = document.getElementById('addStaffForm');
    const addEventForm = document.getElementById('addEventForm');
    const addTeamForm = document.getElementById('addTeamForm');
    
    if (clubProfileForm) {
        clubProfileForm.addEventListener('submit', handleClubProfileUpdate);
    }
    
    if (addPlayerForm) {
        addPlayerForm.addEventListener('submit', handleAddPlayer);
    }
    
    if (addStaffForm) {
        addStaffForm.addEventListener('submit', handleAddStaff);
    }
    
    if (addEventForm) {
        addEventForm.addEventListener('submit', handleAddEvent);
    }
    
    if (addTeamForm) {
        addTeamForm.addEventListener('submit', handleAddTeam);
    }
    
    console.log('📋 Event listeners setup complete');
}

// Section Navigation
function showSection(sectionId) {
    // Hide all sections
    const sections = document.querySelectorAll('.dashboard-section');
    sections.forEach(section => {
        section.classList.remove('active');
    });
    
    // Remove active class from all nav buttons
    const navButtons = document.querySelectorAll('.dashboard-nav button');
    navButtons.forEach(button => {
        button.classList.remove('active');
    });
    
    // Show selected section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    // Add active class to clicked button
    const clickedButton = document.querySelector(`[onclick*="showSection('${sectionId}')"]`);
    if (clickedButton) {
        clickedButton.classList.add('active');
    }
    
    // Update content based on section
    switch(sectionId) {
        case 'overview':
            loadDashboardStats();
            break;
        case 'players':
            loadPlayers();
            break;
        case 'staff':
            loadStaff();
            break;
        case 'teams':
            loadTeams();
            break;
        case 'events':
            loadEvents();
            break;
        case 'finances':
            loadFinances();
            break;
        case 'club-profile':
            loadClubData();
            break;
    }
}

// CLUB PROFILE
function loadClubData() {
    console.log('🏠 Loading club data from database...');
    
    const club = AppState.clubs?.[0];
    if (club) {
        const clubNameField = document.getElementById('clubName');
        const clubDescField = document.getElementById('clubDescription');
        const clubLocationField = document.getElementById('clubLocation');
        const clubPhilosophyField = document.getElementById('clubPhilosophy');
        const clubWebsiteField = document.getElementById('clubWebsite');
        
        if (clubNameField) clubNameField.value = club.name || '';
        if (clubDescField) clubDescField.value = club.description || '';
        if (clubLocationField) clubLocationField.value = club.location || '';
        if (clubPhilosophyField) clubPhilosophyField.value = club.philosophy || '';
        if (clubWebsiteField) clubWebsiteField.value = club.website || '';
    }
}

async function handleClubProfileUpdate(e) {
    e.preventDefault();
    console.log('📝 Updating club profile in database...');
    
    try {
        showLoading(true);
        
        const clubData = {
            name: document.getElementById('clubName')?.value || '',
            description: document.getElementById('clubDescription')?.value || '',
            location: document.getElementById('clubLocation')?.value || '',
            philosophy: document.getElementById('clubPhilosophy')?.value || '',
            website: document.getElementById('clubWebsite')?.value || '',
            types: ['club'],
            sport: 'football'
        };
        
        if (AppState.clubs?.[0]?.id) {
            const updatedClub = await apiService.updateClub(AppState.clubs[0].id, clubData);
            AppState.clubs[0] = updatedClub.club;
        } else {
            const newClub = await apiService.createClub(clubData);
            AppState.clubs = [newClub.club];
        }
        
        showNotification('Club profile updated successfully!', 'success');
        
    } catch (error) {
        console.error('❌ Failed to update club profile:', error);
        showNotification(error.message || 'Failed to update club profile', 'error');
    } finally {
        showLoading(false);
    }
}

// FIXED ADD PLAYER - WITH PROPER CLUB ASSIGNMENT AND USER LINKING
async function handleAddPlayer(e) {
    e.preventDefault();
    console.log('👤 Adding new player to database...');
    
    try {
        showLoading(true);
        
        const playerEmail = document.getElementById('playerEmail')?.value || '';
        
        // Try to find existing user with this email
        let userId = null;
        if (playerEmail) {
            try {
                const existingUser = await apiService.findUserByEmail(playerEmail);
                if (existingUser && existingUser.id) {
                    userId = existingUser.id;
                    console.log('🔗 Found existing user account for:', playerEmail);
                }
            } catch (error) {
                console.log('No existing user found for email:', playerEmail);
            }
        }
        
        const playerData = {
            firstName: document.getElementById('playerFirstName')?.value || '',
            lastName: document.getElementById('playerLastName')?.value || '',
            dateOfBirth: document.getElementById('playerDOB')?.value || '',
            email: playerEmail,
            phone: document.getElementById('playerPhone')?.value || '',
            monthlyFee: parseFloat(document.getElementById('playerFee')?.value) || 0,
            clubId: AppState.clubs?.[0]?.id,
            userId: userId // Link to user account if found
        };
        
        if (!playerData.firstName || !playerData.lastName || !playerData.dateOfBirth) {
            showNotification('Please fill in all required fields', 'error');
            return;
        }
        
        if (!playerData.clubId) {
            showNotification('Please create a club profile first', 'error');
            return;
        }
        
        const response = await apiService.createPlayer(playerData);
        
        if (!AppState.players) AppState.players = [];
        AppState.players.push(response.player);
        
        closeModal('addPlayerModal');
        loadPlayers();
        loadDashboardStats();
        
        document.getElementById('addPlayerForm')?.reset();
        
        showNotification(`Player ${response.player.first_name} ${response.player.last_name} added successfully!`, 'success');
        
        // Handle invite form submission
document.getElementById('invitePlayerForm').addEventListener('submit', handleInvitePlayer);

async function handleInvitePlayer(e) {
    e.preventDefault();
    
    try {
        showLoading(true);
        
        const inviteData = {
            email: document.getElementById('inviteEmail').value,
            firstName: document.getElementById('inviteFirstName').value,
            lastName: document.getElementById('inviteLastName').value,
            clubRole: document.getElementById('inviteRole').value,
            message: document.getElementById('inviteMessage').value
        };
        
        const response = await apiService.generateClubInvite(inviteData);
        
        // Show the invite link to copy/share
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        modal.id = 'inviteLinkModal';
        
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>✅ Invite Sent!</h2>
                    <button class="close" onclick="closeModal('inviteLinkModal')">&times;</button>
                </div>
                <div class="modal-body">
                    <p><strong>Invite created for:</strong> ${inviteData.email}</p>
                    <p><strong>Share this link with the player:</strong></p>
                    <div style="background: #f8f9fa; padding: 1rem; border-radius: 4px; margin: 1rem 0;">
                        <input type="text" value="${response.inviteLink}" readonly style="width: 100%; padding: 0.5rem;" id="inviteLink">
                    </div>
                    <div style="margin-top: 1rem;">
                        <button class="btn btn-primary" onclick="copyInviteLink()">📋 Copy Link</button>
                        <button class="btn btn-success" onclick="shareInviteLink('${response.inviteLink}', '${inviteData.email}')">📧 Share</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        closeModal('invitePlayerModal');
        document.getElementById('invitePlayerForm').reset();
        
        showNotification('Invite created successfully!', 'success');
        
    } catch (error) {
        console.error('Failed to create invite:', error);
        showNotification('Failed to create invite: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

function copyInviteLink() {
    const linkInput = document.getElementById('inviteLink');
    linkInput.select();
    navigator.clipboard.writeText(linkInput.value);
    showNotification('Invite link copied to clipboard!', 'success');
}

function shareInviteLink(link, email) {
    if (navigator.share) {
        navigator.share({
            title: 'Club Invitation',
            text: `You're invited to join our club!`,
            url: link
        });
    } else {
        // Fallback - open email client
        const subject = encodeURIComponent('You\'re invited to join our club!');
        const body = encodeURIComponent(`Hi!\n\nYou're invited to join our club on ClubHub.\n\nClick this link to accept: ${link}\n\nLooking forward to having you on the team!`);
        window.open(`mailto:${email}?subject=${subject}&body=${body}`);
    }
}
        // Generate first payment if monthly fee > 0
        if (playerData.monthlyFee > 0) {
            setTimeout(async () => {
                if (confirm(`Generate first monthly payment of £${playerData.monthlyFee} for ${response.player.first_name}?`)) {
                    await generatePlayerPayment(response.player.id, playerData.monthlyFee);
                }
            }, 1000);
        }
        
    } catch (error) {
        console.error('❌ Failed to add player:', error);
        showNotification(error.message || 'Failed to add player', 'error');
    } finally {
        showLoading(false);
    }
}

// FIXED PLAYER EDITING FUNCTIONALITY
async function editPlayer(playerId) {
    try {
        const player = AppState.players?.find(p => p.id === playerId);
        if (!player) {
            showNotification('Player not found', 'error');
            return;
        }
        
        // Create edit modal
        const modal = createEditModal('editPlayerModal', 'Edit Player', [
            { label: 'First Name', type: 'text', id: 'editPlayerFirstName', value: player.first_name },
            { label: 'Last Name', type: 'text', id: 'editPlayerLastName', value: player.last_name },
            { label: 'Email', type: 'email', id: 'editPlayerEmail', value: player.email || '' },
            { label: 'Phone', type: 'tel', id: 'editPlayerPhone', value: player.phone || '' },
            { label: 'Date of Birth', type: 'date', id: 'editPlayerDOB', value: player.date_of_birth },
            { label: 'Monthly Fee (£)', type: 'number', id: 'editPlayerFee', value: player.monthly_fee || 0 },
            { label: 'Position', type: 'text', id: 'editPlayerPosition', value: player.position || '' }
        ]);
        
        // Add submit handler
        const form = modal.querySelector('form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const updatedData = {
                firstName: document.getElementById('editPlayerFirstName').value,
                lastName: document.getElementById('editPlayerLastName').value,
                email: document.getElementById('editPlayerEmail').value,
                phone: document.getElementById('editPlayerPhone').value,
                dateOfBirth: document.getElementById('editPlayerDOB').value,
                monthlyFee: parseFloat(document.getElementById('editPlayerFee').value),
                position: document.getElementById('editPlayerPosition').value
            };
            
            try {
                const response = await apiService.updatePlayer(playerId, updatedData);
                
                // Update local state
                const playerIndex = AppState.players.findIndex(p => p.id === playerId);
                if (playerIndex !== -1) {
                    AppState.players[playerIndex] = { ...AppState.players[playerIndex], ...response.player };
                }
                
                closeModal('editPlayerModal');
                loadPlayers();
                showNotification('Player updated successfully!', 'success');
                
            } catch (error) {
                console.error('Failed to update player:', error);
                showNotification('Failed to update player', 'error');
            }
        });
        
    } catch (error) {
        console.error('Failed to open edit player modal:', error);
        showNotification('Failed to open edit form', 'error');
    }
}

// FIXED STAFF EDITING FUNCTIONALITY
async function editStaff(staffId) {
    try {
        const staff = AppState.staff?.find(s => s.id === staffId);
        if (!staff) {
            showNotification('Staff member not found', 'error');
            return;
        }
        
        // Create edit modal
        const modal = createEditModal('editStaffModal', 'Edit Staff Member', [
            { label: 'First Name', type: 'text', id: 'editStaffFirstName', value: staff.first_name },
            { label: 'Last Name', type: 'text', id: 'editStaffLastName', value: staff.last_name },
            { label: 'Email', type: 'email', id: 'editStaffEmail', value: staff.email },
            { label: 'Phone', type: 'tel', id: 'editStaffPhone', value: staff.phone || '' },
            { 
                label: 'Role', 
                type: 'select', 
                id: 'editStaffRole', 
                value: staff.role,
                options: [
                    { value: 'coach', text: 'Coach' },
                    { value: 'assistant-coach', text: 'Assistant Coach' },
                    { value: 'treasurer', text: 'Treasurer' },
                    { value: 'coaching-supervisor', text: 'Coaching Supervisor' },
                    { value: 'referee', text: 'Referee' },
                    { value: 'administrator', text: 'Administrator' }
                ]
            }
        ]);
        
        // Add permissions checkboxes
        const permissionsDiv = document.createElement('div');
        permissionsDiv.className = 'form-group';
        permissionsDiv.innerHTML = `
            <label>Permissions</label>
            <div class="checkbox-group">
                <label><input type="checkbox" name="editPermissions" value="finances" ${staff.permissions?.includes('finances') ? 'checked' : ''}> View Finances</label>
                <label><input type="checkbox" name="editPermissions" value="players" ${staff.permissions?.includes('players') ? 'checked' : ''}> Manage Players</label>
                <label><input type="checkbox" name="editPermissions" value="events" ${staff.permissions?.includes('events') ? 'checked' : ''}> Manage Events</label>
                <label><input type="checkbox" name="editPermissions" value="listings" ${staff.permissions?.includes('listings') ? 'checked' : ''}> Manage Listings</label>
            </div>
        `;
        modal.querySelector('form').insertBefore(permissionsDiv, modal.querySelector('form').lastElementChild);
        
        // Add submit handler
        const form = modal.querySelector('form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const permissions = Array.from(document.querySelectorAll('input[name="editPermissions"]:checked'))
                                    .map(cb => cb.value);
            
            const updatedData = {
                firstName: document.getElementById('editStaffFirstName').value,
                lastName: document.getElementById('editStaffLastName').value,
                email: document.getElementById('editStaffEmail').value,
                phone: document.getElementById('editStaffPhone').value,
                role: document.getElementById('editStaffRole').value,
                permissions: permissions
            };
            
            try {
                const response = await apiService.updateStaff(staffId, updatedData);
                
                // Update local state
                const staffIndex = AppState.staff.findIndex(s => s.id === staffId);
                if (staffIndex !== -1) {
                    AppState.staff[staffIndex] = { ...AppState.staff[staffIndex], ...response.staff };
                }
                
                closeModal('editStaffModal');
                loadStaff();
                showNotification('Staff member updated successfully!', 'success');
                
            } catch (error) {
                console.error('Failed to update staff:', error);
                showNotification('Failed to update staff member', 'error');
            }
        });
        
    } catch (error) {
        console.error('Failed to open edit staff modal:', error);
        showNotification('Failed to open edit form', 'error');
    }
}

// FIXED EVENT EDITING FUNCTIONALITY
async function editEvent(eventId) {
    try {
        const event = AppState.events?.find(e => e.id === eventId);
        if (!event) {
            showNotification('Event not found', 'error');
            return;
        }
        
        // Create edit modal
        const modal = createEditModal('editEventModal', 'Edit Event', [
            { label: 'Event Title', type: 'text', id: 'editEventTitle', value: event.title },
            { 
                label: 'Event Type', 
                type: 'select', 
                id: 'editEventType', 
                value: event.event_type,
                options: [
                    { value: 'training', text: 'Training Session' },
                    { value: 'match', text: 'Match' },
                    { value: 'tournament', text: 'Tournament' },
                    { value: 'camp', text: 'Training Camp' },
                    { value: 'social', text: 'Social Event' }
                ]
            },
            { label: 'Date', type: 'date', id: 'editEventDate', value: event.event_date },
            { label: 'Time', type: 'time', id: 'editEventTime', value: event.event_time || '' },
            { label: 'Location', type: 'text', id: 'editEventLocation', value: event.location || '' },
            { label: 'Price (£)', type: 'number', id: 'editEventPrice', value: event.price || 0 },
            { label: 'Capacity', type: 'number', id: 'editEventCapacity', value: event.capacity || '' },
            { label: 'Description', type: 'textarea', id: 'editEventDescription', value: event.description || '' }
        ]);
        
        // Add submit handler
        const form = modal.querySelector('form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const updatedData = {
                title: document.getElementById('editEventTitle').value,
                eventType: document.getElementById('editEventType').value,
                eventDate: document.getElementById('editEventDate').value,
                eventTime: document.getElementById('editEventTime').value,
                location: document.getElementById('editEventLocation').value,
                price: parseFloat(document.getElementById('editEventPrice').value) || 0,
                capacity: parseInt(document.getElementById('editEventCapacity').value) || null,
                description: document.getElementById('editEventDescription').value
            };
            
            try {
                const response = await apiService.updateEvent(eventId, updatedData);
                
                // Update local state
                const eventIndex = AppState.events.findIndex(e => e.id === eventId);
                if (eventIndex !== -1) {
                    AppState.events[eventIndex] = { ...AppState.events[eventIndex], ...response.event };
                }
                
                closeModal('editEventModal');
                loadEvents();
                showNotification('Event updated successfully!', 'success');
                
            } catch (error) {
                console.error('Failed to update event:', error);
                showNotification('Failed to update event', 'error');
            }
        });
        
    } catch (error) {
        console.error('Failed to open edit event modal:', error);
        showNotification('Failed to open edit form', 'error');
    }
}

// UTILITY FUNCTION TO CREATE EDIT MODALS
function createEditModal(modalId, title, fields) {
    // Remove existing modal if present
    const existingModal = document.getElementById(modalId);
    if (existingModal) {
        existingModal.remove();
    }
    
    const modal = document.createElement('div');
    modal.id = modalId;
    modal.className = 'modal';
    modal.style.display = 'block';
    
    let fieldsHtml = '';
    fields.forEach(field => {
        if (field.type === 'select') {
            let optionsHtml = '';
            field.options.forEach(option => {
                optionsHtml += `<option value="${option.value}" ${field.value === option.value ? 'selected' : ''}>${option.text}</option>`;
            });
            fieldsHtml += `
                <div class="form-group">
                    <label for="${field.id}">${field.label}</label>
                    <select id="${field.id}" required>
                        ${optionsHtml}
                    </select>
                </div>
            `;
        } else if (field.type === 'textarea') {
            fieldsHtml += `
                <div class="form-group">
                    <label for="${field.id}">${field.label}</label>
                    <textarea id="${field.id}" rows="3">${field.value}</textarea>
                </div>
            `;
        } else {
            fieldsHtml += `
                <div class="form-group">
                    <label for="${field.id}">${field.label}</label>
                    <input type="${field.type}" id="${field.id}" value="${field.value}" ${field.type === 'text' || field.type === 'email' ? 'required' : ''}>
                </div>
            `;
        }
    });
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>${title}</h2>
                <button class="close" onclick="closeModal('${modalId}')">&times;</button>
            </div>
            <form>
                ${fieldsHtml}
                <button type="submit" class="btn btn-primary">Update</button>
                <button type="button" class="btn btn-secondary" onclick="closeModal('${modalId}')">Cancel</button>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    return modal;
}

// FIXED PAYMENT GENERATION
async function generatePlayerPayment(playerId, amount) {
    try {
        const paymentData = {
            playerId: playerId,
            amount: amount,
            paymentType: 'monthly_fee',
            description: `Monthly Club Fee - ${new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}`,
            dueDate: new Date().toISOString().split('T')[0]
        };
        
        const response = await apiService.createPayment(paymentData);
        
        // Update local payments state
        if (!AppState.payments) AppState.payments = [];
        AppState.payments.push(response.payment);
        
        showNotification('Payment generated successfully!', 'success');
        loadFinances();
        
    } catch (error) {
        console.error('❌ Failed to generate payment:', error);
        showNotification('Failed to generate payment', 'error');
    }
}

// CREATE TEAM
async function handleAddTeam(e) {
    e.preventDefault();
    console.log('⚽ Creating new team in database...');
    
    try {
        showLoading(true);
        
        const teamData = {
            name: document.getElementById('teamName')?.value || '',
            ageGroup: document.getElementById('teamAgeGroup')?.value || '',
            sport: document.getElementById('teamSport')?.value || 'football',
            description: document.getElementById('teamDescription')?.value || '',
            clubId: AppState.clubs?.[0]?.id
        };
        
        if (!teamData.name) {
            showNotification('Please enter a team name', 'error');
            return;
        }
        
        if (!teamData.clubId) {
            showNotification('Please create a club profile first', 'error');
            return;
        }
        
        const response = await apiService.createTeam(teamData);
        
        if (!AppState.teams) AppState.teams = [];
        AppState.teams.push(response.team);
        
        closeModal('addTeamModal');
        loadTeams();
        
        document.getElementById('addTeamForm')?.reset();
        
        showNotification(`Team "${response.team.name}" created successfully!`, 'success');
        
    } catch (error) {
        console.error('❌ Failed to create team:', error);
        showNotification(error.message || 'Failed to create team', 'error');
    } finally {
        showLoading(false);
    }
}

// CREATE EVENT WITH PAYMENT CAPABILITY
async function handleAddEvent(e) {
    e.preventDefault();
    console.log('📅 Creating new event in database...');
    
    try {
        showLoading(true);
        
        const eventData = {
            title: document.getElementById('eventTitle')?.value || '',
            eventType: document.getElementById('eventType')?.value || '',
            eventDate: document.getElementById('eventDate')?.value || '',
            eventTime: document.getElementById('eventTime')?.value || '',
            price: parseFloat(document.getElementById('eventPrice')?.value) || 0,
            capacity: parseInt(document.getElementById('eventCapacity')?.value) || null,
            description: document.getElementById('eventDescription')?.value || '',
            clubId: AppState.clubs?.[0]?.id,
            paymentRequired: parseFloat(document.getElementById('eventPrice')?.value) > 0
        };
        
        if (!eventData.title || !eventData.eventType || !eventData.eventDate) {
            showNotification('Please fill in all required fields', 'error');
            return;
        }
        
        if (!eventData.clubId) {
            showNotification('Please create a club profile first', 'error');
            return;
        }
        
        const response = await apiService.createEvent(eventData);
        
        if (!AppState.events) AppState.events = [];
        AppState.events.push(response.event);
        
        closeModal('addEventModal');
        loadEvents();
        loadDashboardStats();
        
        document.getElementById('addEventForm')?.reset();
        
        showNotification(`Event "${response.event.title}" created successfully!`, 'success');
        
    } catch (error) {
        console.error('❌ Failed to create event:', error);
        showNotification(error.message || 'Failed to create event', 'error');
    } finally {
        showLoading(false);
    }
}

// ADD STAFF
async function handleAddStaff(e) {
    e.preventDefault();
    console.log('👨‍💼 Adding new staff member to database...');
    
    try {
        showLoading(true);
        
        const permissions = Array.from(document.querySelectorAll('input[name="permissions"]:checked'))
                                .map(cb => cb.value);
        
        const staffData = {
            firstName: document.getElementById('staffFirstName')?.value || '',
            lastName: document.getElementById('staffLastName')?.value || '',
            role: document.getElementById('staffRole')?.value || '',
            email: document.getElementById('staffEmail')?.value || '',
            phone: document.getElementById('staffPhone')?.value || '',
            permissions: permissions,
            clubId: AppState.clubs?.[0]?.id
        };
        
        if (!staffData.firstName || !staffData.lastName || !staffData.role || !staffData.email) {
            showNotification('Please fill in all required fields', 'error');
            return;
        }
        
        if (!staffData.clubId) {
            showNotification('Please create a club profile first', 'error');
            return;
        }
        
        const response = await apiService.createStaff(staffData);
        
        if (!AppState.staff) AppState.staff = [];
        AppState.staff.push(response.staff);
        
        closeModal('addStaffModal');
        loadStaff();
        loadDashboardStats();
        
        document.getElementById('addStaffForm')?.reset();
        
        showNotification(`Staff member ${response.staff.first_name} ${response.staff.last_name} added successfully!`, 'success');
        
    } catch (error) {
        console.error('❌ Failed to add staff:', error);
        showNotification(error.message || 'Failed to add staff', 'error');
    } finally {
        showLoading(false);
    }
}

// LOAD PLAYERS WITH IMPROVED CLUB ASSIGNMENT DISPLAY
function loadPlayers() {
    console.log('👥 Loading players...');
    
    const clubPlayers = AppState.players || [];
    const tableBody = document.getElementById('playersTableBody');
    
    if (!tableBody) return;
    
    if (clubPlayers.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7">No players registered yet</td></tr>';
        return;
    }
    
    tableBody.innerHTML = clubPlayers.map(player => {
        // Show club membership - FIXED
        const club = AppState.clubs?.find(c => c.id === player.club_id);
        const clubName = club ? club.name : 'No Club Assigned';
        const clubStatus = club ? 'Active Member' : 'Not Assigned';
        
        // Show team assignments
        let teamNames = 'Unassigned';
        let assignedTeamsCount = 0;
        
        if (player.team_assignments && Array.isArray(player.team_assignments) && player.team_assignments.length > 0) {
            const validAssignments = player.team_assignments.filter(assignment => assignment.team_id);
            if (validAssignments.length > 0) {
                teamNames = validAssignments.map(assignment => assignment.team_name).join(', ');
                assignedTeamsCount = validAssignments.length;
            }
        }
        
        return `
            <tr>
                <td>
                    <div>
                        <strong>${player.first_name} ${player.last_name}</strong>
                        <br><small style="color: #28a745; font-weight: bold;">🏢 ${clubName}</small>
                        <br><small style="color: #666;">Status: ${clubStatus}</small>
                        ${player.user_id ? '<br><small style="color: #007bff;">🔗 Account Linked</small>' : '<br><small style="color: #dc3545;">⚠️ No Account Link</small>'}
                    </div>
                </td>
                <td>${calculateAge(player.date_of_birth)} years</td>
                <td>${player.email || 'No email'}</td>
                <td><span class="status-badge status-${player.payment_status || 'pending'}">${player.payment_status || 'pending'}</span></td>
                <td>
                    <span style="color: ${assignedTeamsCount > 0 ? '#28a745' : '#dc3545'};">
                        ${assignedTeamsCount} team${assignedTeamsCount !== 1 ? 's' : ''}
                    </span>
                    <br><small>${teamNames}</small>
                </td>
                <td>£${player.monthly_fee || 0}</td>
                <td>
                    <button class="btn btn-small btn-secondary" onclick="editPlayer('${player.id}')">Edit</button>
                    ${assignedTeamsCount === 0 ? `
                        <button class="btn btn-small btn-primary" onclick="showPlayerTeamAssignment('${player.id}')">Assign Team</button>
                    ` : ''}
                    <button class="btn btn-small btn-success" onclick="generatePaymentForPlayer('${player.id}')">💳 Payment</button>
                    <button class="btn btn-small btn-danger" onclick="removePlayer('${player.id}')">Remove</button>
                </td>
            </tr>
        `;
    }).join('');
}

// Dashboard Stats
function loadDashboardStats() {
    console.log('📊 Loading dashboard stats...');
    
    const totalPlayers = AppState.players?.length || 0;
    const totalStaff = AppState.staff?.length || 0;
    const totalEvents = AppState.events?.length || 0;
    const totalTeams = AppState.teams?.length || 0;
    
    // Calculate monthly revenue
    const monthlyRevenue = AppState.players?.reduce((total, player) => {
        return total + (player.monthly_fee || 0);
    }, 0) || 0;
    
    // Update stats
    const totalPlayersEl = document.getElementById('totalPlayers');
    const totalStaffEl = document.getElementById('totalStaff');
    const totalEventsEl = document.getElementById('totalEvents');
    const totalRevenueEl = document.getElementById('totalRevenue');
    
    if (totalPlayersEl) totalPlayersEl.textContent = totalPlayers;
    if (totalStaffEl) totalStaffEl.textContent = totalStaff;
    if (totalEventsEl) totalEventsEl.textContent = totalEvents;
    if (totalRevenueEl) totalRevenueEl.textContent = formatCurrency(monthlyRevenue);
    
    loadUpcomingEvents();
}

function loadUpcomingEvents() {
    const upcomingContainer = document.getElementById('upcomingEvents');
    if (!upcomingContainer) return;
    
    const now = new Date();
    const upcoming = AppState.events?.filter(e => new Date(e.event_date) > now)
                                   .sort((a, b) => new Date(a.event_date) - new Date(b.event_date))
                                   .slice(0, 3) || [];
    
    if (upcoming.length === 0) {
        upcomingContainer.innerHTML = '<p>No upcoming events</p>';
        return;
    }
    
    upcomingContainer.innerHTML = upcoming.map(event => `
        <div class="item-list-item">
            <div class="item-info">
                <h4>${event.title}</h4>
                <p>${formatDate(event.event_date)}${event.event_time ? ` at ${event.event_time}` : ''}</p>
            </div>
            <span class="status-badge status-active">${event.event_type}</span>
        </div>
    `).join('');
}

// EVENTS MANAGEMENT WITH PAYMENT DISPLAY
function loadEvents() {
    console.log('📅 Loading events...');
    
    const clubEvents = AppState.events || [];
    const eventsContainer = document.getElementById('eventsContainer');
    
    if (!eventsContainer) return;
    
    if (clubEvents.length === 0) {
        eventsContainer.innerHTML = '<div class="card"><p>No events created yet</p></div>';
        return;
    }
    
    eventsContainer.innerHTML = clubEvents.map(event => `
        <div class="card">
            <h3>${event.title}</h3>
            <p><strong>Type:</strong> ${event.event_type}</p>
            <p><strong>Date:</strong> ${formatDate(event.event_date)}${event.event_time ? ` at ${event.event_time}` : ''}</p>
            <p><strong>Price:</strong> ${formatCurrency(event.price || 0)} ${event.price > 0 ? '💳' : '🆓'}</p>
            <p><strong>Capacity:</strong> ${event.capacity || 'Unlimited'}</p>
            <p><strong>Bookings:</strong> ${event.booking_count || 0}/${event.capacity || '∞'}</p>
            <p>${event.description || ''}</p>
            
            ${event.price > 0 ? `
                <div style="background: #e8f5e8; padding: 0.5rem; border-radius: 4px; margin: 0.5rem 0;">
                    <small>💰 <strong>Paid Event:</strong> Players will be charged ${formatCurrency(event.price)} to book</small>
                </div>
            ` : ''}
            
            <div class="item-actions">
                <button class="btn btn-small btn-secondary" onclick="editEvent('${event.id}')">Edit</button>
                <button class="btn btn-small btn-danger" onclick="removeEvent('${event.id}')">Delete</button>
                <button class="btn btn-small btn-primary" onclick="viewEventBookings('${event.id}')">View Bookings</button>
                ${event.price > 0 ? `<button class="btn btn-small btn-info" onclick="viewEventPayments('${event.id}')">💳 Payments</button>` : ''}
            </div>
        </div>
    `).join('');
}

// TEAM MANAGEMENT WITH PLAYER DISPLAY
function loadTeams() {
    console.log('⚽ Loading teams...');
    
    const clubTeams = AppState.teams || [];
    const teamsContainer = document.getElementById('teamsContainer');
    
    if (!teamsContainer) return;
    
    if (clubTeams.length === 0) {
        teamsContainer.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 2rem;">
                <p>No teams created yet</p>
                <button class="btn btn-primary" onclick="showModal('addTeamModal')">
                    Create First Team
                </button>
            </div>
        `;
        return;
    }
    
    teamsContainer.innerHTML = clubTeams.map(team => {
        const teamPlayers = team.players || [];
        const playerCount = teamPlayers.filter(p => p.id).length;
        
        return `
            <div class="card">
                <h4>${team.name}</h4>
                <p><strong>Age Group:</strong> ${team.age_group || 'Not specified'}</p>
                <p><strong>Sport:</strong> ${team.sport || 'Football'}</p>
                <p><strong>Description:</strong> ${team.description || 'No description'}</p>
                <p><strong>Record:</strong> ${team.wins || 0}W - ${team.draws || 0}D - ${team.losses || 0}L</p>
                <p><strong>Players:</strong> <span style="color: ${playerCount > 0 ? '#28a745' : '#dc3545'};">${playerCount} assigned</span></p>
                
                ${team.coach_first_name ? `
                    <div style="background: #e8f5e8; padding: 0.5rem; border-radius: 4px; margin: 0.5rem 0;">
                        <strong>Coach:</strong> ${team.coach_first_name} ${team.coach_last_name}
                    </div>
                ` : '<p style="color: #dc3545;"><strong>Coach:</strong> Not assigned</p>'}
                
                ${playerCount > 0 ? `
                    <div style="margin-top: 1rem; padding: 0.5rem; background: #f8f9fa; border-radius: 4px;">
                        <strong>Team Members:</strong>
                        <ul style="margin: 0.5rem 0; list-style: none; padding: 0;">
                            ${teamPlayers.filter(p => p.id).slice(0, 5).map(player => 
                                `<li style="padding: 0.2rem 0;">
                                    ${player.first_name} ${player.last_name}
                                    ${player.position ? ` - ${player.position}` : ''}
                                    ${player.jersey_number ? ` (#${player.jersey_number})` : ''}
                                </li>`
                            ).join('')}
                            ${playerCount > 5 ? `<li style="color: #666; font-style: italic;">... and ${playerCount - 5} more</li>` : ''}
                        </ul>
                    </div>
                ` : ''}
                
                <div class="item-actions">
                    <button class="btn btn-small btn-secondary" onclick="viewTeam('${team.id}')">View Details</button>
                    <button class="btn btn-small btn-primary" onclick="manageTeamPlayers('${team.id}')">Manage Players</button>
                    <button class="btn btn-small btn-danger" onclick="removeTeam('${team.id}')">Remove</button>
                </div>
            </div>
        `;
    }).join('');
}

// FINANCES WITH REAL PAYMENT PROCESSING
function loadFinances() {
    console.log('💰 Loading finances...');
    
    const clubPlayers = AppState.players || [];
    const clubPayments = AppState.payments || [];
    
    // Calculate financial stats
    const monthlyRevenue = clubPlayers.reduce((total, player) => {
        return total + (player.monthly_fee || 0);
    }, 0);
    
    const overdueAmount = clubPayments
        .filter(p => p.payment_status === 'overdue')
        .reduce((total, payment) => total + (parseFloat(payment.amount) || 0), 0);
    
    const pendingAmount = clubPayments
        .filter(p => p.payment_status === 'pending')
        .reduce((total, payment) => total + (parseFloat(payment.amount) || 0), 0);
    
    const paidAmount = clubPayments
        .filter(p => p.payment_status === 'paid')
        .reduce((total, payment) => total + (parseFloat(payment.amount) || 0), 0);
    
    const payingMembers = clubPlayers.filter(p => p.payment_status === 'paid').length;
    
    // Update financial stats
    const monthlyRevenueEl = document.getElementById('monthlyRevenue');
    const overdueAmountEl = document.getElementById('overdueAmount');
    const pendingAmountEl = document.getElementById('pendingAmount');
    const totalMembersEl = document.getElementById('totalMembers');
    
    if (monthlyRevenueEl) monthlyRevenueEl.textContent = formatCurrency(monthlyRevenue);
    if (overdueAmountEl) overdueAmountEl.textContent = formatCurrency(overdueAmount);
    if (pendingAmountEl) pendingAmountEl.textContent = formatCurrency(pendingAmount);
    if (totalMembersEl) totalMembersEl.textContent = payingMembers;
    
    loadPaymentsTable(clubPayments);
}

function loadPaymentsTable(payments) {
    const tableBody = document.getElementById('paymentsTableBody');
    if (!tableBody) return;
    
    if (payments.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5">No payment records found</td></tr>';
        return;
    }
    
    tableBody.innerHTML = payments.map(payment => {
        return `
            <tr>
                <td>${payment.player_first_name} ${payment.player_last_name}</td>
                <td>${formatCurrency(payment.amount || 0)}</td>
                <td>${formatDate(payment.due_date)}</td>
                <td><span class="status-badge status-${payment.payment_status}">${payment.payment_status}</span></td>
                <td>
                    ${payment.payment_status !== 'paid' ? `
                        <button class="btn btn-small btn-primary" onclick="processPaymentAdmin('${payment.id}')">Mark Paid</button>
                        <button class="btn btn-small btn-info" onclick="sendPaymentLink('${payment.id}')">Send Link</button>
                    ` : `
                        <span style="color: #28a745;">✅ Paid</span>
                    `}
                    <button class="btn btn-small btn-secondary" onclick="sendReminder('${payment.id}')">Reminder</button>
                </td>
            </tr>
        `;
    }).join('');
}

// STAFF MANAGEMENT
function loadStaff() {
    console.log('👨‍💼 Loading staff...');
    
    const clubStaff = AppState.staff || [];
    const tableBody = document.getElementById('staffTableBody');
    
    if (!tableBody) return;
    
    if (clubStaff.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5">No staff members added yet</td></tr>';
        return;
    }
    
    tableBody.innerHTML = clubStaff.map(staff => `
        <tr>
            <td>${staff.first_name} ${staff.last_name}</td>
            <td>${staff.role}</td>
            <td>${staff.permissions?.join(', ') || 'None'}</td>
            <td>${staff.email}</td>
            <td>
                <button class="btn btn-small btn-secondary" onclick="editStaff('${staff.id}')">Edit</button>
                <button class="btn btn-small btn-danger" onclick="removeStaff('${staff.id}')">Remove</button>
            </td>
        </tr>
    `).join('');
}

// GENERATE PAYMENT FOR SPECIFIC PLAYER
async function generatePaymentForPlayer(playerId) {
    const player = AppState.players?.find(p => p.id === playerId);
    if (!player) return;
    
    if (player.monthly_fee <= 0) {
        showNotification('Player has no monthly fee set', 'error');
        return;
    }
    
    if (confirm(`Generate payment of £${player.monthly_fee} for ${player.first_name} ${player.last_name}?`)) {
        await generatePlayerPayment(playerId, player.monthly_fee);
    }
}

// PROCESS PAYMENT AS ADMIN - WITH STRIPE INTEGRATION
async function processPaymentAdmin(paymentId) {
    const payment = AppState.payments?.find(p => p.id === paymentId);
    if (!payment) return;
    
    // Show payment options modal
    const modal = createPaymentProcessModal(payment);
    document.body.appendChild(modal);
}

function createPaymentProcessModal(payment) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.id = 'processPaymentModal';
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Process Payment</h2>
                <button class="close" onclick="closeModal('processPaymentModal')">&times;</button>
            </div>
            <div class="modal-body">
                <p><strong>Player:</strong> ${payment.player_first_name} ${payment.player_last_name}</p>
                <p><strong>Amount:</strong> ${formatCurrency(payment.amount)}</p>
                <p><strong>Description:</strong> ${payment.description}</p>
                
                <div style="margin: 2rem 0;">
                    <h3>How would you like to process this payment?</h3>
                    
                    <button class="btn btn-primary" onclick="markAsPaidManually('${payment.id}')" style="margin: 0.5rem; width: 100%;">
                        ✅ Mark as Paid (Manual)
                    </button>
                    
                    <button class="btn btn-success" onclick="sendStripePaymentLink('${payment.id}')" style="margin: 0.5rem; width: 100%;">
                        💳 Send Stripe Payment Link
                    </button>
                    
                    <button class="btn btn-info" onclick="processWithStripe('${payment.id}')" style="margin: 0.5rem; width: 100%;">
                        🔗 Process with Stripe (Admin)
                    </button>
                </div>
            </div>
        </div>
    `;
    
    return modal;
}

async function markAsPaidManually(paymentId) {
    if (confirm('Mark this payment as paid manually?')) {
        try {
            await apiService.markPaymentAsPaid(paymentId);
            showNotification('Payment marked as paid!', 'success');
            
            const dashboardData = await apiService.getAdminDashboardData();
            AppState.payments = dashboardData.payments || [];
            AppState.players = dashboardData.players || [];
            
            closeModal('processPaymentModal');
            loadFinances();
            loadPlayers();
            
        } catch (error) {
            console.error('❌ Failed to process payment:', error);
            showNotification('Failed to process payment', 'error');
        }
    }
}

async function sendStripePaymentLink(paymentId) {
    try {
        const response = await apiService.generatePaymentLink(paymentId);
        
        if (navigator.share) {
            await navigator.share({
                title: 'Payment Link',
                text: `Payment link for ${response.player.name}`,
                url: response.paymentLink
            });
        } else {
            navigator.clipboard.writeText(response.paymentLink);
            showNotification('Payment link copied to clipboard!', 'success');
        }
        
        closeModal('processPaymentModal');
        
    } catch (error) {
        console.error('Failed to generate payment link:', error);
        showNotification('Failed to generate payment link', 'error');
    }
}

async function processWithStripe(paymentId) {
    const payment = AppState.payments?.find(p => p.id === paymentId);
    if (!payment) return;
    
    closeModal('processPaymentModal');
    
    // Create Stripe payment modal
    const onSuccess = async (result) => {
        try {
            await apiService.confirmPayment(result.id, paymentId);
            showNotification('Payment processed successfully!', 'success');
            
            const dashboardData = await apiService.getAdminDashboardData();
            AppState.payments = dashboardData.payments || [];
            AppState.players = dashboardData.players || [];
            
            loadFinances();
            loadPlayers();
        } catch (error) {
            console.error('Failed to confirm payment:', error);
            showNotification('Failed to confirm payment', 'error');
        }
    };
    
    createPaymentModal(payment.amount, payment.description, onSuccess);
}

// SEND PAYMENT LINK
async function sendPaymentLink(paymentId) {
    const payment = AppState.payments?.find(p => p.id === paymentId);
    if (!payment) return;
    
    try {
        const response = await apiService.generatePaymentLink(paymentId);
        
        if (navigator.share) {
            await navigator.share({
                title: 'Payment Link',
                text: `Payment link for ${response.player.name}`,
                url: response.paymentLink
            });
        } else {
            navigator.clipboard.writeText(response.paymentLink);
            showNotification('Payment link copied to clipboard!', 'success');
        }
    } catch (error) {
        console.error('Failed to generate payment link:', error);
        showNotification('Failed to generate payment link', 'error');
    }
}

// ENHANCED REMOVAL FUNCTIONS
async function removePlayer(playerId) {
    if (confirm('Are you sure you want to remove this player?')) {
        try {
            await apiService.deletePlayer(playerId);
            AppState.players = AppState.players?.filter(p => p.id !== playerId) || [];
            loadPlayers();
            loadDashboardStats();
            showNotification('Player removed successfully', 'success');
        } catch (error) {
            console.error('Failed to remove player:', error);
            showNotification('Failed to remove player', 'error');
        }
    }
}

async function removeStaff(staffId) {
    if (confirm('Are you sure you want to remove this staff member?')) {
        try {
            await apiService.deleteStaff(staffId);
            AppState.staff = AppState.staff?.filter(s => s.id !== staffId) || [];
            loadStaff();
            loadDashboardStats();
            showNotification('Staff member removed successfully', 'success');
        } catch (error) {
            console.error('Failed to remove staff:', error);
            showNotification('Failed to remove staff', 'error');
        }
    }
}

async function removeTeam(teamId) {
    if (confirm('Are you sure you want to remove this team?')) {
        try {
            await apiService.deleteTeam(teamId);
            AppState.teams = AppState.teams?.filter(t => t.id !== teamId) || [];
            loadTeams();
            showNotification('Team removed successfully', 'success');
        } catch (error) {
            console.error('Failed to remove team:', error);
            showNotification('Failed to remove team', 'error');
        }
    }
}

async function removeEvent(eventId) {
    if (confirm('Are you sure you want to delete this event?')) {
        try {
            await apiService.deleteEvent(eventId);
            AppState.events = AppState.events?.filter(e => e.id !== eventId) || [];
            loadEvents();
            loadDashboardStats();
            showNotification('Event deleted successfully', 'success');
        } catch (error) {
            console.error('Failed to delete event:', error);
            showNotification('Failed to delete event', 'error');
        }
    }
}

// TEAM PLAYER ASSIGNMENT - NEW FUNCTIONALITY
async function showPlayerTeamAssignment(playerId) {
    const player = AppState.players?.find(p => p.id === playerId);
    if (!player) return;
    
    const availableTeams = AppState.teams || [];
    
    if (availableTeams.length === 0) {
        showNotification('No teams available. Create a team first.', 'info');
        return;
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.id = 'playerTeamAssignmentModal';
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Assign ${player.first_name} ${player.last_name} to Team</h2>
                <button class="close" onclick="closeModal('playerTeamAssignmentModal')">&times;</button>
            </div>
            <form id="teamAssignmentForm">
                <div class="form-group">
                    <label for="selectTeam">Select Team</label>
                    <select id="selectTeam" required>
                        <option value="">Choose a team...</option>
                        ${availableTeams.map(team => `
                            <option value="${team.id}">${team.name} (${team.age_group || 'No age group'})</option>
                        `).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label for="playerPosition">Position</label>
                    <input type="text" id="playerPosition" placeholder="e.g., Forward, Midfielder, Defender">
                </div>
                <div class="form-group">
                    <label for="jerseyNumber">Jersey Number</label>
                    <input type="number" id="jerseyNumber" min="1" max="99" placeholder="Optional">
                </div>
                <button type="submit" class="btn btn-primary">Assign to Team</button>
                <button type="button" class="btn btn-secondary" onclick="closeModal('playerTeamAssignmentModal')">Cancel</button>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('teamAssignmentForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const teamId = document.getElementById('selectTeam').value;
        const position = document.getElementById('playerPosition').value;
        const jerseyNumber = document.getElementById('jerseyNumber').value;
        
        try {
            await apiService.assignPlayerToTeam(teamId, {
                playerId: playerId,
                position: position,
                jerseyNumber: jerseyNumber ? parseInt(jerseyNumber) : null
            });
            
            closeModal('playerTeamAssignmentModal');
            
            // Refresh data
            const dashboardData = await apiService.getAdminDashboardData();
            AppState.players = dashboardData.players || [];
            AppState.teams = dashboardData.teams || [];
            
            loadPlayers();
            loadTeams();
            
            showNotification('Player assigned to team successfully!', 'success');
            
        } catch (error) {
            console.error('Failed to assign player to team:', error);
            showNotification('Failed to assign player to team', 'error');
        }
    });
}

// TEAM MANAGEMENT FUNCTIONALITY
async function manageTeamPlayers(teamId) {
    const team = AppState.teams?.find(t => t.id === teamId);
    if (!team) return;
    
    const availablePlayers = AppState.players?.filter(p => {
        // Get players not assigned to this team
        const isInTeam = p.team_assignments?.some(ta => ta.team_id === teamId);
        return !isInTeam;
    }) || [];
    
    const teamPlayers = team.players || [];
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.id = 'manageTeamPlayersModal';
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 800px;">
            <div class="modal-header">
                <h2>Manage Players - ${team.name}</h2>
                <button class="close" onclick="closeModal('manageTeamPlayersModal')">&times;</button>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; padding: 1rem;">
                <div>
                    <h3>Current Team Players</h3>
                    <div id="currentTeamPlayers">
                        ${teamPlayers.length > 0 ? teamPlayers.map(player => `
                            <div class="player-item" style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem; border: 1px solid #ddd; margin: 0.5rem 0; border-radius: 4px;">
                                <div>
                                    <strong>${player.first_name} ${player.last_name}</strong>
                                    ${player.position ? `<br><small>Position: ${player.position}</small>` : ''}
                                    ${player.jersey_number ? `<br><small>Jersey: #${player.jersey_number}</small>` : ''}
                                </div>
                                <button class="btn btn-small btn-danger" onclick="removePlayerFromTeam('${teamId}', '${player.id}')">Remove</button>
                            </div>
                        `).join('') : '<p>No players assigned yet</p>'}
                    </div>
                </div>
                <div>
                    <h3>Available Players</h3>
                    <div id="availableTeamPlayers">
                        ${availablePlayers.length > 0 ? availablePlayers.map(player => `
                            <div class="player-item" style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem; border: 1px solid #ddd; margin: 0.5rem 0; border-radius: 4px;">
                                <div>
                                    <strong>${player.first_name} ${player.last_name}</strong>
                                    <br><small>Age: ${calculateAge(player.date_of_birth)}</small>
                                </div>
                                <button class="btn btn-small btn-primary" onclick="addPlayerToTeam('${teamId}', '${player.id}')">Add</button>
                            </div>
                        `).join('') : '<p>No available players</p>'}
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

async function addPlayerToTeam(teamId, playerId) {
    try {
        await apiService.assignPlayerToTeam(teamId, { playerId: playerId });
        
        // Refresh data
        const dashboardData = await apiService.getAdminDashboardData();
        AppState.players = dashboardData.players || [];
        AppState.teams = dashboardData.teams || [];
        
        closeModal('manageTeamPlayersModal');
        loadPlayers();
        loadTeams();
        
        showNotification('Player added to team successfully!', 'success');
        
    } catch (error) {
        console.error('Failed to add player to team:', error);
        showNotification('Failed to add player to team', 'error');
    }
}

async function removePlayerFromTeam(teamId, playerId) {
    if (confirm('Remove this player from the team?')) {
        try {
            await apiService.removePlayerFromTeam(teamId, playerId);
            
            // Refresh data
            const dashboardData = await apiService.getAdminDashboardData();
            AppState.players = dashboardData.players || [];
            AppState.teams = dashboardData.teams || [];
            
            closeModal('manageTeamPlayersModal');
            loadPlayers();
            loadTeams();
            
            showNotification('Player removed from team successfully!', 'success');
            
        } catch (error) {
            console.error('Failed to remove player from team:', error);
            showNotification('Failed to remove player from team', 'error');
        }
    }
}

// UTILITY FUNCTIONS
function calculateAge(dateOfBirth) {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    
    return age;
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: 'GBP'
    }).format(amount);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// VIEW FUNCTIONS - NOW FULLY FUNCTIONAL
function viewTeam(teamId) {
    const team = AppState.teams?.find(t => t.id === teamId);
    if (!team) return;
    
    manageTeamPlayers(teamId);
}

async function viewEventBookings(eventId) {
    try {
        const response = await apiService.getEventBookings(eventId);
        
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        modal.id = 'eventBookingsModal';
        
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 800px;">
                <div class="modal-header">
                    <h2>Event Bookings - ${response.event.title}</h2>
                    <button class="close" onclick="closeModal('eventBookingsModal')">&times;</button>
                </div>
                <div class="modal-body">
                    <p><strong>Event Date:</strong> ${formatDate(response.event.event_date)}</p>
                    <p><strong>Capacity:</strong> ${response.event.capacity || 'Unlimited'}</p>
                    <p><strong>Total Bookings:</strong> ${response.bookings.length}</p>
                    
                    ${response.bookings.length > 0 ? `
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Booker</th>
                                    <th>Player</th>
                                    <th>Booking Date</th>
                                    <th>Status</th>
                                    <th>Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${response.bookings.map(booking => `
                                    <tr>
                                        <td>${booking.user_first_name} ${booking.user_last_name}</td>
                                        <td>${booking.player_first_name || booking.user_first_name} ${booking.player_last_name || booking.user_last_name}</td>
                                        <td>${formatDate(booking.booked_at)}</td>
                                        <td><span class="status-badge status-${booking.booking_status}">${booking.booking_status}</span></td>
                                        <td>${formatCurrency(booking.amount_paid || 0)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    ` : '<p>No bookings yet.</p>'}
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
    } catch (error) {
        console.error('Failed to load event bookings:', error);
        showNotification('Failed to load event bookings', 'error');
    }
}

async function viewEventPayments(eventId) {
    try {
        const payments = AppState.payments?.filter(p => p.event_id === eventId) || [];
        
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        modal.id = 'eventPaymentsModal';
        
        const event = AppState.events?.find(e => e.id === eventId);
        
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 800px;">
                <div class="modal-header">
                    <h2>Event Payments - ${event?.title || 'Unknown Event'}</h2>
                    <button class="close" onclick="closeModal('eventPaymentsModal')">&times;</button>
                </div>
                <div class="modal-body">
                    ${payments.length > 0 ? `
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Player</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                    <th>Due Date</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${payments.map(payment => `
                                    <tr>
                                        <td>${payment.player_first_name} ${payment.player_last_name}</td>
                                        <td>${formatCurrency(payment.amount)}</td>
                                        <td><span class="status-badge status-${payment.payment_status}">${payment.payment_status}</span></td>
                                        <td>${formatDate(payment.due_date)}</td>
                                        <td>
                                            ${payment.payment_status !== 'paid' ? `
                                                <button class="btn btn-small btn-primary" onclick="processPaymentAdmin('${payment.id}')">Process</button>
                                            ` : `
                                                <span style="color: #28a745;">✅ Paid</span>
                                            `}
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    ` : '<p>No payments for this event.</p>'}
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
    } catch (error) {
        console.error('Failed to load event payments:', error);
        showNotification('Failed to load event payments', 'error');
    }
}

function sendReminder(paymentId) {
    if (confirm('Send payment reminder to player?')) {
        apiService.sendPaymentReminder(paymentId)
            .then(() => showNotification('Payment reminder sent!', 'success'))
            .catch(() => showNotification('Failed to send reminder', 'error'));
    }
}

function filterPlayers() {
    loadPlayers();
}

async function loadTeamsForInvite() {
    try {
        const teams = await apiService.getTeams();
        const teamSelect = document.getElementById('inviteTeam');
        
        if (teamSelect && teams.length > 0) {
            teamSelect.innerHTML = '<option value="">No team assignment</option>';
            teams.forEach(team => {
                teamSelect.innerHTML += `<option value="${team.id}">${team.name} (${team.age_group || 'All ages'})</option>`;
            });
        }
    } catch (error) {
        console.warn('Failed to load teams:', error);
    }
}

// Export functions for global access
window.showSection = showSection;
window.removePlayer = removePlayer;
window.editPlayer = editPlayer;
window.removeStaff = removeStaff;
window.editStaff = editStaff;
window.removeEvent = removeEvent;
window.editEvent = editEvent;
window.viewEventBookings = viewEventBookings;
window.viewEventPayments = viewEventPayments;
window.removeTeam = removeTeam;
window.viewTeam = viewTeam;
window.manageTeamPlayers = manageTeamPlayers;
window.showPlayerTeamAssignment = showPlayerTeamAssignment;
window.generatePaymentForPlayer = generatePaymentForPlayer;
window.processPaymentAdmin = processPaymentAdmin;
window.sendPaymentLink = sendPaymentLink;
window.sendReminder = sendReminder;
window.filterPlayers = filterPlayers;
window.initializeAdminDashboard = initializeAdminDashboard;
window.markAsPaidManually = markAsPaidManually;
window.sendStripePaymentLink = sendStripePaymentLink;
window.processWithStripe = processWithStripe;
window.addPlayerToTeam = addPlayerToTeam;
window.removePlayerFromTeam = removePlayerFromTeam;

console.log('✅ FULLY FUNCTIONAL Admin Dashboard loaded with complete payment processing!');