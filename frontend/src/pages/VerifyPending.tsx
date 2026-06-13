import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Code2, RefreshCw, CheckCircle } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import api from '@/lib/axios';
import toast from 'react-hot-toast';

export default function VerifyPending() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const handleResend = async () => {
    if (!email) return;
    setResending(true);
    try {
      await api.post('/auth/resend-verification', { email });
      setResent(true);
      toast.success('Verification email resent!');
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to resend verification email';
      toast.error(msg);
    } finally {
      setResending(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <section className="min-h-screen flex items-center justify-center py-20 relative">
        <div className="absolute inset-0 gradient-bg-subtle" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(99,102,241,0.08),transparent_50%)]" />

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
            <div className="w-16 h-16 mx-auto bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mb-4">
              <Mail className="w-8 h-8 text-primary-600" />
            </div>

            <h1 className="text-2xl font-bold mb-2">Check Your Email</h1>
            <p className="text-gray-500 mb-2">
              We sent a verification link to:
            </p>
            <p className="font-semibold text-gray-900 dark:text-gray-100 mb-6">
              {email || 'your email address'}
            </p>

            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 mb-6 text-left">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Click the link in the email to verify your account. If you don't see the email, check your spam folder.
              </p>
            </div>

            {resent ? (
              <div className="flex items-center justify-center gap-2 text-green-600 mb-4">
                <CheckCircle className="w-5 h-5" />
                <span className="text-sm font-medium">Verification email resent!</span>
              </div>
            ) : null}

            <Button
              onClick={handleResend}
              loading={resending}
              className="w-full"
              icon={<RefreshCw className="w-4 h-4" />}
            >
              Resend Verification Email
            </Button>

            <div className="mt-6 space-y-2">
              <Link
                to="/login"
                className="block text-sm text-primary-600 dark:text-primary-400 hover:underline"
              >
                Back to Login
              </Link>
              <p className="text-xs text-gray-400">
                The verification link expires in 24 hours.
              </p>
            </div>
          </GlassCard>
        </div>
      </section>
    </motion.div>
  );
}
