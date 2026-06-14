import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../../lib/axios';
import { useAuthStore } from '../../store/authStore';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import { Loader } from '../../components/ui/Loader';
import toast from 'react-hot-toast';
import { CreditCard, Wallet } from 'lucide-react';

const providers = [
  { id: 'paystack', name: 'Paystack', icon: Wallet, color: 'bg-blue-500/10 border-blue-500/30 text-blue-400' },
  { id: 'flutterwave', name: 'Flutterwave', icon: CreditCard, color: 'bg-purple-500/10 border-purple-500/30 text-purple-400' },
];

export default function Checkout() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const courseId = searchParams.get('courseId');
  const [course, setCourse] = useState<any>(null);
  const [provider, setProvider] = useState('paystack');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!courseId) {
      navigate('/courses');
      return;
    }
    loadCourse();
  }, [courseId]);

  const loadCourse = async () => {
    try {
      const { data } = await api.get(`/courses/${courseId}`);
      setCourse(data.data);
    } catch {
      toast.error('Course not found');
      navigate('/courses');
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async () => {
    setProcessing(true);
    try {
      const { data } = await api.post('/payments/initialize', {
        courseId,
        provider,
      });

      if (data.data?.paymentUrl) {
        window.location.href = data.data.paymentUrl;
      } else if (data.data?.autoCompleted) {
        toast.success('Enrolled successfully!');
        navigate('/student/dashboard');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Payment failed');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
      <Loader size="lg" />
    </div>
  );

  if (!course) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pt-20 pb-12">
      <div className="max-w-2xl mx-auto px-4">
        <h1 className="text-2xl font-bold text-white mb-6">Checkout</h1>

        {/* Course Summary */}
        <GlassCard className="mb-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-14 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-600/20 flex items-center justify-center">
              {course.thumbnail ? (
                <img src={course.thumbnail} alt="" className="w-full h-full object-cover rounded-lg" />
              ) : (
                <span className="text-2xl">📚</span>
              )}
            </div>
            <div className="flex-1">
              <h2 className="text-white font-semibold">{course.title}</h2>
              <p className="text-gray-500 text-sm">{course.instructor_name || 'Instructor'}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-white">₦{Number(course.price).toLocaleString()}</p>
            </div>
          </div>
        </GlassCard>

        {/* Payment Method */}
        <GlassCard className="mb-6">
          <h2 className="text-white font-semibold mb-4">Payment Method</h2>
          <div className="space-y-3">
            {providers.map((p) => (
              <button
                key={p.id}
                onClick={() => setProvider(p.id)}
                className={`w-full flex items-center gap-3 p-4 rounded-lg border transition-all ${
                  provider === p.id
                    ? p.color
                    : 'border-white/10 text-gray-400 hover:border-white/20'
                }`}
              >
                <p.icon className="w-5 h-5" />
                <span className="font-medium">{p.name}</span>
                {provider === p.id && (
                  <div className="ml-auto w-5 h-5 rounded-full border-2 border-current flex items-center justify-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-current" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </GlassCard>

        {/* Summary */}
        <GlassCard className="mb-6">
          <h2 className="text-white font-semibold mb-3">Order Summary</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-400">
              <span>Course Price</span>
              <span className="text-white">₦{Number(course.price).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Tax</span>
              <span className="text-emerald-400">Free</span>
            </div>
            <div className="border-t border-white/5 pt-2 flex justify-between font-semibold">
              <span className="text-white">Total</span>
              <span className="text-white">₦{Number(course.price).toLocaleString()}</span>
            </div>
          </div>
        </GlassCard>

        <Button
          className="w-full py-4 text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600"
          onClick={handlePay}
          disabled={processing}
        >
          {processing ? <Loader size="sm" className="mr-2" /> : null}
          Pay with {providers.find(p => p.id === provider)?.name}
        </Button>

        <p className="text-center text-gray-600 text-xs mt-4">
          Your payment is secure. We never store your card details.
        </p>
      </div>
    </div>
  );
}

