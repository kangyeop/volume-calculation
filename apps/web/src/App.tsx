import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './store/AppContext';
import ProjectLayout from './components/layout/ProjectLayout';
import ProjectList from './pages/ProjectList';
import ProjectDashboard from './pages/ProjectDashboard';
import ProductManager from './pages/ProductManager';
import OutboundManager from './pages/OutboundManager';
import PackingCalculator from './pages/PackingCalculator';
import OutboundGuide from './pages/OutboundGuide';
import BoxManager from './pages/BoxManager';
import './App.css';

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<ProjectList />} />
          <Route path="/boxes" element={<BoxManager />} />
          <Route path="/projects/:id" element={<ProjectLayout />}>
            <Route index element={<ProjectDashboard />} />
            <Route path="products" element={<ProductManager />} />
            <Route path="outbound" element={<OutboundManager />} />
            <Route path="packing" element={<PackingCalculator />} />
            <Route path="guide" element={<OutboundGuide />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
