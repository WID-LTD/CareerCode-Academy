import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search,
  Filter,
  Clock,
  Users,
  Star,
  ArrowRight,
  Code2,
  Database,
  Globe,
  Smartphone,
  Shield,
  Palette,
  TrendingUp,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

const allCourses = [
  { title: 'Full-Stack Web Development', slug: 'full-stack-web-development', icon: Code2, duration: '16 weeks', students: 2340, rating: 4.9, level: 'Beginner', category: 'Web Development', color: 'from-blue-500 to-cyan-500', description: 'Master React, Node.js, and MongoDB to build complete web applications.' },
  { title: 'Data Science & ML', slug: 'data-science-ml', icon: Database, duration: '20 weeks', students: 1870, rating: 4.8, level: 'Intermediate', category: 'Data Science', color: 'from-purple-500 to-pink-500', description: 'Learn Python, pandas, scikit-learn, and TensorFlow.' },
  { title: 'Mobile App Development', slug: 'mobile-app-development', icon: Smartphone, duration: '14 weeks', students: 1560, rating: 4.7, level: 'Intermediate', category: 'Mobile', color: 'from-green-500 to-emerald-500', description: 'Build cross-platform mobile apps with React Native.' },
  { title: 'Cloud & DevOps Engineering', slug: 'cloud-devops', icon: Globe, duration: '12 weeks', students: 1120, rating: 4.9, level: 'Advanced', category: 'DevOps', color: 'from-orange-500 to-red-500', description: 'Master AWS, Docker, Kubernetes, and CI/CD pipelines.' },
  { title: 'Cybersecurity Fundamentals', slug: 'cybersecurity', icon: Shield, duration: '10 weeks', students: 980, rating: 4.6, level: 'Intermediate', category: 'Security', color: 'from-red-500 to-rose-500', description: 'Learn ethical hacking, network security, and cryptography.' },
  { title: 'UI/UX Design', slug: 'ui-ux-design', icon: Palette, duration: '8 weeks', students: 1340, rating: 4.8, level: 'Beginner', category: 'Design', color: 'from-pink-500 to-rose-500', description: 'Master Figma, design systems, and user research.' },
  { title: 'AI & Machine Learning', slug: 'ai-ml', icon: TrendingUp, duration: '24 weeks', students: 2100, rating: 4.9, level: 'Advanced', category: 'AI', color: 'from-violet-500 to-purple-500', description: 'Deep learning, NLP, computer vision with PyTorch.' },
  { title: 'Backend Development', slug: 'backend-development', icon: Database, duration: '12 weeks', students: 1450, rating: 4.7, level: 'Intermediate', category: 'Web Development', color: 'from-teal-500 to-cyan-500', description: 'Node.js, Python, Go, APIs, and microservices.' },
];

const categories = ['All', 'Web Development', 'Data Science', 'Mobile', 'DevOps', 'Security', 'Design', 'AI'];

const levels = ['All Levels', 'Beginner', 'Intermediate', 'Advanced'];

export default function Courses() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [level, setLevel] = useState('All Levels');

  const filtered = allCourses.filter((c) => {
    const matchSearch = c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.description.toLowerCase().includes(search.toLowerCase());
    const matchCategory = category === 'All' || c.category === category;
    const matchLevel = level === 'All Levels' || c.level === level;
    return matchSearch && matchCategory && matchLevel;
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <section className="py-20 relative">
        <div className="absolute inset-0 gradient-bg-subtle" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              Explore Our <span className="gradient-text">Courses</span>
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Choose from industry-designed courses and start your journey toward becoming a job-ready developer.
            </p>
          </motion.div>

          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <div className="flex-1">
              <Input
                icon={<Search className="w-4 h-4" />}
                placeholder="Search courses..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-3">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
              >
                {levels.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map((course, i) => (
              <motion.div
                key={course.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link to={`/courses/${course.slug}`}>
                  <GlassCard hover className="h-full p-6 group">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${course.color} flex items-center justify-center mb-4`}>
                      <course.icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="mb-3 flex gap-2">
                      <Badge variant="primary" size="sm">{course.level}</Badge>
                      <Badge variant="default" size="sm">{course.category}</Badge>
                    </div>
                    <h3 className="text-lg font-semibold mb-2 group-hover:text-primary-500 transition-colors">{course.title}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">{course.description}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 pt-4 border-t border-gray-100 dark:border-gray-800 mt-auto">
                      <div className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{course.duration}</div>
                      <div className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{course.students}</div>
                      <div className="flex items-center gap-1"><Star className="w-3.5 h-3.5 text-yellow-500" />{course.rating}</div>
                    </div>
                  </GlassCard>
                </Link>
              </motion.div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-20">
              <p className="text-gray-500 text-lg">No courses found matching your criteria.</p>
            </div>
          )}
        </div>
      </section>
    </motion.div>
  );
}
