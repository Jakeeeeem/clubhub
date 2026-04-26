/**
 * Tactical Logic Pro - Advanced Animation & Equipment Logic
 * Handles multi-frame tactical sequences, animations, and equipment management.
 */

const FORMATIONS = {
    "4-3-3": [
        { role: "GK", x: 50, y: 90 }, { role: "LB", x: 15, y: 70 }, { role: "CB", x: 38, y: 75 }, 
        { role: "CB", x: 62, y: 75 }, { role: "RB", x: 85, y: 70 }, { role: "CDM", x: 50, y: 55 }, 
        { role: "CM", x: 35, y: 45 }, { role: "CM", x: 65, y: 45 }, { role: "LW", x: 15, y: 25 }, 
        { role: "ST", x: 50, y: 15 }, { role: "RW", x: 85, y: 25 }
    ],
    "4-4-2": [
        { role: "GK", x: 50, y: 90 }, { role: "LB", x: 15, y: 70 }, { role: "CB", x: 38, y: 75 }, 
        { role: "CB", x: 62, y: 75 }, { role: "RB", x: 85, y: 70 }, { role: "LM", x: 15, y: 45 }, 
        { role: "CM", x: 40, y: 45 }, { role: "CM", x: 60, y: 45 }, { role: "RM", x: 85, y: 45 }, 
        { role: "ST", x: 40, y: 20 }, { role: "ST", x: 60, y: 20 }
    ],
    "3-5-2": [
        { role: "GK", x: 50, y: 90 }, { role: "CB", x: 25, y: 75 }, { role: "CB", x: 50, y: 75 }, 
        { role: "CB", x: 75, y: 75 }, { role: "LWB", x: 10, y: 50 }, { role: "RWB", x: 90, y: 50 }, 
        { role: "CDM", x: 50, y: 60 }, { role: "CM", x: 35, y: 40 }, { role: "CM", x: 65, y: 40 }, 
        { role: "ST", x: 40, y: 20 }, { role: "ST", x: 60, y: 20 }
    ],
    "5-3-2": [
        { role: "GK", x: 50, y: 90 }, { role: "LWB", x: 10, y: 65 }, { role: "CB", x: 30, y: 75 }, 
        { role: "CB", x: 50, y: 75 }, { role: "CB", x: 70, y: 75 }, { role: "RWB", x: 90, y: 65 }, 
        { role: "CM", x: 35, y: 45 }, { role: "CDM", x: 50, y: 55 }, { role: "CM", x: 65, y: 45 }, 
        { role: "ST", x: 40, y: 20 }, { role: "ST", x: 60, y: 20 }
    ]
};

const TacticalBoard = {
    frames: [[]], // Array of frames, each frame is an array of objects {id, type, x, y, label}
    currentFrame: 0,
    isPlaying: false,
    playbackInterval: null,
    allPlayers: [],
    
    // Initialize the board
    async init() {
        console.log("⚽ Initializing Tactical Board Pro...");
        this.frames = [FORMATIONS["4-3-3"].map((p, i) => ({
            id: `player-${i}`,
            type: 'player',
            role: p.role,
            x: p.x,
            y: p.y,
            label: p.role,
            team: 'home'
        }))];
        
        this.setupPitchListeners();
        await this.loadSquad();
        this.render();
        this.updateUI();
    },

    async loadSquad() {
        const tray = document.getElementById('playerTray');
        if (!tray || typeof apiService === 'undefined') return;

        try {
            const data = await apiService.getAdminDashboardData();
            this.allPlayers = data.players || [];
            this.renderPlayerTray(this.allPlayers);
        } catch (e) {
            console.warn("Failed to load players for tactical tray", e);
            tray.innerHTML = '<div style="grid-column: span 2; text-align:center; padding:1rem; color:#f87171; font-size:0.75rem;">Failed to load squad</div>';
        }
    },

    renderPlayerTray(players) {
        const tray = document.getElementById('playerTray');
        if (!tray) return;

        if (players.length === 0) {
            tray.innerHTML = '<div style="grid-column: span 2; text-align:center; padding:1rem; color:var(--text-muted); font-size:0.75rem;">No players found</div>';
            return;
        }

        tray.innerHTML = players.map(p => {
            const initials = `${p.first_name?.[0] || ''}${p.last_name?.[0] || ''}`.toUpperCase();
            const fullName = `${p.first_name} ${p.last_name}`;
            return `
                <div class="eq-item" draggable="true" ondragstart="TacticalBoard.handleTrayDragStart(event, 'player', '${initials}', '${fullName}')">
                    <div style="width:30px; height:30px; background:var(--primary); border-radius:50%; margin:0 auto 0.5rem; display:flex; align-items:center; justify-content:center; font-size:0.7rem; font-weight:800; color:#fff;">${initials}</div>
                    <span style="display:block; font-size:0.65rem; color:#fff; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${p.last_name}</span>
                </div>
            `;
        }).join('');
    },

    filterPlayers(query) {
        const filtered = this.allPlayers.filter(p => 
            `${p.first_name} ${p.last_name}`.toLowerCase().includes(query.toLowerCase())
        );
        this.renderPlayerTray(filtered);
    },

    handleTrayDragStart(e, type, label, fullName) {
        e.dataTransfer.setData('text/plain', JSON.stringify({
            source: 'tray',
            type: type,
            label: label,
            fullName: fullName
        }));
    },

    setupPitchListeners() {
        const pitch = document.getElementById('activePitchArea');
        if (!pitch) return;

        pitch.addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        pitch.addEventListener('drop', (e) => {
            e.preventDefault();
            const data = e.dataTransfer.getData('text/plain');
            if (!data) return;

            const rect = pitch.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;

            try {
                const parsed = JSON.parse(data);
                if (parsed.source === 'tray') {
                    this.addElement(parsed.type, x, y, parsed.label, parsed);
                } else if (parsed.source === 'pin') {
                    this.updateElementPos(parsed.id, x, y);
                }
            } catch (err) {
                // Support legacy dragging if needed
            }
        });
    },

    setupEquipmentListeners() {
        // Equipment tray items
        document.querySelectorAll('.eq-item').forEach(item => {
            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', JSON.stringify({
                    source: 'tray',
                    type: item.dataset.type || 'equipment',
                    label: ''
                }));
            });
        });
    },

    addElement(type, x, y, label = '', parsedData = {}) {
        const id = `${type}-${Date.now()}`;
        const icons = { cone: '🟠', goal: '🥅', hurdle: '🚧', 'bib-blue': '👕', 'bib-red': '🔴' };
        
        const newEl = {
            id,
            type: type === 'player' ? 'player' : 'equipment',
            x,
            y: Math.min(y, 98)
        };

        if (type === 'player') {
            newEl.label = label || 'P';
            newEl.fullName = parsedData.fullName || '';
        } else {
            newEl.icon = icons[type] || '⚙️';
        }

        // Add to current and all subsequent frames
        for (let i = this.currentFrame; i < this.frames.length; i++) {
            this.frames[i].push(JSON.parse(JSON.stringify(newEl)));
        }
        
        this.render();
    },

    updateElementPos(id, x, y) {
        const element = this.frames[this.currentFrame].find(el => el.id === id);
        if (element) {
            element.x = Math.min(Math.max(x, 2), 98);
            element.y = Math.min(Math.max(y, 2), 98);
            this.render();
        }
    },

    addFrame() {
        const currentData = JSON.stringify(this.frames[this.currentFrame]);
        this.frames.splice(this.currentFrame + 1, 0, JSON.parse(currentData));
        this.currentFrame++;
        this.render();
        this.updateUI();
    },

    nextFrame() {
        if (this.currentFrame < this.frames.length - 1) {
            this.currentFrame++;
            this.render();
            this.updateUI();
        }
    },

    prevFrame() {
        if (this.currentFrame > 0) {
            this.currentFrame--;
            this.render();
            this.updateUI();
        }
    },

    togglePlayback() {
        if (this.isPlaying) {
            clearInterval(this.playbackInterval);
            this.isPlaying = false;
            document.getElementById('playAnimationBtn').innerHTML = '▶ Play';
            
            // Remove animating class
            document.querySelectorAll('.tactical-pin').forEach(p => p.classList.remove('animating'));
        } else {
            this.isPlaying = true;
            document.getElementById('playAnimationBtn').innerHTML = '⏸ Stop';
            
            // Ensure first frame layout is set
            this.render(); 
            
            this.playbackInterval = setInterval(() => {
                if (this.currentFrame >= this.frames.length - 1) {
                    this.currentFrame = 0;
                    // Disable transition for the "jump" back to start
                    document.querySelectorAll('.tactical-pin').forEach(p => p.classList.remove('animating'));
                } else {
                    this.currentFrame++;
                    // Enable transitions for movement
                    document.querySelectorAll('.tactical-pin').forEach(p => p.classList.add('animating'));
                }
                this.render();
                this.updateUI();
            }, 1000);
        }
    },

    setFormation(name) {
        const pos = FORMATIONS[name];
        if (!pos) return;
        
        // Only update players, keep equipment
        const equipment = this.frames[this.currentFrame].filter(el => el.type !== 'player');
        const players = pos.map((p, i) => ({
            id: `player-${i}`,
            type: 'player',
            role: p.role,
            x: p.x,
            y: p.y,
            label: p.role
        }));
        
        this.frames[this.currentFrame] = [...players, ...equipment];
        this.render();
    },

    clearEquipment() {
        this.frames[this.currentFrame] = this.frames[this.currentFrame].filter(el => el.type === 'player');
        this.render();
    },

    render() {
        const pitch = document.getElementById('activePitchArea');
        if (!pitch) return;
        
        const currentElements = this.frames[this.currentFrame] || [];
        const existingPins = Array.from(pitch.querySelectorAll('.tactical-pin'));
        const existingIds = existingPins.map(p => p.dataset.id);
        const currentIds = currentElements.map(el => el.id);

        // Remove old pins
        existingPins.forEach(pin => {
            if (!currentIds.includes(pin.dataset.id)) {
                pin.remove();
            }
        });

        // Add or Update pins
        currentElements.forEach(el => {
            let pin = pitch.querySelector(`[data-id="${el.id}"]`);
            
            if (!pin) {
                pin = document.createElement('div');
                pin.dataset.id = el.id;
                pin.draggable = true;
                pin.addEventListener('dragstart', (e) => {
                    e.dataTransfer.setData('text/plain', JSON.stringify({
                        source: 'pin',
                        id: el.id
                    }));
                });
                
                // Clicking a player allows swapping with a real player
                pin.onclick = (e) => {
                    e.stopPropagation();
                    if (el.type === 'player') this.showPlayerSwapMenu(el.id);
                };
                
                pitch.appendChild(pin);
            }

            // Update properties
            pin.className = `tactical-pin ${el.type === 'player' ? 'player-home' : 'equipment'}`;
            if (this.isPlaying && this.currentFrame > 0) {
                pin.classList.add('animating');
            }
            
            pin.style.left = `${el.x}%`;
            pin.style.top = `${el.y}%`;
            pin.title = el.fullName || el.label || '';
            pin.innerHTML = el.type === 'player' ? `<span>${el.label}</span>` : el.icon;
        });
    },

    updateUI() {
        const label = document.getElementById('currentFrameLabel');
        if (label) {
            label.textContent = `Frame ${this.currentFrame + 1}/${this.frames.length}`;
        }
    },

    async saveFormation() {
        try {
            if (typeof apiService !== 'undefined') {
                await apiService.post('/api/tactical', {
                    name: "Tactical Sequence " + new Date().toLocaleTimeString(),
                    lineup: JSON.stringify(this.frames),
                    formation: document.getElementById('tacticalFormationSelect')?.value || "Custom"
                });
                alert("Scenario saved successfully!");
            }
        } catch (err) {
            console.error("Save error:", err);
            alert("Failed to save scenario (Check console)");
        }
    },

    async shareToFeed() {
        try {
            if (typeof apiService !== 'undefined') {
                const formation = document.getElementById('tacticalFormationSelect')?.value || "Custom";
                const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
                
                await apiService.post('/feed', {
                    type: 'tactical_update',
                    title: `New Tactics: ${formation}`,
                    content: `${user.first_name || 'Coach'} shared a new tactical sequence with ${this.frames.length} frames. Check the Tactical Board for the full walkthrough.`,
                    roles: ['player', 'coach', 'admin']
                });
                
                alert("Shared to feed successfully!");
            }
        } catch (err) {
            console.error("Share error:", err);
            alert("Failed to share to feed");
        }
    },

    showPlayerSwapMenu(elementId) {
        const modalId = 'swapPlayerModal';
        let modal = document.getElementById(modalId);
        if (!modal) {
            modal = document.createElement('div');
            modal.id = modalId;
            modal.className = 'modal';
            document.body.appendChild(modal);
        }

        modal.innerHTML = `
            <div class="modal-content" style="max-width:400px;">
                <div class="modal-header">
                    <h2>Assign Player to Position</h2>
                    <div class="modal-close" onclick="closeModal('${modalId}')">&times;</div>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>Select Player from Squad</label>
                        <select id="swapPlayerSelect" onchange="TacticalBoard.confirmSwap('${elementId}', this.value)" style="width:100%; padding:0.8rem; background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.1); color:#fff; border-radius:10px;">
                            <option value="">-- Choose Player --</option>
                            ${this.allPlayers.map(p => `<option value="${p.id}">${p.first_name} ${p.last_name}</option>`).join('')}
                            <option value="reset">-- Reset to Generic --</option>
                        </select>
                    </div>
                </div>
            </div>
        `;
        modal.style.display = 'block';
    },

    confirmSwap(elementId, playerId) {
        const frame = this.frames[this.currentFrame];
        const el = frame.find(item => item.id === elementId);
        if (!el) return;

        if (playerId === 'reset') {
            el.label = el.role || 'P';
            el.fullName = '';
        } else {
            const player = this.allPlayers.find(p => p.id === playerId);
            if (player) {
                el.label = (player.first_name[0] + player.last_name[0]).toUpperCase();
                el.fullName = `${player.first_name} ${player.last_name}`;
            }
        }

        closeModal('swapPlayerModal');
        this.render();
    }
};

if (typeof window !== "undefined") {
  window.TacticalBoard = TacticalBoard;
  window.initializeTacticalBoard = () => TacticalBoard.init();
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    FORMATIONS,
    getFormationPositions: (f) => FORMATIONS[f] || FORMATIONS["4-4-2"],
    normalizeCoordinate: (val) => Math.max(5, Math.min(95, val)),
    snapToGrid: (val, step = 5) => Math.round(val / step) * step,
    FORMATIONS
  };
}
