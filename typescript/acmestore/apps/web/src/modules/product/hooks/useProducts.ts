import { trpc } from '../../../lib/trpc';

export function useProducts() {
  return trpc.product.getProducts.useQuery();
}

export function useProduct(id: string) {
  return trpc.product.getProductById.useQuery(
    { id },
    { enabled: !!id },
  );
}
