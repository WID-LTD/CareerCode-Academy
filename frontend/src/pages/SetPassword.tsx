import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Code2, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import api from '@/lib/axios';
import toast from 'react-hot-toast';

export default function SetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setIsLoading(true);
    try {
      await api.post('/auth/set-password', { token, password });
      toast.success('Password set successfully! You can now log in.');
      navigate('/login');
    } catch {
      toast.error('Invalid or expired setup link. Please contact support.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <section className="min-h-screen flex items-center justify-center py-20 relative">
        <div className="absolute inset-0 gradient-bg-subtle" />
        <div className="max-w-md w-full mx-auto px-4 relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2 mb-6">
              <div className="w-10 h-10 gradient-bg rounded-xl flex items-center justify-center">
                <Code2 className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold gradient-text">CareerCode</span>
            </Link>
            <h1 className="text-2xl font-bold mb-2">Set Your Password</h1>
            <p className="text-gray-500">Your instructor account is ready. Create a password to get started.</p>
          </motion.div>

          <GlassCard className="p-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Password"
                autoComplete="new-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="At least 6 characters"
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
              <Input
                label="Confirm Password"
                autoComplete="new-password"
                type="password"
                placeholder="Re-enter your password"
                icon={<CheckCircle className="w-4 h-4" />}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              <Button type="submit" className="w-full" loading={isLoading}>Set Password</Button>
            </form>
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
