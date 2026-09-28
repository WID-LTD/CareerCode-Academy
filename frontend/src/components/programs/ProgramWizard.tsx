import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle,
  Clock,
  GripVertical,
  Plus,
  Send,
  Trash2,
  Users,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { useCourseStore } from '@/store/courseStore';
import { useProgramStore, Program, ProgramCourseLink, ProgramCohort, ProgramPayload } from '@/store/programStore';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';

export interface SchoolOption {
  id: string;
  name: string;
  slug?: string;
}

interface ProgramWizardProps {
  initial?: Program | null;
  schools: SchoolOption[];
  onClose: () => void;
  onSaved?: (program: Program | null) => void;
}

const STEPS = ['Basics', 'Courses', 'Cohorts', 'Outcomes', 'Preview', 'Submit'] as const;

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

interface CourseRow extends ProgramCourseLink {
  localId: string;
}

function SortableCourseRow({
  row,
  title,
  onWeekChange,
  onToggleRequired,
  onRemove,
}: {
  row: CourseRow;
  title: string;
  onWeekChange: (week: number) => void;
  onToggleRequired: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: row.localId });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700"
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Reorder ${title}`}
          className="p-1.5 rounded-lg text-gray-400 hover:text-primary-500 hover:bg-gray-200 dark:hover:bg-gray-700 cursor-grab touch-none"
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <span className="text-sm font-medium truncate flex-1">{title}</span>
        {row.required ? (
          <Badge variant="primary" size="sm">Required</Badge>
        ) : (
          <Badge variant="default" size="sm">Optional</Badge>
        )}
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-500 flex items-center gap-1.5">
          Week
          <input
            type="number"
            min={1}
            max={12}
            value={row.week_number}
            onChange={(e) => onWeekChange(Math.min(12, Math.max(1, Number(e.target.value) || 1)))}
            className="w-14 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-primary-500/50"
          />
        </label>
        <button
          type="button"
          onClick={onToggleRequired}
          className="text-xs px-2 py-1 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        >
          {row.required ? 'Make optional' : 'Make required'}
        </button>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${title}`}
          className="p-1.5 rounded-lg text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export function ProgramWizard({ initial, schools, onClose, onSaved }: ProgramWizardProps) {
  const { courses, fetchCourses, isLoading: coursesLoading } = useCourseStore();
  const { createProgram, updateProgram, submitProgram } = useProgramStore();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [slugTouched, setSlugTouched] = useState(!!initial?.slug);

  const [basics, setBasics] = useState({
    school_id: initial?.school_id || '',
    name: initial?.name || initial?.title || '',
    slug: initial?.slug || '',
    description: initial?.description || '',
    duration_weeks: initial?.duration_weeks || 12,
    price: initial?.price ?? 0,
    currency: initial?.currency || 'NGN',
    thumbnail_url: initial?.thumbnail_url || initial?.thumbnail || '',
  });
  const [selectedCourses, setSelectedCourses] = useState<CourseRow[]>(
    (initial?.courses || []).map((c, i) => ({
      ...c,
      order_index: c.order_index ?? i,
      localId: `${c.course_id}-${i}`,
    })),
  );
  const [cohorts, setCohorts] = useState<ProgramCohort[]>(initial?.cohorts || []);
  const [cohortDraft, setCohortDraft] = useState({ title: '', starts_at: '', ends_at: '', capacity: 30 });
  const [outcomes, setOutcomes] = useState<string[]>(initial?.career_outcomes || []);
  const [outcomeDraft, setOutcomeDraft] = useState('');

  useEffect(() => {
    fetchCourses({ limit: 100 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const courseTitle = (id: string) => courses.find((c) => c.id === id)?.title || id;

  const setName = (name: string) => {
    setBasics((b) => ({ ...b, name, slug: slugTouched ? b.slug : slugify(name) }));
  };

  const toggleCourse = (courseId: string) => {
    setSelectedCourses((prev) => {
      if (prev.some((c) => c.course_id === courseId)) {
        return prev.filter((c) => c.course_id !== courseId);
      }
      return [
        ...prev,
        {
          course_id: courseId,
          week_number: Math.min(12, prev.length + 1),
          required: true,
          order_index: prev.length,
          localId: `${courseId}-${Date.now()}`,
        },
      ];
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setSelectedCourses((prev) => {
      const oldIndex = prev.findIndex((c) => c.localId === active.id);
      const newIndex = prev.findIndex((c) => c.localId === over.id);
      if (oldIndex < 0 || newIndex < 0) return prev;
      return arrayMove(prev, oldIndex, newIndex).map((c, i) => ({ ...c, order_index: i }));
    });
  };

  const addCohort = () => {
    if (!cohortDraft.title.trim() || !cohortDraft.starts_at || !cohortDraft.ends_at) {
      toast.error('Cohort needs a title, start date and end date');
      return;
    }
    setCohorts((prev) => [...prev, { ...cohortDraft, capacity: Number(cohortDraft.capacity) || 0 }]);
    setCohortDraft({ title: '', starts_at: '', ends_at: '', capacity: 30 });
  };

  const addOutcome = () => {
    const value = outcomeDraft.trim();
    if (!value) return;
    setOutcomes((prev) => [...prev, value]);
    setOutcomeDraft('');
  };

  const payload: ProgramPayload = useMemo(
    () => ({
      school_id: basics.school_id,
      name: basics.name.trim(),
      slug: basics.slug.trim() || slugify(basics.name),
      description: basics.description.trim(),
      duration_weeks: Number(basics.duration_weeks) || 0,
      price: Number(basics.price) || 0,
      currency: basics.currency || 'NGN',
      thumbnail_url: basics.thumbnail_url.trim() || undefined,
      courses: selectedCourses.map((c, i) => ({
        course_id: c.course_id,
        week_number: c.week_number,
        required: c.required,
        order_index: i,
      })),
      cohorts,
      career_outcomes: outcomes,
    }),
    [basics, selectedCourses, cohorts, outcomes],
  );

  const basicsValid =
    basics.school_id.trim() !== '' &&
    basics.name.trim() !== '' &&
    Number(basics.duration_weeks) > 0;

  const canNext = step === 0 ? basicsValid : true;

  const handleSave = async (andSubmit: boolean) => {
    if (!basicsValid) {
      toast.error('School, name and duration are required');
      setStep(0);
      return;
    }
    setSaving(true);
    try {
      let saved: Program | null;
      if (initial?.id) {
        saved = await updateProgram(initial.id, payload);
      } else {
        saved = await createProgram(payload);
      }
      if (!saved) return;
      if (andSubmit) {
        await submitProgram(saved.id);
      }
      onSaved?.(saved);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const schoolName = schools.find((s) => s.id === basics.school_id)?.name || '';

  return (
    <div className="space-y-5">
      {/* Stepper */}
      <ol className="flex flex-wrap items-center gap-1.5" aria-label="Program creation steps">
        {STEPS.map((label, i) => (
          <li key={label} className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => i < step && setStep(i)}
              disabled={i > step}
              className={cn(
                'px-2.5 py-1 rounded-full text-xs font-medium transition-colors',
                i === step
                  ? 'bg-primary-500 text-white'
                  : i < step
                    ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-400',
              )}
            >
              {i + 1}. {label}
            </button>
            {i < STEPS.length - 1 && <ArrowRight className="w-3 h-3 text-gray-400" />}
          </li>
        ))}
      </ol>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.18 }}
        >
          {step === 0 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="pw-school" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  School *
                </label>
                <select
                  id="pw-school"
                  value={basics.school_id}
                  onChange={(e) => setBasics({ ...basics, school_id: e.target.value })}
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800/50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500/50 text-gray-900 dark:text-gray-100"
                >
                  <option value="">Select a school…</option>
                  {schools.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                {schools.length === 0 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">No schools available — school list failed to load.</p>
                )}
              </div>
              <Input label="Program name *" value={basics.name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Full-Stack Web Development" />
              <Input
                label="Slug"
                value={basics.slug}
                onChange={(e) => { setSlugTouched(true); setBasics({ ...basics, slug: slugify(e.target.value) }); }}
                placeholder="auto-generated from name"
              />
              <div className="space-y-1.5">
                <label htmlFor="pw-desc" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                <textarea
                  id="pw-desc"
                  value={basics.description}
                  onChange={(e) => setBasics({ ...basics, description: e.target.value })}
                  rows={4}
                  placeholder="What will students achieve in this program?"
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800/50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500/50 text-gray-900 dark:text-gray-100 resize-none"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="Duration (weeks) *"
                  type="number"
                  min={1}
                  max={52}
                  value={basics.duration_weeks}
                  onChange={(e) => setBasics({ ...basics, duration_weeks: Number(e.target.value) })}
                />
                <Input
                  label="Price"
                  type="number"
                  min={0}
                  value={basics.price}
                  onChange={(e) => setBasics({ ...basics, price: Number(e.target.value) })}
                />
                <div className="space-y-1.5">
                  <label htmlFor="pw-currency" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Currency</label>
                  <select
                    id="pw-currency"
                    value={basics.currency}
                    onChange={(e) => setBasics({ ...basics, currency: e.target.value })}
                    className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800/50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500/50 text-gray-900 dark:text-gray-100"
                  >
                    {['NGN', 'USD', 'GHS', 'KES', 'ZAR', 'GBP', 'EUR'].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
              <Input
                label="Thumbnail URL"
                value={basics.thumbnail_url}
                onChange={(e) => setBasics({ ...basics, thumbnail_url: e.target.value })}
                placeholder="https://…"
              />
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">Select courses, then drag to order them. Set each course's week (1–12) and whether it is required.</p>
              {coursesLoading ? (
                <p className="text-sm text-gray-500">Loading courses…</p>
              ) : courses.length === 0 ? (
                <p className="text-sm text-amber-600 dark:text-amber-400">No courses found. Courses must exist before they can be attached to a program.</p>
              ) : (
                <div className="max-h-48 overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-800">
                  {courses.map((c) => {
                    const checked = selectedCourses.some((s) => s.course_id === c.id);
                    return (
                      <label key={c.id} className="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleCourse(c.id)}
                          className="rounded border-gray-300 dark:border-gray-600"
                        />
                        <span className="flex-1 min-w-0 truncate">{c.title}</span>
                        <span className="text-xs text-gray-400 shrink-0">{c.level}</span>
                      </label>
                    );
                  })}
                </div>
              )}
              {selectedCourses.length > 0 && (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={selectedCourses.map((c) => c.localId)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2">
                      {selectedCourses.map((row, i) => (
                        <SortableCourseRow
                          key={row.localId}
                          row={row}
                          title={`${i + 1}. ${courseTitle(row.course_id)}`}
                          onWeekChange={(week) =>
                            setSelectedCourses((prev) => prev.map((c) => (c.localId === row.localId ? { ...c, week_number: week } : c)))
                          }
                          onToggleRequired={() =>
                            setSelectedCourses((prev) => prev.map((c) => (c.localId === row.localId ? { ...c, required: !c.required } : c)))
                          }
                          onRemove={() => setSelectedCourses((prev) => prev.filter((c) => c.localId !== row.localId))}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">Add one or more cohorts (intakes) for this program.</p>
              {cohorts.length > 0 && (
                <div className="space-y-2">
                  {cohorts.map((c, i) => (
                    <GlassCard key={i} hover={false} className="p-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{c.title}</p>
                        <p className="text-xs text-gray-500">
                          {c.starts_at} → {c.ends_at} · capacity {c.capacity}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCohorts((prev) => prev.filter((_, idx) => idx !== i))}
                        aria-label={`Remove cohort ${c.title}`}
                        className="p-1.5 rounded-lg text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </GlassCard>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
                <Input label="Cohort title" value={cohortDraft.title} onChange={(e) => setCohortDraft({ ...cohortDraft, title: e.target.value })} placeholder="e.g. January 2026 Intake" />
                <Input label="Capacity" type="number" min={1} value={cohortDraft.capacity} onChange={(e) => setCohortDraft({ ...cohortDraft, capacity: Number(e.target.value) })} />
                <Input label="Starts at" type="date" value={cohortDraft.starts_at} onChange={(e) => setCohortDraft({ ...cohortDraft, starts_at: e.target.value })} />
                <Input label="Ends at" type="date" value={cohortDraft.ends_at} onChange={(e) => setCohortDraft({ ...cohortDraft, ends_at: e.target.value })} />
              </div>
              <Button variant="outline" size="sm" onClick={addCohort} icon={<Plus className="w-4 h-4" />}>
                Add Cohort
              </Button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">List the career outcomes graduates can expect.</p>
              {outcomes.length > 0 && (
                <ul className="space-y-2">
                  {outcomes.map((o, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
                      <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span className="flex-1 min-w-0">{o}</span>
                      <button
                        type="button"
                        onClick={() => setOutcomes((prev) => prev.filter((_, idx) => idx !== i))}
                        aria-label={`Remove outcome ${o}`}
                        className="p-1 rounded-lg text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    value={outcomeDraft}
                    onChange={(e) => setOutcomeDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addOutcome(); } }}
                    placeholder="e.g. Frontend Developer"
                  />
                </div>
                <Button variant="outline" onClick={addOutcome} icon={<Plus className="w-4 h-4" />}>
                  Add
                </Button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5">
              {/* Read-only preview mirroring the public ProgramDetail layout */}
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{basics.name || 'Untitled program'}</h3>
                <p className="text-sm text-gray-500 mt-1">{basics.description || 'No description yet.'}</p>
                <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-gray-500">
                  <span className="inline-flex items-center gap-1.5"><Clock className="w-4 h-4" /> {basics.duration_weeks} weeks</span>
                  <span className="inline-flex items-center gap-1.5"><BookOpen className="w-4 h-4" /> {selectedCourses.length} courses</span>
                  <span className="inline-flex items-center gap-1.5"><Users className="w-4 h-4" /> {cohorts.length} cohorts</span>
                  {schoolName && <Badge variant="primary" size="md">{schoolName}</Badge>}
                  <Badge variant="default" size="md">{formatCurrency(Number(basics.price) || 0, basics.currency)} {basics.currency}</Badge>
                </div>
              </div>
              {basics.thumbnail_url && (
                <img src={basics.thumbnail_url} alt="" className="w-full h-40 object-cover rounded-xl" />
              )}
              <GlassCard hover={false} className="p-4">
                <h4 className="font-semibold mb-2 text-gray-900 dark:text-white">Program Courses</h4>
                {selectedCourses.length === 0 ? (
                  <p className="text-sm text-gray-500">No courses selected.</p>
                ) : (
                  <ol className="space-y-1.5">
                    {selectedCourses.map((c, i) => (
                      <li key={c.localId} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                        <span className="w-6 h-6 rounded-lg bg-primary-500/10 text-primary-500 font-bold text-xs flex items-center justify-center shrink-0">{i + 1}</span>
                        <span className="flex-1 min-w-0 truncate">{courseTitle(c.course_id)}</span>
                        <span className="text-xs text-gray-400 shrink-0">Wk {c.week_number}{c.required ? '' : ' · opt'}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </GlassCard>
              <GlassCard hover={false} className="p-4">
                <h4 className="font-semibold mb-2 text-gray-900 dark:text-white">Career Outcomes</h4>
                {outcomes.length === 0 ? (
                  <p className="text-sm text-gray-500">Career outcomes coming soon.</p>
                ) : (
                  <div className="space-y-1.5">
                    {outcomes.map((o, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                        <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" /> {o}
                      </div>
                    ))}
                  </div>
                )}
              </GlassCard>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4 text-center py-4">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-primary-500/10 flex items-center justify-center">
                <Send className="w-7 h-7 text-primary-500" />
              </div>
              <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                {initial?.id ? 'Save changes' : 'Create program'}
              </h3>
              <p className="text-sm text-gray-500 max-w-md mx-auto">
                {initial?.id
                  ? 'Your edits will be saved. Submit separately to send the program back for review.'
                  : 'The program will be saved as a draft. Submit it to send it for admin review.'}
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-2">
                <Button variant="outline" loading={saving} onClick={() => handleSave(false)}>
                  {initial?.id ? 'Save Changes' : 'Save as Draft'}
                </Button>
                <Button loading={saving} onClick={() => handleSave(true)} icon={<Send className="w-4 h-4" />}>
                  {initial?.id ? 'Save & Submit for Review' : 'Create & Submit for Review'}
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Footer nav */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-800">
        <Button variant="ghost" size="sm" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))} icon={<ArrowLeft className="w-4 h-4" />}>
          Back
        </Button>
        <span className="text-xs text-gray-400">Step {step + 1} of {STEPS.length}</span>
        {step < STEPS.length - 1 ? (
          <Button variant="outline" size="sm" disabled={!canNext} title={!canNext ? 'Fill in school, name and duration first' : undefined} onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))} icon={<ArrowRight className="w-4 h-4" />}>
            Next
          </Button>
        ) : (
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        )}
      </div>
    </div>
  );
}
