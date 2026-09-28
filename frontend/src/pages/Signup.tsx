import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Mail, Lock, Eye, EyeOff, Code2, GraduationCap, Github, CheckCircle2, ArrowRight, ArrowLeft, Sparkles, BookOpen, Brain, Trophy, Zap } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/hooks/useAuth';
import SEO from '@/components/seo/SEO';
import toast from 'react-hot-toast';

const interests = [
  { label: 'Web Development', icon: Code2, color: 'from-blue-500 to-cyan-500' },
  { label: 'Data Science', icon: Brain, color: 'from-purple-500 to-pink-500' },
  { label: 'Mobile Development', icon: BookOpen, color: 'from-green-500 to-emerald-500' },
  { label: 'DevOps', icon: Zap, color: 'from-orange-500 to-red-500' },
  { label: 'Security', icon: Trophy, color: 'from-red-500 to-rose-500' },
  { label: 'Design', icon: Sparkles, color: 'from-pink-500 to-rose-500' },
];

const steps = [
  { title: 'Account', subtitle: 'Create your credentials' },
  { title: 'Interests', subtitle: 'Choose your learning path' },
  { title: 'Ready!', subtitle: 'Start your journey' },
];

export default function Signup() {
  const location = useLocation();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { register, isLoading } = useAuth();

  const validateStep = () => {
    const e: Record<string, string> = {};
    if (step === 0) {
      if (!name || name.trim().length < 2) e.name = 'Name must be at least 2 characters';
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Enter a valid email address';
      if (!password || password.length < 6) e.password = 'Password must be at least 6 characters';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (step === 0 && !validateStep()) return;
    setStep(Math.min(step + 1, 2));
  };

  const handleBack = () => {
    setStep(Math.max(step - 1, 0));
  };

  const toggleInterest = (label: string) => {
    setSelectedInterests(prev =>
      prev.includes(label) ? prev.filter(i => i !== label) : [...prev, label]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 2) {
      handleNext();
      return;
    }
    setErrorMsg('');
    try {
      await register(name, email, password, 'student');
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

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isPasswordValid = password.length >= 6;
  const isNameValid = name.trim().length >= 2;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <SEO title="Sign Up" description="Create your free account and start learning at CareerCode Academy." />
      <section className="min-h-screen flex items-center justify-center py-20 relative">
        <div className="absolute inset-0 gradient-bg-subtle" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(34,197,94,0.08),transparent_50%)]" />

        <div className="max-w-lg w-full mx-auto px-4 relative">
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

          {/* Step Indicator */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {steps.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  i === step ? 'bg-primary-500/20 text-primary-600 dark:text-primary-400 border border-primary-500/30' :
                  i < step ? 'bg-success-500/10 text-success-500 border border-success-500/20' :
                  'bg-gray-100 dark:bg-gray-800 text-gray-400 border border-transparent'
                }`}>
                  {i < step ? <CheckCircle2 className="w-3 h-3" /> : <span className="w-3 h-3 rounded-full border-2 border-current flex items-center justify-center text-[8px] font-bold">{i + 1}</span>}
                  <span className="hidden xs:inline">{s.title}</span>
                </div>
                {i < steps.length - 1 && (
                  <div className={`w-6 h-px ${i < step ? 'bg-success-500' : 'bg-gray-200 dark:bg-gray-700'}`} />
                )}
              </div>
            ))}
          </div>

          <GlassCard className="p-8">
            <form onSubmit={handleSubmit}>
              <AnimatePresence mode="wait">
                {step === 0 && (
                  <motion.div
                    key="step-0"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-4"
                  >
                    <div>
                      <Input
                        label="Full Name"
                        placeholder="John Doe"
                        icon={<User className="w-4 h-4" />}
                        value={name}
                        onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: '' })); }}
                        error={errors.name}
                        required
                      />
                      {isNameValid && name && (
                        <p className="text-xs text-success-500 mt-1 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Looks good!
                        </p>
                      )}
                    </div>
                    <div>
                      <Input
                        label="Email"
                        type="email"
                        placeholder="you@example.com"
                        icon={<Mail className="w-4 h-4" />}
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: '' })); }}
                        error={errors.email}
                        required
                      />
                      {isEmailValid && email && (
                        <p className="text-xs text-success-500 mt-1 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Valid email
                        </p>
                      )}
                    </div>
                    <div>
                      <Input
                        label="Password"
                        autoComplete="new-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Create a strong password"
                        icon={<Lock className="w-4 h-4" />}
                        rightIcon={
                          <button type="button" onClick={() => setShowPassword(!showPassword)}>
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        }
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: '' })); }}
                        error={errors.password}
                        required
                      />
                      {password && (
                        <div className="flex items-center gap-1 mt-1">
                          <div className={`h-1 flex-1 rounded-full ${isPasswordValid ? 'bg-success-500' : password.length > 0 ? 'bg-amber-500' : 'bg-gray-200'}`} />
                          <span className={`text-xs ${isPasswordValid ? 'text-success-500' : 'text-gray-400'}`}>
                            {isPasswordValid ? 'Strong' : `${password.length}/6 min`}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="p-3 rounded-xl bg-primary-500/5 border border-primary-200 dark:border-primary-800 flex items-center gap-3">
                      <GraduationCap className="w-5 h-5 text-primary-500 flex-shrink-0" />
                      <div>
                        <div className="text-sm font-medium text-primary-700 dark:text-primary-300">Student Account</div>
                        <div className="text-xs text-gray-400">Want to teach? <Link to="/become-instructor" className="text-primary-500 hover:underline">Apply as Instructor</Link></div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {step === 1 && (
                  <motion.div
                    key="step-1"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-4"
                  >
                    <div className="text-center mb-4">
                      <h3 className="font-semibold text-lg">What interests you?</h3>
                      <p className="text-sm text-gray-500">Choose your learning path (select all that apply)</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {interests.map((interest) => {
                        const isSelected = selectedInterests.includes(interest.label);
                        const Icon = interest.icon;
                        return (
                          <button
                            key={interest.label}
                            type="button"
                            onClick={() => toggleInterest(interest.label)}
                            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                              isSelected
                                ? 'border-primary-500 bg-primary-500/10'
                                : 'border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700 bg-gray-50/50 dark:bg-gray-800/30'
                            }`}
                          >
                            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${interest.color} flex items-center justify-center`}>
                              <Icon className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-sm font-medium">{interest.label}</span>
                            {isSelected && <CheckCircle2 className="w-4 h-4 text-primary-500" />}
                          </button>
                        );
                      })}
                    </div>
                    {selectedInterests.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 justify-center">
                        {selectedInterests.map(i => (
                          <Badge key={i} variant="primary" size="sm">{i}</Badge>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div
                    key="step-2"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="space-y-6 text-center"
                  >
                    <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center mx-auto">
                      <Sparkles className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">You're almost there!</h3>
                      <p className="text-sm text-gray-500">Review your information before we create your account.</p>
                    </div>

                    <div className="space-y-2 text-left">
                      <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-sm">
                        <span className="text-gray-500">Name</span>
                        <span className="font-medium">{name}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-sm">
                        <span className="text-gray-500">Email</span>
                        <span className="font-medium">{email}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-sm">
                        <span className="text-gray-500">Interests</span>
                        <span className="font-medium">{selectedInterests.length > 0 ? selectedInterests.join(', ') : 'None selected'}</span>
                      </div>
                    </div>

                    {errorMsg && (
                      <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-xl border border-red-100 dark:border-red-900/50 text-sm">
                        {errorMsg}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200 dark:border-gray-800">
                {step > 0 ? (
                  <Button type="button" variant="outline" onClick={handleBack} icon={<ArrowLeft className="w-4 h-4" />}>
                    Back
                  </Button>
                ) : (
                  <div />
                )}
                <Button type="submit" loading={isLoading && step === 2}>
                  {step < 2 ? (
                    <>Continue <ArrowRight className="w-4 h-4" /></>
                  ) : (
                    'Create Account'
                  )}
                </Button>
              </div>
            </form>

            {step === 0 && (
              <>
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200 dark:border-gray-800" /></div>
                  <div className="relative flex justify-center text-sm"><span className="px-3 bg-white dark:bg-gray-900 text-gray-500">or sign up with</span></div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" icon={<Github className="w-4 h-4" />} onClick={() => toast('Social login coming soon')}>GitHub</Button>
                  <Button variant="outline" icon={
                    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                  } onClick={() => window.location.href = `${import.meta.env.VITE_API_URL || '/api/v1'}/auth/google?intent=signup`}>Google</Button>
                </div>
              </>
            )}
          </GlassCard>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" state={location.state} className="text-primary-600 dark:text-primary-400 font-semibold hover:underline">Sign in</Link>
          </p>
        </div>
      </section>
    </motion.div>
  );
}
