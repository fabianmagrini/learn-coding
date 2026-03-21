import { describe, it, expect, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithRouter } from '../../../test-utils';
import { CartItemRow } from './CartItem';
import { useCartStore } from '../store/cart.store';

const mockItem = { productId: 'prod-1', quantity: 2 };

describe('CartItemRow', () => {
  beforeEach(() => {
    useCartStore.setState({ items: [{ ...mockItem }] });
  });

  it('renders the product id and quantity', () => {
    renderWithRouter(<CartItemRow item={mockItem} />);

    expect(screen.getByText('prod-1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('increases quantity when + is clicked', () => {
    renderWithRouter(<CartItemRow item={mockItem} />);

    fireEvent.click(screen.getByRole('button', { name: /increase quantity/i }));

    expect(useCartStore.getState().items[0].quantity).toBe(3);
  });

  it('decreases quantity when − is clicked', () => {
    renderWithRouter(<CartItemRow item={mockItem} />);

    fireEvent.click(screen.getByRole('button', { name: /decrease quantity/i }));

    expect(useCartStore.getState().items[0].quantity).toBe(1);
  });

  it('removes item when quantity is decremented below 1', () => {
    useCartStore.setState({ items: [{ productId: 'prod-1', quantity: 1 }] });
    renderWithRouter(<CartItemRow item={{ productId: 'prod-1', quantity: 1 }} />);

    fireEvent.click(screen.getByRole('button', { name: /decrease quantity/i }));

    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it('removes item when Remove is clicked', () => {
    renderWithRouter(<CartItemRow item={mockItem} />);

    fireEvent.click(screen.getByRole('button', { name: /remove prod-1/i }));

    expect(useCartStore.getState().items).toHaveLength(0);
  });
});
