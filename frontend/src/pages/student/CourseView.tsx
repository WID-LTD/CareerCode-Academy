import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Play, CheckCircle, Circle, FileText, Download,
  ChevronLeft, ChevronRight, Maximize2, BookOpen,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

const lessons = [
  { id: 1, title: 'Introduction to the Course', duration: '10:30', completed: true, type: 'video' },
  { id: 2, title: 'Setting Up Your Development Environment', duration: '15:45', completed: true, type: 'video' },
  { id: 3, title: 'HTML5 Semantic Markup Deep Dive', duration: '22:15', completed: true, type: 'video' },
  { id: 4, title: 'CSS3 Modern Layouts with Flexbox & Grid', duration: '28:00', completed: false, type: 'video' },
  { id: 5, title: 'Responsive Design Principles', duration: '18:30', completed: false, type: 'video' },
  { id: 6, title: 'CSS Exercise: Build a Landing Page', duration: '30:00', completed: false, type: 'exercise' },
  { id: 7, title: 'JavaScript Fundamentals - Variables & Types', duration: '25:00', completed: false, type: 'video' },
  { id: 8, title: 'Functions & Scope in JavaScript', duration: '20:15', completed: false, type: 'video' },
  { id: 9, title: 'Assignment 1: Personal Portfolio Page', duration: '2:00:00', completed: false, type: 'assignment' },
  { id: 10, title: 'Quiz: HTML/CSS Fundamentals', duration: '15:00', completed: false, type: 'quiz' },
];

const resources = [
  { name: 'Course Slides - Module 1', type: 'PDF', size: '2.4 MB' },
  { name: 'Starter Code Bundle', type: 'ZIP', size: '5.1 MB' },
  { name: 'Cheatsheet: CSS Grid', type: 'PDF', size: '0.8 MB' },
  { name: 'Reference: HTML5 Tags', type: 'PDF', size: '1.2 MB' },
];

export default function CourseView() {
  const { slug } = useParams();
  const [currentLesson, setCurrentLesson] = useState(3);
  const completedCount = lessons.filter(l => l.completed).length;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex items-center gap-4 mb-6">
        <Link to="/student/courses" className="text-sm text-gray-500 hover:text-primary-500 transition-colors">
          <ChevronLeft className="w-4 h-4 inline" /> Back to Courses
        </Link>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <GlassCard className="overflow-hidden p-0">
            <div className="aspect-video bg-gray-900 relative flex items-center justify-center group cursor-pointer">
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="w-20 h-20 rounded-full bg-primary-500/90 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Play className="w-8 h-8 text-white ml-1" />
              </div>
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-white text-sm">
                <span className="flex items-center gap-2"><Play className="w-4 h-4" /> {lessons[currentLesson].title}</span>
                <span>{lessons[currentLesson].duration}</span>
              </div>
            </div>
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" icon={<ChevronLeft className="w-4 h-4" />}>Previous</Button>
                <Button variant="ghost" size="sm" icon={<ChevronRight className="w-4 h-4" />}>Next</Button>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" icon={<Download className="w-4 h-4" />}>Download</Button>
                <Button variant="ghost" size="sm" icon={<Maximize2 className="w-4 h-4" />} />
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <h2 className="text-xl font-semibold mb-2">{lessons[currentLesson].title}</h2>
            <div className="flex items-center gap-3 text-sm text-gray-500 mb-6">
              <Badge variant="primary" size="sm">Module 1: Introduction</Badge>
              <span>{lessons[currentLesson].duration}</span>
            </div>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              In this lesson, we'll dive deep into modern CSS layout techniques. You'll learn how to use
              Flexbox and CSS Grid to create complex, responsive layouts with ease. We'll cover
              alignment, distribution, and responsive design patterns that will make your layouts
              shine across all devices.
            </p>
          </GlassCard>

          <GlassCard className="p-6">
            <h3 className="font-semibold mb-4">Resources</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              {resources.map((resource) => (
                <div key={resource.name} className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer">
                  <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-primary-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{resource.name}</div>
                    <div className="text-xs text-gray-500">{resource.type} · {resource.size}</div>
                  </div>
                  <Download className="w-4 h-4 text-gray-400 flex-shrink-0" />
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        <div className="space-y-6">
          <GlassCard className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Course Content</h3>
              <span className="text-sm text-gray-500">{completedCount}/{lessons.length}</span>
            </div>
            <div className="h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full mb-4 overflow-hidden">
              <div className="h-full gradient-bg rounded-full" style={{ width: `${(completedCount / lessons.length) * 100}%` }} />
            </div>
            <div className="space-y-1 max-h-[500px] overflow-y-auto scrollbar-thin pr-1">
              {lessons.map((lesson) => (
                <button
                  key={lesson.id}
                  onClick={() => setCurrentLesson(lesson.id - 1)}
                  className={cn(
                    'w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-colors',
                    currentLesson === lesson.id - 1
                      ? 'bg-primary-500/10 text-primary-600 dark:text-primary-400'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800/50 text-gray-700 dark:text-gray-300'
                  )}
                >
                  {lesson.completed ? (
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  ) : (
                    <Circle className={cn('w-4 h-4 flex-shrink-0', currentLesson === lesson.id - 1 ? 'text-primary-500' : 'text-gray-300 dark:text-gray-600')} />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{lesson.title}</div>
                    <div className="text-xs text-gray-400">{lesson.duration}</div>
                  </div>
                  <div className="flex-shrink-0">
                    {lesson.type === 'video' && <Play className="w-3 h-3 text-gray-400" />}
                    {lesson.type === 'exercise' && <FileText className="w-3 h-3 text-gray-400" />}
                    {lesson.type === 'assignment' && <BookOpen className="w-3 h-3 text-gray-400" />}
                    {lesson.type === 'quiz' && <FileText className="w-3 h-3 text-gray-400" />}
                  </div>
                </button>
              ))}
            </div>
          </GlassCard>
        </div>
      </div>
    </motion.div>
  );
}
