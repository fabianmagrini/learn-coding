import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithRouter } from '../../../test-utils';
import { CartDrawer } from './CartDrawer';
import { useCartStore } from '../store/cart.store';

describe('CartDrawer', () => {
  const onClose = vi.fn();

  beforeEach(() => {
    useCartStore.setState({ items: [] });
    vi.clearAllMocks();
  });

  it('is offscreen when open=false (translate-x-full class)', () => {
    renderWithRouter(<CartDrawer open={false} onClose={onClose} />);
    // The drawer is hidden via CSS transform, not display:none — check the class
    expect(screen.getByRole('dialog')).toHaveClass('translate-x-full');
    // The backdrop overlay should not be rendered
    expect(document.querySelector('[aria-hidden="true"]')).not.toBeInTheDocument();
  });

  it('is visible when open=true', () => {
    renderWithRouter(<CartDrawer open={true} onClose={onClose} />);
    expect(screen.getByRole('dialog', { name: /shopping cart/i })).toBeInTheDocument();
  });

  it('shows empty cart message when no items', () => {
    renderWithRouter(<CartDrawer open={true} onClose={onClose} />);
    expect(screen.getByText('Your cart is empty.')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    renderWithRouter(<CartDrawer open={true} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /close cart/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when overlay is clicked', () => {
    renderWithRouter(<CartDrawer open={true} onClose={onClose} />);
    // the overlay div is aria-hidden, click it directly
    const overlay = document.querySelector('[aria-hidden="true"]') as HTMLElement;
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('renders cart items when items are present', () => {
    useCartStore.setState({ items: [{ productId: 'prod-1', quantity: 3 }] });
    renderWithRouter(<CartDrawer open={true} onClose={onClose} />);
    expect(screen.getByText('prod-1')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('shows item count in heading', () => {
    useCartStore.setState({ items: [{ productId: 'prod-1', quantity: 1 }, { productId: 'prod-2', quantity: 2 }] });
    renderWithRouter(<CartDrawer open={true} onClose={onClose} />);
    expect(screen.getByText('Your Cart (2)')).toBeInTheDocument();
  });

  it('shows checkout link when items are present', () => {
    useCartStore.setState({ items: [{ productId: 'prod-1', quantity: 1 }] });
    renderWithRouter(<CartDrawer open={true} onClose={onClose} />);
    expect(screen.getByRole('link', { name: /proceed to checkout/i })).toHaveAttribute('href', '/checkout');
  });

  it('does not show checkout link when cart is empty', () => {
    renderWithRouter(<CartDrawer open={true} onClose={onClose} />);
    expect(screen.queryByRole('link', { name: /proceed to checkout/i })).not.toBeInTheDocument();
  });

  it('clears cart when Clear Cart is clicked', () => {
    useCartStore.setState({ items: [{ productId: 'prod-1', quantity: 1 }] });
    renderWithRouter(<CartDrawer open={true} onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: /clear cart/i }));

    expect(useCartStore.getState().items).toHaveLength(0);
  });
});
