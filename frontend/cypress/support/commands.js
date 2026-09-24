// Cypress custom commands (plain JavaScript)

/// <reference types="cypress" />

// Login command
Cypress.Commands.add('loginByPhone', (phone, password) => {
  cy.visit('/login');
  cy.get('input[type="tel"]').type(phone);
  cy.get('input[type="password"]').type(password);
  cy.get('button[type="submit"]').click();
});

// Custom command to find element by data-testid
Cypress.Commands.add('getByTestId', { prevSubject: 'optional' }, (subject, testId) => {
  if (subject) {
    return cy.wrap(subject).find('[data-testid="' + testId + '"]');
  }
  return cy.get('[data-testid="' + testId + '"]');
});