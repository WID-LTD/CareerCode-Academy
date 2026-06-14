import React, { useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Code2 } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import api from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';

export default function VerifyEmail() {
  const { token } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (token) {
      api.get(`/auth/verify-email/${token}`)
        .then(({ data }) => {
          const d = data.data;
          if (d) {
            useAuthStore.getState().setUser({ id: d.userId, name: d.name, email: d.email, role: d.role, isVerified: true });
            useAuthStore.getState().setToken(d.token);
          }
          navigate('/auth/verified', { replace: true });
        })
        .catch(() => {
          navigate('/auth/verification-error', { replace: true });
        });
    }
  }, [token, navigate]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <section className="min-h-screen flex items-center justify-center py-20 relative">
        <div className="absolute inset-0 gradient-bg-subtle" />
        <div className="max-w-md w-full mx-auto px-4 relative">
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2 mb-6">
              <div className="w-10 h-10 gradient-bg rounded-xl flex items-center justify-center">
                <Code2 className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold gradient-text">CareerCode</span>
            </Link>
          </div>
          <GlassCard className="p-8 text-center">
            <div className="animate-pulse space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-gray-200 dark:bg-gray-700" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mx-auto" />
            </div>
            <p className="text-gray-500 mt-4 text-sm">Verifying your email...</p>
          </GlassCard>
        </div>
      </section>
    </motion.div>
  );
}