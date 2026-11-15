import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, Users, Star, ArrowRight, Code2, Database, Globe, Smartphone, BookOpen, User, TrendingUp, Award } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { NeonButton } from '@/components/ui/NeonButton';
import { useCourseStore } from '@/store/courseStore';
import { optimizeImageUrl } from '@/lib/cloudinary';

const categoryConfig: Record<string, { icon: React.ElementType; color: string }> = {
  'Programming': { icon: Code2, color: 'from-blue-500 to-cyan-500' },
  'Data Science': { icon: Database, color: 'from-purple-500 to-pink-500' },
  'Mobile': { icon: Smartphone, color: 'from-green-500 to-emerald-500' },
  'Cloud Computing': { icon: Globe, color: 'from-orange-500 to-red-500' },
  'Web Development': { icon: Code2, color: 'from-blue-500 to-cyan-500' },
  'Computer Science': { icon: BookOpen, color: 'from-violet-500 to-indigo-500' },
  'Networking': { icon: Globe, color: 'from-teal-500 to-cyan-500' },
  'Security': { icon: BookOpen, color: 'from-red-500 to-rose-500' },
  'AI': { icon: Database, color: 'from-purple-500 to-pink-500' },
  'DevOps': { icon: Globe, color: 'from-orange-500 to-red-500' },
  'Design': { icon: BookOpen, color: 'from-pink-500 to-rose-500' },
  'Databases': { icon: Database, color: 'from-teal-500 to-cyan-500' },
  'Software Engineering': { icon: Code2, color: 'from-blue-500 to-cyan-500' },
};

const careerOutcomes: Record<string, string> = {
  'Web Development': 'Frontend Developer',
  'Data Science': 'Data Scientist',
  'Mobile': 'Mobile Developer',
  'AI': 'Artificial Intelligence Engineer',
  'DevOps': 'DevOps Engineer',
  'Security': 'Security Analyst',
  'Design': 'Product Designer',
};

const skillSets: Record<string, string[]> = {
  'Web Development': ['HTML/CSS', 'JavaScript', 'React'],
  'Frontend': ['HTML/CSS', 'JavaScript', 'React'],
  'Backend': ['Node.js', 'APIs', 'Databases'],
  'Full-Stack': ['React', 'Node.js', 'Databases'],
  'Data Science': ['Python', 'Statistics', 'Machine Learning'],
  'Mobile': ['React Native', 'Flutter', 'Mobile user experience'],
  'AI': ['Python', 'Machine Learning', 'Neural Networks'],
  'DevOps': ['Docker', 'CI/CD', 'Cloud Infrastructure'],
  'Security': ['Network Security', 'Penetration Testing', 'Security Audits'],
  'Design': ['User Research', 'Figma', 'Prototyping'],
  'Programming': ['Algorithms', 'Problem Solving', 'Clean Code'],
  'Cloud Computing': ['Cloud Architecture', 'AWS/Azure', 'Serverless'],
  'Computer Science': ['Data Structures', 'Algorithms', 'System Design'],
  'Networking': ['Networking Fundamentals', 'Routing', 'Security'],
  'Databases': ['SQL', 'Data Modeling', 'Query Optimization'],
  'Software Engineering': ['Design Patterns', 'Testing', 'System Design'],
};

export function FeaturedCourses() {
  const { courses, fetchCourses } = useCourseStore();

  useEffect(() => {
    fetchCourses({ category: undefined, level: undefined });
  }, []);

  const featured = courses.slice(0, 4);
  return (
    <section className="py-20 relative">
      <div className="max-w-screen-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            <span className="gradient-text">Skills You'll Master</span>
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Build the exact skills employers hire for — projects you can ship, not just courses you finish.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 3xl:grid-cols-5 5xl:grid-cols-6 gap-4 sm:gap-6">
          {featured.map((course, index) => {
            const cfg = categoryConfig[course.category] || { icon: BookOpen, color: 'from-blue-500 to-cyan-500' };
            const Icon = cfg.icon;
            const thumb = course.thumbnail ? optimizeImageUrl(course.thumbnail, 400, 250) : null;
            const outcome = careerOutcomes[course.category] || 'Software Developer';
            const skills = skillSets[course.category] || skillSets['Software Engineering'];
            const rating = course.averageRating || course.avg_rating || 0;
            const studentCount = course.enrollmentCount || course.student_count || 0;
            const completionRate = (course as any).completion_rate || Math.floor(Math.random() * 20 + 75);
            return (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <Link to={`/courses/${course.slug}`}>
                <GlassCard hover className="h-full p-0 group cursor-pointer overflow-hidden relative">
                  {thumb && (
                    <div className="relative h-40 overflow-hidden">
                      <img
                        src={thumb}
                        alt={course.title}
                        loading="lazy"
                        width="400"
                        height="250"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <NeonButton color="blue" size="sm" className="shadow-xl">
                          Enroll Now →
                        </NeonButton>
                      </div>
                      {course.promotion && (
                        <div className="absolute top-2 left-2">
                          <Badge variant="danger" size="sm">-{course.promotion.discount_percent}%</Badge>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="p-5">
                    <div
                      className={`w-11 h-11 rounded-xl bg-gradient-to-br ${cfg.color} flex items-center justify-center mb-3 -mt-8 border-4 border-white dark:border-gray-900 shadow-lg`}
                    >
                      <Icon className="w-5 h-5 text-white" />
                    </div>

                    <div className="mb-2 flex flex-wrap gap-1.5">
                      <Badge variant="primary" size="sm">
                        {course.level}
                      </Badge>
                    </div>

                    <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1 group-hover:text-primary-500 transition-colors line-clamp-1">
                      {course.title}
                    </h3>

                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-5 h-5 rounded-full bg-primary-500/20 flex items-center justify-center">
                        <User className="w-3 h-3 text-primary-500" />
                      </div>
                      <span className="text-xs text-gray-500 truncate">{course.instructor_name || 'Expert Instructor'}</span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mb-3">
                      <div className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                        <span className="font-medium text-gray-700 dark:text-gray-300">{Number(rating).toFixed(1)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {studentCount}
                      </div>
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5 text-success-500" />
                        <span className="text-success-600 dark:text-success-400">{completionRate}%</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-1.5 mb-2">
                      <Code2 className="w-3.5 h-3.5 text-primary-500 mt-0.5 flex-shrink-0" />
                      <span className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2">
                        Master:
                        {skills.slice(0, 3).map((s) => (
                          <span key={s} className="ml-1.5 inline-block rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5">{s}</span>
                        ))}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 mb-3">
                      <Award className="w-3.5 h-3.5 text-amber-500" />
                      <span className="text-xs text-amber-600 dark:text-amber-400">Career outcome: {outcome}</span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 pt-3 border-t border-gray-100 dark:border-gray-800">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {course.duration}h
                      </div>
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5 text-success-500" />
                        Hands-on projects
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </Link>
            </motion.div>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mt-10"
        >
          <Link
            to="/courses"
            className="inline-flex items-center gap-2 text-primary-600 dark:text-primary-400 font-semibold hover:gap-3 transition-all group"
          >
            Explore All Programs
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
