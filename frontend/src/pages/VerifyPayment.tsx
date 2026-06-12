import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../lib/axios';
import { GlassCard } from '../components/ui/GlassCard';
import { Button } from '../components/ui/Button';
import { Loader } from '../components/ui/Loader';
import { CheckCircle, XCircle, ArrowRight } from 'lucide-react';

export default function VerifyPayment() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const reference = searchParams.get('reference') || searchParams.get('trxref');
  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!reference) {
      setState('error');
      setMessage('No payment reference found');
      return;
    }
    verifyPayment();
  }, [reference]);

  const verifyPayment = async () => {
    try {
      const { data } = await api.post('/payments/verify', { reference });
      if (data.data?.enrollment) {
        setState('success');
        setMessage('Payment verified! You are now enrolled.');
        setTimeout(() => navigate('/student/dashboard'), 3000);
      } else {
        setState('success');
        setMessage('Payment successful!');
        setTimeout(() => navigate('/student/dashboard'), 3000);
      }
    } catch (error: any) {
      setState('error');
      setMessage(error?.response?.data?.error || 'Payment verification failed');
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center px-4">
      <GlassCard className="max-w-md w-full text-center p-8">
        {state === 'loading' && (
          <div className="py-8">
            <Loader size="lg" className="mx-auto mb-4" />
            <p className="text-white text-lg font-medium">Verifying your payment...</p>
            <p className="text-gray-500 text-sm mt-2">Please wait while we confirm your transaction</p>
          </div>
        )}

        {state === 'success' && (
          <div className="py-8">
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Payment Successful!</h2>
            <p className="text-gray-400">{message}</p>
            <p className="text-gray-600 text-xs mt-4">Redirecting to dashboard...</p>
            <Link to="/student/dashboard">
              <Button className="mt-6">
                Go to Dashboard <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        )}

        {state === 'error' && (
          <div className="py-8">
            <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-10 h-10 text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Verification Failed</h2>
            <p className="text-gray-400">{message}</p>
            <div className="flex gap-3 mt-6 justify-center">
              <Link to="/student/dashboard">
                <Button variant="outline">Go Back</Button>
              </Link>
              <Button onClick={() => window.location.href = '/contact'}>
                Contact Support
              </Button>
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
