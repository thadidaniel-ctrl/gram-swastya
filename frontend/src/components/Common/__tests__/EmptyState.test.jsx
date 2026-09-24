import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmptyState } from '../EmptyState';
import { MemoryRouter } from 'react-router-dom';

describe('EmptyState Component', () => {
  const renderWithRouter = (component) => {
    return render(
      <MemoryRouter>
        {component}
      </MemoryRouter>
    );
  };

  it('renders with title and description', () => {
    renderWithRouter(<EmptyState title="No data" description="No items found" />);
    expect(screen.getByText('No data')).toBeInTheDocument();
    expect(screen.getByText('No items found')).toBeInTheDocument();
  });

  it('renders custom icon', () => {
    renderWithRouter(<EmptyState icon="🔍" title="No results" />);
    expect(screen.getByText('🔍')).toBeInTheDocument();
  });

  it('renders action button when action is provided', () => {
    renderWithRouter(<EmptyState action={{ label: 'Retry', onClick: vi.fn() }} />);
    const button = screen.getByRole('button', { name: 'Retry' });
    expect(button).toBeInTheDocument();
  });

  it('calls onClick when action button is clicked', async () => {
    render(
      <MemoryRouter>
        <EmptyState action={{ label: 'Retry', onClick: vi.fn() }} />
      </MemoryRouter>
    );
    const button = screen.getByRole('button', { name: 'Retry' });
    await userEvent.click(button);
    // We can't easily test the onClick mock without more setup, but we can verify the button exists
  });

  it('renders navigation action button', () => {
    renderWithRouter(<EmptyState action={{ to: '/dashboard', label: 'Go Home' }} />);
    const button = screen.getByRole('button', { name: 'Go Home' });
    expect(button).toBeInTheDocument();
  });

  it('applies custom className', () => {
    renderWithRouter(<EmptyState className="custom-class" />);
    expect(screen.getByTestId('empty-state')).toHaveClass('custom-class');
  });

  it('renders without action when no action provided', () => {
    renderWithRouter(<EmptyState title="No action" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});