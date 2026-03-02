import React from 'react';
import { useParams } from 'react-router-dom';
import { useProject, useProducts, useOutbounds } from '@/hooks/queries';
import { Package, Send, TrendingUp } from 'lucide-react';

export const ProjectDashboard: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { data: project, isLoading } = useProject(id || '');
  const { data: products = [] } = useProducts(id || '');
  const { data: outbounds = [] } = useOutbounds(id || '');

  if (isLoading && !project) {
    return <div>Loading...</div>;
  }

  if (!project) {
    return <div>Project not found</div>;
  }

  const productCount = products.length || 0;
  const outboundCount = outbounds.length || 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
        <p className="text-muted-foreground">Project overview and statistics.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border bg-card text-card-foreground shadow">
          <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Total Products</h3>
            <Package className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="p-6 pt-0">
            <div className="text-2xl font-bold">{productCount}</div>
            <p className="text-xs text-muted-foreground">SKUs registered</p>
          </div>
        </div>

        <div className="rounded-xl border bg-card text-card-foreground shadow">
          <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Outbound Orders</h3>
            <Send className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="p-6 pt-0">
            <div className="text-2xl font-bold">{outboundCount}</div>
            <p className="text-xs text-muted-foreground">Orders pending processing</p>
          </div>
        </div>

        <div className="rounded-xl border bg-card text-card-foreground shadow">
          <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Status</h3>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="p-6 pt-0">
            <div className="text-2xl font-bold">Active</div>
            <p className="text-xs text-muted-foreground">Project is operational</p>
          </div>
        </div>
      </div>
    </div>
  );
};
