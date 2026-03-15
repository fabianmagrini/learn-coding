import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from './badge.js';

describe('Badge', () => {
  it('renders children', () => {
    render(<Badge>completed</Badge>);
    expect(screen.getByText('completed')).toBeInTheDocument();
  });

  it('applies success variant classes', () => {
    const { container } = render(<Badge variant="success">OK</Badge>);
    expect(container.firstChild).toHaveClass('bg-green-100');
  });

  it('applies error variant classes', () => {
    const { container } = render(<Badge variant="error">Fail</Badge>);
    expect(container.firstChild).toHaveClass('bg-red-100');
  });

  it('applies warning variant classes', () => {
    const { container } = render(<Badge variant="warning">Warn</Badge>);
    expect(container.firstChild).toHaveClass('bg-yellow-100');
  });

  it('defaults to default variant', () => {
    const { container } = render(<Badge>Default</Badge>);
    expect(container.firstChild).toHaveClass('bg-gray-100');
  });

  it('applies custom className', () => {
    const { container } = render(<Badge className="custom-class">Text</Badge>);
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
