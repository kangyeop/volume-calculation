import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Box } from '@wms/types';
import { Trash2, Package } from 'lucide-react';

const BoxManager: React.FC = () => {
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    width: '',
    length: '',
    height: '',
    price: '',
  });

  const fetchBoxes = async () => {
    try {
      const data = await api.boxes.list();
      setBoxes(data);
    } catch (error) {
      console.error('Failed to fetch boxes', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBoxes();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.boxes.create({
        name: formData.name,
        width: Number(formData.width),
        length: Number(formData.length),
        height: Number(formData.height),
        price: formData.price ? Number(formData.price) : undefined,
      });
      setFormData({ name: '', width: '', length: '', height: '', price: '' });
      fetchBoxes();
    } catch (error) {
      alert('Failed to create box');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    try {
      await api.boxes.delete(id);
      fetchBoxes();
    } catch (error) {
      alert('Failed to delete box');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Box Management</h1>
          <p className="text-muted-foreground">Manage standard box sizes for packing algorithms.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 border p-6 rounded-lg bg-white shadow-sm h-fit">
          <h2 className="text-lg font-semibold mb-4">Add New Box</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Box Name</label>
              <input
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder="e.g. CO-45"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-sm font-medium mb-1">L (cm)</label>
                <input
                  type="number"
                  className="w-full border rounded px-3 py-2 text-sm"
                  value={formData.length}
                  onChange={(e) => setFormData({ ...formData, length: e.target.value })}
                  required
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">W (cm)</label>
                <input
                  type="number"
                  className="w-full border rounded px-3 py-2 text-sm"
                  value={formData.width}
                  onChange={(e) => setFormData({ ...formData, width: e.target.value })}
                  required
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">H (cm)</label>
                <input
                  type="number"
                  className="w-full border rounded px-3 py-2 text-sm"
                  value={formData.height}
                  onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                  required
                  min="0"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Price (Optional)</label>
              <input
                type="number"
                className="w-full border rounded px-3 py-2 text-sm"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                min="0"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-black text-white rounded py-2 text-sm font-medium hover:bg-gray-800 transition-colors"
            >
              Add Box
            </button>
          </form>
        </div>

        <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {boxes.map((box) => (
            <div key={box.id} className="border rounded-lg p-4 bg-white shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-gray-500" />
                    <h3 className="font-bold">{box.name}</h3>
                </div>
                <button
                  onClick={() => handleDelete(box.id)}
                  className="text-red-400 hover:text-red-600 p-1"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="text-sm text-gray-600 mb-2">
                <div>{box.length} x {box.width} x {box.height} cm</div>
                <div className="text-xs text-gray-400 mt-1">
                    Vol: {((box.length * box.width * box.height) / 1000000).toFixed(4)} CBM
                </div>
              </div>
              {box.price && (
                <div className="text-sm font-medium text-green-600 mt-2">
                  ₩{box.price.toLocaleString()}
                </div>
              )}
            </div>
          ))}
          {boxes.length === 0 && !loading && (
            <div className="col-span-full py-12 text-center text-gray-400 bg-gray-50 rounded-lg border border-dashed">
              No boxes defined yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BoxManager;
