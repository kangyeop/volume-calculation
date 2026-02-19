import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ProjectLayout } from './components/layout/ProjectLayout';
import { ProjectList } from './pages/ProjectList';
import { ProjectDashboard } from './pages/ProjectDashboard';
import { ProductManager } from './pages/ProductManager';
import { OutboundManager } from './pages/OutboundManager';
import { PackingCalculator } from './pages/PackingCalculator';
import { BoxManager } from './pages/BoxManager';
import './App.css';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ProjectList />} />
        <Route path="/boxes" element={<BoxManager />} />
        <Route path="/projects/:id" element={<ProjectLayout />}>
          <Route index element={<ProjectDashboard />} />
          <Route path="products" element={<ProductManager />} />
          <Route path="outbound" element={<OutboundManager />} />
          <Route path="packing" element={<PackingCalculator />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
