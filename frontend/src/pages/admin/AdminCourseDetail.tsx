import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, Save, Loader2, BookOpen, Clock, DollarSign, Star, Trash2, Plus, Edit3, Video, FileText, Upload } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import api from '@/lib/axios';
import { useAdminStore } from '@/store/adminStore';
import { optimizeImageUrl } from '@/lib/cloudinary';
import toast from 'react-hot-toast';
import LessonLightbox from '@/components/admin/LessonLightbox';

export default function AdminCourseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { updateCourse, deleteCourse } = useAdminStore();
  const [course, setCourse] = useState<any>(null);
  const [modules, setModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({});
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const uploadThumbnail = async (file: File) => {
    setUploadingThumb(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await api.post('/upload', fd);
      setForm((f: any) => ({ ...f, thumbnail: data.data.url }));
    } finally { setUploadingThumb(false); }
  };
  const [selectedLesson, setSelectedLesson] = useState<any>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchCourse();
  }, [id]);

  const fetchCourse = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/admin/courses/${id}`);
      const c = data.data || data;
      setCourse(c);
      setForm({
        title: c.title || '',
        description: c.description || '',
        category: c.category || 'Web Development',
        level: c.level || 'beginner',
        price: c.price || 0,
        duration: c.duration || 0,
        thumbnail: c.thumbnail || '',
        status: c.status || 'draft',
        featured: c.featured || c.is_featured || false,
        learning_outcomes: (c.learning_outcomes || []).join('\n'),
      });
      // fetch modules + lessons
      const modRes = await api.get(`/modules/course/${c.id || id}`);
      const mods = modRes.data.data || modRes.data || [];
      // for each module, fetch lessons via course lessons or modules
      const courseRes = await api.get(`/courses/${c.id || id}`);
      const lessons = courseRes.data.data?.lessons || courseRes.data.lessons || [];
      const enriched = mods.map((m: any) => ({
        ...m,
        lessons: lessons.filter((l: any) => l.module_id === m.id).sort((a: any, b: any) => (a.order_index||0)-(b.order_index||0))
      }));
      const ungrouped = lessons.filter((l: any) => !l.module_id || !mods.some((m: any) => m.id === l.module_id));
      if (ungrouped.length > 0) enriched.push({ id: 'ungrouped', title: 'Ungrouped', lessons: ungrouped });
      setModules(enriched);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to load course');
    } finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!id || !form.title.trim()) { toast.error('Title required'); return; }
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        description: form.description,
        category: form.category,
        level: form.level,
        price: Number(form.price),
        duration: Number(form.duration),
        thumbnail: form.thumbnail,
        status: form.status,
        featured: form.featured,
        learning_outcomes: form.learning_outcomes.split('\n').filter(Boolean),
      };
      await updateCourse(id, payload);
      toast.success('Course saved');
      fetchCourse();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Save failed');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this course permanently?')) return;
    try { await deleteCourse(id!); toast.success('Deleted'); navigate('/admin/courses'); } catch { toast.error('Delete failed'); }
  };

  const openLesson = (lesson: any) => {
    setSelectedLesson(lesson);
    setLightboxOpen(true);
  };

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>;
  if (!course) return <div className="p-8 text-center text-gray-400">Course not found</div>;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-6xl mx-auto">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 -mx-4 px-4 py-3 flex flex-wrap items-center justify-between gap-3 lg:mx-0 lg:rounded-xl lg:border lg:mt-2">
        <div className="flex items-center gap-3 min-w-0">
          <Link to="/admin/courses" className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"><ChevronLeft className="w-5 h-5" /></Link>
          <div className="min-w-0">
            <h1 className="font-bold text-lg truncate">{form.title || 'Untitled Course'}</h1>
            <p className="text-xs text-gray-400 truncate">{course.slug} · {course.category}</p>
          </div>
          <Badge variant={form.status==='published'?'success': form.status==='draft'?'default':'warning'} className="capitalize hidden sm:inline-flex">{form.status}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => navigate('/admin/courses')}>Back</Button>
          <Button variant="outline" onClick={handleDelete}><Trash2 className="w-4 h-4 mr-1" /> Delete</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />} Save</Button>
        </div>
      </div>

      {/* Course editorial */}
      <GlassCard className="p-4 sm:p-6">
        <h2 className="font-semibold mb-4 flex items-center gap-2"><BookOpen className="w-4 h-4 text-primary-500" /> Course Details</h2>
        <div className="grid gap-4">
          <Input label="Title" value={form.title} onChange={e=>setForm({...form, title:e.target.value})} placeholder="Course title" />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium">Description</label>
            <textarea value={form.description} onChange={e=>setForm({...form, description:e.target.value})} rows={4} className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800/50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500/50" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium">Category</label>
              <select value={form.category} onChange={e=>setForm({...form, category:e.target.value})} className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800/50 px-4 py-2.5 text-sm">
                {['Web Development','Data Science','Design','Mobile','DevOps','AI/ML','Cloud','Cybersecurity'].map(c=> <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium">Level</label>
              <select value={form.level} onChange={e=>setForm({...form, level:e.target.value})} className="w-full rounded-xl border px-4 py-2.5 text-sm capitalize">
                {['beginner','intermediate','advanced'].map(l=> <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input label="Price" type="number" value={form.price} onChange={e=>setForm({...form, price:e.target.value})} />
            <Input label="Duration (min)" type="number" value={form.duration} onChange={e=>setForm({...form, duration:e.target.value})} />
          </div>
          <div>
            <Input label="Thumbnail URL" value={form.thumbnail} onChange={e=>setForm({...form, thumbnail:e.target.value})} placeholder="https://..." />
            <label className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs cursor-pointer">
              {uploadingThumb ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              Upload image
              <input type="file" accept="image/*" className="hidden" disabled={uploadingThumb} onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadThumbnail(f); }} />
            </label>
          </div>
          {form.thumbnail && <img src={optimizeImageUrl(form.thumbnail, 400, 200)} alt="thumb" className="w-full max-w-sm h-40 object-cover rounded-xl border" />}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium">Learning Outcomes (one per line)</label>
            <textarea value={form.learning_outcomes} onChange={e=>setForm({...form, learning_outcomes:e.target.value})} rows={3} className="w-full rounded-xl border px-4 py-2.5 text-sm" placeholder="Outcome per line" />
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.featured} onChange={e=>setForm({...form, featured:e.target.checked})} /> Featured <Star className="w-4 h-4 text-amber-400" /></label>
            <select value={form.status} onChange={e=>setForm({...form, status:e.target.value})} className="rounded-xl border px-3 py-2 text-sm capitalize">
              {['draft','pending_review','published','rejected','archived'].map(s=> <option key={s} value={s}>{s.replace('_',' ')}</option>)}
            </select>
          </div>
        </div>
      </GlassCard>

      {/* Lessons */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2"><FileText className="w-4 h-4 text-primary-500" /> Lessons <Badge>{modules.reduce((a,m)=>a+(m.lessons?.length||0),0)}</Badge></h2>
          <Button size="sm" variant="outline" onClick={fetchCourse}><Clock className="w-4 h-4 mr-1" /> Refresh</Button>
        </div>
        {modules.length===0 && <p className="text-sm text-gray-400 text-center py-8">No lessons yet. Add via instructor editor or here soon.</p>}
        {modules.map((mod:any) => (
          <GlassCard key={mod.id} className="p-4">
            <h3 className="font-medium text-sm mb-3 flex items-center gap-2"><BookOpen className="w-4 h-4 text-gray-400" /> {mod.title} <Badge variant="default">{mod.lessons?.length||0}</Badge></h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(mod.lessons||[]).map((lesson:any) => (
                <div key={lesson.id} onClick={()=>openLesson(lesson)} className="group p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-primary-500/50 hover:bg-primary-50/50 dark:hover:bg-primary-900/10 cursor-pointer transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-medium text-sm line-clamp-2 flex-1">{lesson.title}</h4>
                    <Edit3 className="w-4 h-4 text-gray-400 group-hover:text-primary-500 shrink-0" />
                  </div>
                  <p className="text-xs text-gray-400 line-clamp-2 mt-1">{lesson.description}</p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {lesson.duration||15} min</span>
                    {lesson.video_url ? <span className="flex items-center gap-1 text-emerald-500"><Video className="w-3 h-3" /> Video</span> : <span className="flex items-center gap-1 text-amber-500">No video</span>}
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        ))}
      </div>

      {lightboxOpen && selectedLesson && (
        <LessonLightbox lesson={selectedLesson} courseId={course.id} onClose={()=>{setLightboxOpen(false); setSelectedLesson(null); fetchCourse();}} onSaved={()=>{setLightboxOpen(false); setSelectedLesson(null); fetchCourse();}} />
      )}
    </motion.div>
  );
}
