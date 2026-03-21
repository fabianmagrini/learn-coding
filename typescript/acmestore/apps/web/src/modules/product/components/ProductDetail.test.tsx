import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithRouter } from '../../../test-utils';
import { ProductDetail } from './ProductDetail';
import { useCartStore } from '../../cart/store/cart.store';

vi.mock('../../../lib/trpc', () => ({
  trpc: {
    product: {
      getProductById: {
        useQuery: vi.fn(),
      },
    },
  },
}));

// react-router-dom useParams needs a matching route; we inject id via initialEntries
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useParams: vi.fn(() => ({ id: '1' })),
  };
});

const mockProduct = {
  id: '1',
  name: 'Wireless Headphones',
  price: 79.99,
  description: 'High-quality wireless headphones.',
  imageUrl: 'https://example.com/headphones.jpg',
};

async function getTrpcMock() {
  const { trpc } = await import('../../../lib/trpc');
  return vi.mocked(trpc.product.getProductById.useQuery);
}

describe('ProductDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCartStore.setState({ items: [] });
  });

  it('shows loading skeleton while fetching', async () => {
    const mock = await getTrpcMock();
    mock.mockReturnValue({ data: undefined, isLoading: true, error: null } as any);

    renderWithRouter(<ProductDetail />);

    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('shows not found message when product is null', async () => {
    const mock = await getTrpcMock();
    mock.mockReturnValue({ data: null, isLoading: false, error: null } as any);

    renderWithRouter(<ProductDetail />);

    expect(screen.getByText('Product not found.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to products/i })).toBeInTheDocument();
  });

  it('shows not found message on error', async () => {
    const mock = await getTrpcMock();
    mock.mockReturnValue({ data: undefined, isLoading: false, error: new Error('Not found') } as any);

    renderWithRouter(<ProductDetail />);

    expect(screen.getByText('Product not found.')).toBeInTheDocument();
  });

  it('renders product name, description and price', async () => {
    const mock = await getTrpcMock();
    mock.mockReturnValue({ data: mockProduct, isLoading: false, error: null } as any);

    renderWithRouter(<ProductDetail />);

    expect(screen.getByRole('heading', { name: 'Wireless Headphones' })).toBeInTheDocument();
    expect(screen.getByText('High-quality wireless headphones.')).toBeInTheDocument();
    expect(screen.getByText('$79.99')).toBeInTheDocument();
  });

  it('renders product image with correct alt text', async () => {
    const mock = await getTrpcMock();
    mock.mockReturnValue({ data: mockProduct, isLoading: false, error: null } as any);

    renderWithRouter(<ProductDetail />);

    const img = screen.getByAltText('Wireless Headphones');
    expect(img).toHaveAttribute('src', mockProduct.imageUrl);
  });

  it('adds product to cart when button is clicked', async () => {
    const mock = await getTrpcMock();
    mock.mockReturnValue({ data: mockProduct, isLoading: false, error: null } as any);

    renderWithRouter(<ProductDetail />);

    fireEvent.click(screen.getByRole('button', { name: /add to cart/i }));

    const { items } = useCartStore.getState();
    expect(items).toHaveLength(1);
    expect(items[0]).toEqual({ productId: '1', quantity: 1 });
  });

  it('has a back link to product listing', async () => {
    const mock = await getTrpcMock();
    mock.mockReturnValue({ data: mockProduct, isLoading: false, error: null } as any);

    renderWithRouter(<ProductDetail />);

    expect(screen.getByRole('link', { name: /back to products/i })).toHaveAttribute('href', '/');
  });
});
