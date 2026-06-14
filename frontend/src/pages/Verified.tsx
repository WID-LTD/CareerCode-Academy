import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, Code2 } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/authStore';

export default function Verified() {
  const { isAuthenticated, user } = useAuthStore();

  if (isAuthenticated) {
    const redirect = user?.role === 'instructor' ? '/instructor/dashboard' : '/student/dashboard';
    return <Navigate to={redirect} replace />;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <section className="min-h-screen flex items-center justify-center py-20 relative">
        <div className="absolute inset-0 gradient-bg-subtle" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(34,197,94,0.08),transparent_50%)]" />

        <div className="max-w-md w-full mx-auto px-4 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <Link to="/" className="inline-flex items-center gap-2 mb-6">
              <div className="w-10 h-10 gradient-bg rounded-xl flex items-center justify-center">
                <Code2 className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold gradient-text">CareerCode</span>
            </Link>
          </motion.div>

          <GlassCard className="p-8 text-center">
            <div className="w-16 h-16 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>

            <h1 className="text-2xl font-bold mb-2">Email Verified!</h1>
            <p className="text-gray-500 mb-6">
              Your email has been verified successfully. You can now access all features of CareerCode Academy.
            </p>

            <Link to="/login">
              <Button className="w-full">Continue to Login</Button>
            </Link>
          </GlassCard>
        </div>
      </section>
    </motion.div>
  );
}
