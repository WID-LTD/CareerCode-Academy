import { useCallback, useEffect, useState } from 'react';
import { Compass, Eye, Loader2, Pencil, Plus, RefreshCw, Save, Trash2, Upload } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import SEO from '@/components/seo/SEO';
import api from '@/lib/axios';
import toast from 'react-hot-toast';

export default function AdminGuides() {
  const [tours, setTours] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [steps, setSteps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tourOpen, setTourOpen] = useState(false);
  const [stepOpen, setStepOpen] = useState(false);
  const [editingTour, setEditingTour] = useState<any>(null);
  const [editingStep, setEditingStep] = useState<any>(null);
  const [tourForm, setTourForm] = useState({ name: '', role: 'student', type: 'role_journey', description: '' });
  const [stepForm, setStepForm] = useState<any>({ position: 1, route: '/student/dashboard', selector: '[data-tour="page-content"]', title: '', body: '', placement: 'auto', arrow: true, chapter: 'Core', prompt: '', optional: false, requires_access: false });
  const [saving, setSaving] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);

  const loadTours = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/guide/admin/tours');
      setTours(data.data || []);
      if (!selected && data.data?.[0]) setSelected(data.data[0]);
    } catch { toast.error('Failed to load tours'); }
    finally { setLoading(false); }
  }, [selected]);

  const loadSteps = useCallback(async (tour: any) => {
    if (!tour) return;
    try { const { data } = await api.get(`/guide/admin/tours/${tour.id}/steps`); setSteps(data.data || []); }
    catch { toast.error('Failed to load steps'); }
  }, []);

  useEffect(() => { loadTours(); }, [loadTours]);
  useEffect(() => { loadSteps(selected); }, [selected, loadSteps]);
  useEffect(() => { api.get('/guide/admin/analytics').then(({ data }) => setAnalytics(data.data)).catch(() => {}); }, []);

  const saveTour = async () => {
    setSaving(true);
    try {
      if (editingTour) await api.put(`/guide/admin/tours/${editingTour.id}`, tourForm);
      else await api.post('/guide/admin/tours', tourForm);
      toast.success(editingTour ? 'Tour updated' : 'Tour created');
      setTourOpen(false); setEditingTour(null); loadTours();
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Failed to save tour'); }
    finally { setSaving(false); }
  };

  const saveStep = async () => {
    setSaving(true);
    try {
      if (editingStep) await api.put(`/guide/admin/steps/${editingStep.id}`, stepForm);
      else await api.post(`/guide/admin/tours/${selected.id}/steps`, stepForm);
      toast.success(editingStep ? 'Step updated' : 'Step created');
      setStepOpen(false); setEditingStep(null); loadSteps(selected);
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Failed to save step'); }
    finally { setSaving(false); }
  };

  const deleteStep = async (step: any) => {
    try { await api.delete(`/guide/admin/steps/${step.id}`); toast.success('Step deleted'); loadSteps(selected); }
    catch { toast.error('Failed to delete step'); }
  };

  const publish = async () => {
    if (!selected) return;
    try { const { data } = await api.post(`/guide/admin/tours/${selected.id}/publish`, {}); toast.success(`Published version ${data.data.version}`); loadTours(); }
    catch { toast.error('Failed to publish tour'); }
  };

  const preview = async () => {
    if (!selected) return;
    try {
      const { data } = await api.get(`/guide/tours/${selected.key}`);
      window.dispatchEvent(new CustomEvent('tour:preview', { detail: { tour: data.data } }));
    } catch { toast.error('Failed to preview tour'); }
  };

  const openNewTour = () => { setEditingTour(null); setTourForm({ name: '', role: 'student', type: 'role_journey', description: '' }); setTourOpen(true); };
  const openEditTour = (t: any) => { setEditingTour(t); setTourForm({ name: t.name, role: t.role, type: t.type, description: t.description || '' }); setTourOpen(true); };
  const openNewStep = () => { setEditingStep(null); setStepForm({ position: steps.length + 1, route: '/student/dashboard', selector: '[data-tour="page-content"]', title: '', body: '', placement: 'auto', arrow: true, chapter: 'Core', prompt: '', optional: false, requires_access: false }); setStepOpen(true); };
  const openEditStep = (s: any) => { setEditingStep(s); setStepForm({ ...s }); setStepOpen(true); };

  return (
    <>
      <SEO title="Guided tours" description="Edit built-in guided tours and create new tours." />
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary-500">Guided experience</p>
            <h1 className="text-2xl sm:text-3xl font-bold">Guided tours</h1>
            <p className="text-sm text-gray-500 mt-1">Edit built-in tours, create new tours, preview and publish.</p>
          </div>
          <div className="flex gap-2"><Button variant="outline" onClick={loadTours} icon={<RefreshCw className="w-4 h-4" />}>Refresh</Button><Button onClick={openNewTour} icon={<Plus className="w-4 h-4" />}>New tour</Button></div>
        </div>

        <div className="grid lg:grid-cols-4 gap-4">
          <GlassCard hover={false} className="p-3 lg:col-span-1">
            {loading ? <div className="py-10 grid place-items-center"><Loader2 className="w-5 h-5 animate-spin text-primary-500" /></div> : tours.map((t) => (
              <button key={t.id} onClick={() => setSelected(t)} className={`w-full text-left p-3 rounded-xl mb-1 ${selected?.id === t.id ? 'bg-primary-500/10' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}>
                <div className="flex items-center justify-between gap-2"><p className="text-sm font-medium truncate">{t.name}</p>{t.is_builtin ? <Badge variant="primary">Built-in</Badge> : <Badge>Custom</Badge>}</div>
                <p className="text-[11px] text-gray-400">{t.role} · {t.step_count} steps · v{t.version}</p>
              </button>
            ))}
          </GlassCard>

          <GlassCard hover={false} className="p-5 lg:col-span-3">
            {!selected ? <p className="text-sm text-gray-400">Select a tour.</p> : (
              <div className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><h2 className="text-lg font-semibold">{selected.name}</h2><p className="text-xs text-gray-400">{selected.role} · {selected.type} · version {selected.version}</p></div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => openEditTour(selected)} icon={<Pencil className="w-3.5 h-3.5" />}>Edit tour</Button>
                    <Button size="sm" variant="outline" onClick={preview} icon={<Eye className="w-3.5 h-3.5" />}>Preview</Button>
                    <Button size="sm" onClick={publish} icon={<Upload className="w-3.5 h-3.5" />}>Publish</Button>
                  </div>
                </div>
                <div className="flex items-center justify-between"><h3 className="text-sm font-semibold">Steps ({steps.length})</h3><Button size="sm" onClick={openNewStep} icon={<Plus className="w-3.5 h-3.5" />}>Add step</Button></div>
                <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
                  {steps.map((s, i) => (
                    <div key={s.id} className="rounded-xl border border-gray-100 dark:border-gray-800 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0"><p className="text-sm font-medium"><span className="text-gray-400 mr-1">{i + 1}.</span>{s.title}</p><p className="text-[11px] text-gray-400 truncate">{s.route} · {s.selector}</p></div>
                        <div className="flex gap-1 shrink-0"><Button size="sm" variant="ghost" onClick={() => openEditStep(s)}><Pencil className="w-3.5 h-3.5" /></Button><Button size="sm" variant="ghost" onClick={() => deleteStep(s)}><Trash2 className="w-3.5 h-3.5 text-red-500" /></Button></div>
                      </div>
                    </div>
                  ))}
                  {steps.length === 0 && <p className="text-sm text-gray-400">No steps yet.</p>}
                </div>
              </div>
            )}
          </GlassCard>
        </div>

        {analytics && <GlassCard hover={false} className="p-5"><h2 className="font-semibold mb-2">Tour analytics</h2><div className="grid sm:grid-cols-2 gap-4 text-sm"><div>{(analytics.events || []).slice(0, 8).map((e: any) => <div key={`${e.tour_key}-${e.event}`} className="flex justify-between py-1"><span className="text-gray-500">{e.tour_key} · {e.event}</span><span>{e.count}</span></div>)}</div><div>{(analytics.progress || []).map((p: any) => <div key={`${p.tour_key}-${p.status}`} className="flex justify-between py-1"><span className="text-gray-500">{p.tour_key} · {p.status}</span><span>{p.count}</span></div>)}</div></div></GlassCard>}
      </div>

      <Modal isOpen={tourOpen} onClose={() => setTourOpen(false)} title={editingTour ? 'Edit tour' : 'New tour'}>
        <div className="space-y-3">
          <Input label="Name" value={tourForm.name} onChange={(e) => setTourForm({ ...tourForm, name: e.target.value })} />
          <Select label="Role" value={tourForm.role} onChange={(e) => setTourForm({ ...tourForm, role: e.target.value })} options={[{ value: 'student', label: 'Student' }, { value: 'instructor', label: 'Instructor' }, { value: 'admin', label: 'Admin' }]} />
          <Select label="Type" value={tourForm.type} onChange={(e) => setTourForm({ ...tourForm, type: e.target.value })} options={[{ value: 'role_journey', label: 'Role journey' }, { value: 'first_launch', label: 'First launch' }, { value: 'page_tour', label: 'Page tour' }]} />
          <Input label="Description" value={tourForm.description} onChange={(e) => setTourForm({ ...tourForm, description: e.target.value })} />
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setTourOpen(false)}>Cancel</Button><Button loading={saving} onClick={saveTour}>Save tour</Button></div>
        </div>
      </Modal>

      <Modal isOpen={stepOpen} onClose={() => setStepOpen(false)} title={editingStep ? 'Edit step' : 'New step'} size="lg">
        <div className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <Input label="Position" type="number" value={stepForm.position} onChange={(e) => setStepForm({ ...stepForm, position: Number(e.target.value) })} />
            <Input label="Route" value={stepForm.route} onChange={(e) => setStepForm({ ...stepForm, route: e.target.value })} />
            <Input label="Target selector" value={stepForm.selector} onChange={(e) => setStepForm({ ...stepForm, selector: e.target.value })} />
            <Select label="Placement" value={stepForm.placement} onChange={(e) => setStepForm({ ...stepForm, placement: e.target.value })} options={[{ value: 'auto', label: 'Auto' }, { value: 'top', label: 'Top' }, { value: 'bottom', label: 'Bottom' }, { value: 'left', label: 'Left' }, { value: 'right', label: 'Right' }]} />
            <Input label="Chapter" value={stepForm.chapter || ''} onChange={(e) => setStepForm({ ...stepForm, chapter: e.target.value })} />
            <Input label="GiGo prompt" value={stepForm.prompt || ''} onChange={(e) => setStepForm({ ...stepForm, prompt: e.target.value })} />
          </div>
          <Input label="Title" value={stepForm.title} onChange={(e) => setStepForm({ ...stepForm, title: e.target.value })} />
          <div className="space-y-1.5"><label className="block text-sm font-medium">Body</label><textarea rows={4} value={stepForm.body} onChange={(e) => setStepForm({ ...stepForm, body: e.target.value })} className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800/50 px-4 py-2.5 text-sm" /></div>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={!!stepForm.arrow} onChange={(e) => setStepForm({ ...stepForm, arrow: e.target.checked })} /> Arrow</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={!!stepForm.optional} onChange={(e) => setStepForm({ ...stepForm, optional: e.target.checked })} /> Optional</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={!!stepForm.requires_access} onChange={(e) => setStepForm({ ...stepForm, requires_access: e.target.checked })} /> Requires access</label>
          </div>
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setStepOpen(false)}>Cancel</Button><Button loading={saving} onClick={saveStep} icon={<Save className="w-4 h-4" />}>Save step</Button></div>
        </div>
      </Modal>
    </>
  );
}
