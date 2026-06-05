import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Save, Plus, Trash2, GripVertical, ChevronLeft, FileText, Video, HelpCircle } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';

export default function CourseEditor() {
  const { slug } = useParams();
  const isNew = slug === 'new';
  const [title, setTitle] = useState(isNew ? '' : 'Full-Stack Web Development');
  const [description, setDescription] = useState(isNew ? '' : 'Master React, Node.js, and MongoDB to build complete web applications.');
  const [price, setPrice] = useState(isNew ? '' : '2499');
  const [category, setCategory] = useState('Web Development');
  const [level, setLevel] = useState('Beginner');

  const [modules, setModules] = useState([
    { title: 'Introduction to Web Development', lessons: ['Introduction & Setup', 'How the Web Works', 'Setting Up Your Environment'] },
    { title: 'HTML5 Fundamentals', lessons: ['Semantic HTML', 'Forms & Validation', 'SEO Best Practices'] },
  ]);

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
        <Button icon={<Save className="w-4 h-4" />}>{isNew ? 'Create Course' : 'Save Changes'}</Button>
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
                <Input label="Price ($)" type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="2499" />
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800/50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50">
                    <option>Web Development</option>
                    <option>Data Science</option>
                    <option>Mobile Development</option>
                    <option>DevOps</option>
                    <option>Design</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Level</label>
                  <select value={level} onChange={(e) => setLevel(e.target.value)} className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800/50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50">
                    <option>Beginner</option>
                    <option>Intermediate</option>
                    <option>Advanced</option>
                  </select>
                </div>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Curriculum</h2>
              <Button variant="outline" size="sm" icon={<Plus className="w-4 h-4" />}>Add Module</Button>
            </div>
            <div className="space-y-3">
              {modules.map((module, i) => (
                <div key={i} className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
                  <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800/50">
                    <GripVertical className="w-4 h-4 text-gray-400 cursor-move" />
                    <input
                      className="flex-1 bg-transparent border-none font-medium focus:outline-none text-gray-900 dark:text-white"
                      value={module.title}
                      onChange={(e) => {
                        const newModules = [...modules];
                        newModules[i].title = e.target.value;
                        setModules(newModules);
                      }}
                    />
                    <Badge variant="primary" size="sm">{module.lessons.length} lessons</Badge>
                    <button onClick={() => setModules(modules.filter((_, idx) => idx !== i))}>
                      <Trash2 className="w-4 h-4 text-red-400 hover:text-red-500" />
                    </button>
                  </div>
                  <div className="p-4 space-y-2">
                    {module.lessons.map((lesson, j) => (
                      <div key={j} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <Video className="w-4 h-4 text-gray-400" />
                        <input
                          className="flex-1 bg-transparent border-none text-sm focus:outline-none text-gray-700 dark:text-gray-300"
                          value={lesson}
                          onChange={(e) => {
                            const newModules = [...modules];
                            newModules[i].lessons[j] = e.target.value;
                            setModules(newModules);
                          }}
                        />
                        <button className="text-gray-400 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    ))}
                    <Button variant="ghost" size="sm" icon={<Plus className="w-3.5 h-3.5" />}>Add Lesson</Button>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        <div className="space-y-6">
          <GlassCard className="p-6">
            <h2 className="text-lg font-semibold mb-4">Course Image</h2>
            <div className="aspect-video rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-700 cursor-pointer hover:border-primary-500 transition-colors">
              <div className="text-center">
                <Plus className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Upload Image</p>
                <p className="text-xs text-gray-400">Recommended: 1200×600px</p>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <h2 className="text-lg font-semibold mb-4">Course Settings</h2>
            <div className="space-y-4">
              <label className="flex items-center justify-between">
                <span className="text-sm text-gray-700 dark:text-gray-300">Published</span>
                <input type="checkbox" defaultChecked className="rounded text-primary-500 focus:ring-primary-500" />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-sm text-gray-700 dark:text-gray-300">Featured course</span>
                <input type="checkbox" className="rounded text-primary-500 focus:ring-primary-500" />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-sm text-gray-700 dark:text-gray-300">Free preview</span>
                <input type="checkbox" defaultChecked className="rounded text-primary-500 focus:ring-primary-500" />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-sm text-gray-700 dark:text-gray-300">Certificate on completion</span>
                <input type="checkbox" defaultChecked className="rounded text-primary-500 focus:ring-primary-500" />
              </label>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <h2 className="text-lg font-semibold mb-4">Instructor Info</h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 gradient-bg rounded-full flex items-center justify-center text-white font-semibold">AR</div>
                <div>
                  <div className="font-medium">Dr. Alex Rivera</div>
                  <div className="text-gray-500">Senior Full-Stack Engineer</div>
                </div>
              </div>
              <Button variant="outline" size="sm" className="w-full">Change Instructor</Button>
            </div>
          </GlassCard>
        </div>
      </div>
    </motion.div>
  );
}
