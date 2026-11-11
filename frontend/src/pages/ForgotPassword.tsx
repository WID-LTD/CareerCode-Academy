import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail,
  Code2,
  ArrowLeft,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  HelpCircle,
  Sparkles,
  Clock,
  Send,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import api from '@/lib/axios';
import { Turnstile } from '@/components/security/Turnstile';
import toast from 'react-hot-toast';
import SEO from '@/components/seo/SEO';

const RESEND_COOLDOWN = 60; // 60 seconds

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [sent, setSent] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Timer countdown handler
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [countdown]);

  const validateEmail = (val: string) => {
    if (!val || !val.trim()) {
      return 'Email is required';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(val)) {
      return 'Please enter a valid email address';
    }
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateEmail(email);
    if (err) {
      setError(err);
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      await api.post('/auth/forgot-password', { email: email.trim(), turnstileToken: captchaToken || undefined });
      setSent(true);
      setCountdown(RESEND_COOLDOWN);
      toast.success('Password reset link sent! Check your inbox.');
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (status === 503
          ? 'Service temporarily unavailable — database connection issue.'
          : 'Failed to send reset email. Please try again.');
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || isResending) return;

    setIsResending(true);
    try {
      await api.post('/auth/forgot-password', { email: email.trim(), turnstileToken: captchaToken || undefined });
      setCountdown(RESEND_COOLDOWN);
      toast.success('Reset email resent successfully!');
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (status === 503
          ? 'Service temporarily unavailable — database connection issue.'
          : 'Failed to resend reset email.');
      toast.error(msg);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen relative flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8"
    >
      <SEO title="Forgot Password - CareerCode Academy" />

      {/* Background Gradients & Effects */}
      <div className="absolute inset-0 gradient-bg-subtle pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(99,102,241,0.12),transparent_50%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(168,85,247,0.1),transparent_50%)] pointer-events-none" />

      <div className="max-w-5xl w-full mx-auto relative grid lg:grid-cols-12 gap-8 items-center">
        {/* Left Side: Form / Sent Card (Span 7) */}
        <div className="lg:col-span-7">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-6 text-center sm:text-left"
          >
            <Link to="/" className="inline-flex items-center gap-2 mb-6 group">
              <div className="w-10 h-10 gradient-bg rounded-xl flex items-center justify-center shadow-md group-hover:scale-105 transition-transform duration-200">
                <Code2 className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold gradient-text">CareerCode Academy</span>
            </Link>

            <Badge variant="primary" className="mb-3 inline-flex items-center gap-1.5 px-3 py-1 text-xs">
              <ShieldCheck className="w-3.5 h-3.5" />
              Account Recovery
            </Badge>

            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-4xl mb-2">
              {sent ? 'Check Your Inbox' : 'Forgot Password?'}
            </h1>
            <p className="text-base text-gray-600 dark:text-gray-400 max-w-md">
              {sent
                ? `We have dispatched a password reset link to your email address.`
                : `Don't worry, it happens. Enter your registered email address below to receive password reset instructions.`}
            </p>
          </motion.div>

          <GlassCard className="p-6 sm:p-8 backdrop-blur-xl border border-white/20 dark:border-gray-800/80 shadow-2xl relative overflow-hidden">
            <AnimatePresence mode="wait">
              {sent ? (
                /* --- SENT STATE VIEW --- */
                <motion.div
                  key="sent-state"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <div className="flex items-center gap-4 p-4 rounded-2xl bg-primary-500/10 border border-primary-500/20 text-primary-900 dark:text-primary-100">
                    <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center shrink-0 shadow-lg">
                      <Mail className="w-6 h-6 text-white animate-bounce" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white">
                        Reset Link Dispatched
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 break-all">
                        Sent to: <span className="font-semibold text-primary-600 dark:text-primary-400">{email}</span>
                      </p>
                    </div>
                  </div>

                  {/* Instructions */}
                  <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-200/60 dark:border-gray-800">
                    <div className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                      <span>Click the reset link in the email to set a new password.</span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <Clock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <span>The reset link will expire in <strong>15 minutes</strong>.</span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <HelpCircle className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                      <span>Can't find it? Check your spam or junk folder.</span>
                    </div>
                  </div>

                  {/* Quick Webmail Shortcuts */}
                  <div className="space-y-2">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider block">
                      Quick Open Webmail
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <a
                        href="https://mail.google.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800/80 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-gray-700 dark:text-gray-200"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-red-500" />
                        Gmail
                      </a>
                      <a
                        href="https://outlook.live.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800/80 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-gray-700 dark:text-gray-200"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-blue-500" />
                        Outlook
                      </a>
                      <a
                        href="https://mail.yahoo.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800/80 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-gray-700 dark:text-gray-200 col-span-2 sm:col-span-1"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-purple-500" />
                        Yahoo
                      </a>
                    </div>
                  </div>

                  {/* Resend Section */}
                  <div className="pt-2 border-t border-gray-200/80 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={countdown > 0 || isResending}
                      className={`inline-flex items-center gap-2 font-medium transition-colors ${
                        countdown > 0 || isResending
                          ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                          : 'text-primary-600 dark:text-primary-400 hover:underline'
                      }`}
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isResending ? 'animate-spin' : ''}`} />
                      {countdown > 0 ? `Resend email in ${countdown}s` : 'Resend reset link'}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSent(false);
                        setError('');
                      }}
                      className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                    >
                      Wrong email address? Change
                    </button>
                  </div>

                  {/* Back to Login Link */}
                  <div className="pt-3 text-center">
                    <Link
                      to="/login"
                      className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4" /> Back to Sign In
                    </Link>
                  </div>
                </motion.div>
              ) : (
                /* --- FORM VIEW --- */
                <motion.form
                  key="form-state"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.3 }}
                  onSubmit={handleSubmit}
                  className="space-y-5"
                >
                  <Input
                    label="Account Email Address"
                    type="email"
                    placeholder="name@example.com"
                    icon={<Mail className="w-4 h-4 text-gray-400" />}
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError('');
                    }}
                    error={error}
                    required
                    autoFocus
                  />

                  <Turnstile onToken={setCaptchaToken} />
              <Button
                    type="submit"
                    className="w-full h-11 text-base font-semibold shadow-lg shadow-primary-500/20"
                    loading={isLoading}
                  >
                    <Send className="w-4 h-4 mr-2 inline" /> Send Reset Link
                  </Button>

                  <div className="pt-4 border-t border-gray-200/80 dark:border-gray-800 flex items-center justify-between text-sm">
                    <Link
                      to="/login"
                      className="inline-flex items-center gap-1.5 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white font-medium transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4" /> Remember password? Sign In
                    </Link>

                    <Link
                      to="/signup"
                      className="text-primary-600 dark:text-primary-400 font-semibold hover:underline"
                    >
                      Create account
                    </Link>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </GlassCard>
        </div>

        {/* Right Side: Security Highlights & Info Card (Span 5 - Hidden on mobile) */}
        <div className="lg:col-span-5 hidden lg:block">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="space-y-6"
          >
            <GlassCard className="p-8 backdrop-blur-xl border border-white/20 dark:border-gray-800/80 space-y-6 relative overflow-hidden bg-gradient-to-br from-indigo-900/20 via-purple-900/10 to-transparent">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center shadow-lg">
                  <KeyRound className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Secure Password Reset</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">CareerCode Security Standards</p>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <ShieldCheck className="w-4 h-4 text-indigo-500" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Single-Use Tokens</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Reset links are cryptographically signed and expire automatically after one hour for your safety.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="w-4 h-4 text-purple-500" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Instant Verification</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Reset emails are sent instantly. You can quickly set a new password and jump right back into learning.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <HelpCircle className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Dedicated Support</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Having trouble with your account? Reach out to our support team anytime at hello@careercode.com.ng.
                    </p>
                  </div>
                </div>
              </div>

              {/* Trust Badge */}
              <div className="pt-4 border-t border-gray-200/60 dark:border-gray-800 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  All Systems Operational
                </span>
                <span>256-bit SSL Protection</span>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}