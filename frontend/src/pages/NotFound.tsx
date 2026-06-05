import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, ArrowLeft, Search } from 'lucide-react';
import { NeonButton } from '@/components/ui/NeonButton';
import { Button } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <section className="min-h-screen flex items-center justify-center relative">
        <div className="absolute inset-0 gradient-bg-subtle" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(99,102,241,0.05),transparent_50%)]" />

        <div className="text-center relative px-4">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="text-8xl sm:text-9xl font-extrabold gradient-text mb-4">404</div>
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <h1 className="text-2xl sm:text-3xl font-bold mb-3">Page Not Found</h1>
            <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-8">
              Oops! The page you're looking for doesn't exist or has been moved.
              Let's get you back on track.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/">
                <NeonButton color="blue">
                  <Home className="w-5 h-5" />
                  Back to Home
                </NeonButton>
              </Link>
              <Link to="/courses">
                <Button variant="outline" icon={<Search className="w-4 h-4" />}>
                  Browse Courses
                </Button>
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-12 text-sm text-gray-400"
          >
            <p>Try these popular pages instead:</p>
            <div className="flex items-center justify-center gap-4 mt-2">
              <Link to="/" className="hover:text-primary-500 transition-colors">Home</Link>
              <Link to="/courses" className="hover:text-primary-500 transition-colors">Courses</Link>
              <Link to="/pricing" className="hover:text-primary-500 transition-colors">Pricing</Link>
              <Link to="/blog" className="hover:text-primary-500 transition-colors">Blog</Link>
              <Link to="/contact" className="hover:text-primary-500 transition-colors">Contact</Link>
            </div>
          </motion.div>
        </div>
      </section>
    </motion.div>
  );
}
