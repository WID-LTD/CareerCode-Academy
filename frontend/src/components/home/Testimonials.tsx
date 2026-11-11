import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Star, Quote } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import api from '@/lib/axios';

type Testimonial = {
  id: string;
  quote: string;
  role?: string | null;
  company?: string | null;
  image_url?: string | null;
  name?: string | null;
  rating?: number;
  source?: string;
};

export function Testimonials() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(0);

  useEffect(() => {
    let alive = true;
    api.get('/public/testimonials')
      .then(({ data }) => { if (alive) setTestimonials((data.data || []).slice(0, 6)); })
      .catch(() => { if (alive) setTestimonials([]); });
    return () => { alive = false; };
  }, []);

  if (!testimonials.length) return null;

  const slideVariants = {
    enter: (d: number) => ({ x: d > 0 ? 300 : -300, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? -300 : 300, opacity: 0 }),
  };

  const paginate = (newDirection: number) => {
    setDirection(newDirection);
    setCurrent((prev) => (prev + newDirection + testimonials.length) % testimonials.length);
  };

  const t = testimonials[current];
  const initials = (t.name || 'Learner').split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase();

  return (
    <section className="py-16 sm:py-20 relative overflow-hidden">
      <div className="absolute inset-0 gradient-bg-subtle" />
      <div className="max-w-screen-4xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Learner <span className="gradient-text">Stories</span></h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">Real reviews from learners on CareerCode courses.</p>
        </motion.div>

        <div className="max-w-3xl mx-auto relative">
          <AnimatePresence initial={false} custom={direction} mode="wait">
            <motion.div
              key={t.id}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <GlassCard className="p-8 sm:p-10 text-center relative" hover={false}>
                <Quote className="w-10 h-10 text-primary-500/20 mx-auto mb-4" />
                <div className="flex justify-center gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star key={n} className={`w-4 h-4 ${n <= (t.rating || 5) ? 'text-amber-400 fill-current' : 'text-gray-300'}`} />
                  ))}
                </div>
                <p className="text-lg sm:text-xl text-gray-700 dark:text-gray-300 leading-relaxed mb-6">"{t.quote}"</p>
                <div className="flex items-center justify-center gap-3">
                  {t.image_url ? (
                    <img src={t.image_url} alt="" className="w-12 h-12 rounded-full object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-primary-500/10 text-primary-600 grid place-items-center font-bold text-sm">{initials}</div>
                  )}
                  <div className="text-left">
                    <p className="font-semibold text-sm">{t.name || 'CareerCode learner'}</p>
                    <p className="text-xs text-gray-500">{[t.role, t.company].filter(Boolean).join(' · ') || 'CareerCode Academy'}</p>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          </AnimatePresence>

          {testimonials.length > 1 && (
            <>
              <button onClick={() => paginate(-1)} aria-label="Previous testimonial" className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 sm:-translate-x-12 w-10 h-10 rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 grid place-items-center shadow-lg">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button onClick={() => paginate(1)} aria-label="Next testimonial" className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 sm:translate-x-12 w-10 h-10 rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 grid place-items-center shadow-lg">
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}

          <div className="flex justify-center gap-2 mt-6">
            {testimonials.map((_, i) => (
              <button key={i} onClick={() => { setDirection(i > current ? 1 : -1); setCurrent(i); }} aria-label={`Go to testimonial ${i + 1}`} className={`h-2 rounded-full transition-all ${i === current ? 'w-8 bg-primary-500' : 'w-2 bg-gray-300 dark:bg-gray-700'}`} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
