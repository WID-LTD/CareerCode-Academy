import React, { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lock,
  Code2,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import SEO from '@/components/seo/SEO';

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Password strength calculation
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: '', color: 'bg-gray-200 dark:bg-gray-800' };
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 10) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[a-z]/.test(pass) && /[A-Z]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 2) return { score: 33, label: 'Weak', color: 'bg-red-500' };
    if (score <= 4) return { score: 66, label: 'Medium', color: 'bg-amber-500' };
    return { score: 100, label: 'Strong', color: 'bg-emerald-500' };
  };

  const strength = getPasswordStrength(password);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!password) {
      errs.password = 'New password is required';
    } else if (password.length < 6) {
      errs.password = 'Password must be at least 6 characters';
    }

    if (!confirmPassword) {
      errs.confirmPassword = 'Please confirm your new password';
    } else if (password !== confirmPassword) {
      errs.confirmPassword = 'Passwords do not match';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast.error('Invalid or missing reset token.');
      return;
    }

    if (!validate()) return;

    setIsLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      setIsSuccess(true);
      toast.success('Password updated successfully!');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Invalid or expired reset token. Please request a new one.';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen relative flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8"
    >
      <SEO title="Reset Password - CareerCode Academy" />

      {/* Ambient background glows */}
      <div className="absolute inset-0 gradient-bg-subtle pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(99,102,241,0.12),transparent_50%)] pointer-events-none" />

      <div className="max-w-md w-full mx-auto relative">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center mb-6"
        >
          <Link to="/" className="inline-flex items-center gap-2 mb-6 group">
            <div className="w-10 h-10 gradient-bg rounded-xl flex items-center justify-center shadow-md group-hover:scale-105 transition-transform duration-200">
              <Code2 className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold gradient-text">CareerCode Academy</span>
          </Link>

          <Badge variant="primary" className="mb-3 inline-flex items-center gap-1.5 px-3 py-1 text-xs">
            <ShieldCheck className="w-3.5 h-3.5" />
            Security Reset
          </Badge>

          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2">
            {isSuccess ? 'Password Reset Complete!' : 'Set New Password'}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {isSuccess
              ? 'Your password has been successfully updated. You can now sign in with your new credentials.'
              : 'Please enter a strong new password for your account.'}
          </p>
        </motion.div>

        <GlassCard className="p-6 sm:p-8 backdrop-blur-xl border border-white/20 dark:border-gray-800/80 shadow-2xl relative overflow-hidden">
          <AnimatePresence mode="wait">
            {isSuccess ? (
              <motion.div
                key="success-state"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="text-center space-y-6"
              >
                <div className="w-16 h-16 mx-auto gradient-bg rounded-2xl flex items-center justify-center shadow-xl shadow-primary-500/20">
                  <CheckCircle2 className="w-8 h-8 text-white animate-pulse" />
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">All Set!</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Your password reset token has been consumed and your new password is saved.
                  </p>
                </div>

                <Button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="w-full h-11 text-base font-semibold shadow-lg shadow-primary-500/20 inline-flex items-center justify-center gap-2"
                >
                  Proceed to Sign In <ArrowRight className="w-4 h-4" />
                </Button>
              </motion.div>
            ) : (
              <motion.form
                key="form-state"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onSubmit={handleSubmit}
                className="space-y-5"
              >
                {/* New Password */}
                <div className="space-y-1.5">
                  <Input
                    label="New Password"
                    autoComplete="new-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter new password"
                    icon={<Lock className="w-4 h-4 text-gray-400" />}
                    rightIcon={
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    }
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errors.password) setErrors((p) => ({ ...p, password: '' }));
                    }}
                    error={errors.password}
                    required
                  />

                  {/* Strength Bar */}
                  {password && (
                    <div className="pt-1.5 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500 dark:text-gray-400">Strength:</span>
                        <span className="font-medium text-gray-700 dark:text-gray-300">{strength.label}</span>
                      </div>
                      <div className="h-1.5 w-full bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${strength.color}`}
                          style={{ width: `${strength.score}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <Input
                  label="Confirm New Password"
                  autoComplete="new-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Re-enter new password"
                  icon={<KeyRound className="w-4 h-4 text-gray-400" />}
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (errors.confirmPassword) setErrors((p) => ({ ...p, confirmPassword: '' }));
                  }}
                  error={errors.confirmPassword}
                  required
                />

                {/* Requirements Checklist */}
                <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-900/60 border border-gray-200/60 dark:border-gray-800 text-xs space-y-2 text-gray-600 dark:text-gray-400">
                  <span className="font-medium text-gray-700 dark:text-gray-300 block mb-1">
                    Password Requirements:
                  </span>
                  <div className="flex items-center gap-2">
                    {password.length >= 6 ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    )}
                    <span className={password.length >= 6 ? 'text-emerald-600 dark:text-emerald-400 font-medium' : ''}>
                      At least 6 characters
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {password && confirmPassword && password === confirmPassword ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    )}
                    <span
                      className={
                        password && confirmPassword && password === confirmPassword
                          ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                          : ''
                      }
                    >
                      Passwords match
                    </span>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 text-base font-semibold shadow-lg shadow-primary-500/20"
                  loading={isLoading}
                >
                  Reset Password
                </Button>
              </motion.form>
            )}
          </AnimatePresence>
        </GlassCard>
      </div>
    </motion.div>
  );
}