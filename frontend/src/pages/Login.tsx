import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, Code2, Github, Star, Shield, Award, TrendingUp, Quote } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/hooks/useAuth';
import SEO from '@/components/seo/SEO';
import toast from 'react-hot-toast';

const testimonials = [
  {
    quote: 'CareerCode completely transformed my career. Within 6 months I went from knowing basic HTML to landing a job at Google.',
    name: 'Sarah Johnson',
    role: 'Frontend Developer at Google',
  },
  {
    quote: 'The project-based approach and mentorship helped me build a portfolio that stood out to top tech companies.',
    name: 'Marcus Chen',
    role: 'Full-Stack Developer at Stripe',
  },
];

export default function Login() {
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginTimeout, setLoginTimeout] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { login, isLoading } = useAuth();

  const validate = () => {
    const e: Record<string, string> = {};
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Enter a valid email address';
    if (!password || password.length < 6) e.password = 'Password must be at least 6 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoginTimeout(false);
    const timer = setTimeout(() => setLoginTimeout(true), 30000);
    try {
      await login(email, password);
    } finally {
      clearTimeout(timer);
    }
  };

  return (
    <section className="min-h-screen flex items-center justify-center py-20 relative">
      <SEO title="Login" />
      <div className="absolute inset-0 gradient-bg-subtle" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(99,102,241,0.08),transparent_50%)]" />

      <div className="max-w-5xl w-full mx-auto px-4 relative grid lg:grid-cols-2 gap-8 items-center">
        {/* Left - Form */}
        <div>
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2 mb-6">
              <div className="w-10 h-10 gradient-bg rounded-xl flex items-center justify-center">
                <Code2 className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold gradient-text">CareerCode</span>
            </Link>
            <h1 className="text-2xl font-bold mb-2">Welcome Back</h1>
            <p className="text-gray-600 dark:text-gray-400">Sign in to continue your learning journey.</p>
          </div>

          <GlassCard className="p-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                icon={<Mail className="w-4 h-4" />}
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: '' })); }}
                error={errors.email}
                required
              />
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Enter your password"
                icon={<Lock className="w-4 h-4" />}
                rightIcon={
                  <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
                value={password}
                onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: '' })); }}
                error={errors.password}
                required
              />

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="rounded border-gray-300 text-primary-500 focus:ring-primary-500" />
                  <span className="text-gray-600 dark:text-gray-400">Remember me</span>
                </label>
                <Link to="/forgot-password" className="text-primary-600 dark:text-primary-400 hover:underline">Forgot password?</Link>
              </div>

              <Button type="submit" className="w-full" loading={isLoading}>Sign In</Button>
              {isLoading && loginTimeout && (
                <p className="text-xs text-amber-600 text-center">
                  Still connecting... The server may be starting up.
                </p>
              )}

              <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                <Shield className="w-3 h-3" />
                <span>SSL Encrypted & Secure</span>
              </div>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200 dark:border-gray-800" /></div>
              <div className="relative flex justify-center text-sm"><span className="px-3 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400">or continue with</span></div>
            </div>

            <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
              <Button variant="outline" icon={<Github className="w-4 h-4" />} aria-label="Sign in with GitHub" onClick={() => toast('Social login coming soon')}>GitHub</Button>
              <Button variant="outline" icon={
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              } aria-label="Sign in with Google" onClick={() => window.location.href = `${import.meta.env.VITE_API_URL || '/api/v1'}/auth/google?intent=login`}>Google</Button>
            </div>
          </GlassCard>

          <p className="text-center text-sm text-gray-500 mt-6">
            Don't have an account?{' '}
            <Link to="/signup" state={location.state} className="text-primary-600 dark:text-primary-400 font-semibold hover:underline">Create one</Link>
          </p>
        </div>

        {/* Right - Trust & Social Proof */}
        <div className="hidden lg:block space-y-6">
          <div className="glass-card p-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold gradient-text tabular-nums">15K+</div>
                <div className="text-xs text-gray-500 mt-1">Students</div>
              </div>
              <div>
                <div className="text-2xl font-bold gradient-text tabular-nums">4.9</div>
                <div className="text-xs text-gray-500 mt-1">Avg Rating</div>
              </div>
              <div>
                <div className="text-2xl font-bold gradient-text tabular-nums">95%</div>
                <div className="text-xs text-gray-500 mt-1">Placement</div>
              </div>
            </div>
          </div>

          {testimonials.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
            >
              <GlassCard className="p-5" hover>
                <Quote className="w-6 h-6 text-primary-500/30 mb-2" />
                <p className="text-sm text-gray-600 dark:text-gray-400 italic mb-3">"{t.quote}"</p>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full gradient-bg flex items-center justify-center text-white text-xs font-bold">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{t.name}</p>
                    <p className="text-xs text-gray-500">{t.role}</p>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}

          <div className="flex flex-wrap gap-2">
            <Badge variant="success" size="sm" className="px-3 py-1">
              <Shield className="w-3 h-3" /> 100% Secure
            </Badge>
            <Badge variant="primary" size="sm" className="px-3 py-1">
              <Award className="w-3 h-3" /> Industry Approved
            </Badge>
            <Badge variant="default" size="sm" className="px-3 py-1">
              <TrendingUp className="w-3 h-3" /> Career Guarantee
            </Badge>
          </div>
        </div>
      </div>
    </section>
  );
}
