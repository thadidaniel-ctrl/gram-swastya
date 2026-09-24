/// <reference types="cypress" />

describe('Patient Login Flow', () => {
  beforeEach(() => {
    cy.visit('/login');
  });

  it('should display login page', () => {
    cy.contains('Login').should('be.visible');
    cy.get('input[type="tel"]').should('exist');
    cy.get('button[type="submit"]').should('exist');
  });

  it('shows error for invalid phone number', () => {
    cy.get('input[type="tel"]').type('123');
    cy.get('button[type="submit"]').click();
    cy.contains('Invalid phone number').should('be.visible');
  });

  it('sends OTP for valid phone number', () => {
    cy.get('input[type="tel"]').type('9999999999');
    cy.get('button[type="submit"]').click();
    cy.contains('OTP sent').should('be.visible');
  });

  it('shows OTP input after sending', () => {
    cy.get('input[type="tel"]').type('9999999999');
    cy.get('button[type="submit"]').click();
    cy.contains('Enter OTP').should('be.visible');
    cy.get('input[maxlength="1"]').should('have.length', 6);
  });
});

describe('Patient Dashboard', () => {
  beforeEach(() => {
    // Mock authenticated state
    cy.window().then((win) => {
      win.localStorage.setItem('accessToken', 'mock-token');
      win.localStorage.setItem('refreshToken', 'mock-refresh');
    });
  });

  beforeEach(() => {
    cy.visit('/dashboard');
  });

  it('displays welcome message', () => {
    cy.contains('Welcome').should('be.visible');
  });

  it('shows stats cards', () => {
    cy.get('[class*="stat"]').should('have.length.at.least', 3);
  });

  it('navigates to medicines page', () => {
    cy.contains('My Medicines').click();
    cy.url().should('include', '/medicines');
  });
});

describe('File Upload Flow', () => {
  beforeEach(() => {
    cy.window().then((win) => {
      win.localStorage.setItem('accessToken', 'mock-token');
      win.localStorage.setItem('refreshToken', 'mock-refresh');
    });
  });

  beforeEach(() => {
    cy.visit('/files');
  });

  it('displays upload button', () => {
    cy.contains('Upload Files').should('be.visible');
  });

  it('opens upload modal', () => {
    cy.contains('Upload Files').click();
    cy.contains('Upload Medical Files').should('be.visible');
  });

  it('shows drag and drop zone', () => {
    cy.contains('Upload Files').click();
    cy.contains('Drag & drop files here').should('be.visible');
  });
});

describe('Emergency/Ambulance Booking', () => {
  beforeEach(() => {
    cy.window().then((win) => {
      win.localStorage.setItem('accessToken', 'mock-token');
      win.localStorage.setItem('refreshToken', 'mock-refresh');
    });
  });

  beforeEach(() => {
    cy.visit('/ambulance');
  });

  it('displays emergency types', () => {
    cy.contains('Cardiac').should('be.visible');
    cy.contains('Trauma').should('be.visible');
    cy.contains('Respiratory').should('be.visible');
  });

  it('allows location selection', () => {
    cy.get('input[placeholder*="location"]').should('exist');
  });

  it('shows confirmation before booking', () => {
    cy.contains('Cardiac').click();
    cy.contains('Confirm').click();
    cy.contains('Confirm booking').should('be.visible');
  });
});