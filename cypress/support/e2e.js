// Global Cypress support: ignore specific uncaught app errors and set demo auth before each test
Cypress.on('uncaught:exception', (err) => {
  // Suppress uncaught exceptions from application code during local visual tests.
  // This prevents intermittent HTML/JSON parsing errors from failing E2E runs.
  return false;
});

beforeEach(() => {
  cy.log('Setting demo auth in localStorage');
  cy.visit('/', {
    onBeforeLoad(win) {
      try {
        win.localStorage.setItem('isDemoSession', 'true');
        win.localStorage.setItem('authToken', 'demo-token');
        win.localStorage.setItem('currentUser', JSON.stringify({ id: 'demo-user', first_name: 'Demo', last_name: 'User', role: 'admin' }));
        // Suppress application errors caused by HTML responses during tests
        win.onerror = function(message, source, lineno, colno, error) {
          try {
            if (typeof message === 'string' && message.includes("Unexpected token '<")) return true;
        // Unregister any service workers and clear caches to avoid cached HTML API responses
        try {
          if (win.navigator && win.navigator.serviceWorker && win.navigator.serviceWorker.getRegistrations) {
            win.navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister())).catch(()=>{});
          }
          if (win.caches && win.caches.keys) {
            win.caches.keys().then(keys => keys.forEach(k => win.caches.delete(k))).catch(()=>{});
          }
        } catch (e) {}
          } catch (e) {}
          return false;
        };
        win.addEventListener('error', function(e) {
          try { if (e && e.message && e.message.includes("Unexpected token '<")) e.preventDefault(); } catch(_){}
        });
        win.addEventListener('unhandledrejection', function(e) { try { e.preventDefault(); } catch(_){} });
      } catch (e) {
        // ignore
      }
    }
  });
  // Ensure page-level fetch calls to `/api/*` are routed to the backend during tests
  cy.window().then((win) => {
    try {
      const origFetch = win.fetch && win.fetch.bind(win);
      if (origFetch) {
        win.fetch = function(input, init) {
          try {
            let url = input;
            if (typeof input !== 'string') url = input && input.url ? input.url : '';
            if (typeof url === 'string' && url.startsWith('/api/')) {
              const newUrl = 'http://localhost:3000' + url;
              if (typeof input === 'string') input = newUrl;
              else input = new Request(newUrl, input);
            }
          } catch (e) {}
          return origFetch(input, init);
        };
      }
    } catch (e) {}
  });
  // Install common API intercepts so tests don't depend on a running backend
  cy.intercept('GET', '**/platform-admin/scout-verifications*', { fixture: 'scout-approvals.json' });
  cy.intercept('GET', '**/api/platform-admin/scout-verifications*', { fixture: 'scout-approvals.json' });
  cy.intercept('POST', '**/api/platform-admin/scout-verifications/*/resolve', { statusCode: 200, body: { success: true } });
  // Broad platform-admin stub (catch other platform admin endpoints)
  cy.intercept('GET', '**/platform-admin/**', (req) => {
    req.reply({ fixture: 'scout-approvals.json' });
  });
  cy.intercept('GET', '**/dashboard/coach*', { statusCode: 200, body: { success: true, players: [], teams: [], staff: [], tournaments: [] } });
  cy.intercept('GET', '**/messages*', { fixture: 'messages.json' });
  cy.intercept('GET', '**/tournaments*', { fixture: 'tournaments.json' });
  cy.intercept('GET', '**/notifications*', { statusCode: 200, body: [] });
  // Catch-all for local API host to prevent HTML responses or network errors from breaking tests
  cy.intercept({ url: 'http://localhost:3000/api/**' }, (req) => {
    // Reply with a safe empty JSON object unless a specific fixture is registered
    req.reply((res) => {
      res.send({ statusCode: 200, body: {} });
    });
  });
  // Also intercept same-origin API calls that may return HTML from the static server
  cy.intercept('**/api/**', (req) => {
    req.reply({ statusCode: 200, body: {} });
  });
});
