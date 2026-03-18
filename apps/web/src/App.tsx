import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GlobalLayout } from './components/layout/GlobalLayout';
import { ProductGroupList } from './pages/products/ProductGroupList';
import { ProductGroupCreate } from './pages/products/ProductGroupCreate';
import { ProductGroupDetail } from './pages/products/ProductGroupDetail';
import { OutboundList } from './pages/outbound/OutboundList';
import { OutboundDetail } from './pages/outbound/OutboundDetail';
import { PackingCalculator } from './pages/outbound/PackingCalculator';
import { BoxGroupList } from './pages/boxes/BoxGroupList';
import { BoxGroupCreate } from './pages/boxes/BoxGroupCreate';
import { BoxGroupDetail } from './pages/boxes/BoxGroupDetail';
import { Toaster } from './components/Toaster';
import { ErrorBoundary } from './components/ErrorBoundary';
import './App.css';

export function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<Navigate to="/outbound" replace />} />
          <Route element={<GlobalLayout />}>
            <Route path="/products" element={<ProductGroupList />} />
            <Route path="/products/new" element={<ProductGroupCreate />} />
            <Route path="/products/:id" element={<ProductGroupDetail />} />
            <Route path="/outbound" element={<OutboundList />} />
            <Route path="/outbound/:id" element={<OutboundDetail />} />
            <Route path="/outbound/:id/packing" element={<PackingCalculator />} />
            <Route path="/boxes" element={<BoxGroupList />} />
            <Route path="/boxes/new" element={<BoxGroupCreate />} />
            <Route path="/boxes/:id" element={<BoxGroupDetail />} />
          </Route>
        </Routes>
      </ErrorBoundary>
      <Toaster />
    </BrowserRouter>
  );
}
