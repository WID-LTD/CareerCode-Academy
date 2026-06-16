import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../../lib/axios';
import { useAuthStore } from '../../store/authStore';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import { Loader } from '../../components/ui/Loader';
import toast from 'react-hot-toast';
import { CreditCard, Wallet, Lock, ShieldCheck, CheckCircle, ChevronLeft } from 'lucide-react';
import { optimizeImageUrl } from '@/lib/cloudinary';

const providers = [
  { 
    id: 'paystack', 
    name: 'Paystack', 
    icon: Wallet, 
    color: 'from-blue-500/20 to-cyan-500/10 border-blue-500/50 shadow-blue-500/10',
    ring: 'ring-blue-500',
    text: 'text-blue-400',
    bg: 'bg-blue-400',
    bgAlpha: 'bg-blue-400/20',
    border: 'border-blue-400'
  },
  { 
    id: 'flutterwave', 
    name: 'Flutterwave', 
    icon: CreditCard, 
    color: 'from-purple-500/20 to-pink-500/10 border-purple-500/50 shadow-purple-500/10',
    ring: 'ring-purple-500',
    text: 'text-purple-400',
    bg: 'bg-purple-400',
    bgAlpha: 'bg-purple-400/20',
    border: 'border-purple-400'
  },
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

      if (data.data?.authorizationUrl) {
        window.location.href = data.data.authorizationUrl;
      } else {
        toast.success('Enrolled successfully!');
        navigate('/student/dashboard');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.response?.data?.error || 'Payment failed');
      setProcessing(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-96 h-96 bg-blue-500/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-96 h-96 bg-purple-500/20 rounded-full blur-[100px] pointer-events-none" />
      <Loader size="lg" className="text-blue-500" />
      <p className="mt-6 text-gray-500 font-medium animate-pulse">Preparing your secure checkout...</p>
    </div>
  );

  if (!course) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pt-24 pb-16 relative overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute top-0 inset-x-0 h-96 bg-gradient-to-b from-blue-900/10 to-transparent pointer-events-none" />
      <div className="absolute -top-48 -right-48 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-48 -left-48 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
        
        {/* Back navigation */}
        <Link to={`/courses/${course.slug}`} className="inline-flex items-center text-gray-400 hover:text-white transition-colors mb-8 group">
          <ChevronLeft className="w-5 h-5 mr-1 transform group-hover:-translate-x-1 transition-transform" />
          <span>Back to Course</span>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          
          {/* LEFT COLUMN - Payment Details */}
          <div className="lg:col-span-7 space-y-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Secure Checkout</h1>
              <p className="text-gray-500 dark:text-gray-400">Choose your preferred payment method to complete enrollment.</p>
            </div>

            {/* Payment Providers */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Wallet className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                Payment Method
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {providers.map((p) => {
                  const isSelected = provider === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => setProvider(p.id)}
                      className={`relative overflow-hidden cursor-pointer rounded-2xl p-6 transition-all duration-300 border ${
                        isSelected 
                          ? `bg-gradient-to-br ${p.color} ring-1 ${p.ring} scale-[1.02] shadow-lg shadow-${p.ring.split('-')[1]}-500/10` 
                          : 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-4 relative z-10">
                        <div className={`p-3 rounded-xl ${isSelected ? 'bg-white/90 dark:bg-white/10 shadow-sm' : 'bg-gray-100 dark:bg-gray-800'}`}>
                          <p.icon className={`w-6 h-6 ${isSelected ? p.text : 'text-gray-500 dark:text-gray-400'}`} />
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                          isSelected ? `${p.border} ${p.bgAlpha}` : 'border-gray-300 dark:border-gray-600'
                        }`}>
                          {isSelected && <div className={`w-3 h-3 rounded-full ${p.bg}`} />}
                        </div>
                      </div>
                      
                      <div className="relative z-10">
                        <h3 className={`font-semibold text-lg ${isSelected ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                          {p.name}
                        </h3>
                        <p className={`text-sm mt-1 ${isSelected ? 'text-gray-600 dark:text-gray-300' : 'text-gray-500'}`}>
                          Pay securely via {p.name}
                        </p>
                      </div>
                      
                      {/* Background accent */}
                      {isSelected && (
                        <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-white/20 dark:bg-white/5 rounded-full blur-2xl pointer-events-none" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-2 gap-4 pt-6">
              <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-200 dark:border-emerald-500/10">
                <ShieldCheck className="w-8 h-8 text-emerald-500 dark:text-emerald-400 shrink-0" />
                <div>
                  <h4 className="text-emerald-700 dark:text-emerald-400 font-medium text-sm">Secure Payment</h4>
                  <p className="text-emerald-600/70 dark:text-gray-500 text-xs mt-0.5">256-bit SSL encryption</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-500/5 border border-blue-200 dark:border-blue-500/10">
                <Lock className="w-8 h-8 text-blue-500 dark:text-blue-400 shrink-0" />
                <div>
                  <h4 className="text-blue-700 dark:text-blue-400 font-medium text-sm">Data Protected</h4>
                  <p className="text-blue-600/70 dark:text-gray-500 text-xs mt-0.5">We don't store your card</p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN - Order Summary */}
          <div className="lg:col-span-5">
            <div className="sticky top-24">
              <GlassCard className="p-0 overflow-hidden border-gray-200 dark:border-white/10 shadow-2xl relative bg-white dark:bg-gray-900/50">
                
                {/* Processing Overlay */}
                {processing && (
                  <div className="absolute inset-0 z-20 bg-white/90 dark:bg-gray-950/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-2xl transition-all duration-300">
                    <Loader size="lg" className="text-blue-500 mb-4" />
                    <p className="text-gray-900 dark:text-white font-medium animate-pulse">Connecting to secure gateway...</p>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-2 text-center px-6">Please don't close this window or click back.</p>
                  </div>
                )}

                <div className="p-6 sm:p-8 bg-gradient-to-b from-gray-50 dark:from-white/5 to-transparent">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Order Summary</h2>
                  
                  {/* Course Item */}
                  <div className="flex gap-4 items-start mb-8">
                    <div className="w-24 h-20 rounded-xl bg-gray-100 dark:bg-gray-800 shrink-0 overflow-hidden relative group border border-gray-200 dark:border-gray-700">
                      {course.thumbnail ? (
                        <img src={optimizeImageUrl(course.thumbnail, 120, 90)} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500/10 to-purple-500/10 dark:from-blue-600/20 dark:to-purple-600/20">
                          <span className="text-2xl">📚</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/5 dark:bg-black/20 group-hover:bg-transparent transition-colors" />
                    </div>
                    <div>
                      <h3 className="text-gray-900 dark:text-white font-medium line-clamp-2 leading-snug">{course.title}</h3>
                      <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{course.instructor_name || 'Instructor'}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 uppercase tracking-wider">
                          {course.level}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Receipt Lines */}
                  <div className="space-y-4 text-sm relative">
                    <div className="absolute -left-8 -right-8 top-1/2 border-t border-dashed border-gray-200 dark:border-white/10" />
                    
                    <div className="flex justify-between text-gray-600 dark:text-gray-300">
                      <span>Original Price</span>
                      <span>₦{Number(course.price).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-gray-600 dark:text-gray-400">
                      <span>Platform Fee</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">Free</span>
                    </div>
                    <div className="flex justify-between text-gray-600 dark:text-gray-400 pb-4">
                      <span>Taxes</span>
                      <span>₦0</span>
                    </div>
                    
                    <div className="border-t border-gray-200 dark:border-white/10 pt-4 pb-2">
                      <div className="flex justify-between items-end">
                        <span className="text-gray-800 dark:text-gray-300 font-medium">Total Amount</span>
                        <div className="text-right">
                          <span className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400">
                            ₦{Number(course.price).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 sm:p-8 bg-gray-50 dark:bg-white/5 border-t border-gray-200 dark:border-white/5">
                  <Button
                    onClick={handlePay}
                    disabled={processing}
                    className="w-full h-14 text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg shadow-blue-500/25 transition-all hover:scale-[1.02] disabled:hover:scale-100 disabled:opacity-70 group border-0"
                  >
                    {processing ? (
                      <span className="flex items-center justify-center">
                        <Loader size="sm" className="mr-3 text-white" /> Processing...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center w-full relative">
                        <span>Complete Payment</span>
                        <CheckCircle className="w-5 h-5 absolute right-4 opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:scale-110" />
                      </span>
                    )}
                  </Button>

                  <div className="mt-4 flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400 text-xs">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Guaranteed safe & secure checkout</span>
                  </div>
                </div>
              </GlassCard>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

