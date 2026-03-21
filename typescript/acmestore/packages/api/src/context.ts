export interface ProductServiceInterface {
  getProducts(params?: { limit?: number; offset?: number }): Promise<Product[]>;
  getProductById(id: string): Promise<Product | null>;
}

export interface CheckoutServiceInterface {
  getSummary(items: CartItem[]): Promise<CheckoutSummary>;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  imageUrl: string;
}

export interface CartItem {
  productId: string;
  quantity: number;
}

export interface CheckoutSummary {
  items: Array<{
    productId: string;
    name: string;
    price: number;
    quantity: number;
    subtotal: number;
  }>;
  total: number;
}

export interface Services {
  product: ProductServiceInterface;
  checkout: CheckoutServiceInterface;
}

export interface Context {
  services: Services;
}
