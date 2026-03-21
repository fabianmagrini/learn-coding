import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithRouter } from '../../../test-utils';
import { ProductList } from './ProductList';

vi.mock('../../../lib/trpc', () => ({
  trpc: {
    product: {
      getProducts: {
        useQuery: vi.fn(),
      },
    },
  },
}));

const mockProducts = [
  { id: '1', name: 'Headphones', price: 79.99, description: 'Great headphones', imageUrl: 'https://example.com/1.jpg' },
  { id: '2', name: 'Keyboard', price: 129.99, description: 'Mechanical keyboard', imageUrl: 'https://example.com/2.jpg' },
];

async function getTrpcMock() {
  const { trpc } = await import('../../../lib/trpc');
  return vi.mocked(trpc.product.getProducts.useQuery);
}

describe('ProductList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading skeletons while fetching', async () => {
    const mock = await getTrpcMock();
    mock.mockReturnValue({ data: undefined, isLoading: true, error: null } as any);

    renderWithRouter(<ProductList />);

    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBe(4);
  });

  it('shows error message on failure', async () => {
    const mock = await getTrpcMock();
    mock.mockReturnValue({ data: undefined, isLoading: false, error: new Error('Network error') } as any);

    renderWithRouter(<ProductList />);

    expect(screen.getByText(/failed to load products/i)).toBeInTheDocument();
  });

  it('renders the "Products" heading when loaded', async () => {
    const mock = await getTrpcMock();
    mock.mockReturnValue({ data: mockProducts, isLoading: false, error: null } as any);

    renderWithRouter(<ProductList />);

    expect(screen.getByRole('heading', { name: 'Products' })).toBeInTheDocument();
  });

  it('renders a card for each product', async () => {
    const mock = await getTrpcMock();
    mock.mockReturnValue({ data: mockProducts, isLoading: false, error: null } as any);

    renderWithRouter(<ProductList />);

    expect(screen.getAllByTestId('product-card')).toHaveLength(2);
    expect(screen.getByText('Headphones')).toBeInTheDocument();
    expect(screen.getByText('Keyboard')).toBeInTheDocument();
  });

  it('renders empty grid when no products returned', async () => {
    const mock = await getTrpcMock();
    mock.mockReturnValue({ data: [], isLoading: false, error: null } as any);

    renderWithRouter(<ProductList />);

    expect(screen.getByRole('heading', { name: 'Products' })).toBeInTheDocument();
    expect(screen.queryAllByTestId('product-card')).toHaveLength(0);
  });
});
