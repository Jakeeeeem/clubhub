// Headless E2E test for club-admin scout approval UI
// Place this file in cypress/e2e/

describe('Club Admin Scout Approval UI', () => {
  beforeEach(() => {
    cy.visit('/admin-scout-approvals.html', {
      onBeforeLoad(win) {
        try {
          win.localStorage.setItem('isDemoSession', 'true');
          win.localStorage.setItem('currentUser', JSON.stringify({ id: 'demo-admin', userType: 'admin', firstName: 'Demo', lastName: 'Admin' }));
        } catch (e) {}
      }
    });
  });

  beforeEach(() => {
    cy.intercept('GET', '**/platform-admin/scout-verifications*').as('scoutReq');
  });

  it('loads pending scout approvals', () => {
    // activate platform tab in case approvals are lazy-loaded
    cy.window().then((win) => {
      if (typeof win.showScoutTab === 'function') win.showScoutTab('platform');
    });
    cy.wait('@scoutReq', { timeout: 10000 }).its('response.body').then((body) => {
      cy.log('scoutReq response', JSON.stringify(body));
      expect(body).to.exist;
      // support both array or wrapped response
      const list = Array.isArray(body) ? body : (body.requests || body || []);
      expect(list.length).to.be.greaterThan(0);
    });
    cy.get('#scoutApprovalsList', { timeout: 10000 }).should('exist');
    cy.get('#scoutApprovalsList .feed-entry', { timeout: 10000 }).should('have.length.at.least', 1);
    cy.contains('Oliver Brown').should('exist');
  });

  it('approves a scout (click only)', () => {
    cy.window().then((win) => {
      if (typeof win.showScoutTab === 'function') win.showScoutTab('platform');
    });
    cy.get('#scoutApprovalsList .feed-entry', { timeout: 10000 }).first().within(() => {
      cy.contains('Approve').click();
    });
    cy.get('#scoutApprovalsList', { timeout: 10000 }).should('exist');
  });

  it('rejects a scout (click only)', () => {
    cy.window().then((win) => {
      if (typeof win.showScoutTab === 'function') win.showScoutTab('platform');
    });
    cy.get('#scoutApprovalsList .feed-entry', { timeout: 10000 }).first().within(() => {
      cy.contains('Reject').click();
    });
    cy.get('#scoutApprovalsList', { timeout: 10000 }).should('exist');
  });
});
