import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Star, Quote } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';

const testimonials = [
  {
    name: 'Sarah Johnson',
    role: 'Frontend Developer at Google',
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face',
    content:
      'CareerCode completely transformed my career. Within 6 months of joining, I went from knowing basic HTML to landing a job at Google. The project-based approach is unmatched.',
    rating: 5,
  },
  {
    name: 'Marcus Chen',
    role: 'Full-Stack Developer at Stripe',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    content:
      'The mentorship program is incredible. My mentor guided me through complex concepts and helped me build a portfolio that stood out to top tech companies.',
    rating: 5,
  },
  {
    name: 'Emily Rodriguez',
    role: 'Data Scientist at Netflix',
    image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
    content:
      'The Data Science track was comprehensive and up-to-date. The real-world projects gave me the confidence to tackle complex problems in my current role.',
    rating: 5,
  },
  {
    name: 'James Wilson',
    role: 'DevOps Engineer at AWS',
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
    content:
      'Coming from a non-CS background, I was nervous about breaking into tech. CareerCode structured the learning path perfectly, making complex topics accessible.',
    rating: 5,
  },
];

export function Testimonials() {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(0);

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction > 0 ? -300 : 300,
      opacity: 0,
    }),
  };

  const paginate = (newDirection: number) => {
    setDirection(newDirection);
    setCurrent((prev) => {
      let next = prev + newDirection;
      if (next < 0) next = testimonials.length - 1;
      if (next >= testimonials.length) next = 0;
      return next;
    });
  };

  return (
    <section className="py-20 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(99,102,241,0.05),transparent_50%)]" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            What Our <span className="gradient-text">Students</span> Say
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Hear from our graduates who have launched successful careers in tech.
          </p>
        </motion.div>

        <div className="max-w-3xl mx-auto relative">
          <div className="overflow-hidden">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={current}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              >
                <GlassCard className="p-8 sm:p-10 text-center">
                  <Quote className="w-10 h-10 text-primary-500/30 mx-auto mb-6" />
                  <p className="text-lg sm:text-xl text-gray-700 dark:text-gray-300 leading-relaxed mb-8 italic">
                    "{testimonials[current].content}"
                  </p>
                  <div className="flex items-center justify-center gap-1 mb-4">
                    {Array.from({ length: testimonials[current].rating }).map((_, i) => (
                      <Star key={i} className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                    ))}
                  </div>
                  <div className="flex items-center justify-center gap-4">
                    <img
                      src={testimonials[current].image}
                      alt={testimonials[current].name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div className="text-left">
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {testimonials[current].name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {testimonials[current].role}
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="flex items-center justify-center gap-4 mt-8">
            <button
              onClick={() => paginate(-1)}
              className="p-3 rounded-xl glass hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setDirection(index > current ? 1 : -1);
                    setCurrent(index);
                  }}
                  className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                    index === current
                      ? 'bg-primary-500 w-8'
                      : 'bg-gray-300 dark:bg-gray-700 hover:bg-gray-400'
                  }`}
                />
              ))}
            </div>
            <button
              onClick={() => paginate(1)}
              className="p-3 rounded-xl glass hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
