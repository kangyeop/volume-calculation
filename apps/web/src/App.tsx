import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ProjectLayout } from './components/layout/ProjectLayout';
import { ProjectList } from './pages/ProjectList';
import { ProjectDashboard } from './pages/ProjectDashboard';
import { ProductManager } from './pages/ProductManager';
import { OutboundWizard } from './pages/OutboundWizard';
import { PackingCalculator } from './pages/PackingCalculator';
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
            <Route path="outbound" element={<OutboundWizard />} />
            <Route path="packing" element={<PackingCalculator />} />
          </Route>
        </Routes>
      </ErrorBoundary>
      <Toaster />
    </BrowserRouter>
  );
}
