import { trpc } from '../../../lib/trpc';
import type { CartItem } from '../../cart/store/cart.store';

export function useCheckoutSummary(items: CartItem[]) {
  return trpc.checkout.getSummary.useQuery(
    { items },
    { enabled: items.length > 0 },
  );
}
