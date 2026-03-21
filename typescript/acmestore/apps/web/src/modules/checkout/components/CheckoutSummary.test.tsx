import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithRouter } from '../../../test-utils';
import { CheckoutSummary } from './CheckoutSummary';
import { useCartStore } from '../../cart/store/cart.store';

vi.mock('../../../lib/trpc', () => ({
  trpc: {
    checkout: {
      getSummary: {
        useQuery: vi.fn(),
      },
    },
  },
}));

const mockSummary = {
  items: [
    { productId: '1', name: 'Wireless Headphones', price: 79.99, quantity: 2, subtotal: 159.98 },
    { productId: '2', name: 'Keyboard', price: 129.99, quantity: 1, subtotal: 129.99 },
  ],
  total: 289.97,
};

async function getTrpcMock() {
  const { trpc } = await import('../../../lib/trpc');
  return vi.mocked(trpc.checkout.getSummary.useQuery);
}

describe('CheckoutSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCartStore.setState({ items: [] });
  });

  it('shows empty cart message when cart is empty', async () => {
    const mock = await getTrpcMock();
    mock.mockReturnValue({ data: undefined, isLoading: false, error: null } as any);

    renderWithRouter(<CheckoutSummary />);

    expect(screen.getByText('Your cart is empty.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue shopping/i })).toBeInTheDocument();
  });

  it('shows loading skeleton while fetching', async () => {
    useCartStore.setState({ items: [{ productId: '1', quantity: 1 }] });
    const mock = await getTrpcMock();
    mock.mockReturnValue({ data: undefined, isLoading: true, error: null } as any);

    renderWithRouter(<CheckoutSummary />);

    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('shows error message on failure', async () => {
    useCartStore.setState({ items: [{ productId: '1', quantity: 1 }] });
    const mock = await getTrpcMock();
    mock.mockReturnValue({ data: undefined, isLoading: false, error: new Error('fail') } as any);

    renderWithRouter(<CheckoutSummary />);

    expect(screen.getByText(/failed to load checkout summary/i)).toBeInTheDocument();
  });

  it('renders checkout heading and item lines', async () => {
    useCartStore.setState({ items: [{ productId: '1', quantity: 2 }, { productId: '2', quantity: 1 }] });
    const mock = await getTrpcMock();
    mock.mockReturnValue({ data: mockSummary, isLoading: false, error: null } as any);

    renderWithRouter(<CheckoutSummary />);

    expect(screen.getByRole('heading', { name: 'Checkout' })).toBeInTheDocument();
    expect(screen.getByText('Wireless Headphones × 2')).toBeInTheDocument();
    expect(screen.getByText('$159.98')).toBeInTheDocument();
    expect(screen.getByText('Keyboard × 1')).toBeInTheDocument();
    expect(screen.getByText('$129.99')).toBeInTheDocument();
  });

  it('renders total amount', async () => {
    useCartStore.setState({ items: [{ productId: '1', quantity: 1 }] });
    const mock = await getTrpcMock();
    mock.mockReturnValue({ data: mockSummary, isLoading: false, error: null } as any);

    renderWithRouter(<CheckoutSummary />);

    expect(screen.getByText('$289.97')).toBeInTheDocument();
  });

  it('places order and shows confirmation', async () => {
    useCartStore.setState({ items: [{ productId: '1', quantity: 1 }] });
    const mock = await getTrpcMock();
    mock.mockReturnValue({ data: mockSummary, isLoading: false, error: null } as any);

    renderWithRouter(<CheckoutSummary />);

    fireEvent.click(screen.getByRole('button', { name: /place order/i }));

    expect(screen.getByText('Order Placed!')).toBeInTheDocument();
    expect(screen.getByText(/thank you for your simulated order/i)).toBeInTheDocument();
  });

  it('clears cart after placing order', async () => {
    useCartStore.setState({ items: [{ productId: '1', quantity: 1 }] });
    const mock = await getTrpcMock();
    mock.mockReturnValue({ data: mockSummary, isLoading: false, error: null } as any);

    renderWithRouter(<CheckoutSummary />);
    fireEvent.click(screen.getByRole('button', { name: /place order/i }));

    expect(useCartStore.getState().items).toHaveLength(0);
  });
});
