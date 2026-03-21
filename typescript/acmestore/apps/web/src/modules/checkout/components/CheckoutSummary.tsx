import { useNavigate } from 'react-router-dom';
import { useCartStore } from '../../cart/store/cart.store';
import { trpc } from '../../../lib/trpc';
import { useState } from 'react';

export function CheckoutSummary() {
  const navigate = useNavigate();
  const items = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clearCart);
  const [ordered, setOrdered] = useState(false);

  const { data: summary, isLoading, error } = trpc.checkout.getSummary.useQuery(
    { items },
    { enabled: items.length > 0 },
  );

  if (items.length === 0 && !ordered) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Your cart is empty.</p>
        <button
          onClick={() => navigate('/')}
          className="mt-4 text-blue-600 hover:underline"
        >
          Continue Shopping
        </button>
      </div>
    );
  }

  if (ordered) {
    return (
      <div className="text-center py-12">
        <div className="text-green-500 text-5xl mb-4">✓</div>
        <h2 className="text-2xl font-bold text-gray-900">Order Placed!</h2>
        <p className="text-gray-500 mt-2">Thank you for your simulated order.</p>
        <button
          onClick={() => navigate('/')}
          className="mt-6 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
        >
          Continue Shopping
        </button>
      </div>
    );
  }

  if (isLoading) {
    return <div className="animate-pulse bg-white rounded-lg h-64" />;
  }

  if (error) {
    return <div className="text-red-500 text-center py-8">Failed to load checkout summary.</div>;
  }

  const handlePlaceOrder = () => {
    clearCart();
    setOrdered(true);
  };

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Checkout</h1>
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        {summary?.items.map((item) => (
          <div key={item.productId} className="flex justify-between text-sm">
            <span className="text-gray-700">
              {item.name} × {item.quantity}
            </span>
            <span className="font-medium">${item.subtotal.toFixed(2)}</span>
          </div>
        ))}
        <div className="border-t pt-4 flex justify-between font-bold text-lg">
          <span>Total</span>
          <span>${summary?.total.toFixed(2)}</span>
        </div>
      </div>
      <button
        onClick={handlePlaceOrder}
        className="mt-6 w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-medium text-lg"
      >
        Place Order
      </button>
    </div>
  );
}
