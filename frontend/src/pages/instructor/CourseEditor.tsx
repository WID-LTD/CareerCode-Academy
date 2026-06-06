import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Save, Plus, Trash2, ChevronLeft, Video, Loader2 } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import api from '@/lib/axios';
import toast from 'react-hot-toast';

export default function CourseEditor() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const isNew = slug === 'new';

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [course, setCourse] = useState<any>(null);

  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('Web Development');
  const [level, setLevel] = useState('beginner');
  const [published, setPublished] = useState(false);

  // Curriculum state
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
        setPublished(c.published);

        // Fetch modules
        const modulesRes = await api.get(`/modules/course/${c.id}`);
        const rawModules = modulesRes.data.data;

        // Group lessons by module_id
        const lessons = c.lessons || [];
        const enrichedModules = rawModules.map((m: any) => ({
          ...m,
          lessons: lessons
            .filter((l: any) => l.module_id === m.id)
            .sort((a: any, b: any) => a.order_index - b.order_index),
        }));

        setModules(enrichedModules);
      } catch (err: any) {
        toast.error('Failed to load course details');
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
      const payload = {
        title,
        description,
        price: parseFloat(price) || 0,
        category,
        level,
        published,
        duration: 120, // default placeholder duration
      };

      if (isNew) {
        const { data } = await api.post('/courses', payload);
        toast.success('Course created successfully!');
        navigate(`/instructor/courses/${data.data.slug}/edit`);
      } else {
        await api.put(`/courses/${course.id}`, payload);
        toast.success('Course details updated!');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save course');
    } finally {
      setIsSaving(false);
    }
  };

  // Module actions
  const handleAddModule = async () => {
    if (!course) {
      toast.error('Please save course details first');
      return;
    }
    try {
      const moduleTitle = prompt('Enter module title:');
      if (!moduleTitle) return;

      const { data } = await api.post('/modules', {
        courseId: course.id,
        title: moduleTitle,
        orderIndex: modules.length,
      });

      setModules([...modules, { ...data.data, lessons: [] }]);
      toast.success('Module added');
    } catch (err: any) {
      toast.error('Failed to add module');
    }
  };

  const handleUpdateModule = async (moduleId: string, currentTitle: string) => {
    try {
      const newTitle = prompt('Update module title:', currentTitle);
      if (!newTitle || newTitle === currentTitle) return;

      await api.put(`/modules/${moduleId}`, { title: newTitle });
      setModules(modules.map((m) => (m.id === moduleId ? { ...m, title: newTitle } : m)));
      toast.success('Module title updated');
    } catch (err) {
      toast.error('Failed to update module');
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (!confirm('Are you sure you want to delete this module and all its lessons?')) return;
    try {
      await api.delete(`/modules/${moduleId}`);
      setModules(modules.filter((m) => m.id !== moduleId));
      toast.success('Module deleted');
    } catch (err) {
      toast.error('Failed to delete module');
    }
  };

  // Lesson actions
  const handleAddLesson = async (moduleId: string, lessonIndex: number) => {
    try {
      const lessonTitle = prompt('Enter lesson title:');
      if (!lessonTitle) return;

      const { data } = await api.post('/lessons', {
        courseId: course.id,
        moduleId: moduleId,
        title: lessonTitle,
        description: 'Learn the fundamentals of this topic.',
        duration: 15,
        orderIndex: lessonIndex,
        isFree: false,
      });

      setModules(
        modules.map((m) =>
          m.id === moduleId ? { ...m, lessons: [...m.lessons, data.data] } : m
        )
      );
      toast.success('Lesson added');
    } catch (err) {
      toast.error('Failed to add lesson');
    }
  };

  const handleUpdateLesson = async (moduleId: string, lessonId: string, currentTitle: string) => {
    try {
      const newTitle = prompt('Update lesson title:', currentTitle);
      if (!newTitle || newTitle === currentTitle) return;

      await api.put(`/lessons/${lessonId}`, { title: newTitle });
      setModules(
        modules.map((m) =>
          m.id === moduleId
            ? {
                ...m,
                lessons: m.lessons.map((l: any) =>
                  l.id === lessonId ? { ...l, title: newTitle } : l
                ),
              }
            : m
        )
      );
      toast.success('Lesson updated');
    } catch (err) {
      toast.error('Failed to update lesson');
    }
  };

  const handleDeleteLesson = async (moduleId: string, lessonId: string) => {
    if (!confirm('Are you sure you want to delete this lesson?')) return;
    try {
      await api.delete(`/lessons/${lessonId}`);
      setModules(
        modules.map((m) =>
          m.id === moduleId
            ? { ...m, lessons: m.lessons.filter((l: any) => l.id !== lessonId) }
            : m
        )
      );
      toast.success('Lesson deleted');
    } catch (err) {
      toast.error('Failed to delete lesson');
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
                      {(module.lessons || []).map((lesson: any, idx: number) => (
                        <div key={lesson.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          <Video className="w-4 h-4 text-gray-400" />
                          <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 cursor-pointer" onClick={() => handleUpdateLesson(module.id, lesson.id, lesson.title)}>
                            {lesson.title}
                          </span>
                          <button className="text-gray-400 hover:text-red-400" onClick={() => handleDeleteLesson(module.id, lesson.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
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
