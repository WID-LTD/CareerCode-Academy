import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Code2 } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import api from '@/lib/axios';

export default function VerifyEmail() {
  const { token } = useParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (token) {
      api.get(`/auth/verify-email/${token}`)
        .then(() => {
          setStatus('success');
          setMessage('Email verified successfully!');
        })
        .catch((err) => {
          setStatus('error');
          setMessage(err.response?.data?.message || 'Verification failed');
        });
    }
  }, [token]);

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
            {status === 'loading' && (
              <div className="animate-pulse space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-gray-200 dark:bg-gray-700" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mx-auto" />
              </div>
            )}
            {status === 'success' && (
              <div className="space-y-4">
                <div className="w-16 h-16 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-xl font-semibold text-green-600">{message}</h2>
                <Link to="/login" className="text-primary-600 dark:text-primary-400 hover:underline text-sm">
                  Go to Login
                </Link>
              </div>
            )}
            {status === 'error' && (
              <div className="space-y-4">
                <div className="w-16 h-16 mx-auto bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                  <XCircle className="w-8 h-8 text-red-600" />
                </div>
                <h2 className="text-xl font-semibold text-red-600">{message}</h2>
                <Link to="/" className="text-primary-600 dark:text-primary-400 hover:underline text-sm">
                  Go to Home
                </Link>
              </div>
            )}
          </GlassCard>
        </div>
      </section>
    </motion.div>
  );
}