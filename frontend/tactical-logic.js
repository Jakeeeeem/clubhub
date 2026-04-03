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
    
    // Initialize the board
    init() {
        console.log("⚽ Initializing Tactical Board Pro...");
        this.frames = [JSON.parse(JSON.stringify(FORMATIONS["4-3-3"].map((p, i) => ({
            id: `player-${i}`,
            type: 'player',
            role: p.role,
            x: p.x,
            y: p.y,
            label: p.role
        }))))];
        
        this.setupPitchListeners();
        this.setupEquipmentListeners();
        this.render();
        this.updateUI();
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
                this.addElement(parsed.type, x, y, parsed.label);
            } else if (parsed.source === 'pin') {
                this.updateElementPos(parsed.id, x, y);
            }
        } catch (err) {
            // Legacy/Fallback
            this.addElement(data, x, y);
        }
    });
},

setupEquipmentListeners() {
    document.querySelectorAll('.eq-item, .player-pin-source').forEach(item => {
        item.addEventListener('dragstart', (e) => {
            const isPlayer = item.classList.contains('player-pin-source');
            e.dataTransfer.setData('text/plain', JSON.stringify({
                source: 'tray',
                type: isPlayer ? 'player' : item.dataset.type,
                label: isPlayer ? item.innerText : ''
            }));
        });
    });
},

addElement(type, x, y, label = '') {
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
    } else {
        newEl.icon = icons[type] || '⚙️';
    }

    this.frames[this.currentFrame].push(newEl);
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
        } else {
            this.isPlaying = true;
            document.getElementById('playAnimationBtn').innerHTML = '⏸ Stop';
            this.playbackInterval = setInterval(() => {
                if (this.currentFrame >= this.frames.length - 1) {
                    this.currentFrame = 0;
                } else {
                    this.currentFrame++;
                }
                this.render();
                this.updateUI();
            }, 800);
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
        
        pitch.innerHTML = '';
        const elements = this.frames[this.currentFrame] || [];
        
        elements.forEach(el => {
            const div = document.createElement('div');
            div.className = el.type === 'player' ? 'player-pin' : 'equipment-pin';
            div.style.left = `${el.x}%`;
            div.style.top = `${el.y}%`;
            div.draggable = true;
            
            if (el.type === 'player') {
                div.innerHTML = `<span>${el.label}</span>`;
                div.style.background = 'var(--primary)';
                div.style.boxShadow = '0 0 10px rgba(220, 38, 38, 0.4)';
            } else {
                div.innerHTML = el.icon;
                div.style.fontSize = '1.4rem';
            }
            
            div.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', JSON.stringify({
                    source: 'pin',
                    id: el.id
                }));
            });
            
            pitch.appendChild(div);
        });
    },

    updateUI() {
        const label = document.getElementById('currentFrameLabel');
        if (label) {
            label.textContent = `Frame ${this.currentFrame + 1}/${this.frames.length}`;
        }
    },

    async saveFormation() {
        const scenarioData = {
            name: "Tactical Sequence " + new Date().toLocaleTimeString(),
            frames: this.frames,
            formation: document.getElementById('tacticalFormationSelect')?.value || "Custom"
        };
        
        try {
            console.log("💾 Saving tactical scenario:", scenarioData);
            // In real app, call backend route
            if (typeof apiService !== 'undefined') {
                await apiService.post('/api/tactical', {
                    name: scenarioData.name,
                    lineup: JSON.stringify(scenarioData.frames)
                });
                alert("Scenario saved successfully!");
            }
        } catch (err) {
            console.error("Save error:", err);
        }
    }
};

window.TacticalBoard = TacticalBoard;
window.initializeTacticalBoard = () => TacticalBoard.init();
