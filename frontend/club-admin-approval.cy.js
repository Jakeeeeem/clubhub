// cypress/e2e/club-admin-approval.cy.js
// Headless E2E test for club-admin scout approval UI

// NOTE: This assumes Cypress is installed and configured in the project.
// If not, run: npm install --save-dev cypress

describe("Club Admin Scout Approval UI", () => {
  before(() => {
    // Optionally seed DB or login via API
    cy.visit("/frontend/admin-dashboard.html");
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
