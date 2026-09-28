import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Play, Code2, Sparkles, Shield, Zap, Award, Users, BookOpen, Building2, Star, ChevronRight } from 'lucide-react';
import { NeonButton } from '@/components/ui/NeonButton';
import { Badge } from '@/components/ui/Badge';

const typingTexts = [
  'Master In-Demand Skills',
  'Build Real-World Projects',
  'Ship Production Apps',
  'Earn Industry Certification',
];

const floatingShapes = [
  { icon: Code2, color: 'text-neon-blue', delay: 0, x: '10%', y: '20%' },
  { icon: Zap, color: 'text-neon-purple', delay: 0.5, x: '85%', y: '15%' },
  { icon: Sparkles, color: 'text-neon-pink', delay: 1, x: '15%', y: '70%' },
  { icon: Shield, color: 'text-neon-green', delay: 1.5, x: '80%', y: '75%' },
];

const employerLogos = [
  'Google', 'Microsoft', 'Amazon', 'Stripe', 'Netflix', 'Spotify', 'Atlassian', 'GitLab', 'Vercel', 'Figma',
];

const styles = {
  container: "max-w-[2560px] mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32 3xl:py-48 relative w-full",
  contentWrapper: "max-w-[1280px] 3xl:max-w-[2240px] mx-auto text-center",
  badgeWrapper: "mb-6 md:mb-8 3xl:mb-12",
  badge: "inline-flex items-center gap-2 px-4 py-2 3xl:px-8 3xl:py-4 rounded-full bg-primary-500/10 border border-primary-500/20 text-sm 3xl:text-xl font-medium text-primary-600 dark:text-primary-400",
  badgeIcon: "w-4 h-4 3xl:w-6 3xl:h-6",
  heading: "text-4xl sm:text-5xl md:text-6xl lg:text-7xl 3xl:text-[7rem] font-extrabold tracking-tight mb-6 3xl:mb-12 leading-tight",
  subtitle: "text-lg sm:text-xl 3xl:text-3xl text-gray-600 dark:text-gray-400 max-w-2xl 3xl:max-w-5xl mx-auto mb-10 3xl:mb-16 leading-relaxed",
  buttonWrapper: "flex flex-col sm:flex-row items-center justify-center gap-4 lg:gap-6 3xl:gap-10",
  button: "3xl:text-2xl 3xl:px-12 3xl:py-6 3xl:rounded-2xl",
  buttonIcon: "w-5 h-5 3xl:w-8 3xl:h-8",
  statsWrapper: "mt-16 lg:mt-24 3xl:mt-40 flex flex-wrap items-center justify-center gap-8 lg:gap-16 3xl:gap-32 text-sm 3xl:text-2xl text-gray-500",
  statNumber: "text-2xl lg:text-4xl 3xl:text-7xl font-bold text-gray-900 dark:text-white mb-1 3xl:mb-4",
  floatingIcon: "w-12 h-12 md:w-16 md:h-16 3xl:w-32 3xl:h-32 opacity-20 transition-all duration-300 hover:scale-110",
};

function Marquee() {
  return (
    <div className="relative overflow-hidden w-full mt-12 lg:mt-16">
      <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-white dark:from-gray-950 to-transparent z-10" />
      <div className="absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-white dark:from-gray-950 to-transparent z-10" />
      <motion.div
        className="flex gap-16 items-center"
        animate={{ x: ['0%', '-50%'] }}
        transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
      >
        {[...employerLogos, ...employerLogos].map((name, i) => (
          <div
            key={i}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100/50 dark:bg-gray-800/30 border border-gray-200 dark:border-gray-700/50 whitespace-nowrap"
          >
            <Building2 className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{name}</span>
          </div>
        ))}
      </motion.div>
    </div>
  );
}

export function Hero() {
  const [textIndex, setTextIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  // Social-proof counters: animate 0 -> 999+ on mount.
  const SOCIAL_PROOF_TARGET = 999;
  const [counts, setCounts] = useState([0, 0, 0, 0]);
  const stats = [
    { number: `${counts[0].toLocaleString()}+`, label: 'Students' },
    { number: `${counts[1].toLocaleString()}+`, label: 'Courses' },
    { number: `${counts[2].toLocaleString()}+`, label: 'Certificates Issued' },
    { number: `${counts[3].toLocaleString()}+`, label: 'Graduate Alumni' },
  ];

  useEffect(() => {
    const duration = 2000;
    const startedAt = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const value = Math.floor(eased * SOCIAL_PROOF_TARGET);
      setCounts([value, value, value, value]);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

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
    <section className="relative min-h-[70vh] sm:min-h-[90vh] flex items-center overflow-hidden">
      <div className="absolute inset-0 gradient-bg-subtle" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(99,102,241,0.1),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(34,197,94,0.08),transparent_50%)]" />
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')]" />

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
          <shape.icon className={styles.floatingIcon} />
        </motion.div>
      ))}

      <div className={styles.container}>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className={styles.contentWrapper}
        >
          <motion.div variants={itemVariants} className={styles.badgeWrapper}>
            <span className={styles.badge}>
              <Sparkles className={styles.badgeIcon} />
              Skill-First, Career-Focused
            </span>
          </motion.div>

          <motion.h1
            variants={itemVariants}
            className={styles.heading}
          >
            <span className="text-gray-900 dark:text-white">Learn to Code,</span>
            <br />
            <span className="gradient-text">{typingTexts[textIndex].substring(0, charIndex)}</span>
            <span className="animate-pulse text-primary-500">|</span>
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className={styles.subtitle}
          >
            Acquire job-ready skills through hands-on projects, guided mentorship,
            and a curriculum built by industry professionals — skills you can use
            from day one.
          </motion.p>

          <motion.div
            variants={itemVariants}
            className={styles.buttonWrapper}
          >
            <Link to="/signup">
              <NeonButton color="blue" size="lg" className={styles.button + " animate-glow"}>
                Start Building Skills
                <ArrowRight className={styles.buttonIcon} />
              </NeonButton>
            </Link>
            <Link to="/courses">
              <NeonButton color="purple" size="lg" className={styles.button}>
                <Play className={styles.buttonIcon} />
                Explore Programs
              </NeonButton>
            </Link>
          </motion.div>

          <motion.div
            variants={itemVariants}
            className={styles.statsWrapper}
          >
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className={styles.statNumber}>
                  {stat.number}
                </div>
                <div>{stat.label}</div>
              </div>
            ))}
          </motion.div>

          <motion.div variants={itemVariants}>
            <div className="mt-8 flex items-center justify-center gap-3">
              <Badge variant="success" size="sm" className="px-3 py-1">
                <Award className="w-3 h-3" />
                Industry Approved
              </Badge>
              <Badge variant="primary" size="sm" className="px-3 py-1">
                <Users className="w-3 h-3" />
                Career Pipeline
              </Badge>
              <Badge variant="default" size="sm" className="px-3 py-1">
                <Star className="w-3 h-3 text-yellow-500" />
                Certificate Included
              </Badge>
            </div>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Marquee />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
