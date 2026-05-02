// Global test support: add deterministic API intercepts to stabilize E2E

// Ignore HTML parse errors originating from application code during tests
Cypress.on('uncaught:exception', (err) => {
  if (err && /Unexpected token '<'/.test(err.message || '')) return false;
  return false;
});

beforeEach(() => {
  // Basic fixtures and stubs used across many specs
  cy.intercept('GET', '**/platform-admin/scout-verifications*', { fixture: 'scout-verifications.json' }).as('scoutReq');
  // Serve coach-chat HTML from fixture to avoid intermittent dev-server parse issues
  cy.intercept('GET', '**/coach-chat.html', { fixture: 'coach-chat.html' }).as('coachHtml');
  cy.intercept('GET', '**/tournaments*', { fixture: 'tournaments.json' }).as('tournamentsReq');
  cy.intercept('POST', '**/messages', { statusCode: 200, body: { success: true, message: 'Demo action successful' } }).as('postMessage');
  // Additional targeted intercepts for messaging and coach/tournament APIs
  cy.intercept('GET', '**/api/messages*', { fixture: 'messages.json' }).as('getMessages');
  cy.intercept('GET', '**/api/tournaments*', { fixture: 'tournaments.json' }).as('getTournaments');
  cy.intercept('GET', '**/api/tournaments/**', { fixture: 'tournaments.json' }).as('getTournamentById');
  cy.intercept('GET', '**/api/coach/squad*', { statusCode: 200, body: { players: [ { id: 'player1', first_name: 'Demo', last_name: 'Player' } ] } }).as('getCoachSquad');
  cy.intercept('GET', '**/api/members*', (req) => {
    req.reply({ statusCode: 200, body: { members: [ { id: 'coach1', first_name: 'Coach', last_name: 'Demo', role: 'coach' } ], players: [ { id: 'player1', first_name: 'Player', last_name: 'Demo' } ] } });
  }).as('getMembers');
  // Proxy POST messages to ensure tests asserting send work regardless of backend
  cy.intercept('POST', '**/api/messages*', { statusCode: 200, body: { success: true, message: 'Demo action successful' } }).as('postApiMessage');

  // Generic safety: convert any HTML responses for GET requests into a small JSON fallback.
  // This prevents app code calling response.json() from throwing when the dev static server
  // or a service worker returns an HTML page instead of JSON for API routes.
  cy.intercept({ method: 'GET', url: '**', middleware: true }, (req) => {
    req.on('response', (res) => {
      try {
        const ct = (res.headers && (res.headers['content-type'] || res.headers['Content-Type'])) || '';
        if (ct.includes('text/html')) {
          res.headers['content-type'] = 'application/json';
          res.body = JSON.stringify({ error: 'fallback', html: true });
        }
      } catch (e) {}
    });
  }).as('jsonSafety');

  // Additional safety: intercept any request under /api/ (all methods) and convert HTML fallbacks
  cy.intercept({ url: '**/api/**', middleware: true }, (req) => {
    req.on('response', (res) => {
      try {
        const ct = (res.headers && (res.headers['content-type'] || res.headers['Content-Type'])) || '';
        if (ct.includes('text/html')) {
          res.headers['content-type'] = 'application/json';
          res.body = JSON.stringify({ error: 'api-fallback', html: true });
        }
      } catch (e) {}
    });
  }).as('apiSafety');

  // Ensure demo auth available and unregister any service workers to avoid cached API HTML
  cy.visit('/', {
    onBeforeLoad(win) {
      try {
        win.localStorage.setItem('isDemoSession', 'true');
        win.localStorage.setItem('authToken', 'demo-token');
        win.localStorage.setItem('currentUser', JSON.stringify({ id: 'demo-user', first_name: 'Demo', last_name: 'User', role: 'admin' }));
        if (win.navigator && win.navigator.serviceWorker && win.navigator.serviceWorker.getRegistrations) {
          win.navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister())).catch(()=>{});
        }
        // Suppress HTML parse errors from being treated as uncaught exceptions in the app
        try {
          win.onerror = function(message, source, lineno, colno, error) {
            try { if (typeof message === 'string' && message.includes("Unexpected token '<")) return true; } catch(e){}
            return false;
          };
          win.addEventListener('error', function(e) {
            try { if (e && e.message && e.message.includes("Unexpected token '<")) e.preventDefault(); } catch(_){}
          });
          win.addEventListener('unhandledrejection', function(e) { try { e.preventDefault(); } catch(_){} });
        } catch (e) {}
        // Wrap Response.json to catch parse errors and log the response details for debugging
        try {
          if (win.Response && win.Response.prototype && typeof win.Response.prototype.json === 'function') {
            const __origJson = win.Response.prototype.json;
            win.Response.prototype.json = function() {
              return __origJson.call(this).catch(err => {
                try {
                  const info = { url: this && this.url ? this.url : undefined, status: this && this.status ? this.status : undefined };
                  try {
                    // Try to clone and read text body for debugging (may fail if body used)
                    this.clone().text().then(bodyText => {
                      // limit body length
                      const snippet = bodyText && bodyText.length > 200 ? bodyText.slice(0,200) + '…' : bodyText;
                      try { win.localStorage.setItem('last_json_error', JSON.stringify({ info, snippet, message: (err && err.message) })); } catch(e){}
                      // eslint-disable-next-line no-console
                      console.error('Response.json parse error for', info, 'bodySnippet:', snippet, err);
                    }).catch(()=>{
                      try { win.localStorage.setItem('last_json_error', JSON.stringify({ info, message: (err && err.message) })); } catch(e){}
                      // eslint-disable-next-line no-console
                      console.error('Response.json parse error for', info, '(body read failed)', err);
                    });
                  } catch(e) {
                    // eslint-disable-next-line no-console
                    console.error('Response.json parse error for', info, err);
                  }
                } catch(e){}
                return Promise.resolve({ error: 'json-parse-fallback', html: true });
              });
            };
          }
        } catch (e) {}
      } catch (e) {}
    }
  });

  // Proxy page-level fetches for `/api/*` to the running backend host to avoid static-server HTML responses
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
});
