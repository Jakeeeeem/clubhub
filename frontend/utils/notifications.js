// Notification utility used throughout ClubHub frontend
export function showNotification(message, type = "info", duration = 5000) {
  // Ensure container exists
  let container = document.getElementById("notification-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "notification-container";
    container.style.position = "fixed";
    container.style.top = "1rem";
    container.style.right = "1rem";
    container.style.zIndex = "10000";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.style.minWidth = "200px";
  toast.style.marginBottom = "0.5rem";
  toast.style.padding = "0.75rem 1rem";
  toast.style.borderRadius = "0.4rem";
  toast.style.boxShadow = "0 2px 6px rgba(0,0,0,0.15)";
  toast.style.backgroundColor = type === "error" ? "#dc2626" : type === "success" ? "#16a34a" : "#2563eb";
  toast.style.color = "#fff";
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), duration);
}
