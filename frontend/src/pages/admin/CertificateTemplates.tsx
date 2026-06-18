import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit2, Trash2, Upload, Image, Check, X, Loader2 } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import api from '@/lib/axios';

interface Template {
  id: string;
  name: string;
  course_id: string;
  course_title: string;
  stamp_url: string | null;
  signature_url: string | null;
  logo_url: string | null;
  show_stamp: boolean;
  show_signature: boolean;
  instructor_name: string;
  org_name: string;
  org_rc: string;
}

interface Course {
  id: string;
  title: string;
}

export default function AdminCertificateTemplates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    courseId: '',
    instructorName: 'Udokamma Emmanuel',
    orgName: 'Career Code WID Ltd',
    orgRc: 'RC 8824091',
    showStamp: true,
    showSignature: true,
  });

  const fetchTemplates = async () => {
    try {
      const { data } = await api.get('/admin/certificate-templates');
      setTemplates(data.data || []);
    } catch { /* ignore */ }
  };

  const fetchCourses = async () => {
    try {
      const { data } = await api.get('/admin/courses?limit=500');
      setCourses(data.data || []);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    Promise.all([fetchTemplates(), fetchCourses()]).finally(() => setLoading(false));
  }, []);

  const resetForm = () => {
    setForm({ name: '', courseId: '', instructorName: 'Udokamma Emmanuel', orgName: 'Career Code WID Ltd', orgRc: 'RC 8824091', showStamp: true, showSignature: true });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (t: Template) => {
    setForm({
      name: t.name,
      courseId: t.course_id,
      instructorName: t.instructor_name,
      orgName: t.org_name,
      orgRc: t.org_rc,
      showStamp: t.show_stamp,
      showSignature: t.show_signature,
    });
    setEditingId(t.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    try {
      if (editingId) {
        await api.put(`/admin/certificate-templates/${editingId}`, form);
      } else {
        await api.post('/admin/certificate-templates', form);
      }
      resetForm();
      await fetchTemplates();
    } catch { /* ignore */ }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this template?')) return;
    try {
      await api.delete(`/admin/certificate-templates/${id}`);
      await fetchTemplates();
    } catch { /* ignore */ }
  };

  const handleUpload = async (templateId: string, field: 'stamp' | 'signature' | 'logo', file: File) => {
    setUploadingField(field);
    try {
      const formData = new FormData();
      formData.append('file', file);
      await api.post(`/admin/certificate-templates/${templateId}/upload-${field}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await fetchTemplates();
    } catch { /* ignore */ }
    setUploadingField(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-primary-500" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Certificate Templates</h1>
        <Button onClick={() => setShowForm(true)}>
          <Plus size={16} className="mr-1" /> New Template
        </Button>
      </div>

      {showForm && (
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">{editingId ? 'Edit Template' : 'New Template'}</h2>
            <button onClick={resetForm} className="text-gray-500 hover:text-gray-700"><X size={20} /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Template Name *</label>
              <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="e.g. Full-Stack Certificate" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Course *</label>
              <select value={form.courseId} onChange={e => setForm({ ...form, courseId: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm">
                <option value="">Select a course...</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Instructor Name</label>
              <input type="text" value={form.instructorName} onChange={e => setForm({ ...form, instructorName: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Organization Name</label>
              <input type="text" value={form.orgName} onChange={e => setForm({ ...form, orgName: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Organization RC</label>
              <input type="text" value={form.orgRc} onChange={e => setForm({ ...form, orgRc: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.showStamp} onChange={e => setForm({ ...form, showStamp: e.target.checked })} />
                Show Stamp
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.showSignature} onChange={e => setForm({ ...form, showSignature: e.target.checked })} />
                Show Signature
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="secondary" onClick={resetForm}>Cancel</Button>
            <Button onClick={handleSave}>{editingId ? 'Update' : 'Create'}</Button>
          </div>
        </GlassCard>
      )}

      <div className="grid gap-4">
        {templates.length === 0 && (
          <GlassCard className="p-8 text-center text-gray-500">
            <Image size={48} className="mx-auto mb-3 text-gray-300" />
            <p>No certificate templates yet. Create your first one!</p>
          </GlassCard>
        )}
        {templates.map(t => (
          <GlassCard key={t.id} className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{t.name}</h3>
                  {t.show_signature && <Badge variant="default" className="text-xs">Sig</Badge>}
                  {t.show_stamp && <Badge variant="default" className="text-xs">Stamp</Badge>}
                </div>
                <p className="text-sm text-gray-500 mt-1">Course: {t.course_title}</p>
                <p className="text-xs text-gray-400 mt-1">Instructor: {t.instructor_name}</p>

                <div className="flex flex-wrap gap-3 mt-3">
                  {['stamp', 'signature', 'logo'].map(field => (
                    <div key={field} className="flex items-center gap-2">
                      {t[`${field}_url` as keyof Template] ? (
                        <div className="relative group">
                          <img src={t[`${field}_url` as keyof Template] as string} alt={field}
                            className="h-10 w-10 object-contain border rounded bg-white" />
                          <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 cursor-pointer rounded transition-opacity">
                            <Upload size={12} className="text-white" />
                            <input type="file" accept="image/png,image/jpeg" className="hidden"
                              onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(t.id, field as any, f); }} />
                          </label>
                        </div>
                      ) : (
                        <label className="flex items-center gap-1 px-2 py-1 border rounded text-xs text-gray-500 cursor-pointer hover:bg-gray-50">
                          <Upload size={12} /> {field}
                          <input type="file" accept="image/png,image/jpeg" className="hidden"
                            onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(t.id, field as any, f); }} />
                        </label>
                      )}
                      {uploadingField === field && <Loader2 size={14} className="animate-spin" />}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => handleEdit(t)} className="p-1.5 text-gray-500 hover:text-primary-500"><Edit2 size={16} /></button>
                <button onClick={() => handleDelete(t.id)} className="p-1.5 text-gray-500 hover:text-red-500"><Trash2 size={16} /></button>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}

function Badge({ children, variant, className }: { children: React.ReactNode; variant?: string; className?: string }) {
  const bg = variant === 'default' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600';
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${bg} ${className || ''}`}>{children}</span>;
}
