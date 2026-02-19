import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useProjects, useCreateProject } from '@/hooks/queries';
import { Plus, Folder } from 'lucide-react';

export const ProjectList: React.FC = () => {
  const { data: projects = [], isLoading } = useProjects();
  const createProject = useCreateProject();
  const [newProjectName, setNewProjectName] = useState('');
  const navigate = useNavigate();

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    try {
      const project = await createProject.mutateAsync({ name: newProjectName });
      setNewProjectName('');
      navigate(`/projects/${project.id}`);
    } catch (err) {
      console.error('Failed to create project:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-8 max-w-4xl flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">My Projects</h1>
      </div>

      <form onSubmit={handleCreateProject} className="mb-12 flex gap-4">
        <input
          type="text"
          placeholder="Enter project name..."
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          value={newProjectName}
          onChange={(e) => setNewProjectName(e.target.value)}
        />
        <button
          type="submit"
          disabled={createProject.isPending}
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Project
        </button>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => (
          <Link
            key={project.id}
            to={`/projects/${project.id}`}
            className="group block p-6 bg-white border rounded-xl shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-50 rounded-lg text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <Folder className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">{project.name}</h3>
                <p className="text-sm text-gray-500">
                  Created: {new Date(project.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </Link>
        ))}

        {projects.length === 0 && (
          <div className="col-span-full py-12 text-center border-2 border-dashed rounded-xl text-gray-400">
            No projects found. Create your first one above!
          </div>
        )}
      </div>
    </div>
  );
};

