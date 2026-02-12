// PWA Installation Handler
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

// Listen for beforeinstallprompt event
window.addEventListener("beforeinstallprompt", (e) => {
  console.log("💾 beforeinstallprompt fired");
  e.preventDefault();
  deferredPrompt = e;

  // Show install button if it exists
  const installBtns = document.querySelectorAll(".pwa-install-btn");
  installBtns.forEach((btn) => {
    btn.style.display = "inline-flex";
  });
});

// Handle install button click
function installPWA() {
  const installBtns = document.querySelectorAll(".pwa-install-btn");
  installBtns.forEach((btn) => {
    btn.style.display = "none";
  });

  if (!deferredPrompt) {
    console.log("❌ No deferred prompt available");
    return;
  }

  deferredPrompt.prompt();

  deferredPrompt.userChoice.then((choiceResult) => {
    if (choiceResult.outcome === "accepted") {
      console.log("✅ User accepted the install prompt");
    } else {
      console.log("❌ User dismissed the install prompt");
      // Show button again if dismissed
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
  const installBtns = document.querySelectorAll(".pwa-install-btn");
  installBtns.forEach((btn) => {
    btn.style.display = "none";
  });
});

// Check if already installed
window.addEventListener("load", () => {
  if (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  ) {
    console.log("✅ Running as installed PWA");
    const installBtns = document.querySelectorAll(".pwa-install-btn");
    installBtns.forEach((btn) => {
      btn.style.display = "none";
    });
  }
});
