import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Project, Product, Outbound } from '@wms/types';

interface AppState {
  projects: Project[];
  products: Record<string, Product[]>; // projectId -> products
  outbound: Record<string, Outbound[]>; // projectId -> outbound orders
}

interface AppContextType extends AppState {
  addProject: (name: string) => Project;
  setProducts: (projectId: string, products: Product[]) => void;
  setOutbound: (projectId: string, outbound: Outbound[]) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [products, setProductsState] = useState<Record<string, Product[]>>({});
  const [outbound, setOutboundState] = useState<Record<string, Outbound[]>>({});

  const addProject = (name: string) => {
    const newProject: Project = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      createdAt: new Date().toISOString(),
    };
    setProjects((prev) => [...prev, newProject]);
    return newProject;
  };

  const setProducts = (projectId: string, newProducts: Product[]) => {
    setProductsState((prev) => ({ ...prev, [projectId]: newProducts }));
  };

  const setOutbound = (projectId: string, newOutbound: Outbound[]) => {
    setOutboundState((prev) => ({ ...prev, [projectId]: newOutbound }));
  };

  return (
    <AppContext.Provider
      value={{
        projects,
        products,
        outbound,
        addProject,
        setProducts,
        setOutbound,
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
