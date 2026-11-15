import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../lib/axios';
import { GlassCard } from '../components/ui/GlassCard';
import { Button } from '../components/ui/Button';
import { Loader } from '../components/ui/Loader';
import { CheckCircle, XCircle, ArrowRight, RefreshCw, Receipt } from 'lucide-react';

export default function VerifyPayment() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const reference = searchParams.get('reference') || searchParams.get('trxref');
  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [courseSlug, setCourseSlug] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (!reference) {
      setState('error');
      setMessage('No payment reference found. Please try again from checkout.');
      return;
    }
    verifyPayment();
  }, [reference]);

  useEffect(() => {
    if (state === 'success' && countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
    if (state === 'success' && countdown === 0) {
      navigate(courseSlug ? `/student/courses/${courseSlug}` : '/student/dashboard');
    }
  }, [state, countdown, navigate, courseSlug]);

  const verifyPayment = async () => {
    setState('loading');
    setMessage('Contacting the payment provider…');
    try {
      const { data } = await api.get(`/payments/verify/${reference}`);
      let payment = data.data;
      if (payment?.course_slug) setCourseSlug(payment.course_slug);

      if (payment?.status === 'completed') {
        setState('success');
        setMessage('Payment verified successfully!');
        return;
      }
      if (payment?.status === 'failed') {
        setState('error');
        setMessage('The payment provider says this transaction failed. You have not been charged for a successful enrollment.');
        return;
      }

      // The provider may need a few seconds to settle. Poll the database-only
      // status endpoint so we do not hammer the provider API.
      setMessage('Payment received. Waiting for the provider to confirm…');
      for (let attempt = 0; attempt < 20; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 2500));
        try {
          const statusRes = await api.get(`/payments/status/${reference}`);
          payment = statusRes.data.data;
          if (payment?.course_slug) setCourseSlug(payment.course_slug);
          if (payment?.status === 'completed') {
            setState('success');
            setMessage('Payment verified successfully!');
            return;
          }
          if (payment?.status === 'failed') {
            setState('error');
            setMessage('The payment provider says this transaction failed. Please try again or contact support.');
            return;
          }
          setMessage(`Still confirming with the provider… (${attempt + 1}/20)`);
        } catch {
          // Keep polling through transient errors.
        }
      }
      setState('error');
      setMessage('Payment is still processing. We have not marked it as failed. Press Try Again in a moment, or contact support with your reference.');
    } catch (error: any) {
      setState('error');
      setMessage(error?.response?.data?.message || error?.response?.data?.error || 'Payment verification failed');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Background Orbs */}
      <div className={`absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-[120px] pointer-events-none transition-colors duration-1000 ${
        state === 'success' ? 'bg-emerald-500/20' : state === 'error' ? 'bg-red-500/20' : 'bg-blue-500/20'
      }`} />
      <div className={`absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-[120px] pointer-events-none transition-colors duration-1000 ${
        state === 'success' ? 'bg-emerald-400/10' : state === 'error' ? 'bg-red-400/10' : 'bg-purple-500/20'
      }`} />

      <GlassCard className="max-w-md w-full p-0 overflow-hidden relative z-10 border-gray-200 dark:border-white/10 shadow-2xl bg-white dark:bg-gray-900/60">
        
        {/* Loading State */}
        {state === 'loading' && (
          <div className="p-10 text-center">
            <div className="relative w-24 h-24 mx-auto mb-6">
              <div className="absolute inset-0 rounded-full border-4 border-gray-100 dark:border-gray-800" />
              <div className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <RefreshCw className="w-8 h-8 text-blue-500 animate-pulse" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Verifying Payment</h2>
            <p className="text-gray-500 dark:text-gray-400">Please wait while we confirm your transaction with the bank...</p>
            
            <div className="mt-8 space-y-3">
              <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 w-full origin-left animate-[scale-x_2s_ease-in-out_infinite]" />
              </div>
            </div>
          </div>
        )}

        {/* Success State */}
        {state === 'success' && (
          <div className="text-center animate-in fade-in zoom-in duration-500">
            <div className="bg-gradient-to-b from-emerald-50 to-white dark:from-emerald-500/10 dark:to-transparent p-10 pb-6 border-b border-gray-100 dark:border-white/5">
              <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center mx-auto mb-6 ring-4 ring-white dark:ring-gray-900 shadow-xl shadow-emerald-500/20">
                <CheckCircle className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Payment Successful!</h2>
              <p className="text-emerald-600 dark:text-emerald-400 font-medium">{message}</p>
            </div>
            
            <div className="p-8 bg-gray-50 dark:bg-black/20">
              <div className="flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400 mb-6">
                <Receipt className="w-4 h-4" />
                <span className="text-sm font-medium">Receipt confirmed</span>
              </div>
              
              <Link to={courseSlug ? `/student/courses/${courseSlug}` : '/student/dashboard'} className="block w-full">
                <Button className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 group">
                  Go to Dashboard 
                  <span className="bg-emerald-700 rounded px-2 py-0.5 ml-2 text-xs font-mono group-hover:bg-emerald-800 transition-colors">
                    {countdown}s
                  </span>
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Error State */}
        {state === 'error' && (
          <div className="text-center animate-in fade-in zoom-in duration-300">
            <div className="bg-gradient-to-b from-red-50 to-white dark:from-red-500/10 dark:to-transparent p-10 pb-6 border-b border-gray-100 dark:border-white/5">
              <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center mx-auto mb-6 ring-4 ring-white dark:ring-gray-900 shadow-xl shadow-red-500/20">
                <XCircle className="w-10 h-10 text-red-600 dark:text-red-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Verification Failed</h2>
              <p className="text-red-600 dark:text-red-400 font-medium">{message}</p>
            </div>
            
            <div className="p-8 bg-gray-50 dark:bg-black/20">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Don't worry, if you were charged, your money will be automatically refunded by your bank.
              </p>
              
              <div className="flex flex-col gap-3">
                <Button 
                  onClick={verifyPayment} 
                  variant="outline" 
                  className="w-full h-12 border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
                <Link to="/courses" className="block w-full">
                  <Button className="w-full h-12">
                    Return to Courses
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  );
}

