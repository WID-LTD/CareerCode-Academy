import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  Image,
  ListOrdered,
  DollarSign,
  Send,
  Save,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Circle,
  Upload,
  Video,
  FileText,
  File,
  Presentation,
  ClipboardList,
  Code,
  Monitor,
  Download,
  GripVertical,
  Plus,
  Trash2,
  Copy,
  Loader2,
  X,
  Check,
  Type,
  AlertCircle,
} from 'lucide-react';
import { DndContext, closestCenter, DragOverlay, PointerSensor, useSensor, useSensors, DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { ProgressBar } from '@/components/ui/ProgressBar';
import SEO from '@/components/seo/SEO';
import api from '@/lib/axios';
import { cn, generateId } from '@/lib/utils';

const STEPS = [
  { id: 1, label: 'Course Info', icon: BookOpen },
  { id: 2, label: 'Media', icon: Image },
  { id: 3, label: 'Curriculum', icon: ListOrdered },
  { id: 4, label: 'Pricing', icon: DollarSign },
  { id: 5, label: 'Publish', icon: Send },
];

const LESSON_TYPES = [
  { value: 'video', label: 'Video', icon: Video, color: 'text-blue-500' },
  { value: 'text', label: 'Text', icon: FileText, color: 'text-green-500' },
  { value: 'pdf', label: 'PDF', icon: File, color: 'text-red-500' },
  { value: 'slides', label: 'Slide Presentation', icon: Presentation, color: 'text-orange-500' },
  { value: 'assignment', label: 'Assignment', icon: ClipboardList, color: 'text-purple-500' },
  { value: 'quiz', label: 'Quiz', icon: CheckCircle2, color: 'text-yellow-500' },
  { value: 'coding', label: 'Coding Exercise', icon: Code, color: 'text-cyan-500' },
  { value: 'live', label: 'Live Session', icon: Monitor, color: 'text-pink-500' },
  { value: 'downloadable', label: 'Downloadable Resource', icon: Download, color: 'text-indigo-500' },
];

const SKILL_LEVELS = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'all-levels', label: 'All Levels' },
];

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'ar', label: 'Arabic' },
  { value: 'zh', label: 'Chinese' },
  { value: 'ja', label: 'Japanese' },
  { value: 'ko', label: 'Korean' },
];

const stepOneSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  subtitle: z.string().optional(),
  description: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
  school: z.string().optional(),
  program: z.string().optional(),
  skillLevel: z.string().optional(),
  language: z.string().optional(),
  tags: z.string().optional(),
});

type StepOneData = z.infer<typeof stepOneSchema>;

interface Lesson {
  id: string;
  type: string;
  title: string;
}

interface Section {
  id: string;
  title: string;
  lessons: Lesson[];
}

interface CourseMedia {
  thumbnail: string | null;
  promoVideo: string;
  bannerImage: string | null;
}

interface CourseFormData {
  step1: StepOneData;
  media: CourseMedia;
  sections: Section[];
  pricing: 'free' | 'paid' | 'scholarship' | 'subscription';
  price: string;
}

interface SortableLessonProps {
  lesson: Lesson;
  onUpdate: (id: string, title: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  isDragging?: boolean;
}

interface SortableSectionProps {
  section: Section;
  onUpdateTitle: (id: string, title: string) => void;
  onAddLesson: (sectionId: string, type: string) => void;
  onUpdateLesson: (sectionId: string, lessonId: string, title: string) => void;
  onDuplicateLesson: (sectionId: string, lessonId: string) => void;
  onDeleteLesson: (sectionId: string, lessonId: string) => void;
  onDeleteSection: (id: string) => void;
}

const lessonTypeConfig = (type: string) =>
  LESSON_TYPES.find((lt) => lt.value === type) || LESSON_TYPES[1];

function SortableLesson({ lesson, onUpdate, onDuplicate, onDelete, isDragging }: SortableLessonProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: isSortableDragging } =
    useSortable({ id: lesson.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.4 : 1,
  };

  const config = lessonTypeConfig(lesson.type);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-xl bg-white/50 dark:bg-gray-800/30 border border-gray-200 dark:border-gray-700/50',
        isDragging && 'shadow-lg ring-2 ring-primary-500/30'
      )}
    >
      <button className="cursor-grab touch-none text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" {...attributes} {...listeners}>
        <GripVertical className="w-4 h-4" />
      </button>
      <div className={cn('p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800', config.color)}>
        {React.createElement(config.icon, { className: 'w-4 h-4' })}
      </div>
      <input
        value={lesson.title}
        onChange={(e) => onUpdate(lesson.id, e.target.value)}
        className="flex-1 bg-transparent border-none outline-none text-sm font-medium text-gray-800 dark:text-gray-200 placeholder-gray-400"
        placeholder="Lesson title..."
      />
      <Badge variant="primary" size="sm">{config.label}</Badge>
      <button
        onClick={() => onDuplicate(lesson.id)}
        className="p-1.5 rounded-lg text-gray-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-950/30 transition-colors"
        title="Duplicate"
      >
        <Copy className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => onDelete(lesson.id)}
        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
        title="Delete"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function SortableSection({ section, onUpdateTitle, onAddLesson, onUpdateLesson, onDuplicateLesson, onDeleteLesson, onDeleteSection }: SortableSectionProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const [showAddMenu, setShowAddMenu] = useState(false);

  return (
    <div ref={setNodeRef} style={style} className="rounded-2xl border border-gray-200 dark:border-gray-700/50 bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-800">
        <button className="cursor-grab touch-none text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" {...attributes} {...listeners}>
          <GripVertical className="w-4 h-4" />
        </button>
        <Type className="w-4 h-4 text-primary-500" />
        <input
          value={section.title}
          onChange={(e) => onUpdateTitle(section.id, e.target.value)}
          className="flex-1 bg-transparent border-none outline-none text-sm font-semibold text-gray-900 dark:text-gray-100 placeholder-gray-400"
          placeholder="Section title (e.g. Introduction)"
        />
        <button
          onClick={() => onDeleteSection(section.id)}
          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
          title="Delete section"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-3">
        <SortableContext items={section.lessons.map((l) => l.id)} strategy={verticalListSortingStrategy}>
          {section.lessons.map((lesson) => (
            <SortableLesson
              key={lesson.id}
              lesson={lesson}
              onUpdate={(id, title) => onUpdateLesson(section.id, id, title)}
              onDuplicate={(id) => onDuplicateLesson(section.id, id)}
              onDelete={(id) => onDeleteLesson(section.id, id)}
            />
          ))}
        </SortableContext>

        <div className="relative">
          <button
            onClick={() => setShowAddMenu(!showAddMenu)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-500 dark:text-gray-400 hover:border-primary-400 hover:text-primary-500 hover:bg-primary-50/50 dark:hover:bg-primary-950/20 transition-all"
          >
            <Plus className="w-4 h-4" /> Add Lesson
          </button>

          <AnimatePresence>
            {showAddMenu && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                className="absolute left-0 right-0 bottom-full mb-2 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-2 z-10 grid grid-cols-1 sm:grid-cols-2 gap-1"
              >
                {LESSON_TYPES.map((lt) => (
                  <button
                    key={lt.value}
                    onClick={() => {
                      onAddLesson(section.id, lt.value);
                      setShowAddMenu(false);
                    }}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                  >
                    <div className={cn('p-1 rounded', lt.color, 'bg-gray-100 dark:bg-gray-700')}>
                      {React.createElement(lt.icon, { className: 'w-3.5 h-3.5' })}
                    </div>
                    {lt.label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

const slideVariants = {
  enter: (direction: number) => ({ x: direction > 0 ? 300 : -300, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction > 0 ? -300 : 300, opacity: 0 }),
};

export default function CourseBuilder() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const [rules, setRules] = useState('');
  const [formData, setFormData] = useState<CourseFormData>({
    step1: { title: '', subtitle: '', description: '', category: '', school: '', program: '', skillLevel: '', language: '', tags: '' },
    media: { thumbnail: null, promoVideo: '', bannerImage: null },
    sections: [],
    pricing: 'free',
    price: '',
  });

  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingPromo, setUploadingPromo] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    trigger,
    getValues,
    setValue,
  } = useForm<StepOneData>({
    resolver: zodResolver(stepOneSchema),
    defaultValues: formData.step1,
    mode: 'onBlur',
  });

  useEffect(() => {
    const sub = watch((values) => {
      if (values) setFormData((prev) => ({ ...prev, step1: values as StepOneData }));
    });
    return () => sub.unsubscribe();
  }, [watch]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const updateStep1Field = useCallback(
    (field: keyof StepOneData, value: string) => {
      setFormData((prev) => ({ ...prev, step1: { ...prev.step1, [field]: value } }));
      setValue(field, value);
    },
    [setValue]
  );

  const goNext = async () => {
    if (currentStep === 1) {
      const valid = await trigger();
      if (!valid) return;
    }
    if (currentStep < 5) {
      setDirection(1);
      setCurrentStep((s) => s + 1);
    }
  };

  const goBack = () => {
    if (currentStep > 1) {
      setDirection(-1);
      setCurrentStep((s) => s - 1);
    }
  };

  const addSection = () => {
    const newSection: Section = {
      id: generateId(),
      title: '',
      lessons: [],
    };
    setFormData((prev) => ({ ...prev, sections: [...prev.sections, newSection] }));
  };

  const updateSectionTitle = (id: string, title: string) => {
    setFormData((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => (s.id === id ? { ...s, title } : s)),
    }));
  };

  const addLessonToSection = (sectionId: string, type: string) => {
    const newLesson: Lesson = {
      id: generateId(),
      type,
      title: '',
    };
    setFormData((prev) => ({
      ...prev,
      sections: prev.sections.map((s) =>
        s.id === sectionId ? { ...s, lessons: [...s.lessons, newLesson] } : s
      ),
    }));
  };

  const updateLessonTitle = (sectionId: string, lessonId: string, title: string) => {
    setFormData((prev) => ({
      ...prev,
      sections: prev.sections.map((s) =>
        s.id === sectionId
          ? { ...s, lessons: s.lessons.map((l) => (l.id === lessonId ? { ...l, title } : l)) }
          : s
      ),
    }));
  };

  const duplicateLesson = (sectionId: string, lessonId: string) => {
    setFormData((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => {
        if (s.id !== sectionId) return s;
        const idx = s.lessons.findIndex((l) => l.id === lessonId);
        if (idx === -1) return s;
        const original = s.lessons[idx];
        const copy: Lesson = { ...original, id: generateId(), title: original.title ? `${original.title} (Copy)` : '' };
        const lessons = [...s.lessons];
        lessons.splice(idx + 1, 0, copy);
        return { ...s, lessons };
      }),
    }));
  };

  const deleteLesson = (sectionId: string, lessonId: string) => {
    setFormData((prev) => ({
      ...prev,
      sections: prev.sections.map((s) =>
        s.id === sectionId ? { ...s, lessons: s.lessons.filter((l) => l.id !== lessonId) } : s
      ),
    }));
  };

  const deleteSection = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      sections: prev.sections.filter((s) => s.id !== id),
    }));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const allIds = formData.sections.flatMap((s) => [s.id, ...s.lessons.map((l) => l.id)]);
    const activeIsSection = formData.sections.some((s) => s.id === active.id);
    const overIsSection = formData.sections.some((s) => s.id === over.id);

    if (activeIsSection && overIsSection) {
      const oldIdx = formData.sections.findIndex((s) => s.id === active.id);
      const newIdx = formData.sections.findIndex((s) => s.id === over.id);
      setFormData((prev) => ({ ...prev, sections: arrayMove(prev.sections, oldIdx, newIdx) }));
      return;
    }

    if (!activeIsSection && !overIsSection) {
      let activeSectionIdx = -1;
      let activeLessonIdx = -1;
      let overSectionIdx = -1;
      let overLessonIdx = -1;

      for (let si = 0; si < formData.sections.length; si++) {
        const li = formData.sections[si].lessons.findIndex((l) => l.id === active.id);
        if (li !== -1) { activeSectionIdx = si; activeLessonIdx = li; }
        const oi = formData.sections[si].lessons.findIndex((l) => l.id === over.id);
        if (oi !== -1) { overSectionIdx = si; overLessonIdx = oi; }
      }

      if (activeSectionIdx === -1 || overSectionIdx === -1) return;

      if (activeSectionIdx === overSectionIdx) {
        setFormData((prev) => {
          const sections = [...prev.sections];
          const lessons = arrayMove(sections[activeSectionIdx].lessons, activeLessonIdx, overLessonIdx);
          sections[activeSectionIdx] = { ...sections[activeSectionIdx], lessons };
          return { ...prev, sections };
        });
      }
      return;
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  };

  const handleImageUpload = async (file: File, type: 'thumbnail' | 'banner') => {
    if (type === 'thumbnail') setUploadingThumbnail(true);
    else setUploadingBanner(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const { data } = await api.post('/upload', form);
      if (data.success) {
        const url = data.data.url || data.data.path;
        if (type === 'thumbnail') {
          setFormData((prev) => ({ ...prev, media: { ...prev.media, thumbnail: url } }));
        } else {
          setFormData((prev) => ({ ...prev, media: { ...prev.media, bannerImage: url } }));
        }
        toast.success(`${type === 'thumbnail' ? 'Thumbnail' : 'Banner'} uploaded`);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || `Failed to upload ${type}`);
    } finally {
      if (type === 'thumbnail') setUploadingThumbnail(false);
      else setUploadingBanner(false);
    }
  };

  const handlePromoUpload = async (file: File) => {
    setUploadingPromo(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const { data } = await api.post('/upload', form);
      if (data.success) {
        setFormData((prev) => ({ ...prev, media: { ...prev.media, promoVideo: data.data.url || data.data.path } }));
        toast.success('Promo video uploaded');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to upload promo video');
    } finally { setUploadingPromo(false); }
  };

  const totalLessons = formData.sections.reduce((sum, s) => sum + s.lessons.length, 0);
  const hasAssessment = formData.sections.some((s) =>
    s.lessons.some((l) => l.type === 'quiz' || l.type === 'assignment')
  );
  const checklist = [
    { key: 'image', label: 'Course image uploaded', done: !!formData.media.thumbnail },
    { key: 'outcomes', label: 'Learning outcomes completed', done: true },
    { key: 'sections', label: 'Curriculum has at least 1 section', done: formData.sections.length >= 1 },
    { key: 'assessment', label: 'At least one assessment (quiz or assignment)', done: hasAssessment },
    { key: 'lessons', label: 'Minimum 3 lessons', done: totalLessons >= 3 },
  ];
  const allChecked = checklist.every((c) => c.done);

  const buildPayload = (published: boolean) => {
    const { step1, media, sections, pricing, price } = formData;
    const rawLevel = step1.skillLevel || 'beginner';
    const level = ['beginner', 'intermediate', 'advanced'].includes(rawLevel) ? rawLevel : 'beginner';
    const duration = Math.max(1, totalLessons * 10);
    return {
      title: step1.title,
      subtitle: step1.subtitle || undefined,
      description: step1.description || undefined,
      rules: rules || undefined,
      category: step1.category,
      school: step1.school || undefined,
      program: step1.program || undefined,
      skill_level: level,
      level,
      language: step1.language || 'en',
      tags: step1.tags
        ? step1.tags.split(',').map((t) => t.trim()).filter(Boolean)
        : [],
      thumbnail: media.thumbnail,
      promo_video_url: media.promoVideo || undefined,
      banner_image: media.bannerImage,
      sections: sections.map((s) => ({
        title: s.title,
        lessons: s.lessons.map((l) => ({
          type: l.type,
          title: l.title,
        })),
      })),
      pricing_model: pricing,
      price: pricing === 'paid' && price ? parseFloat(price) : 0,
      duration,
      published,
    };
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      const { data } = await api.post('/courses', buildPayload(false));
      if (data.success) {
        toast.success('Course saved as draft');
        navigate('/instructor/courses');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save course');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!allChecked) return;
    setPublishing(true);
    try {
      const { data } = await api.post('/courses', buildPayload(true));
      if (data.success) {
        toast.success('Course published successfully!');
        navigate('/instructor/courses');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to publish course');
    } finally {
      setPublishing(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="relative mb-10">
      <ProgressBar value={((currentStep - 1) / (STEPS.length - 1)) * 100} size="sm" className="mb-6" />
      <div className="flex justify-between">
        {STEPS.map((step, idx) => {
          const StepIcon = step.icon;
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id;
          return (
            <button
              key={step.id}
              onClick={() => {
                if (step.id < currentStep) {
                  setDirection(step.id > currentStep ? 1 : -1);
                  setCurrentStep(step.id);
                }
              }}
              disabled={step.id > currentStep}
              className="flex flex-col items-center gap-1.5 group"
            >
              <div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300',
                  isCompleted &&
                    'bg-success-500 border-success-500 text-white shadow-lg shadow-success-500/30',
                  isActive &&
                    'bg-primary-500 border-primary-500 text-white shadow-lg shadow-primary-500/30 ring-4 ring-primary-500/20',
                  !isActive &&
                    !isCompleted &&
                    'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500'
                )}
              >
                {isCompleted ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <StepIcon className="w-4 h-4" />
                )}
              </div>
              <span
                className={cn(
                  'text-xs font-medium whitespace-nowrap transition-colors',
                  isActive && 'text-primary-600 dark:text-primary-400',
                  isCompleted && 'text-success-600 dark:text-success-400',
                  !isActive && !isCompleted && 'text-gray-400 dark:text-gray-600'
                )}
              >
                {step.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderStep1 = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="md:col-span-2">
        <Input
          label="Course Title *"
          placeholder="e.g. Complete React Development Bootcamp"
           {...register('title')}
          error={errors.title?.message}
          value={formData.step1.title}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateStep1Field('title', e.target.value)}
        />
      </div>
      <div className="md:col-span-2">
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
          <textarea
            value={formData.step1.description}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateStep1Field('description', e.target.value)}
            rows={4}
            placeholder="Describe what students will learn..."
            className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800/50 px-4 py-2.5 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 resize-none"
          />
        </div>
      </div>
      <Select
        label="Category *"
        placeholder="Select a category"
        options={[
          { value: 'web-development', label: 'Web Development' },
          { value: 'mobile-development', label: 'Mobile Development' },
          { value: 'data-science', label: 'Data Science' },
          { value: 'machine-learning', label: 'Machine Learning' },
          { value: 'devops', label: 'DevOps' },
          { value: 'cybersecurity', label: 'Cybersecurity' },
          { value: 'cloud-computing', label: 'Cloud Computing' },
          { value: 'ui-ux', label: 'UI/UX Design' },
          { value: 'game-development', label: 'Game Development' },
          { value: 'blockchain', label: 'Blockchain' },
        ]}
        value={formData.step1.category}
        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateStep1Field('category', e.target.value)}
        error={errors.category?.message}
      />
      <Select
        label="Skill Level"
        placeholder="Select skill level"
        options={SKILL_LEVELS}
        value={formData.step1.skillLevel}
        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateStep1Field('skillLevel', e.target.value)}
      />
      <Select
        label="Language"
        placeholder="Select language"
        options={LANGUAGES}
        value={formData.step1.language}
        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateStep1Field('language', e.target.value)}
      />
      <Input
        label="Subtitle"
        placeholder="A short tagline for your course"
        value={formData.step1.subtitle}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateStep1Field('subtitle', e.target.value)}
      />
      <Input
        label="School"
        placeholder="e.g. School of Engineering"
        value={formData.step1.school}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateStep1Field('school', e.target.value)}
      />
      <Input
        label="Program"
        placeholder="e.g. Full-Stack Web Development"
        value={formData.step1.program}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateStep1Field('program', e.target.value)}
      />
      <Input
        label="Course Tags"
        placeholder="react, javascript, frontend (comma-separated)"
        value={formData.step1.tags}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateStep1Field('tags', e.target.value)}
      />
    </div>
  );

  const renderMediaUpload = (
    label: string,
    accept: string,
    currentValue: string | null,
    onUpload: (file: File) => void,
    uploading: boolean,
    type: 'image' | 'video',
    onUrl?: (url: string) => void,
    onClear?: () => void
  ) => (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
      {currentValue ? (
        <div className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 group">
          {type === 'image' ? (
            <img src={currentValue} alt={label} className="w-full h-48 object-cover" />
          ) : (
            <div className="w-full h-48 bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <Video className="w-10 h-10 text-gray-400" />
            </div>
          )}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
            <button
              onClick={() => onClear?.()}
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center w-full h-48 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/30 cursor-pointer hover:border-primary-400 hover:bg-primary-50/50 dark:hover:bg-primary-950/20 transition-all">
          <div className="flex flex-col items-center gap-2 text-gray-400">
            {uploading ? (
              <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            ) : (
              <>
                <Upload className="w-8 h-8" />
                <span className="text-sm font-medium">Click to upload</span>
                <span className="text-xs text-gray-400">PNG, JPG, GIF up to 10MB</span>
              </>
            )}
          </div>
          <input
            type="file"
            accept={accept}
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUpload(file);
              e.target.value = '';
            }}
          />
        </label>
      )}
      {onUrl && (
        <input
          type="url"
          placeholder="…or paste an image URL (https://…)"
          className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm"
          onChange={(e) => { if (e.target.value.trim()) onUrl(e.target.value.trim()); }}
        />
      )}
    </div>
  );

  const renderStep2 = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {renderMediaUpload(
        'Course Thumbnail *',
        'image/*',
        formData.media.thumbnail,
        (file) => handleImageUpload(file, 'thumbnail'),
        uploadingThumbnail,
        'image',
        (url) => setFormData((prev) => ({ ...prev, media: { ...prev.media, thumbnail: url } })),
        () => setFormData((prev) => ({ ...prev, media: { ...prev.media, thumbnail: null } }))
      )}
      {renderMediaUpload(
        'Banner Image',
        'image/*',
        formData.media.bannerImage,
        (file) => handleImageUpload(file, 'banner'),
        uploadingBanner,
        'image',
        (url) => setFormData((prev) => ({ ...prev, media: { ...prev.media, bannerImage: url } })),
        () => setFormData((prev) => ({ ...prev, media: { ...prev.media, bannerImage: null } }))
      )}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Promo Video URL</label>
        <Input
          placeholder="https://www.youtube.com/watch?v=..."
          value={formData.media.promoVideo}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData((prev) => ({ ...prev, media: { ...prev.media, promoVideo: e.target.value } }))}
          icon={<Video className="w-4 h-4" />}
        />
        <div className="flex items-center gap-2">
          <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs cursor-pointer">
            {uploadingPromo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />} Upload video
            <input type="file" accept="video/*" className="hidden" disabled={uploadingPromo} onChange={(e) => { const f = e.target.files?.[0]; if (f) void handlePromoUpload(f); e.target.value = ''; }} />
          </label>
          {formData.media.promoVideo && <button type="button" onClick={() => setFormData((prev) => ({ ...prev, media: { ...prev.media, promoVideo: '' } }))} className="text-xs text-red-400">Remove</button>}
        </div>
        <p className="text-xs text-gray-400">Paste a YouTube/Vimeo URL or upload an MP4/WebM file.</p>
      </div>
      <div className="space-y-2 sm:col-span-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Course rules & expectations</label>
        <textarea
          rows={4}
          value={rules}
          onChange={(e) => setRules(e.target.value)}
          placeholder="e.g. Complete lessons in order, submit assignments before the deadline, be respectful in discussions…"
          className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm"
        />
        <p className="text-xs text-gray-400">Shown to students on the course page.</p>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Curriculum</h3>
          <p className="text-sm text-gray-500">{formData.sections.length} sections &middot; {totalLessons} lessons</p>
        </div>
        <Button variant="outline" size="sm" onClick={addSection} icon={<Plus className="w-4 h-4" />}>
          Add Section
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={formData.sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <AnimatePresence>
            {formData.sections.map((section) => (
              <motion.div
                key={section.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.2 }}
              >
                <SortableSection
                  section={section}
                  onUpdateTitle={updateSectionTitle}
                  onAddLesson={addLessonToSection}
                  onUpdateLesson={updateLessonTitle}
                  onDuplicateLesson={duplicateLesson}
                  onDeleteLesson={deleteLesson}
                  onDeleteSection={deleteSection}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </SortableContext>

        <DragOverlay>
          {activeDragId ? (
            <div className="rounded-2xl border-2 border-primary-500/50 bg-white dark:bg-gray-800 shadow-2xl p-4 opacity-90">
              <div className="flex items-center gap-3">
                <GripVertical className="w-4 h-4 text-primary-500" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {formData.sections.find((s) => s.id === activeDragId)?.title || 'Lesson'}
                </span>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {formData.sections.length === 0 && (
        <div className="text-center py-16">
          <ListOrdered className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <p className="text-gray-500 dark:text-gray-400 mb-4">No sections yet. Start building your curriculum!</p>
          <Button variant="outline" onClick={addSection} icon={<Plus className="w-4 h-4" />}>
            Add First Section
          </Button>
        </div>
      )}
    </div>
  );

  const renderStep4 = () => {
    const pricingOptions = [
      {
        value: 'free' as const,
        label: 'Free',
        description: 'Offer this course for free to all students',
        badge: 'Free',
        badgeVariant: 'success' as const,
      },
      {
        value: 'paid' as const,
        label: 'Paid',
        description: 'Set a one-time purchase price for your course',
        badge: 'Premium',
        badgeVariant: 'primary' as const,
      },
      {
        value: 'scholarship' as const,
        label: 'Scholarship Access',
        description: 'Available only to students with scholarship grants',
        badge: 'Scholarship',
        badgeVariant: 'warning' as const,
      },
      {
        value: 'subscription' as const,
        label: 'Subscription Access',
        description: 'Included in the platform subscription plan',
        badge: 'Subscription',
        badgeVariant: 'neon' as const,
      },
    ];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {pricingOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFormData((prev) => ({ ...prev, pricing: opt.value, price: opt.value !== 'paid' ? '' : prev.price }))}
              className={cn(
                'relative text-left p-5 rounded-2xl border-2 transition-all duration-200',
                formData.pricing === opt.value
                  ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-950/30 shadow-lg shadow-primary-500/10'
                  : 'border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-900/50 hover:border-gray-300 dark:hover:border-gray-600'
              )}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">{opt.label}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{opt.description}</p>
                </div>
                <Badge variant={opt.badgeVariant} size="sm">{opt.badge}</Badge>
              </div>

              {formData.pricing === opt.value && (
                <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}

              {opt.value === 'paid' && formData.pricing === 'paid' && (
                <div className="mt-4">
                  <Input
                    label="Course Price ($)"
                    type="number"
                    placeholder="49.99"
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData((prev) => ({ ...prev, price: e.target.value }))}
                  />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderStep5 = () => (
    <div className="space-y-8">
      <div className="text-center">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Almost there!</h3>
        <p className="text-gray-500">Review the checklist below before publishing your course.</p>
      </div>

      <GlassCard className="p-6 space-y-4">
        {checklist.map((item, idx) => (
          <motion.div
            key={item.key}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="flex items-center gap-3"
          >
            {item.done ? (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20, delay: idx * 0.15 }}
              >
                <CheckCircle2 className="w-6 h-6 text-success-500" />
              </motion.div>
            ) : (
              <Circle className="w-6 h-6 text-gray-300 dark:text-gray-600" />
            )}
            <span
              className={cn(
                'text-sm font-medium',
                item.done
                  ? 'text-gray-900 dark:text-gray-100'
                  : 'text-gray-400 dark:text-gray-500'
              )}
            >
              {item.label}
            </span>
          </motion.div>
        ))}
      </GlassCard>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
        <Button
          variant="primary"
          size="lg"
          className="flex-1"
          disabled={!allChecked}
          loading={publishing}
          onClick={handlePublish}
          icon={<Send className="w-5 h-5" />}
        >
          Publish Course
        </Button>
        <Button
          variant="secondary"
          size="lg"
          className="flex-1"
          loading={saving}
          onClick={handleSaveDraft}
          icon={<Save className="w-5 h-5" />}
        >
          Save as Draft
        </Button>
      </div>

      {!allChecked && (
        <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 rounded-xl">
          <AlertCircle className="w-4 h-4 shrink-0" />
          Complete all checklist items to publish your course
        </div>
      )}
    </div>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      case 5: return renderStep5();
      default: return null;
    }
  };

  return (
    <>
      <SEO title="Create Course" />
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Create New Course</h1>
          <p className="text-gray-500 mt-1">Fill in the details to build your course</p>
        </div>

        {renderStepIndicator()}

        <div className="relative overflow-hidden">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentStep}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              <GlassCard className="p-6 sm:p-8">
                {renderStepContent()}
              </GlassCard>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-between mt-8">
          <Button
            variant="secondary"
            onClick={goBack}
            disabled={currentStep === 1}
            icon={<ChevronLeft className="w-4 h-4" />}
          >
            Back
          </Button>
          <span className="text-sm text-gray-400 font-medium">
            Step {currentStep} of {STEPS.length}
          </span>
          {currentStep < 5 ? (
            <Button variant="primary" onClick={goNext} icon={<ChevronRight className="w-4 h-4" />}>
              Next
            </Button>
          ) : (
            <div />
          )}
        </div>
      </motion.div>
    </>
  );
}
