import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import api from '@/lib/axios';

export default function VerifyPayment() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your payment...');

  const reference = searchParams.get('reference') || searchParams.get('trxref');

  useEffect(() => {
    if (!reference) {
      setStatus('error');
      setMessage('No payment reference found.');
      return;
    }

    const verify = async () => {
      try {
        const { data } = await api.get(`/payments/verify/${reference}`);
        if (data.success && data.data.status === 'completed') {
          setStatus('success');
          setMessage('Payment successful! You are now enrolled.');
          // Automatically redirect to student dashboard after 3 seconds
          setTimeout(() => {
            navigate('/student/dashboard');
          }, 3000);
        } else {
          setStatus('error');
          setMessage('Payment verification failed or is still pending.');
        }
      } catch (error: any) {
        setStatus('error');
        setMessage(error.response?.data?.message || 'Error verifying payment.');
      }
    };

    verify();
  }, [reference, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center py-20 px-4">
      <div className="absolute inset-0 gradient-bg-subtle" />
      <GlassCard className="relative z-10 p-8 max-w-md w-full text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center"
        >
          {status === 'loading' && (
            <Loader2 className="w-16 h-16 text-primary-500 animate-spin mb-6" />
          )}
          {status === 'success' && (
            <CheckCircle className="w-16 h-16 text-green-500 mb-6" />
          )}
          {status === 'error' && (
            <XCircle className="w-16 h-16 text-red-500 mb-6" />
          )}

          <h1 className="text-2xl font-bold mb-4">
            {status === 'loading' ? 'Verifying Payment' : 
             status === 'success' ? 'Payment Verified!' : 'Payment Failed'}
          </h1>
          <p className="text-gray-500 mb-8">{message}</p>

          {status === 'success' ? (
            <p className="text-sm text-gray-400">Redirecting to your dashboard...</p>
          ) : status === 'error' ? (
            <div className="flex gap-4 w-full">
              <Button variant="outline" className="flex-1" onClick={() => navigate(-1)}>
                Go Back
              </Button>
              <Link to="/contact" className="flex-1">
                <Button className="w-full">Support</Button>
              </Link>
            </div>
          ) : null}
        </motion.div>
      </GlassCard>
    </div>
  );
}
