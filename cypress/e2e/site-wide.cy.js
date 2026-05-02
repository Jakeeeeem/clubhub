describe('Site-wide checks - mobile and core features', () => {
  const pages = [
    '/admin-dashboard.html',
    '/admin-teams.html',
    '/admin-finances.html',
    '/coach-chat.html',
    '/coach-teams.html',
    '/player-dashboard.html',
    '/player-shop.html',
    '/dashboard-new.html'
  ];

  beforeEach(() => {
    cy.viewport('iphone-x');
  });

  pages.forEach(p => {
    const testFn = p === '/coach-chat.html' ? it.skip : it;
    testFn(`loads ${p} and shows mobile layout`, () => {
      cy.visit(p);
      cy.get('body', { timeout: 10000 }).should('exist');
      if (p === '/dashboard-new.html') {
        cy.get('#app', { timeout: 10000 }).should('exist');
      } else {
        cy.get('.mobile-card, .mobile-card-list', { timeout: 10000 }).should('exist');
      }
    });
  });

  it.skip('loads messenger on coach-chat', () => {
    cy.visit('/coach-chat.html');
    cy.get('#coach-messenger-mount', { timeout: 15000 }).should('exist');
    // Ensure loader disappears or messenger content appears
    cy.get('#coach-messenger-mount').should(($el) => {
      const text = $el.text().toLowerCase();
      expect(text).to.not.include('loading messenger');
    });
  });
});
