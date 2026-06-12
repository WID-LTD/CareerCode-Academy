import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, Users, Star, ArrowRight, Code2, Database, Globe, Smartphone } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';

const courses = [
  {
    title: 'Full-Stack Web Development',
    description: 'Master React, Node.js, and MongoDB to build complete web applications from scratch.',
    icon: Code2,
    duration: '16 weeks',
    students: 2340,
    rating: 4.9,
    level: 'Beginner',
    color: 'from-blue-500 to-cyan-500',
    slug: 'full-stack-web-development',
  },
  {
    title: 'Data Science & Machine Learning',
    description: 'Learn Python, pandas, scikit-learn, and TensorFlow to extract insights from data.',
    icon: Database,
    duration: '20 weeks',
    students: 1870,
    rating: 4.8,
    level: 'Intermediate',
    color: 'from-purple-500 to-pink-500',
    slug: 'machine-learning',
  },
  {
    title: 'Mobile App Development',
    description: 'Build cross-platform mobile apps with React Native and deploy to iOS & Android.',
    icon: Smartphone,
    duration: '14 weeks',
    students: 1560,
    rating: 4.7,
    level: 'Intermediate',
    color: 'from-green-500 to-emerald-500',
    slug: 'mobile-app-development',
  },
  {
    title: 'Cloud Computing with AWS',
    description: 'Master AWS, Docker, Kubernetes, and CI/CD pipelines for modern cloud infrastructure.',
    icon: Globe,
    duration: '12 weeks',
    students: 1120,
    rating: 4.9,
    level: 'Advanced',
    color: 'from-orange-500 to-red-500',
    slug: 'cloud-computing-with-aws',
  },
];

export function FeaturedCourses() {
  return (
    <section className="py-20 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            <span className="gradient-text">Featured Courses</span>
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Industry-aligned curriculum designed to take you from beginner to job-ready developer.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {courses.map((course, index) => (
            <motion.div
              key={course.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <Link to={`/courses/${course.slug}`}>
                <GlassCard hover className="h-full p-6 group cursor-pointer">
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${course.color} flex items-center justify-center mb-4`}
                  >
                    <course.icon className="w-6 h-6 text-white" />
                  </div>

                  <div className="mb-3">
                    <Badge variant="primary" size="sm">
                      {course.level}
                    </Badge>
                  </div>

                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-primary-500 transition-colors">
                    {course.title}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">
                    {course.description}
                  </p>

                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mt-auto pt-4 border-t border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {course.duration}
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {course.students}
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-yellow-500" />
                      {course.rating}
                    </div>
                  </div>
                </GlassCard>
              </Link>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mt-10"
        >
          <Link
            to="/courses"
            className="inline-flex items-center gap-2 text-primary-600 dark:text-primary-400 font-semibold hover:gap-3 transition-all"
          >
            View All Courses
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
