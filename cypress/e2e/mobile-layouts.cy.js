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
    it(`renders mobile cards on ${p}`, () => {
      cy.visit(p);
      cy.get('.mobile-card, .mobile-card-list', { timeout: 10000 }).should('exist');
    });
  });
});
