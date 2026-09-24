import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import App from '../App';

describe('App smoke test', () => {
  it('renders without throwing (regression: ToastProvider/AuthProvider ordering, localStorage)', async () => {
    render(<App />);

    await waitFor(
      () => {
        expect(document.body.textContent.length).toBeGreaterThan(0);
      },
      { timeout: 3000 }
    );

    // The error-boundary fallback must NOT be what "rendered" — AuthProvider
    // must never throw (guards the temporal-dead-zone regression).
    const text = document.body.textContent;
    expect(text).not.toContain('Something went wrong');
    expect(text).not.toContain('Reload Page');
  });
});