import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ProjectLayout } from './components/layout/ProjectLayout';
import { ProjectList } from './pages/ProjectList';
import { ProjectDashboard } from './pages/ProjectDashboard';
import { ProductManager } from './pages/ProductManager';
import { OutboundUpload } from './pages/OutboundUpload';
import { OutboundList } from './pages/OutboundList';
import { PackingCalculator } from './pages/PackingCalculator';
import { PackingSummary } from './pages/PackingSummary';
import { PackingResultHistory } from './pages/PackingResultHistory';
import { BoxManager } from './pages/BoxManager';
import { Toaster } from './components/Toaster';
import { ErrorBoundary } from './components/ErrorBoundary';
import './App.css';

export function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<ProjectList />} />
          <Route path="/boxes" element={<BoxManager />} />
          <Route path="/projects/:id" element={<ProjectLayout />}>
            <Route index element={<ProjectDashboard />} />
            <Route path="products" element={<ProductManager />} />
            <Route path="outbound" element={<OutboundUpload />} />
            <Route path="outbound/list" element={<OutboundList />} />
            <Route path="packing" element={<PackingCalculator />} />
            <Route path="packing/summary" element={<PackingSummary />} />
            <Route path="packing/history" element={<PackingResultHistory />} />
          </Route>
        </Routes>
      </ErrorBoundary>
      <Toaster />
    </BrowserRouter>
  );
}
