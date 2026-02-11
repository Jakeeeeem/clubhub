/**
 * Premium Walkthrough Service
 * Provides interactive onboarding tours for the platform dashboards.
 */

class TourService {
  constructor() {
    this.steps = [];
    this.currentStepIndex = -1;
    this.overlay = null;
    this.card = null;
    this.activeElement = null;
    this.tourId = null;

    this.init();
  }

  init() {
    if (document.getElementById("tour-overlay")) {
      this.overlay = document.getElementById("tour-overlay");
      this.card = document.getElementById("tour-card");
      return;
    }

    // Create overlay
    this.overlay = document.createElement("div");
    this.overlay.id = "tour-overlay";
    this.overlay.className = "tour-overlay";
    document.body.appendChild(this.overlay);

    // Create tour card
    this.card = document.createElement("div");
    this.card.id = "tour-card";
    this.card.className = "tour-card";
    document.body.appendChild(this.card);

    // Resize listener for cutout adjustment
    window.addEventListener("resize", () => {
      if (this.currentStepIndex !== -1) {
        this.updateCutout();
      }
    });
  }

  /**
   * Start a tour
   * @param {string} tourId - Unique ID for the tour (for persistence)
   * @param {Array} steps - Array of step objects { target, title, text, position }
   */
  start(tourId, steps) {
    // Check if already completed
    if (localStorage.getItem(`tour_completed_${tourId}`)) {
      console.log(`🚀 Tour ${tourId} already completed. Skip.`);
      return;
    }

    console.log(`🚀 Starting Tour: ${tourId}`);
    this.tourId = tourId;
    this.steps = steps;
    this.currentStepIndex = 0;
    this.renderStep();
  }

  renderStep() {
    const step = this.steps[this.currentStepIndex];
    const target = document.querySelector(step.target);

    if (!target) {
      console.warn(`Target ${step.target} not found for tour step. Skipping.`);
      this.nextStep();
      return;
    }

    // Update Overlay
    this.overlay.classList.add("active");
    this.card.classList.add("active");

    // Highlight Target
    if (this.activeElement) {
      this.activeElement.classList.remove("tour-highlight");
    }
    this.activeElement = target;
    // Commenting out highlights as background cutout is cleaner
    // this.activeElement.classList.add('tour-highlight');

    // Update Cutout
    this.updateCutout(target);

    // Update Card Content
    const isLast = this.currentStepIndex === this.steps.length - 1;

    this.card.innerHTML = `
            <div class="tour-header">
                <h3 class="tour-title">✨ ${step.title}</h3>
                <button class="tour-close" onclick="tourService.end()">&times;</button>
            </div>
            <div class="tour-body">
                ${step.text}
            </div>
            <div class="tour-footer">
                <div class="tour-progress">Step ${this.currentStepIndex + 1} of ${this.steps.length}</div>
                <div class="tour-actions">
                    ${!isLast ? '<button class="tour-btn tour-btn-skip" onclick="tourService.end()">Skip</button>' : ""}
                    <button class="tour-btn tour-btn-next" onclick="tourService.nextStep()">
                        ${isLast ? "Finish" : "Next"}
                    </button>
                </div>
            </div>
        `;

    // Position Card
    this.positionCard(target, step.position || "bottom");
  }

  updateCutout(target = this.activeElement) {
    if (!target) return;
    const rect = target.getBoundingClientRect();
    const padding = 5;

    const top = rect.top - padding;
    const left = rect.left - padding;
    const bottom = rect.bottom + padding;
    const right = rect.right + padding;
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Clip-path polygon to create a hole
    // Clockwise outer path + Counter-clockwise inner path
    this.overlay.style.clipPath = `polygon(
            0% 0%, 0% 100%, 100% 100%, 100% 0%, 0% 0%,
            ${left}px ${top}px, ${right}px ${top}px, ${right}px ${bottom}px, ${left}px ${bottom}px, ${left}px ${top}px
        )`;
  }

  positionCard(target, preferredPosition) {
    const rect = target.getBoundingClientRect();
    const cardRect = this.card.getBoundingClientRect();
    const padding = 20;

    let top, left;
    this.card.className = "tour-card active"; // Reset classes

    switch (preferredPosition) {
      case "bottom":
        top = rect.bottom + padding;
        left = rect.left + rect.width / 2 - cardRect.width / 2;
        this.card.classList.add("arrow-top");
        break;
      case "top":
        top = rect.top - cardRect.height - padding;
        left = rect.left + rect.width / 2 - cardRect.width / 2;
        this.card.classList.add("arrow-bottom");
        break;
      case "left":
        top = rect.top + rect.height / 2 - cardRect.height / 2;
        left = rect.left - cardRect.width - padding;
        this.card.classList.add("arrow-right");
        break;
      case "right":
        top = rect.top + rect.height / 2 - cardRect.height / 2;
        left = rect.right + padding;
        this.card.classList.add("arrow-left");
        break;
    }

    // Keep on screen
    left = Math.max(
      padding,
      Math.min(left, window.innerWidth - cardRect.width - padding),
    );
    top = Math.max(
      padding,
      Math.min(top, window.innerHeight - cardRect.height - padding),
    );

    this.card.style.top = `${top}px`;
    this.card.style.left = `${left}px`;
  }

  nextStep() {
    if (this.currentStepIndex < this.steps.length - 1) {
      this.currentStepIndex++;
      this.renderStep();
    } else {
      this.end(true);
    }
  }

  end(completed = false) {
    if (completed && this.tourId) {
      localStorage.setItem(`tour_completed_${this.tourId}`, "true");
    }

    this.overlay.classList.remove("active");
    this.card.classList.remove("active");
    this.currentStepIndex = -1;

    if (this.activeElement) {
      this.activeElement.classList.remove("tour-highlight");
      this.activeElement = null;
    }
  }
}

// Global instance
window.tourService = new TourService();
