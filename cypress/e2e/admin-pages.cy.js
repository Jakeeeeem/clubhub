describe('Admin pages - mobile layout checks', () => {
  beforeEach(() => cy.viewport('iphone-x'));

  const pages = ['/admin-staff.html', '/admin-teams.html', '/admin-finances.html', '/admin-dashboard.html'];

  pages.forEach(p => {
    it(`loads ${p} and shows mobile layout`, () => {
      cy.visit(p);
      cy.get('body', { timeout: 10000 }).should('exist');
      cy.get('.mobile-card, .mobile-card-list', { timeout: 10000 }).should('exist');
    });
  });
});
