import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Play, Code2, Sparkles, Shield, Zap } from 'lucide-react';
import { NeonButton } from '@/components/ui/NeonButton';

const typingTexts = [
  'Build Real-World Projects',
  'Master Modern Frameworks',
  'Launch Your Dev Career',
  'Learn From Industry Experts',
];

const floatingShapes = [
  { icon: Code2, color: 'text-neon-blue', delay: 0, x: '10%', y: '20%' },
  { icon: Zap, color: 'text-neon-purple', delay: 0.5, x: '85%', y: '15%' },
  { icon: Sparkles, color: 'text-neon-pink', delay: 1, x: '15%', y: '70%' },
  { icon: Shield, color: 'text-neon-green', delay: 1.5, x: '80%', y: '75%' },
];

export function Hero() {
  const [textIndex, setTextIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentText = typingTexts[textIndex];
    const timeout = setTimeout(
      () => {
        if (!isDeleting) {
          if (charIndex < currentText.length) {
            setCharIndex(charIndex + 1);
          } else {
            setTimeout(() => setIsDeleting(true), 2000);
          }
        } else {
          if (charIndex > 0) {
            setCharIndex(charIndex - 1);
          } else {
            setIsDeleting(false);
            setTextIndex((textIndex + 1) % typingTexts.length);
          }
        }
      },
      isDeleting ? 50 : 100
    );
    return () => clearTimeout(timeout);
  }, [charIndex, isDeleting, textIndex]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.3 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
      <div className="absolute inset-0 gradient-bg-subtle" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(99,102,241,0.1),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(34,197,94,0.08),transparent_50%)]" />

      {floatingShapes.map((shape) => (
        <motion.div
          key={shape.color}
          className={`absolute ${shape.color}`}
          style={{ left: shape.x, top: shape.y }}
          animate={{
            y: [0, -20, 0],
            rotate: [0, 10, -10, 0],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            delay: shape.delay,
            ease: 'easeInOut',
          }}
        >
          <shape.icon className="w-12 h-12 opacity-20" />
        </motion.div>
      ))}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 relative">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-4xl mx-auto text-center"
        >
          <motion.div variants={itemVariants} className="mb-6">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-500/10 border border-primary-500/20 text-sm font-medium text-primary-600 dark:text-primary-400">
              <Sparkles className="w-4 h-4" />
              New: Interactive Coding Challenges Launched
            </span>
          </motion.div>

          <motion.h1
            variants={itemVariants}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6"
          >
            <span className="text-gray-900 dark:text-white">Learn to Code,</span>
            <br />
            <span className="gradient-text">{typingTexts[textIndex].substring(0, charIndex)}</span>
            <span className="animate-pulse text-primary-500">|</span>
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            From zero to job-ready developer. Master in-demand technologies through
            hands-on projects, expert mentorship, and a curriculum designed by
            industry professionals.
          </motion.p>

          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link to="/signup">
              <NeonButton color="blue" size="lg">
                Start Learning Free
                <ArrowRight className="w-5 h-5" />
              </NeonButton>
            </Link>
            <Link to="/courses">
              <NeonButton color="purple" size="lg">
                <Play className="w-5 h-5" />
                Explore Courses
              </NeonButton>
            </Link>
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="mt-16 flex flex-wrap items-center justify-center gap-8 text-sm text-gray-500"
          >
            {[
              { number: '10K+', label: 'Students' },
              { number: '200+', label: 'Courses' },
              { number: '95%', label: 'Job Placement' },
              { number: '4.9', label: 'Avg Rating' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stat.number}
                </div>
                <div>{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
