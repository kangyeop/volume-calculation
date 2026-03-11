import React from 'react';
import { Outlet, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { useProject } from '@/hooks/queries';

export const ProjectLayout: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { data: project } = useProject(id || '');

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1">
        <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-10">
          <div className="flex items-center gap-4 px-8 py-4">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Projects
            </button>
            <div className="h-4 w-px bg-border" />
            <h2 className="text-lg font-semibold">{project?.name || 'Project'}</h2>
          </div>
        </header>
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
