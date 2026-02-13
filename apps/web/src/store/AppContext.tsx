import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Project, Product, Outbound } from '@wms/types';
import { api } from '../lib/api';

interface AppState {
  projects: Project[];
  products: Record<string, Product[]>; // projectId -> products
  outbounds: Record<string, Outbound[]>; // projectId -> outbound orders
  loading: boolean;
  error: string | null;
}

interface AppContextType extends AppState {
  addProject: (name: string) => Promise<Project>;
  fetchProducts: (projectId: string) => Promise<void>;
  fetchOutbounds: (projectId: string) => Promise<void>;
  createProducts: (projectId: string, data: any[]) => Promise<void>;
  createOutbound: (projectId: string, data: any[]) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [products, setProductsState] = useState<Record<string, Product[]>>({});
  const [outbounds, setOutboundsState] = useState<Record<string, Outbound[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadProjects = async () => {
      setLoading(true);
      try {
        const data = await api.projects.list();
        setProjects(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load projects');
      } finally {
        setLoading(false);
      }
    };
    loadProjects();
  }, []);

  const addProject = async (name: string) => {
    setLoading(true);
    try {
      const newProject = await api.projects.create(name);
      setProjects((prev) => [...prev, newProject]);
      return newProject;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create project';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async (projectId: string) => {
    try {
      const data = await api.products.list(projectId);
      setProductsState((prev) => ({ ...prev, [projectId]: data }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch products');
    }
  };

  const fetchOutbounds = async (projectId: string) => {
    try {
      const data = await api.outbound.list(projectId);
      setOutboundsState((prev) => ({ ...prev, [projectId]: data }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch outbound');
    }
  };

  const createProducts = async (projectId: string, data: any[]) => {
    setLoading(true);
    try {
      await api.products.createBulk(projectId, data);
      await fetchProducts(projectId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create products');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const createOutbound = async (projectId: string, data: any[]) => {
    setLoading(true);
    try {
      await api.outbound.createBulk(projectId, data);
      await fetchOutbounds(projectId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create outbound');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppContext.Provider
      value={{
        projects,
        products,
        outbounds,
        loading,
        error,
        addProject,
        fetchProducts,
        fetchOutbounds,
        createProducts,
        createOutbound,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
