import { describe, it, expect, beforeEach } from 'vitest';
import { useCartStore } from './cart.store';

describe('cartStore', () => {
  beforeEach(() => {
    useCartStore.setState({ items: [] });
  });

  it('should add an item', () => {
    useCartStore.getState().addItem({ productId: '1', quantity: 2 });
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().items[0].quantity).toBe(2);
  });

  it('should increment quantity when adding existing item', () => {
    useCartStore.getState().addItem({ productId: '1', quantity: 1 });
    useCartStore.getState().addItem({ productId: '1', quantity: 3 });
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().items[0].quantity).toBe(4);
  });

  it('should remove an item', () => {
    useCartStore.getState().addItem({ productId: '1', quantity: 1 });
    useCartStore.getState().removeItem('1');
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it('should update quantity', () => {
    useCartStore.getState().addItem({ productId: '1', quantity: 1 });
    useCartStore.getState().updateQuantity('1', 5);
    expect(useCartStore.getState().items[0].quantity).toBe(5);
  });

  it('should remove item when quantity is set to 0', () => {
    useCartStore.getState().addItem({ productId: '1', quantity: 1 });
    useCartStore.getState().updateQuantity('1', 0);
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it('should clear cart', () => {
    useCartStore.getState().addItem({ productId: '1', quantity: 1 });
    useCartStore.getState().addItem({ productId: '2', quantity: 2 });
    useCartStore.getState().clearCart();
    expect(useCartStore.getState().items).toHaveLength(0);
  });
});
