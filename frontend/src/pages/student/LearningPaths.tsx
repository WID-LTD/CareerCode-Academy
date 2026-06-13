import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { GitBranch, BookOpen, ArrowRight, Clock, Award, Users } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

const learningPaths = [
  {
    id: '1',
    title: 'Full-Stack Web Development',
    description: 'Master modern web development from frontend to backend.',
    courses: 8,
    duration: 4800,
    students: 2341,
    level: 'Intermediate',
    progress: 35,
    color: 'from-blue-600 to-cyan-600',
  },
  {
    id: '2',
    title: 'Data Science & Machine Learning',
    description: 'Learn data analysis, statistics, and ML algorithms.',
    courses: 6,
    duration: 5400,
    students: 1856,
    level: 'Beginner',
    progress: 0,
    color: 'from-purple-600 to-pink-600',
  },
  {
    id: '3',
    title: 'Cloud Architecture & DevOps',
    description: 'Build and deploy scalable cloud infrastructure.',
    courses: 5,
    duration: 3600,
    students: 1243,
    level: 'Advanced',
    progress: 12,
    color: 'from-orange-600 to-red-600',
  },
  {
    id: '4',
    title: 'Mobile App Development',
    description: 'Create cross-platform mobile applications with React Native.',
    courses: 4,
    duration: 3000,
    students: 987,
    level: 'Intermediate',
    progress: 0,
    color: 'from-green-600 to-emerald-600',
  },
  {
    id: '5',
    title: 'Cybersecurity Fundamentals',
    description: 'Understand security principles, threats, and defense strategies.',
    courses: 6,
    duration: 4200,
    students: 1567,
    level: 'Beginner',
    progress: 0,
    color: 'from-red-600 to-rose-600',
  },
];

export default function LearningPaths() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold">Learning Paths</h1>
        <p className="text-gray-500 mt-1">Follow structured paths to master new skills.</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {learningPaths.map((path, i) => (
          <motion.div
            key={path.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Link to="#" className="block group">
              <GlassCard className="h-full p-0 overflow-hidden" hover>
                <div className={`h-2 bg-gradient-to-r ${path.color}`} />
                <div className="p-5">
                  <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center mb-3">
                    <GitBranch className="w-5 h-5 text-primary-500" />
                  </div>
                  <h3 className="font-semibold text-base mb-1 group-hover:text-primary-600 transition-colors">{path.title}</h3>
                  <p className="text-sm text-gray-500 mb-4 line-clamp-2">{path.description}</p>

                  {path.progress > 0 && (
                    <div className="mb-4">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-500">Progress</span>
                        <span className="font-medium">{path.progress}%</span>
                      </div>
                      <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-primary-500 to-accent-500 transition-all duration-700"
                          style={{ width: `${path.progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3 text-xs text-gray-400 mb-4">
                    <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {path.courses} courses</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {Math.floor(path.duration / 60)}h</span>
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {path.students}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {path.progress > 0 ? (
                      <Button size="sm" className="flex-1">Continue <ArrowRight className="w-3 h-3 ml-1" /></Button>
                    ) : (
                      <Button size="sm" variant="outline" className="flex-1">View Path</Button>
                    )}
                    <Badge className="capitalize">{path.level}</Badge>
                  </div>
                </div>
              </GlassCard>
            </Link>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
