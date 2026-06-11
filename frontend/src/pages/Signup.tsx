import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Mail, Lock, Eye, EyeOff, Code2, GraduationCap, Users } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

const roles = [
  { value: 'student', label: 'Student', icon: GraduationCap, desc: 'I want to learn and build projects' },
  { value: 'instructor', label: 'Instructor', icon: Users, desc: 'I want to teach and mentor students' },
];

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const { register, isLoading } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      await register(name, email, password, role);
    } catch (err: any) {
      const data = err.response?.data;
      if (data?.errors) {
        const firstError = Object.values(data.errors)[0] as string[];
        setErrorMsg(firstError[0]);
      } else {
        setErrorMsg(data?.message || 'An error occurred during registration.');
      }
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <section className="min-h-screen flex items-center justify-center py-20 relative">
        <div className="absolute inset-0 gradient-bg-subtle" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(34,197,94,0.08),transparent_50%)]" />

        <div className="max-w-md w-full mx-auto px-4 relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2 mb-6">
              <div className="w-10 h-10 gradient-bg rounded-xl flex items-center justify-center">
                <Code2 className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold gradient-text">CareerCode</span>
            </Link>
            <h1 className="text-2xl font-bold mb-2">Create Your Account</h1>
            <p className="text-gray-500">Start your journey to becoming a job-ready developer.</p>
          </motion.div>

          <GlassCard className="p-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input label="Full Name" placeholder="John Doe" icon={<User className="w-4 h-4" />} value={name} onChange={(e) => setName(e.target.value)} required />
              <Input label="Email" type="email" placeholder="you@example.com" icon={<Mail className="w-4 h-4" />} value={email} onChange={(e) => setEmail(e.target.value)} required />
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Create a strong password"
                icon={<Lock className="w-4 h-4" />}
                rightIcon={
                  <button type="button" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">I want to join as</label>
                <div className="grid grid-cols-2 gap-3">
                  {roles.map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setRole(r.value)}
                      className={cn(
                        'p-4 rounded-xl border-2 text-left transition-all',
                        role === r.value
                          ? 'border-primary-500 bg-primary-500/5'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      )}
                    >
                      <r.icon className={cn('w-5 h-5 mb-1', role === r.value ? 'text-primary-500' : 'text-gray-400')} />
                      <div className={cn('font-medium text-sm', role === r.value ? 'text-primary-500' : 'text-gray-700 dark:text-gray-300')}>{r.label}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{r.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-xl border border-red-100 dark:border-red-900/50 text-sm text-center">
                  {errorMsg}
                </div>
              )}

              <Button type="submit" className="w-full" loading={isLoading}>Create Account</Button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200 dark:border-gray-800" /></div>
              <div className="relative flex justify-center text-sm"><span className="px-3 bg-white dark:bg-gray-900 text-gray-500">or sign up with</span></div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline">GitHub</Button>
              <Button variant="outline">Google</Button>
            </div>
          </GlassCard>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 dark:text-primary-400 font-semibold hover:underline">Sign in</Link>
          </p>
        </div>
      </section>
    </motion.div>
  );
}
