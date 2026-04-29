/**
 * ClubHub Training & Drills Frontend Service
 * Handles all API interactions for the Training module
 */

const TrainingService = {
  baseUrl: window.API_BASE_URL || '/api',

  // Auth header
  _headers() {
    const token = localStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  },

  async _fetch(path, options = {}) {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: { ...this._headers(), ...(options.headers || {}) }
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || 'Request failed');
    }
    return res.json();
  },

  // ── Drill Library ──────────────────────────────────────────
  async getDrills(filters = {}) {
    try {
      const params = new URLSearchParams(filters).toString();
      return await this._fetch(`/training/drills${params ? '?' + params : ''}`);
    } catch (err) {
      console.warn("TrainingService: getDrills failed", err);
      return { drills: [] };
    }
  },

  getDrill(id) { return this._fetch(`/training/drills/${id}`); },

  createDrill(data) {
    return this._fetch('/training/drills', { method: 'POST', body: JSON.stringify(data) });
  },

  updateDrill(id, data) {
    return this._fetch(`/training/drills/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },

  deleteDrill(id) {
    return this._fetch(`/training/drills/${id}`, { method: 'DELETE' });
  },

  // ── Assignments ─────────────────────────────────────────────
  assignDrill(drillId, data) {
    return this._fetch(`/training/drills/${drillId}/assign`, { method: 'POST', body: JSON.stringify(data) });
  },

  getMyDrills() { return this._fetch('/training/my-drills'); },

  // ── Submissions ─────────────────────────────────────────────
  submitAttempt(data) {
    return this._fetch('/training/submissions', { method: 'POST', body: JSON.stringify(data) });
  },

  getSubmissions(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    return this._fetch(`/training/submissions${params ? '?' + params : ''}`);
  },

  // ── Reviews ─────────────────────────────────────────────────
  reviewSubmission(submissionId, data) {
    return this._fetch(`/training/submissions/${submissionId}/review`, { method: 'POST', body: JSON.stringify(data) });
  },

  // ── Skill Scores ────────────────────────────────────────────
  getPlayerSkills(playerId) { return this._fetch(`/training/skills/${playerId}`); },
  getTeamProgress(teamId) { return this._fetch(`/training/team-progress/${teamId}`); },
};

// ─────────────────────────────────────────────────────────────
//  PLAYER DASHBOARD: Training Library UI
// ─────────────────────────────────────────────────────────────

async function loadTrainingLibrary(category = null) {
  const container = document.getElementById('trainingLibraryGrid');
  const noResults = document.getElementById('trainingLibraryEmpty');
  if (!container) return;

  // Update tabs active state
  const tabs = document.querySelectorAll('#player-training-manager .btn-secondary');
  tabs.forEach(tab => {
    if (tab.textContent === (category || 'All Drills')) {
        tab.style.background = 'rgba(106,92,255,0.25)';
        tab.style.borderColor = 'var(--primary)';
    } else {
        tab.style.background = 'transparent';
        tab.style.borderColor = 'rgba(255,255,255,0.1)';
    }
  });

  container.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding:2rem; grid-column:1/-1;">⏳ Loading drills...</p>';

  try {
    const data = await TrainingService.getMyDrills();
    let drills = data.drills || [];

    if (category && category !== 'All Drills') {
      drills = drills.filter(d => d.category === category);
    }

    if (!drills.length) {
      container.innerHTML = '';
      if (noResults) noResults.style.display = 'block';
      return;
    }
    if (noResults) noResults.style.display = 'none';

    container.innerHTML = drills.map(drill => renderDrillCard(drill, 'player')).join('');
  } catch (err) {
    container.innerHTML = `<p style="color:var(--accent-red); grid-column:1/-1;">${err.message}</p>`;
  }
}

async function loadTrainingProgress() {
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
  const playerId = currentUser?.player_id || currentUser?.id;
  if (!playerId) return;

  try {
    const data = await TrainingService.getPlayerSkills(playerId);
    renderSkillRadar(data.skills || {});
    renderDrillHistory(data.history || []);
  } catch (err) {
    console.warn('Could not load training progress:', err.message);
  }
}

function renderDrillCard(drill, role = 'player') {
  const diffColors = { Beginner: '#4ade80', Intermediate: '#facc15', Advanced: '#f87171' };
  const diffColor = diffColors[drill.difficulty] || '#9ca3af';
  const statusBadge = drill.my_submission_status
    ? `<span style="background: rgba(74,222,128,0.15); color:#4ade80; font-size:0.65rem; padding:2px 8px; border-radius:12px; font-weight:700;">✓ SUBMITTED</span>`
    : drill.due_date ? `<span style="font-size:0.65rem; color:var(--text-muted);">Due ${new Date(drill.due_date).toLocaleDateString('en-GB')}</span>` : '';

  const actions = role === 'player'
    ? `<button class="btn btn-primary" style="width:100%; margin-top:1rem; padding:0.85rem;" onclick="openDrillDetail('${drill.id}', '${drill.assignment_id || ''}')">
        ${drill.my_submission_id ? '▶ View & Re-attempt' : '▶ Watch & Attempt'}
       </button>`
    : `<button class="btn btn-secondary btn-small" onclick="openAssignDrillModal('${drill.id}')">Assign</button>
       <button class="btn btn-primary btn-small" onclick="viewDrillSubmissions('${drill.id}')">Reviews</button>`;

  return `
    <div class="glass-card" style="padding:1.5rem; display:flex; flex-direction:column; gap:0.75rem; transition:transform 0.2s;">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:0.5rem;">
        <div>
          <div style="font-size:0.7rem; text-transform:uppercase; letter-spacing:1px; color:var(--primary); margin-bottom:0.25rem;">${drill.category}</div>
          <h3 style="font-size:1.1rem; margin:0; font-family:var(--font-heading);">${drill.title}</h3>
        </div>
        ${statusBadge}
      </div>
      <p style="color:var(--text-muted); font-size:0.88rem; line-height:1.5; margin:0;">${drill.description || 'No description provided.'}</p>
      <div style="display:flex; gap:1rem; flex-wrap:wrap; margin-top:auto; padding-top:0.5rem; border-top:1px solid rgba(255,255,255,0.05);">
        <span style="font-size:0.75rem; color:${diffColor};">● ${drill.difficulty}</span>
        <span style="font-size:0.75rem; color:var(--text-muted);">⏱ ${drill.duration_minutes} min</span>
        ${drill.coach_name ? `<span style="font-size:0.75rem; color:var(--text-muted);">👤 ${drill.coach_name}</span>` : ''}
      </div>
      <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">${actions}</div>
    </div>`;
}

// Open a drill detail view (player flow)
async function openDrillDetail(drillId, assignmentId) {
  try {
    const modal = document.getElementById('drillDetailModal');
    const content = document.getElementById('drillDetailContent');
    if (!modal || !content) return;

    content.innerHTML = '<p style="text-align:center;padding:2rem;">⏳ Loading drill...</p>';
    modal.style.display = 'flex';

    const data = await TrainingService.getDrill(drillId);
    const drill = data.drill;

    content.innerHTML = `
      <div style="padding:0 0 1.5rem;">
        <div style="font-size:0.75rem; text-transform:uppercase; letter-spacing:2px; color:var(--primary); margin-bottom:0.5rem;">${drill.category} • ${drill.difficulty}</div>
        <h2 style="font-family:var(--font-heading); font-size:1.8rem; margin:0 0 0.5rem;">${drill.title}</h2>
        <p style="color:var(--text-muted);">⏱ ${drill.duration_minutes} min${drill.required_equipment ? ' • 🎒 ' + drill.required_equipment : ''}</p>
      </div>

      ${drill.demo_video_url ? `
        <div style="margin-bottom:1.5rem; border-radius:16px; overflow:hidden; background:#000; position:relative; cursor:pointer;" onclick="UnifiedNav.openVideoModal('${drill.title}', '${drill.demo_video_url}')">
          ${drill.demo_video_url.includes('youtube.com') || drill.demo_video_url.includes('youtu.be') ? `
            <div style="aspect-ratio:16/9; display:flex; align-items:center; justify-content:center; background:rgba(255,255,255,0.05);">
              <div style="font-size:3rem; color:rgba(255,255,255,0.5);">▶️</div>
              <div style="position:absolute; bottom:1rem; left:1rem; right:1rem; font-size:0.75rem; color:rgba(255,255,255,0.4); text-align:center;">Click to watch full screen</div>
            </div>
          ` : `
            <video controls style="width:100%; max-height:300px; display:block;" src="${drill.demo_video_url}">
              <source src="${drill.demo_video_url}">
            </video>
          `}
        </div>` : `
        <div class="glass-panel" style="padding:2rem; text-align:center; margin-bottom:1.5rem; color:var(--text-muted);">
          📹 No demo video yet
        </div>`}

      <div class="glass-panel" style="padding:1.5rem; margin-bottom:1.5rem;">
        <h4 style="margin:0 0 0.75rem; color:var(--primary);">📋 Instructions</h4>
        <p style="margin:0; line-height:1.7;">${drill.description || "Follow the coach's demonstration above."}</p>
      </div>

      <div style="border-top:1px solid rgba(255,255,255,0.05); padding-top:1.5rem;">
        <h4 style="margin:0 0 1rem; font-family:var(--font-heading);">📹 Upload Your Attempt</h4>
        <div class="glass-panel" style="padding:1.5rem;">
          <div class="form-group" style="margin-bottom:1rem;">
            <label style="font-size:0.85rem; color:var(--text-muted); margin-bottom:0.5rem; display:block;">Video URL or Link</label>
            <input type="url" id="attemptVideoUrl" placeholder="Paste video link (Google Drive, YouTube, etc.)"
              style="width:100%; padding:0.75rem; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.08); border-radius:10px; color:white; font-size:0.95rem;">
          </div>
          <div class="form-group" style="margin-bottom:1rem;">
            <label style="font-size:0.85rem; color:var(--text-muted); margin-bottom:0.5rem; display:block;">Notes (optional)</label>
            <textarea id="attemptNotes" rows="3" placeholder="e.g. Found the weak foot turns tricky..."
              style="width:100%; padding:0.75rem; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.08); border-radius:10px; color:white; font-size:0.95rem; resize:vertical;"></textarea>
          </div>
          <button class="btn btn-primary" style="width:100%; padding:1rem;" onclick="submitDrillAttempt('${drillId}', '${assignmentId}')">
            🎯 Submit Attempt
          </button>
        </div>
      </div>`;
  } catch (err) {
    const content = document.getElementById('drillDetailContent');
    if (content) content.innerHTML = `<p style="color:var(--accent-red);">${err.message}</p>`;
  }
}

async function submitDrillAttempt(drillId, assignmentId) {
  const videoUrl = document.getElementById('attemptVideoUrl')?.value?.trim();
  const notes = document.getElementById('attemptNotes')?.value?.trim();

  if (!videoUrl) {
    alert('Please add a video URL before submitting.');
    return;
  }

  try {
    const btn = event.target;
    btn.disabled = true;
    btn.textContent = '⏳ Submitting...';

    await TrainingService.submitAttempt({
      drill_id: drillId,
      assignment_id: assignmentId || null,
      video_url: videoUrl,
      player_notes: notes
    });

    btn.textContent = '✅ Submitted!';
    btn.style.background = '#4ade80';
    setTimeout(() => closeModal('drillDetailModal'), 1500);
    if (typeof showNotification === 'function') showNotification('Drill attempt submitted! Your coach will review it.', 'success');
  } catch (err) {
    alert(err.message);
    const btn = event.target;
    btn.disabled = false;
    btn.textContent = '🎯 Submit Attempt';
  }
}

// ─────────────────────────────────────────────────────────────
//  COACH / ADMIN: Review Queue UI
// ─────────────────────────────────────────────────────────────

async function loadCoachReviewQueue() {
  const container = document.getElementById('coachReviewQueue');
  if (!container) return;

  container.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:2rem;">⏳ Loading submissions...</p>';
  try {
    const data = await TrainingService.getSubmissions({ status: 'pending_review' });
    const submissions = data.submissions || [];

    if (!submissions.length) {
      container.innerHTML = '<div class="glass-card" style="padding:2rem;text-align:center;color:var(--text-muted);">🎉 No pending reviews! All caught up.</div>';
      return;
    }

    container.innerHTML = submissions.map(s => `
      <div class="glass-card" style="padding:1.5rem; display:grid; grid-template-columns:1fr auto; gap:1rem; align-items:start;">
        <div>
          <div style="font-size:0.7rem; text-transform:uppercase; letter-spacing:1px; color:var(--primary); margin-bottom:0.25rem;">${s.drill_category}</div>
          <h4 style="margin:0 0 0.25rem;">${s.first_name} ${s.last_name}</h4>
          <p style="margin:0; color:var(--text-muted); font-size:0.85rem;">${s.drill_title}</p>
          <p style="margin:0.5rem 0 0; color:var(--text-muted); font-size:0.75rem;">Submitted ${new Date(s.submitted_at).toLocaleDateString('en-GB')}</p>
          ${s.player_notes ? `<p style="margin:0.5rem 0 0; font-size:0.85rem; font-style:italic; color:#d1d5db;">"${s.player_notes}"</p>` : ''}
          ${s.video_url ? `<a href="${s.video_url}" target="_blank" class="btn btn-secondary btn-small" style="margin-top:0.75rem; display:inline-flex; align-items:center; gap:0.5rem;">▶ Watch Video</a>` : ''}
        </div>
        <button class="btn btn-primary btn-small" onclick="openReviewModal('${s.id}', '${s.first_name} ${s.last_name}', '${s.drill_title}')">Review</button>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = `<p style="color:var(--accent-red);">${err.message}</p>`;
  }
}

function openReviewModal(submissionId, playerName, drillTitle) {
  const modal = document.getElementById('reviewSubmissionModal');
  if (!modal) return;

  document.getElementById('reviewPlayerName').textContent = playerName;
  document.getElementById('reviewDrillName').textContent = drillTitle;
  document.getElementById('reviewSubmissionId').value = submissionId;
  document.getElementById('reviewScore').value = '';
  document.getElementById('reviewFeedback').value = '';
  document.getElementById('reviewImprovements').value = '';
  modal.style.display = 'flex';
}

async function submitCoachReview() {
  const submissionId = document.getElementById('reviewSubmissionId')?.value;
  const score = parseInt(document.getElementById('reviewScore')?.value);
  const feedback = document.getElementById('reviewFeedback')?.value?.trim();
  const improvements = document.getElementById('reviewImprovements')?.value?.trim();

  if (!score || score < 1 || score > 10) {
    alert('Please enter a score between 1 and 10.');
    return;
  }

  try {
    await TrainingService.reviewSubmission(submissionId, {
      score, feedback, improvement_focus: improvements
    });

    closeModal('reviewSubmissionModal');
    if (typeof showNotification === 'function') showNotification('Review submitted!', 'success');
    loadCoachReviewQueue(); // Refresh the queue
  } catch (err) {
    alert(err.message);
  }
}

// Skill radar visual renderer
function renderSkillRadar(skills) {
  const container = document.getElementById('playerSkillBars');
  if (!container) return;

  const skillMap = {
    'Ball Control': skills.ball_control || 50,
    'Passing': skills.passing || 50,
    'Shooting': skills.shooting || 50,
    'Agility': skills.agility || 50,
    'Fitness': skills.fitness || 50,
  };

  container.innerHTML = Object.entries(skillMap).map(([name, val]) => `
    <div style="margin-bottom:1rem;">
      <div style="display:flex; justify-content:space-between; font-size:0.85rem; margin-bottom:0.4rem;">
        <span>${name}</span>
        <span style="font-weight:700; color:var(--primary);">${val}</span>
      </div>
      <div style="height:8px; background:rgba(255,255,255,0.08); border-radius:99px; overflow:hidden;">
        <div style="height:100%; width:${val}%; background:linear-gradient(90deg, var(--primary), var(--primary)); border-radius:99px; transition:width 0.8s ease;"></div>
      </div>
    </div>`).join('');
}

function renderDrillHistory(history) {
  const container = document.getElementById('drillHistoryList');
  if (!container) return;

  if (!history.length) {
    container.innerHTML = '<p style="color:var(--text-muted); font-size:0.9rem;">No completed drills yet.</p>';
    return;
  }

  container.innerHTML = history.map(h => `
    <div class="glass-card" style="padding:1rem; display:flex; justify-content:space-between; align-items:center;">
      <div>
        <div style="font-size:0.7rem; text-transform:uppercase; letter-spacing:1px; color:var(--primary);">${h.category}</div>
        <div style="font-weight:600; margin-top:0.25rem;">${h.title}</div>
        ${h.feedback ? `<div style="font-size:0.8rem; color:var(--text-muted); margin-top:0.25rem; font-style:italic;">"${h.feedback}"</div>` : ''}
      </div>
      <div style="text-align:right;">
        ${h.score ? `<div style="font-size:1.5rem; font-weight:800; color:${h.score >= 8 ? '#4ade80' : h.score >= 5 ? '#facc15' : '#f87171'};">${h.score}/10</div>` : '<div style="color:var(--text-muted); font-size:0.8rem;">Pending</div>'}
        <div style="font-size:0.7rem; color:var(--text-muted);">${new Date(h.submitted_at).toLocaleDateString('en-GB')}</div>
      </div>
    </div>`).join('');
}

window.TrainingService = TrainingService;
window.loadTrainingLibrary = loadTrainingLibrary;
window.loadTrainingProgress = loadTrainingProgress;
window.openDrillDetail = openDrillDetail;
window.submitDrillAttempt = submitDrillAttempt;
window.loadCoachReviewQueue = loadCoachReviewQueue;
window.openReviewModal = openReviewModal;
window.submitCoachReview = submitCoachReview;
