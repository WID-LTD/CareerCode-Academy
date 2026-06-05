import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Clock, Users, Star, Play, FileText, CheckCircle, ChevronDown,
  Monitor, Award, ArrowLeft, BookOpen, Code2, Download,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { NeonButton } from '@/components/ui/NeonButton';
import { cn } from '@/lib/utils';

const courseData = {
  'full-stack-web-development': {
    title: 'Full-Stack Web Development',
    description: 'Master React, Node.js, and MongoDB to build complete web applications from scratch. This comprehensive course takes you from beginner to job-ready full-stack developer.',
    longDescription: 'Learn to build modern, scalable web applications from the ground up. You will master front-end development with React, back-end APIs with Node.js and Express, database management with MongoDB, and deployment with cloud services. Each module includes real-world projects that simulate actual industry scenarios.',
    image: 'https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=1200&h=600&fit=crop',
    icon: Code2,
    duration: '16 weeks',
    students: 2340,
    rating: 4.9,
    level: 'Beginner',
    category: 'Web Development',
    color: 'from-blue-500 to-cyan-500',
    price: 2499,
    instructor: { name: 'Dr. Alex Rivera', role: 'Senior Full-Stack Engineer', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop' },
    curriculum: [
      { title: 'Introduction to Web Development', lessons: 8, duration: '2 weeks', topics: ['HTTP & Web Basics', 'HTML5 Semantic Markup', 'CSS3 & Flexbox/Grid', 'Responsive Design'] },
      { title: 'JavaScript Fundamentals', lessons: 12, duration: '3 weeks', topics: ['ES6+ Syntax', 'Async/Await & Promises', 'DOM Manipulation', 'API Integration'] },
      { title: 'React & Modern Frontend', lessons: 14, duration: '4 weeks', topics: ['Components & Props', 'State Management', 'React Hooks', 'Routing & Authentication'] },
      { title: 'Node.js & Express', lessons: 10, duration: '3 weeks', topics: ['RESTful APIs', 'Middleware & Routing', 'Authentication & JWT', 'File Uploads'] },
      { title: 'Database with MongoDB', lessons: 8, duration: '2 weeks', topics: ['Schema Design', 'CRUD Operations', 'Aggregation Pipeline', 'Mongoose ODM'] },
      { title: 'Final Capstone Project', lessons: 6, duration: '2 weeks', topics: ['Project Architecture', 'Full-Stack Integration', 'Testing & Deployment', 'Presentation'] },
    ],
    learningOutcomes: [
      'Build complete full-stack applications with React and Node.js',
      'Design and manage MongoDB databases efficiently',
      'Implement authentication, authorization, and security best practices',
      'Deploy applications to cloud platforms (AWS/Vercel)',
      'Collaborate using Git, GitHub, and agile methodologies',
    ],
  },
};

export default function CourseDetails() {
  const { slug } = useParams();
  const [expandedModule, setExpandedModule] = useState<number | null>(0);
  const course = courseData[slug as keyof typeof courseData];

  if (!course) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Course Not Found</h2>
          <Link to="/courses"><Button>Back to Courses</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="relative h-[40vh] sm:h-[50vh] overflow-hidden">
        <img src={course.image} alt={course.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/60 to-transparent" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-32 relative z-10 pb-16">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Link to="/courses" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-4">
                <ArrowLeft className="w-4 h-4" /> Back to Courses
              </Link>
              <div className="flex items-center gap-3 mb-4">
                <Badge variant="primary" size="md">{course.level}</Badge>
                <Badge variant="default" size="md">{course.category}</Badge>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">{course.title}</h1>
              <p className="text-lg text-gray-300 leading-relaxed">{course.description}</p>
            </motion.div>

            <GlassCard className="p-6">
              <h2 className="text-xl font-semibold mb-6">What You'll Learn</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {course.learningOutcomes.map((outcome, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{outcome}</span>
                  </div>
                ))}
              </div>
            </GlassCard>

            <GlassCard className="p-6">
              <h2 className="text-xl font-semibold mb-6">Course Curriculum</h2>
              <div className="space-y-3">
                {course.curriculum.map((module, i) => (
                  <div key={i} className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setExpandedModule(expandedModule === i ? null : i)}
                      className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center">
                          <BookOpen className="w-4 h-4 text-primary-500" />
                        </div>
                        <div className="text-left">
                          <h3 className="font-medium text-sm">{module.title}</h3>
                          <p className="text-xs text-gray-500">{module.lessons} lessons · {module.duration}</p>
                        </div>
                      </div>
                      <ChevronDown className={cn('w-5 h-5 text-gray-400 transition-transform', expandedModule === i && 'rotate-180')} />
                    </button>
                    {expandedModule === i && (
                      <div className="px-4 pb-4 border-t border-gray-200 dark:border-gray-800">
                        <ul className="mt-3 space-y-2">
                          {module.topics.map((topic, j) => (
                            <li key={j} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                              <Play className="w-3 h-3 text-primary-500" /> {topic}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>

          <div className="space-y-6">
            <GlassCard className="p-6 sticky top-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                  <Monitor className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-3xl font-bold gradient-text">${course.price}</div>
                  <div className="text-sm text-gray-500">or $249/mo for 10 months</div>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <NeonButton color="blue" className="w-full">Enroll Now</NeonButton>
                <Button variant="outline" className="w-full">
                  <Play className="w-4 h-4" /> Watch Preview
                </Button>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-800">
                  <div className="flex items-center gap-2 text-gray-500"><Clock className="w-4 h-4" /> Duration</div>
                  <span className="font-medium">{course.duration}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-800">
                  <div className="flex items-center gap-2 text-gray-500"><Users className="w-4 h-4" /> Students</div>
                  <span className="font-medium">{course.students.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-800">
                  <div className="flex items-center gap-2 text-gray-500"><Star className="w-4 h-4" /> Rating</div>
                  <span className="font-medium">{course.rating}/5.0</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-800">
                  <div className="flex items-center gap-2 text-gray-500"><Award className="w-4 h-4" /> Certificate</div>
                  <span className="font-medium text-green-500">Yes</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2 text-gray-500"><FileText className="w-4 h-4" /> Resources</div>
                  <span className="font-medium">25+ downloads</span>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-3">
                  <img src={course.instructor.avatar} alt={course.instructor.name} className="w-10 h-10 rounded-full object-cover" />
                  <div>
                    <div className="font-medium text-sm">{course.instructor.name}</div>
                    <div className="text-xs text-gray-500">{course.instructor.role}</div>
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
