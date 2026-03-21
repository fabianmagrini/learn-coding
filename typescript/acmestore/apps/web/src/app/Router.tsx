import { Routes, Route } from 'react-router-dom';
import { Layout } from '../shared/components/Layout';
import { ProductList } from '../modules/product/components/ProductList';
import { ProductDetail } from '../modules/product/components/ProductDetail';
import { CheckoutSummary } from '../modules/checkout/components/CheckoutSummary';

export function AppRouter() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<ProductList />} />
        <Route path="/products/:id" element={<ProductDetail />} />
        <Route path="/checkout" element={<CheckoutSummary />} />
      </Routes>
    </Layout>
  );
}
