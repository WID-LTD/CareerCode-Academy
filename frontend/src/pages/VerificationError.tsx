import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { XCircle, Code2, RefreshCw, CheckCircle } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Mail } from 'lucide-react';
import api from '@/lib/axios';
import toast from 'react-hot-toast';

export default function VerificationError() {
  const [searchParams] = useSearchParams();
  const initialEmail = searchParams.get('email') || '';
  const [email, setEmail] = useState(initialEmail);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
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
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(239,68,68,0.08),transparent_50%)]" />

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
            <div className="w-16 h-16 mx-auto bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>

            <h1 className="text-2xl font-bold mb-2">Verification Failed</h1>
            <p className="text-gray-500 mb-6">
              The verification link is invalid or has expired. Please request a new verification email.
            </p>

            {resent ? (
              <div className="flex items-center justify-center gap-2 text-green-600 mb-4">
                <CheckCircle className="w-5 h-5" />
                <span className="text-sm font-medium">Verification email resent!</span>
              </div>
            ) : null}

            <form onSubmit={handleResend} className="space-y-4 text-left">
              <Input
                label="Email Address"
                type="email"
                placeholder="you@example.com"
                icon={<Mail className="w-4 h-4" />}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Button type="submit" className="w-full" loading={resending}>
                Resend Verification Email
              </Button>
            </form>

            <div className="mt-6">
              <Link
                to="/login"
                className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
              >
                Back to Login
              </Link>
            </div>
          </GlassCard>
        </div>
      </section>
    </motion.div>
  );
}
