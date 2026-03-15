import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Card, CardHeader, CardBody } from './card.js';

describe('Card', () => {
  it('renders children', () => {
    render(<Card><span>content</span></Card>);
    expect(screen.getByText('content')).toBeDefined();
  });

  it('applies custom className', () => {
    const { container } = render(<Card className="custom-class"><div /></Card>);
    expect(container.firstChild).toHaveClass('custom-class');
  });
});

describe('CardHeader', () => {
  it('renders the title', () => {
    render(<CardHeader title="My Card" />);
    expect(screen.getByText('My Card')).toBeDefined();
  });

  it('renders subtitle when provided', () => {
    render(<CardHeader title="Title" subtitle="Subtitle text" />);
    expect(screen.getByText('Subtitle text')).toBeDefined();
  });

  it('omits subtitle when not provided', () => {
    render(<CardHeader title="Title" />);
    expect(screen.queryByText('Subtitle text')).toBeNull();
  });

  it('renders action element when provided', () => {
    render(<CardHeader title="Title" action={<button>Action</button>} />);
    expect(screen.getByRole('button', { name: 'Action' })).toBeDefined();
  });
});

describe('CardBody', () => {
  it('renders children', () => {
    render(<CardBody><p>body content</p></CardBody>);
    expect(screen.getByText('body content')).toBeDefined();
  });

  it('applies custom className', () => {
    const { container } = render(<CardBody className="extra"><div /></CardBody>);
    expect(container.firstChild).toHaveClass('extra');
  });
});
