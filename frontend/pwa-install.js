// PWA Installation Handler with Smart Prompts
let deferredPrompt;
let installButton;

// Register service worker
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js")
      .then((registration) => {
        console.log("✅ ServiceWorker registered:", registration.scope);
      })
      .catch((error) => {
        console.log("❌ ServiceWorker registration failed:", error);
      });
  });
}

// Check if user has dismissed the banner before
function hasUserDismissedBanner() {
  return localStorage.getItem("pwa-banner-dismissed") === "true";
}

// Check if already installed
function isPWAInstalled() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

// Create floating install button
function createFloatingInstallButton() {
  const existingButton = document.getElementById("pwa-floating-btn");
  if (existingButton) return; // Already exists

  const floatingBtn = document.createElement("button");
  floatingBtn.id = "pwa-floating-btn";
  floatingBtn.className = "pwa-floating-install";
  floatingBtn.innerHTML = `
    <img src="images/logo.png" alt="Install ClubHub" style="width: 24px; height: 24px;">
    <span class="pwa-floating-tooltip">Install ClubHub App</span>
  `;
  floatingBtn.onclick = installPWA;
  document.body.appendChild(floatingBtn);
}

// Create install banner
function createInstallBanner() {
  if (hasUserDismissedBanner() || isPWAInstalled()) {
    createFloatingInstallButton(); // Show floating button instead
    return;
  }

  const banner = document.createElement("div");
  banner.id = "pwa-install-banner";
  banner.className = "pwa-install-banner";
  banner.innerHTML = `
    <div class="pwa-banner-content">
      <div class="pwa-banner-icon">
        <img src="images/logo.png" alt="ClubHub">
      </div>
      <div class="pwa-banner-text">
        <h4>Install ClubHub</h4>
        <p>Get the app experience with offline access and faster loading</p>
      </div>
      <div class="pwa-banner-actions">
        <button class="pwa-banner-install" onclick="installPWAFromBanner()">Install</button>
        <button class="pwa-banner-dismiss" onclick="dismissPWABanner()">Not Now</button>
      </div>
      <button class="pwa-banner-close" onclick="dismissPWABannerPermanently()" title="Don't show again">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10 8.586L3.707 2.293 2.293 3.707 8.586 10l-6.293 6.293 1.414 1.414L10 11.414l6.293 6.293 1.414-1.414L11.414 10l6.293-6.293-1.414-1.414L10 8.586z"/>
        </svg>
      </button>
    </div>
  `;

  document.body.appendChild(banner);

  // Animate in after a short delay
  setTimeout(() => {
    banner.classList.add("pwa-banner-visible");
  }, 1000);
}

// Listen for beforeinstallprompt event
window.addEventListener("beforeinstallprompt", (e) => {
  console.log("💾 beforeinstallprompt fired");
  e.preventDefault();
  deferredPrompt = e;

  // Show header install buttons if they exist
  const installBtns = document.querySelectorAll(".pwa-install-btn");
  installBtns.forEach((btn) => {
    btn.style.display = "inline-flex";
  });

  // Show banner or floating button
  if (!isPWAInstalled()) {
    createInstallBanner();
  }
});

// Install PWA from banner
window.installPWAFromBanner = function () {
  dismissPWABanner();
  installPWA();
};

// Dismiss banner temporarily (this session only)
window.dismissPWABanner = function () {
  const banner = document.getElementById("pwa-install-banner");
  if (banner) {
    banner.classList.remove("pwa-banner-visible");
    setTimeout(() => {
      banner.remove();
      createFloatingInstallButton(); // Show floating button instead
    }, 300);
  }
};

// Dismiss banner permanently
window.dismissPWABannerPermanently = function () {
  localStorage.setItem("pwa-banner-dismissed", "true");
  dismissPWABanner();
};

// Handle install button click
function installPWA() {
  const installBtns = document.querySelectorAll(".pwa-install-btn");
  const floatingBtn = document.getElementById("pwa-floating-btn");

  installBtns.forEach((btn) => {
    btn.style.display = "none";
  });

  if (!deferredPrompt) {
    console.log("❌ No deferred prompt available");
    // Show helpful message
    alert(
      "To install ClubHub:\n\nChrome/Edge: Click the install icon in the address bar\niOS Safari: Tap Share → Add to Home Screen",
    );
    return;
  }

  deferredPrompt.prompt();

  deferredPrompt.userChoice.then((choiceResult) => {
    if (choiceResult.outcome === "accepted") {
      console.log("✅ User accepted the install prompt");
      // Hide all install prompts
      const banner = document.getElementById("pwa-install-banner");
      if (banner) banner.remove();
      if (floatingBtn) floatingBtn.remove();
    } else {
      console.log("❌ User dismissed the install prompt");
      // Show buttons again if dismissed
      installBtns.forEach((btn) => {
        btn.style.display = "inline-flex";
      });
    }
    deferredPrompt = null;
  });
}

// Listen for successful installation
window.addEventListener("appinstalled", (evt) => {
  console.log("✅ ClubHub PWA installed successfully");

  // Hide all install UI
  const installBtns = document.querySelectorAll(".pwa-install-btn");
  installBtns.forEach((btn) => {
    btn.style.display = "none";
  });

  const banner = document.getElementById("pwa-install-banner");
  if (banner) banner.remove();

  const floatingBtn = document.getElementById("pwa-floating-btn");
  if (floatingBtn) floatingBtn.remove();

  // Mark as installed
  localStorage.setItem("pwa-installed", "true");
});

// Check if already installed on load
window.addEventListener("load", () => {
  if (isPWAInstalled()) {
    console.log("✅ Running as installed PWA");
    const installBtns = document.querySelectorAll(".pwa-install-btn");
    installBtns.forEach((btn) => {
      btn.style.display = "none";
    });
  } else if (hasUserDismissedBanner() && deferredPrompt) {
    // User dismissed banner before, show floating button
    createFloatingInstallButton();
  }
});
