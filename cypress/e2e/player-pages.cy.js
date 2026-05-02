describe('Player pages - mobile layout checks', () => {
  beforeEach(() => cy.viewport('iphone-x'));

  const pages = ['/player-dashboard.html', '/player-shop.html'];

  pages.forEach(p => {
    it(`loads ${p} and shows mobile layout`, () => {
      cy.visit(p);
      cy.get('body', { timeout: 10000 }).should('exist');
      cy.get('.mobile-card, .mobile-card-list', { timeout: 10000 }).should('exist');
    });
  });

  it('loads dashboard-new SPA and mounts app', () => {
    cy.visit('/dashboard-new.html');
    cy.get('#app', { timeout: 10000 }).should('exist');
  });
});
