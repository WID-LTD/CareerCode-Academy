import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Clock, Play, Star, Users, ArrowRight } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

const enrolledCourses = [
  { title: 'Full-Stack Web Development', progress: 75, instructor: 'Dr. Alex Rivera', lessons: 48, completed: 36, duration: '16 weeks', rating: 4.9, color: 'from-blue-500 to-cyan-500', slug: 'full-stack-web-development', lastAccessed: '2 hours ago' },
  { title: 'Data Science & ML', progress: 45, instructor: 'Maya Patel', lessons: 60, completed: 27, duration: '20 weeks', rating: 4.8, color: 'from-purple-500 to-pink-500', slug: 'data-science-ml', lastAccessed: '1 day ago' },
  { title: 'UI/UX Design', progress: 20, instructor: 'David Kim', lessons: 32, completed: 6, duration: '8 weeks', rating: 4.8, color: 'from-pink-500 to-rose-500', slug: 'ui-ux-design', lastAccessed: '3 days ago' },
  { title: 'Cloud & DevOps', progress: 10, instructor: 'Sarah Mitchell', lessons: 40, completed: 4, duration: '12 weeks', rating: 4.9, color: 'from-orange-500 to-red-500', slug: 'cloud-devops', lastAccessed: '1 week ago' },
];

export default function MyCourses() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">My Courses</h1>
          <p className="text-gray-500">You are enrolled in {enrolledCourses.length} courses.</p>
        </div>
        <Link to="/courses"><Button variant="outline" icon={<BookOpen className="w-4 h-4" />}>Browse Courses</Button></Link>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {enrolledCourses.map((course, i) => (
          <motion.div
            key={course.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <GlassCard hover className="p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${course.color} flex items-center justify-center flex-shrink-0`}>
                  <BookOpen className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold mb-1">{course.title}</h3>
                  <p className="text-sm text-gray-500">{course.instructor}</p>
                </div>
                <Badge variant="primary" size="sm">{course.progress}%</Badge>
              </div>

              <div className="mb-4">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                  <span>Progress</span>
                  <span>{course.completed}/{course.lessons} lessons</span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full gradient-bg rounded-full transition-all duration-500" style={{ width: `${course.progress}%` }} />
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                <div className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {course.duration}</div>
                <div className="flex items-center gap-1"><Star className="w-3.5 h-3.5 text-yellow-500" /> {course.rating}</div>
                <div className="text-gray-400">Last: {course.lastAccessed}</div>
              </div>

              <Link to={`/student/courses/${course.slug}`}>
                <Button className="w-full" icon={<Play className="w-4 h-4" />}>
                  Continue Learning
                </Button>
              </Link>
            </GlassCard>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
