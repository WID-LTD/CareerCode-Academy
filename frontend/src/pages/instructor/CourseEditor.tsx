import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, Plus, Trash2, ChevronLeft, Video, Loader2, Upload, CheckCircle, XCircle, Film, Code, Edit3, X } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import api from '@/lib/axios';
import toast from 'react-hot-toast';

export default function CourseEditor() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const isNew = !slug || slug === 'new';

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [course, setCourse] = useState<any>(null);
  const [uploadingLesson, setUploadingLesson] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('Web Development');
  const [level, setLevel] = useState('beginner');
  const [duration, setDuration] = useState('');
  const [published, setPublished] = useState(false);

  const [modules, setModules] = useState<any[]>([]);

  useEffect(() => {
    if (isNew) {
      setIsLoading(false);
      return;
    }

    async function loadCourse() {
      try {
        const courseRes = await api.get(`/courses/slug/${slug}`);
        const c = courseRes.data.data;
        setCourse(c);
        setTitle(c.title);
        setDescription(c.description);
        setPrice(c.price.toString());
        setCategory(c.category);
        setLevel(c.level);
        setDuration(c.duration?.toString() || '');
        setPublished(c.published);

        const modulesRes = await api.get(`/modules/course/${c.id}`);
        const rawModules = modulesRes.data.data;
        const lessons = c.lessons || [];
        const enrichedModules = rawModules.map((m: any) => ({
          ...m,
          lessons: lessons
            .filter((l: any) => l.module_id === m.id)
            .sort((a: any, b: any) => a.order_index - b.order_index),
        }));

        setModules(enrichedModules);
      } catch {
        toast.error('Failed to load course');
        navigate('/instructor/courses');
      } finally {
        setIsLoading(false);
      }
    }

    loadCourse();
  }, [slug, isNew, navigate]);

  const handleSaveCourse = async () => {
    setIsSaving(true);
    try {
      const payload = { title, description, price: parseFloat(price) || 0, category, level, published, duration: parseInt(duration) || 0 };

      if (isNew) {
        const { data } = await api.post('/courses', payload);
        toast.success('Course created!');
        navigate(`/instructor/courses/${data.data.slug}/edit`);
      } else {
        await api.put(`/courses/${course.id}`, payload);
        toast.success('Course saved!');
      }
    } catch {
      toast.error('Failed to save course');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddModule = async () => {
    if (!course) { toast.error('Save course details first'); return; }
    const moduleTitle = prompt('Enter module title:');
    if (!moduleTitle) return;
    try {
      const { data } = await api.post('/modules', { courseId: course.id, title: moduleTitle, orderIndex: modules.length });
      setModules([...modules, { ...data.data, lessons: [] }]);
      toast.success('Module added');
    } catch {
      toast.error('Failed to add module');
    }
  };

  const handleUpdateModule = async (moduleId: string, currentTitle: string) => {
    const newTitle = prompt('Update module title:', currentTitle);
    if (!newTitle || newTitle === currentTitle) return;
    try {
      await api.put(`/modules/${moduleId}`, { title: newTitle });
      setModules(modules.map((m) => (m.id === moduleId ? { ...m, title: newTitle } : m)));
      toast.success('Module updated');
    } catch {
      toast.error('Failed to update module');
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (!confirm('Delete this module and all its lessons?')) return;
    try {
      await api.delete(`/modules/${moduleId}`);
      setModules(modules.filter((m) => m.id !== moduleId));
      toast.success('Module deleted');
    } catch {
      toast.error('Failed to delete module');
    }
  };

  const handleAddLesson = async (moduleId: string, lessonIndex: number) => {
    const lessonTitle = prompt('Enter lesson title:');
    if (!lessonTitle) return;
    try {
      const { data } = await api.post('/lessons', {
        courseId: course.id, moduleId, title: lessonTitle,
        description: 'Learn the fundamentals of this topic.', duration: 15, orderIndex: lessonIndex, isFree: false,
      });
      setModules(modules.map((m) => m.id === moduleId ? { ...m, lessons: [...m.lessons, data.data] } : m));
      toast.success('Lesson added');
    } catch {
      toast.error('Failed to add lesson');
    }
  };

  const handleUpdateLesson = async (moduleId: string, lessonId: string, currentTitle: string) => {
    const newTitle = prompt('Update lesson title:', currentTitle);
    if (!newTitle || newTitle === currentTitle) return;
    try {
      await api.put(`/lessons/${lessonId}`, { title: newTitle });
      setModules(modules.map((m) => m.id === moduleId ? {
        ...m, lessons: m.lessons.map((l: any) => l.id === lessonId ? { ...l, title: newTitle } : l)
      } : m));
      toast.success('Lesson updated');
    } catch {
      toast.error('Failed to update lesson');
    }
  };

  const handleDeleteLesson = async (moduleId: string, lessonId: string) => {
    if (!confirm('Delete this lesson?')) return;
    try {
      await api.delete(`/lessons/${lessonId}`);
      setModules(modules.map((m) => m.id === moduleId ? {
        ...m, lessons: m.lessons.filter((l: any) => l.id !== lessonId)
      } : m));
      toast.success('Lesson deleted');
    } catch {
      toast.error('Failed to delete lesson');
    }
  };

  const handleUploadVideo = async (lessonId: string, file: File) => {
    setUploadingLesson(lessonId);
    setUploadProgress(0);
    try {
      const formData = new FormData();
      formData.append('video', file);

      const { data } = await api.post(`/videos/upload/${lessonId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const pct = progressEvent.total ? Math.round((progressEvent.loaded * 100) / progressEvent.total) : 0;
          setUploadProgress(pct);
        },
      });

      // Update local state
      setModules(modules.map((m) => ({
        ...m,
        lessons: m.lessons.map((l: any) =>
          l.id === lessonId ? { ...l, video_url: data.data.streaming_url || data.data.video_url, video_thumbnail: data.data.thumbnail } : l
        ),
      })));

      toast.success('Video uploaded!');
    } catch {
      toast.error('Failed to upload video');
    } finally {
      setUploadingLesson(null);
      setUploadProgress(0);
    }
  };

  const handleRemoveVideo = async (lessonId: string) => {
    if (!confirm('Remove video from this lesson?')) return;
    try {
      await api.delete(`/videos/${lessonId}`);
      setModules(modules.map((m) => ({
        ...m,
        lessons: m.lessons.map((l: any) => l.id === lessonId ? { ...l, video_url: null, video_thumbnail: null } : l),
      })));
      toast.success('Video removed');
    } catch {
      toast.error('Failed to remove video');
    }
  };

  // Challenge management
  const [challengesByLesson, setChallengesByLesson] = useState<Record<string, any[]>>({});
  const [challengeFormOpen, setChallengeFormOpen] = useState(false);
  const [challengeFormLessonId, setChallengeFormLessonId] = useState<string | null>(null);
  const [challengeForm, setChallengeForm] = useState({
    title: '', instructions: '', starterCode: '', expectedOutput: '', testCases: '', language: 'javascript', difficulty: 'easy',
  });
  const [editingChallengeId, setEditingChallengeId] = useState<string | null>(null);
  const [savingChallenge, setSavingChallenge] = useState(false);

  const openChallengeForm = async (lessonId: string, existing?: any) => {
    // Load existing challenges for this lesson
    try {
      const { data } = await api.get(`/challenges/lesson/${lessonId}`);
      setChallengesByLesson(prev => ({ ...prev, [lessonId]: data.data || [] }));
    } catch {}
    setChallengeFormLessonId(lessonId);
    if (existing) {
      setChallengeForm({
        title: existing.title || '',
        instructions: existing.instructions || '',
        starterCode: existing.starter_code || '',
        expectedOutput: existing.expected_output || '',
        testCases: Array.isArray(existing.test_cases) ? existing.test_cases.map((tc: any) => `${tc.input}|${tc.expected}`).join('\n') : '',
        language: existing.language || 'javascript',
        difficulty: existing.difficulty || 'easy',
      });
      setEditingChallengeId(existing.id);
    } else {
      setChallengeForm({ title: '', instructions: '', starterCode: '', expectedOutput: '', testCases: '', language: 'javascript', difficulty: 'easy' });
      setEditingChallengeId(null);
    }
    setChallengeFormOpen(true);
  };

  const handleSaveChallenge = async () => {
    if (!challengeFormLessonId || !challengeForm.title.trim()) return;
    setSavingChallenge(true);
    try {
      const testCases = challengeForm.testCases.split('\n').filter(Boolean).map(line => {
        const sep = line.includes('|') ? '|' : ',';
        const parts = line.split(sep);
        return { input: parts[0]?.trim() || '', expected: parts[1]?.trim() || '' };
      });
      const payload = {
        lessonId: challengeFormLessonId,
        title: challengeForm.title,
        instructions: challengeForm.instructions,
        starterCode: challengeForm.starterCode,
        expectedOutput: challengeForm.expectedOutput,
        testCases,
        language: challengeForm.language,
        difficulty: challengeForm.difficulty,
      };

      if (editingChallengeId) {
        await api.put(`/challenges/${editingChallengeId}`, payload);
        toast.success('Challenge updated');
      } else {
        await api.post('/challenges', payload);
        toast.success('Challenge created');
      }

      const { data } = await api.get(`/challenges/lesson/${challengeFormLessonId}`);
      setChallengesByLesson(prev => ({ ...prev, [challengeFormLessonId!]: data.data || [] }));
      setChallengeFormOpen(false);
    } catch {
      toast.error('Failed to save challenge');
    } finally {
      setSavingChallenge(false);
    }
  };

  const handleDeleteChallenge = async (challengeId: string, lessonId: string) => {
    if (!confirm('Delete this challenge permanently?')) return;
    try {
      await api.delete(`/challenges/${challengeId}`);
      const { data } = await api.get(`/challenges/lesson/${lessonId}`);
      setChallengesByLesson(prev => ({ ...prev, [lessonId]: data.data || [] }));
      toast.success('Challenge deleted');
    } catch {
      toast.error('Failed to delete challenge');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link to="/instructor/courses" className="text-gray-500 hover:text-primary-500 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{isNew ? 'Create New Course' : 'Edit Course'}</h1>
            <p className="text-sm text-gray-500">{isNew ? 'Set up your course details' : `Editing: ${title}`}</p>
          </div>
        </div>
        <Button onClick={handleSaveCourse} disabled={isSaving} icon={isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}>
          {isNew ? 'Create Course' : 'Save Changes'}
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <GlassCard className="p-6">
            <h2 className="text-lg font-semibold mb-4">Basic Information</h2>
            <div className="space-y-4">
              <Input label="Course Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Full-Stack Web Development" />
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                <textarea
                  rows={4}
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800/50 px-4 py-2.5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what students will learn..."
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <Input label="Duration (hours)" type="number" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="40" />
                <Input label="Price (₦)" type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="25000" />
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800/50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50">
                    <option value="Web Development">Web Development</option>
                    <option value="Data Science">Data Science</option>
                    <option value="Mobile Development">Mobile Development</option>
                    <option value="DevOps">DevOps</option>
                    <option value="Design">Design</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Level</label>
                  <select value={level} onChange={(e) => setLevel(e.target.value)} className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800/50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50">
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
              </div>
            </div>
          </GlassCard>

          {!isNew && (
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Curriculum</h2>
                <Button variant="outline" size="sm" onClick={handleAddModule} icon={<Plus className="w-4 h-4" />}>Add Module</Button>
              </div>
              <div className="space-y-3">
                {modules.map((module) => (
                  <div key={module.id} className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
                    <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800/50">
                      <span className="font-semibold flex-1 text-gray-900 dark:text-white cursor-pointer" onClick={() => handleUpdateModule(module.id, module.title)}>
                        {module.title}
                      </span>
                      <Badge variant="primary" size="sm">{(module.lessons || []).length} lessons</Badge>
                      <button onClick={() => handleDeleteModule(module.id)}>
                        <Trash2 className="w-4 h-4 text-red-400 hover:text-red-500" />
                      </button>
                    </div>
                    <div className="p-4 space-y-2">
                      {(module.lessons || []).map((lesson: any) => (
                        <LessonRow
                          key={lesson.id}
                          lesson={lesson}
                          uploadingLesson={uploadingLesson}
                          uploadProgress={uploadProgress}
                          challenges={challengesByLesson[lesson.id] || []}
                          onUpdate={() => handleUpdateLesson(module.id, lesson.id, lesson.title)}
                          onDelete={() => handleDeleteLesson(module.id, lesson.id)}
                          onUploadVideo={(file) => handleUploadVideo(lesson.id, file)}
                          onRemoveVideo={() => handleRemoveVideo(lesson.id)}
                          onManageChallenge={() => openChallengeForm(lesson.id)}
                        />
                      ))}
                      <Button variant="ghost" size="sm" onClick={() => handleAddLesson(module.id, (module.lessons || []).length)} icon={<Plus className="w-3.5 h-3.5" />}>Add Lesson</Button>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}
        </div>

        <div className="space-y-6">
          <GlassCard className="p-6">
            <h2 className="text-lg font-semibold mb-4">Course Settings</h2>
            <div className="space-y-4">
              <label className="flex items-center justify-between">
                <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">Published</span>
                <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} className="rounded text-primary-500 focus:ring-primary-500" />
              </label>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Challenge Form Modal */}
      <AnimatePresence>
        {challengeFormOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setChallengeFormOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Code className="w-5 h-5 text-purple-500" />
                  {editingChallengeId ? 'Edit' : 'Add'} Challenge
                </h2>
                <button onClick={() => setChallengeFormOpen(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Existing challenges */}
              {challengeFormLessonId && (challengesByLesson[challengeFormLessonId] || []).length > 0 && !editingChallengeId && (
                <div className="mb-4 space-y-1.5">
                  <p className="text-xs font-medium text-gray-500 uppercase">Existing Challenges</p>
                  {(challengesByLesson[challengeFormLessonId] || []).map((ch: any) => (
                    <div key={ch.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 text-xs">
                      <div className="flex items-center gap-2">
                        <Code className="w-3 h-3 text-purple-500" />
                        <span>{ch.title}</span>
                        <Badge className="bg-blue-500/10 text-blue-400 text-[10px]">{ch.difficulty}</Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => openChallengeForm(challengeFormLessonId!, ch)} className="text-gray-400 hover:text-blue-400">
                          <Edit3 className="w-3 h-3" />
                        </button>
                        <button onClick={() => handleDeleteChallenge(ch.id, challengeFormLessonId!)} className="text-gray-400 hover:text-red-400">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Show existing challenges for this lesson */}
              {!editingChallengeId && challengeFormLessonId && (challengesByLesson[challengeFormLessonId] || []).length > 0 && (
                <div className="mb-4">
                  <Button size="sm" variant="outline" onClick={() => {
                    setChallengeForm({ title: '', instructions: '', starterCode: '', expectedOutput: '', testCases: '', language: 'javascript', difficulty: 'easy' });
                    setEditingChallengeId(null);
                  }}>
                    <Plus className="w-3 h-3 mr-1" /> Add Another
                  </Button>
                </div>
              )}

              <div className="space-y-3">
                <Input label="Title" value={challengeForm.title} onChange={(e) => setChallengeForm({ ...challengeForm, title: e.target.value })} placeholder="e.g. Reverse a String" />
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Instructions</label>
                  <textarea value={challengeForm.instructions} onChange={(e) => setChallengeForm({ ...challengeForm, instructions: e.target.value })} rows={3} className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800/50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500/50" placeholder="Write the instructions the student will see..." />
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Starter Code</label>
                  <textarea value={challengeForm.starterCode} onChange={(e) => setChallengeForm({ ...challengeForm, starterCode: e.target.value })} rows={4} className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800/50 px-4 py-2.5 text-sm font-mono outline-none focus:ring-2 focus:ring-primary-500/50" placeholder="// Initial code" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Expected Output" value={challengeForm.expectedOutput} onChange={(e) => setChallengeForm({ ...challengeForm, expectedOutput: e.target.value })} placeholder="Hello, World!" />
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Language</label>
                    <select value={challengeForm.language} onChange={(e) => setChallengeForm({ ...challengeForm, language: e.target.value })} className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800/50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500/50">
                      {['javascript', 'python', 'java', 'cpp', 'go', 'rust', 'typescript', 'ruby', 'php'].map(l => (
                        <option key={l} value={l}>{l}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Difficulty</label>
                    <select value={challengeForm.difficulty} onChange={(e) => setChallengeForm({ ...challengeForm, difficulty: e.target.value })} className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800/50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500/50">
                      {['easy', 'medium', 'hard'].map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Test Cases</label>
                    <textarea value={challengeForm.testCases} onChange={(e) => setChallengeForm({ ...challengeForm, testCases: e.target.value })} rows={2} className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800/50 px-4 py-2.5 text-sm font-mono outline-none focus:ring-2 focus:ring-primary-500/50" placeholder="input|expected" />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setChallengeFormOpen(false)}>Cancel</Button>
                <Button onClick={handleSaveChallenge} disabled={savingChallenge || !challengeForm.title.trim()}>
                  {savingChallenge ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                  {editingChallengeId ? 'Update' : 'Create'} Challenge
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function LessonRow({
  lesson, uploadingLesson, uploadProgress, challenges,
  onUpdate, onDelete, onUploadVideo, onRemoveVideo, onManageChallenge,
}: {
  lesson: any;
  uploadingLesson: string | null;
  uploadProgress: number;
  challenges: any[];
  onUpdate: () => void;
  onDelete: () => void;
  onUploadVideo: (file: File) => void;
  onRemoveVideo: () => void;
  onManageChallenge: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isUploading = uploadingLesson === lesson.id;
  const hasVideo = !!lesson.video_url;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 100 * 1024 * 1024) {
        toast.error('Video must be under 100MB');
        return;
      }
      if (!file.type.startsWith('video/')) {
        toast.error('Only video files are allowed');
        return;
      }
      onUploadVideo(file);
    }
    e.target.value = '';
  };

  return (
    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 group">
      {hasVideo ? (
        <Film className="w-4 h-4 text-emerald-400 shrink-0" />
      ) : (
        <Video className="w-4 h-4 text-gray-400 shrink-0" />
      )}
      <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 cursor-pointer truncate" onClick={onUpdate}>
        {lesson.title}
      </span>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={onManageChallenge}
          className="text-gray-400 hover:text-purple-400 transition-colors relative"
          title="Manage challenge"
        >
          <Code className="w-3.5 h-3.5" />
          {challenges.length > 0 && (
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-purple-500" />
          )}
        </button>
        {hasVideo && (
          <button
            onClick={onRemoveVideo}
            className="text-gray-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Remove video"
          >
            <XCircle className="w-3.5 h-3.5" />
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={handleFileChange}
        />
        {isUploading ? (
          <div className="flex items-center gap-1.5 text-xs text-blue-400">
            <Loader2 className="w-3 h-3 animate-spin" />
            {uploadProgress}%
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            className={`text-gray-400 hover:text-blue-400 transition-colors ${hasVideo ? 'opacity-0 group-hover:opacity-100' : ''}`}
            title="Upload video"
          >
            <Upload className="w-3.5 h-3.5" />
          </button>
        )}
        <button className="text-gray-400 hover:text-red-400" onClick={onDelete}>
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
