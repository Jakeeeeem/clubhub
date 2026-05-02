describe('Mobile layout checks', () => {
  beforeEach(() => {
    cy.viewport('iphone-x');
  });

  const pages = [
    '/admin-teams.html',
    '/admin-finances.html',
    '/coach-chat.html',
    '/player-dashboard.html',
    '/player-shop.html'
  ];

  pages.forEach((p) => {
    const testFn = p === '/coach-chat.html' ? it.skip : it;
    testFn(`renders mobile cards on ${p}`, () => {
      cy.visit(p);
      cy.get('.mobile-card, .mobile-card-list', { timeout: 10000 }).should('exist');
    });
  });
});
