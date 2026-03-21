import { useParams, Link } from 'react-router-dom';
import { trpc } from '../../../lib/trpc';
import { useCartStore } from '../../cart/store/cart.store';

export function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const addItem = useCartStore((s) => s.addItem);

  const { data: product, isLoading, error } = trpc.product.getProductById.useQuery(
    { id: id! },
    { enabled: !!id },
  );

  if (isLoading) {
    return <div className="animate-pulse bg-white rounded-lg h-96" />;
  }

  if (error || !product) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">Product not found.</p>
        <Link to="/" className="text-blue-600 hover:underline mt-4 inline-block">
          Back to Products
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 max-w-2xl mx-auto">
      <Link to="/" className="text-blue-600 hover:underline text-sm mb-4 inline-block">
        ← Back to Products
      </Link>
      <img
        src={product.imageUrl}
        alt={product.name}
        className="w-full h-64 object-cover rounded-lg mb-6"
      />
      <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
      <p className="text-gray-600 mt-3 leading-relaxed">{product.description}</p>
      <div className="mt-6 flex items-center justify-between">
        <span className="text-2xl font-bold text-gray-900">${product.price.toFixed(2)}</span>
        <button
          onClick={() => addItem({ productId: product.id, quantity: 1 })}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Add to Cart
        </button>
      </div>
    </div>
  );
}
