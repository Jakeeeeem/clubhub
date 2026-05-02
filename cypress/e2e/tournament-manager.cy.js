describe('Tournament manager - mobile friendly checks', () => {
  beforeEach(() => cy.viewport('iphone-x'));

  it('loads coach tournament manager and shows list container', () => {
    cy.visit('/coach-chat.html#coach-tournament-manager');
    cy.get('#coachTournamentListContainer', { timeout: 10000 }).should('exist');
  });

  it('converts tournament table/grid to mobile cards when present', () => {
    cy.visit('/coach-chat.html#coach-tournament-manager');
    cy.get('.mobile-card, .mobile-card-list', { timeout: 10000 }).should('exist');
  });
});
