import React, { useState } from 'react';
import { toast } from 'sonner';
import { useBoxes, useCreateBox, useDeleteBox } from '@/hooks/queries';
import { Trash2, Package, Plus, Box as BoxIcon, Ruler } from 'lucide-react';

export const BoxManager: React.FC = () => {
  const { data: boxes = [], isLoading } = useBoxes();
  const createBox = useCreateBox();
  const deleteBox = useDeleteBox();

  const [formData, setFormData] = useState({
    name: '',
    width: '',
    length: '',
    height: '',
    price: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.width || !formData.length || !formData.height) return;

    try {
      await createBox.mutateAsync({
        name: formData.name,
        width: Number(formData.width),
        length: Number(formData.length),
        height: Number(formData.height),
        price: formData.price ? Number(formData.price) : undefined,
      });
      setFormData({ name: '', width: '', length: '', height: '', price: '' });
      toast.success('박스 생성 완료', { description: '새로운 박스가 추가되었습니다.' });
    } catch {
      toast.error('생성 실패', { description: '박스 생성에 실패했습니다.' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this box?')) return;
    try {
      await deleteBox.mutateAsync(id);
      toast.success('삭제 완료', { description: '박스가 삭제되었습니다.' });
    } catch {
      toast.error('삭제 실패', { description: '박스 삭제에 실패했습니다.' });
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Box Management</h1>
          <p className="text-muted-foreground mt-1">
            Configure standard box sizes for packing optimization algorithms.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg border border-indigo-100">
          <Package className="h-5 w-5" />
          <span className="font-semibold">{boxes.length} Box Types Configured</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden sticky top-6">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex items-center gap-2">
              <Plus className="h-5 w-5 text-gray-500" />
              <h2 className="font-semibold text-gray-900">Add New Box Type</h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Box Name</label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  placeholder="e.g. Standard Large Box (A-1)"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Ruler className="h-4 w-4" />
                  Dimensions (cm)
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <div className="relative">
                      <input
                        type="number"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm pl-8 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                        value={formData.length}
                        onChange={(e) => setFormData({ ...formData, length: e.target.value })}
                        required
                        min="0"
                        placeholder="L"
                      />
                      <span className="absolute left-3 top-2 text-gray-400 text-xs font-bold">
                        L
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="relative">
                      <input
                        type="number"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm pl-8 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                        value={formData.width}
                        onChange={(e) => setFormData({ ...formData, width: e.target.value })}
                        required
                        min="0"
                        placeholder="W"
                      />
                      <span className="absolute left-3 top-2 text-gray-400 text-xs font-bold">
                        W
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="relative">
                      <input
                        type="number"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm pl-8 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                        value={formData.height}
                        onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                        required
                        min="0"
                        placeholder="H"
                      />
                      <span className="absolute left-3 top-2 text-gray-400 text-xs font-bold">
                        H
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground text-center">Length × Width × Height</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Price (Optional)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500 text-sm">₩</span>
                  <input
                    type="number"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm pl-7 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    min="0"
                    placeholder="0"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={createBox.isPending}
                className="w-full bg-indigo-600 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-100 transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="h-4 w-4" />
                Add Box Type
              </button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-2">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {boxes.map((box) => (
                <div
                  key={box.id}
                  className="group bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all duration-200 relative"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600 group-hover:bg-indigo-100 transition-colors">
                        <BoxIcon className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">{box.name}</h3>
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">
                          ID: {box.id.slice(0, 8)}...
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(box.id)}
                      disabled={deleteBox.isPending}
                      className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-md transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
                      title="Delete Box"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div className="bg-gray-50 rounded-lg p-3 grid grid-cols-3 gap-2 text-center border border-gray-100">
                      <div>
                        <div className="text-xs text-gray-500 uppercase font-semibold">Length</div>
                        <div className="font-medium text-gray-900">
                          {box.length} <span className="text-gray-400 text-xs">cm</span>
                        </div>
                      </div>
                      <div className="border-l border-gray-200">
                        <div className="text-xs text-gray-500 uppercase font-semibold">Width</div>
                        <div className="font-medium text-gray-900">
                          {box.width} <span className="text-gray-400 text-xs">cm</span>
                        </div>
                      </div>
                      <div className="border-l border-gray-200">
                        <div className="text-xs text-gray-500 uppercase font-semibold">Height</div>
                        <div className="font-medium text-gray-900">
                          {box.height} <span className="text-gray-400 text-xs">cm</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-1">
                      <div className="text-xs text-muted-foreground">
                        Volume:{' '}
                        <span className="font-mono font-medium text-gray-700">
                          {((box.length * box.width * box.height) / 1000000).toFixed(4)} CBM
                        </span>
                      </div>
                      {box.price && (
                        <div className="text-sm font-bold text-gray-900">
                          ₩{box.price.toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {boxes.length === 0 && (
                <div className="col-span-full py-16 text-center bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                  <BoxIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-gray-900">No boxes defined</h3>
                  <p className="text-gray-500 mt-1 max-w-sm mx-auto">
                    Add standard box sizes to start calculating packing efficiency.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
