import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Loader2, X, Check, AlertCircle, Hash, Palette } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { useAdminStore } from '@/store/adminStore';

export default function AdminCategories() {
  const { categories, isLoading, fetchCategories, createCategory, updateCategory, deleteCategory } = useAdminStore();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', slug: '', description: '', icon: '', color: '#4F46E5', sort_order: 0 });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const generateSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const resetForm = () => {
    setForm({ name: '', slug: '', description: '', icon: '', color: '#4F46E5', sort_order: 0 });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (cat: any) => {
    setForm({ name: cat.name, slug: cat.slug, description: cat.description || '', icon: cat.icon || '', color: cat.color || '#4F46E5', sort_order: cat.sort_order || 0 });
    setEditingId(cat._id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.slug) return;
    setSaving(true);
    try {
      if (editingId) {
        await updateCategory(editingId, form);
      } else {
        await createCategory(form);
      }
      resetForm();
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this category? Courses using it will lose their category reference.')) return;
    await deleteCategory(id);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Categories</h1>
          <p className="text-gray-500 mt-1">Manage course category taxonomy.</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus className="w-4 h-4 mr-1.5" /> Add Category
        </Button>
      </div>

      {showForm && (
        <GlassCard className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">{editingId ? 'Edit Category' : 'New Category'}</h2>
            <button onClick={resetForm} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Name *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: editingId ? form.slug : generateSlug(e.target.value) })}
                className="w-full rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500/30" placeholder="Web Development" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Slug *</label>
              <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })}
                className="w-full rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500/30" placeholder="web-development" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-gray-500 mb-1 block">Description</label>
              <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500/30" placeholder="Courses about web development..." />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Icon</label>
              <input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })}
                className="w-full rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500/30" placeholder="Code, Book, etc." />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Color</label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })}
                  className="w-10 h-10 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer" />
                <input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })}
                  className="flex-1 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500/30" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Sort Order</label>
              <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
                className="w-full rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500/30" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="ghost" onClick={resetForm}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.name || !form.slug}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              {editingId ? 'Update' : 'Create'}
            </Button>
          </div>
        </GlassCard>
      )}

      {isLoading && categories.length === 0 ? (
        <div className="text-center py-16 text-gray-400"><Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" />Loading categories...</div>
      ) : categories.length === 0 ? (
        <div className="text-center py-16 text-gray-400">No categories yet. Create your first one.</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <motion.div key={cat._id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <GlassCard className="p-4" hover>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg font-bold" style={{ backgroundColor: cat.color || '#4F46E5' }}>
                      {cat.icon || cat.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">{cat.name}</h3>
                      <p className="text-xs text-gray-400">{cat.slug}</p>
                    </div>
                  </div>
                </div>
                {cat.description && <p className="text-xs text-gray-500 mb-3 line-clamp-2">{cat.description}</p>}
                <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
                  <span>Order: {cat.sort_order}</span>
                </div>
                <div className="flex gap-1.5">
                  <Button size="sm" variant="outline" onClick={() => handleEdit(cat)}>Edit</Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(cat._id)} className="text-danger-500">Delete</Button>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
