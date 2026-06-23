import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Code2, RefreshCw, CheckCircle } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { OtpInput } from '@/components/ui/OtpInput';
import api from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

export default function VerifyPending() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const handleVerify = async () => {
    if (code.length !== 6) return;
    setVerifying(true);
    setVerifyError('');
    try {
      const { data } = await api.post('/auth/verify-email', { email, code });
      const d = data.data;
      if (d) {
        useAuthStore.getState().setUser({ id: d.userId, name: d.name || d.fullName || d.username || 'User', email: d.email, role: d.role, isVerified: true });
      }
      toast.success('Email verified successfully!');
      navigate('/auth/verified', { replace: true });
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Verification failed';
      setVerifyError(msg);
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    if (code.length === 6) {
      handleVerify();
    }
  }, [code]);

  const handleResend = async () => {
    if (!email) return;
    setResending(true);
    try {
      await api.post('/auth/resend-verification', { email });
      setResent(true);
      setCode('');
      setVerifyError('');
      toast.success('Verification code resent!');
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
              We sent a verification code to:
            </p>
            <p className="font-semibold text-gray-900 dark:text-gray-100 mb-6">
              {email || 'your email address'}
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Enter verification code
              </label>
              <OtpInput
                length={6}
                value={code}
                onChange={setCode}
                disabled={verifying}
                error={verifyError}
              />
            </div>

            <Button
              onClick={handleVerify}
              loading={verifying}
              disabled={code.length !== 6}
              className="w-full mb-4"
            >
              Verify Email
            </Button>

            {resent ? (
              <div className="flex items-center justify-center gap-2 text-green-600 mb-4">
                <CheckCircle className="w-5 h-5" />
                <span className="text-sm font-medium">Verification code resent!</span>
              </div>
            ) : null}

            <Button
              onClick={handleResend}
              loading={resending}
              variant="ghost"
              className="w-full"
              icon={<RefreshCw className="w-4 h-4" />}
            >
              Resend Code
            </Button>

            <div className="mt-6 space-y-2">
              <Link
                to="/login"
                className="block text-sm text-primary-600 dark:text-primary-400 hover:underline"
              >
                Back to Login
              </Link>
              <p className="text-xs text-gray-400">
                The code expires in 24 hours.
              </p>
            </div>
          </GlassCard>
        </div>
      </section>
    </motion.div>
  );
}
