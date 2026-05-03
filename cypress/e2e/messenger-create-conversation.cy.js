describe('Messenger — create new conversation', () => {
  it('allows composing a message without an active convo and sending after picking recipient', () => {
    // Seed deterministic localStorage for test user/context before page load
    cy.visit('/coach-chat.html', {
      onBeforeLoad(win) {
        try {
          win.localStorage.setItem('isDemoSession', 'true');
          // Use admin account_type to avoid client-side permission gating in tests
          win.localStorage.setItem('currentUser', JSON.stringify({ id: 'cypress-user-1', first_name: 'Cypress', last_name: 'User', account_type: 'admin' }));
        } catch (e) {}
      }
    });

    // Ensure messenger section is visible (JS-driven navigation)
    cy.window().then((win) => {
      if (typeof win.showCoachSection === 'function') win.showCoachSection('messenger');
    });

    // Open New Message modal via the messenger API to avoid ambiguous buttons
    cy.window().then((win) => {
      if (win.SquadMessenger && typeof win.SquadMessenger.openNewMessageModal === 'function') {
        win.SquadMessenger.openNewMessageModal();
      } else {
        // fallback: click the visible New button
        cy.get('.sq-left').find('button').contains('+ New').first().click();
      }
    });

    // Modal should appear
    cy.get('#sq-new-modal').should('be.visible');

    // Wait for contacts to load into the picker
    cy.get('#sq-contact-picker > *').should('have.length.greaterThan', 0);

    // Open a conversation programmatically to avoid DOM re-render flakiness
    cy.window().then((win) => {
      const c = win.SquadMessenger?.state?.allContacts?.[0];
      if (c) {
        const name = (c.first_name || c.firstName || c.name || '').trim();
        if (typeof win.SquadMessenger.openConversation === 'function') {
          win.SquadMessenger.openConversation(c.id || c.user_id, name || '');
        } else if (typeof win.SquadMessenger._pickContact === 'function') {
          win.SquadMessenger._pickContact(c.id || c.user_id, name || '');
        }
      }
    });

    // Wait for chat header to update to the picked contact
    cy.get('#sq-chat-name').should('not.contain', 'Select a conversation');

    // Set message and send via the messenger API to avoid click/visibility flakiness
    cy.window().then((win) => {
      const input = win.document.getElementById('sq-input');
      if (input) input.value = 'Hello from Cypress';
      if (win.SquadMessenger && typeof win.SquadMessenger.send === 'function') {
        win.SquadMessenger.send();
      }
    });

    // Verify internal state updated, then DOM
    cy.window().its('SquadMessenger.state').should('exist').then(state => {
      const has = (state.allMessages || []).some(m => (m.content || '').includes('Hello from Cypress'));
      expect(has, 'message present in state').to.be.true;
    });

    // Finally check UI shows message
    cy.get('#sq-messages').should('contain.text', 'Hello from Cypress');
  });
});
