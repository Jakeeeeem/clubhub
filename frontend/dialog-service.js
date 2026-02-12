/**
 * Premium Dialog Service
 * Replaces standard browser alert() and confirm() with beautiful custom modals.
 */

class DialogService {
  constructor() {
    this.overlay = null;
    // Don't init immediately as document.body might not be ready
  }

  init() {
    if (this.overlay || document.getElementById("dialog-overlay")) return;

    this.overlay = document.createElement("div");
    this.overlay.id = "dialog-overlay";
    this.overlay.className = "dialog-overlay";
    this.overlay.innerHTML = `
            <div class="dialog-card">
                <div class="dialog-icon" id="dialog-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                </div>
                <h3 class="dialog-title" id="dialog-title">Confirm Action</h3>
                <p class="dialog-message text-muted" id="dialog-message"></p>
                <div class="dialog-actions">
                    <button class="btn btn-secondary" id="dialog-cancel">Cancel</button>
                    <button class="btn btn-primary" id="dialog-confirm">Confirm</button>
                </div>
            </div>
        `;
    document.body.appendChild(this.overlay);

    this.titleEl = document.getElementById("dialog-title");
    this.messageEl = document.getElementById("dialog-message");
    this.iconEl = document.getElementById("dialog-icon");
    this.cancelBtn = document.getElementById("dialog-cancel");
    this.confirmBtn = document.getElementById("dialog-confirm");
  }

  /**
   * Show a custom confirmation dialog
   * @param {string} message - The message to display
   * @param {string} title - The title of the dialog
   * @param {string} type - 'confirm', 'warning', or 'info'
   * @returns {Promise<boolean>}
   */
  confirm(message, title = "Are you sure?", type = "confirm") {
    this.init();
    return new Promise((resolve) => {
      this.titleEl.textContent = title;
      this.messageEl.textContent = message;

      // Set icon and style based on type
      this.iconEl.className = `dialog-icon ${type}`;
      this.confirmBtn.className = `btn ${type === "confirm" ? "btn-primary" : type === "warning" ? "btn-danger" : "btn-primary"}`;

      this.cancelBtn.style.display = "block";
      this.overlay.classList.add("active");

      const handleCancel = () => {
        this.overlay.classList.remove("active");
        cleanup();
        resolve(false);
      };

      const handleConfirm = () => {
        this.overlay.classList.remove("active");
        cleanup();
        resolve(true);
      };

      const cleanup = () => {
        this.cancelBtn.removeEventListener("click", handleCancel);
        this.confirmBtn.removeEventListener("click", handleConfirm);
      };

      this.cancelBtn.addEventListener("click", handleCancel);
      this.confirmBtn.addEventListener("click", handleConfirm);
    });
  }

  /**
   * Show a custom alert dialog
   * @param {string} message - The message to display
   * @param {string} title - The title of the dialog
   * @param {string} type - 'info', 'warning', or 'error'
   * @returns {Promise<void>}
   */
  alert(message, title = "Notification", type = "info") {
    this.init();
    return new Promise((resolve) => {
      this.titleEl.textContent = title;
      this.messageEl.textContent = message;

      this.iconEl.className = `dialog-icon ${type}`;
      this.confirmBtn.className = "btn btn-primary";
      this.confirmBtn.textContent = "Got it";

      this.cancelBtn.style.display = "none";
      this.overlay.classList.add("active");

      const handleConfirm = () => {
        this.overlay.classList.remove("active");
        this.confirmBtn.removeEventListener("click", handleConfirm);
        // Reset text for future confirms
        setTimeout(() => {
          this.confirmBtn.textContent = "Confirm";
        }, 300);
        resolve();
      };

      this.confirmBtn.addEventListener("click", handleConfirm);
    });
  }
}

// Initialize and export to window
const dialogService = new DialogService();
window.showConfirm = (message, title, type) =>
  dialogService.confirm(message, title, type);
window.showAlert = (message, title, type) =>
  dialogService.alert(message, title, type);

// Global Overrides
window.alert = (message) => {
  dialogService.alert(message, "Notification", "info");
};

window.confirm = (message) => {
  console.warn(
    "Sync confirm() called. Standard browser confirm returns true/false immediately. Custom dialogs are async. Showing premium UI but this may not block execution as expected.",
  );
  dialogService.confirm(message, "Confirmation", "confirm");
  return true;
};
