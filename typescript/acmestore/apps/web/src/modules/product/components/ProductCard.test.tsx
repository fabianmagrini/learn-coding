import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithRouter } from '../../../test-utils';
import { ProductCard } from './ProductCard';
import { useCartStore } from '../../cart/store/cart.store';

const mockProduct = {
  id: '1',
  name: 'Wireless Headphones',
  price: 79.99,
  description: 'High-quality wireless headphones.',
  imageUrl: 'https://example.com/headphones.jpg',
};

describe('ProductCard', () => {
  beforeEach(() => {
    useCartStore.setState({ items: [] });
  });

  it('renders product name, price, and description', () => {
    renderWithRouter(<ProductCard product={mockProduct} />);

    expect(screen.getByText('Wireless Headphones')).toBeInTheDocument();
    expect(screen.getByText('$79.99')).toBeInTheDocument();
    expect(screen.getByText('High-quality wireless headphones.')).toBeInTheDocument();
  });

  it('renders product image with alt text', () => {
    renderWithRouter(<ProductCard product={mockProduct} />);

    const img = screen.getByAltText('Wireless Headphones');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', mockProduct.imageUrl);
  });

  it('has a link to the product detail page', () => {
    renderWithRouter(<ProductCard product={mockProduct} />);

    const links = screen.getAllByRole('link');
    expect(links.some((l) => l.getAttribute('href') === '/products/1')).toBe(true);
  });

  it('adds item to cart when "Add to Cart" is clicked', () => {
    renderWithRouter(<ProductCard product={mockProduct} />);

    fireEvent.click(screen.getByRole('button', { name: /add to cart/i }));

    const { items } = useCartStore.getState();
    expect(items).toHaveLength(1);
    expect(items[0]).toEqual({ productId: '1', quantity: 1 });
  });

  it('increments quantity when same product is added twice', () => {
    renderWithRouter(<ProductCard product={mockProduct} />);

    fireEvent.click(screen.getByRole('button', { name: /add to cart/i }));
    fireEvent.click(screen.getByRole('button', { name: /add to cart/i }));

    const { items } = useCartStore.getState();
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(2);
  });

  it('has a data-testid attribute for e2e targeting', () => {
    renderWithRouter(<ProductCard product={mockProduct} />);
    expect(screen.getByTestId('product-card')).toBeInTheDocument();
  });

  it('formats price with two decimal places', () => {
    const product = { ...mockProduct, price: 10 };
    renderWithRouter(<ProductCard product={product} />);
    expect(screen.getByText('$10.00')).toBeInTheDocument();
  });
});
