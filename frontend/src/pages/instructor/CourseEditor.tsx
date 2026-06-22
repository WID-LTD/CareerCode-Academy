import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Save, Plus, Trash2, ChevronLeft, Video, Loader2, Upload, CheckCircle, XCircle, Film } from 'lucide-react';
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
                          onUpdate={() => handleUpdateLesson(module.id, lesson.id, lesson.title)}
                          onDelete={() => handleDeleteLesson(module.id, lesson.id)}
                          onUploadVideo={(file) => handleUploadVideo(lesson.id, file)}
                          onRemoveVideo={() => handleRemoveVideo(lesson.id)}
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
    </motion.div>
  );
}

function LessonRow({
  lesson, uploadingLesson, uploadProgress,
  onUpdate, onDelete, onUploadVideo, onRemoveVideo,
}: {
  lesson: any;
  uploadingLesson: string | null;
  uploadProgress: number;
  onUpdate: () => void;
  onDelete: () => void;
  onUploadVideo: (file: File) => void;
  onRemoveVideo: () => void;
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
