import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { GitBranch, BookOpen, ArrowRight, Clock, Award, Users, Loader2 } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import api from '@/lib/axios';

export default function LearningPaths() {
  const [learningPaths, setLearningPaths] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchPaths() {
      try {
        const { data } = await api.get('/learning-paths');
        setLearningPaths(data.data || []);
      } catch {
        setLearningPaths([]);
      } finally {
        setIsLoading(false);
      }
    }
    fetchPaths();
  }, []);
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold">Learning Paths</h1>
        <p className="text-gray-500 mt-1">Follow structured paths to master new skills.</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
        </div>
      ) : (
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {learningPaths.length === 0 && (
          <div className="col-span-full text-center py-20 text-gray-500">
            No learning paths available yet.
          </div>
        )}
        {learningPaths.map((path, i) => (
          <motion.div
            key={path.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Link to="#" className="block group">
              <GlassCard className="h-full p-0 overflow-hidden" hover>
                <div className={`h-2 bg-gradient-to-r ${path.color || 'from-blue-600 to-cyan-600'}`} />
                <div className="p-5">
                  <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center mb-3">
                    <GitBranch className="w-5 h-5 text-primary-500" />
                  </div>
                  <h3 className="font-semibold text-base mb-1 group-hover:text-primary-600 transition-colors">{path.title}</h3>
                  <p className="text-sm text-gray-500 mb-4 line-clamp-2">{path.description}</p>

                  <div className="flex items-center gap-3 text-xs text-gray-400 mb-4">
                    <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {path.courses_count} courses</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {Math.floor((path.total_duration || 0) / 60)}h</span>
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {path.students_count || 0}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" className="flex-1">View Path</Button>
                    <Badge className="capitalize">{path.level}</Badge>
                  </div>
                </div>
              </GlassCard>
            </Link>
          </motion.div>
        ))}
      </div>
      )}
    </motion.div>
  );
}
