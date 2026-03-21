import type { CartItem } from '../store/cart.store';
import { useCartStore } from '../store/cart.store';

interface CartItemRowProps {
  item: CartItem;
}

export function CartItemRow({ item }: CartItemRowProps) {
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);

  return (
    <li className="flex items-center gap-3 bg-gray-50 rounded p-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{item.productId}</p>
        <div className="flex items-center gap-2 mt-1">
          <button
            onClick={() => updateQuantity(item.productId, item.quantity - 1)}
            className="w-6 h-6 rounded bg-gray-200 hover:bg-gray-300 text-sm font-bold"
            aria-label="Decrease quantity"
          >
            −
          </button>
          <span className="text-sm w-6 text-center">{item.quantity}</span>
          <button
            onClick={() => updateQuantity(item.productId, item.quantity + 1)}
            className="w-6 h-6 rounded bg-gray-200 hover:bg-gray-300 text-sm font-bold"
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>
      </div>
      <button
        onClick={() => removeItem(item.productId)}
        className="text-gray-400 hover:text-red-500 text-xs"
        aria-label={`Remove ${item.productId} from cart`}
      >
        Remove
      </button>
    </li>
  );
}
