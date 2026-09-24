import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SkeletonLoader, SkeletonCard, SkeletonList, SkeletonStatCard } from '../SkeletonLoader';

describe('SkeletonLoader Component', () => {
  it('renders with default props', () => {
    render(<SkeletonLoader />);
    expect(screen.getByTestId('skeleton-loader')).toBeInTheDocument();
  });

  it('applies custom width and height', () => {
    render(<SkeletonLoader width="200px" height="50px" />);
    const skeleton = screen.getByTestId('skeleton-loader');
    expect(skeleton).toHaveStyle({ width: '200px', height: '50px' });
  });

  it('applies variant classes', () => {
    render(<SkeletonLoader variant="avatar" />);
    expect(screen.getByTestId('skeleton-loader')).toHaveClass('skeleton-avatar');
  });

  it('renders SkeletonCard', () => {
    render(<SkeletonCard />);
    expect(screen.getByTestId('skeleton-card')).toBeInTheDocument();
  });

  it('renders SkeletonStatCard', () => {
    render(<SkeletonStatCard />);
    expect(screen.getByTestId('skeleton-stat-card')).toBeInTheDocument();
  });

  it('renders SkeletonList with correct count', () => {
    render(<SkeletonList count={3} />);
    const items = screen.getAllByTestId('skeleton-list-item');
    expect(items).toHaveLength(3);
  });
});