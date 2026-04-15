// Headless E2E test for club-admin scout approval UI
// Place this file in cypress/e2e/

describe("Club Admin Scout Approval UI", () => {
  before(() => {
    cy.visit("/admin-dashboard.html");
  });

  it("loads pending scout approvals", () => {
    cy.contains("Scout Approvals").should("exist");
    cy.get('[data-testid="scout-approval-row"]').should("exist");
  });

  it("approves a scout", () => {
    cy.get('[data-testid="scout-approval-row"]')
      .first()
      .within(() => {
        cy.contains("Approve").click();
      });
    cy.contains("Approval successful").should("exist");
  });

  it("rejects a scout", () => {
    cy.get('[data-testid="scout-approval-row"]')
      .first()
      .within(() => {
        cy.contains("Reject").click();
      });
    cy.contains("Rejection successful").should("exist");
  });
});
