import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Star, Clock, Users, BookOpen } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useStudentStore } from '@/store/studentStore';
import { optimizeImageUrl } from '@/lib/cloudinary';

const difficultyColors: Record<string, string> = {
  beginner: 'bg-success-500/10 text-success-500 border-success-500/20',
  intermediate: 'bg-warning-500/10 text-warning-500 border-warning-500/20',
  advanced: 'bg-danger-500/10 text-danger-500 border-danger-500/20',
};

export function RecommendedCourses() {
  const carouselRef = useRef<HTMLDivElement>(null);
  const { recommendedCourses } = useStudentStore();

  if (recommendedCourses.length === 0) return null;

  const scroll = (dir: 'left' | 'right') => {
    if (!carouselRef.current) return;
    const amount = dir === 'left' ? -320 : 320;
    carouselRef.current.scrollBy({ left: amount, behavior: 'smooth' });
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">Recommended for You</h2>
          <p className="text-xs text-gray-500 mt-0.5">Personalized based on your learning history</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => scroll('left')}
            className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div
        ref={carouselRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 snap-x snap-mandatory"
        role="list"
        aria-label="Recommended courses"
      >
        {recommendedCourses.map((course, i) => (
          <motion.div
            key={course.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex-shrink-0 w-[280px] snap-start"
            role="listitem"
          >
            <GlassCard className="h-full p-0 overflow-hidden" hover>
              <Link to={`/courses/${course.slug}`} className="block">
                <div className="aspect-video bg-gradient-to-br from-primary-600/20 to-accent-600/20 flex items-center justify-center relative">
                  {course.thumbnail ? (
                    <img src={optimizeImageUrl(course.thumbnail, 400, 225)} alt={course.title} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <BookOpen className="w-10 h-10 text-gray-400" />
                  )}
                  <Badge className={`absolute top-2 right-2 capitalize border ${difficultyColors[course.difficulty] || 'bg-gray-500/10 text-gray-500'}`}>
                    {course.difficulty}
                  </Badge>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-sm leading-tight line-clamp-2 mb-1 group-hover:text-primary-600 transition-colors">
                    {course.title}
                  </h3>
                  <p className="text-xs text-gray-500 mb-3">{course.instructor_name}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {Math.floor(course.duration / 60)}h
                    </span>
                    <span className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-yellow-500" />
                      {course.rating}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {course.studentCount}
                    </span>
                  </div>
                  <Button size="sm" className="w-full">Enroll Now</Button>
                </div>
              </Link>
            </GlassCard>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
