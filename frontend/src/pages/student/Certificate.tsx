import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Award, Share2, Calendar, Search, ExternalLink, X, Sparkles } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { formatDate } from '@/lib/utils';
import { PageSkeleton } from '@/components/student/SkeletonLoader';
import toast from 'react-hot-toast';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function isNew(issuedAt: string): boolean {
  return Date.now() - new Date(issuedAt).getTime() < SEVEN_DAYS_MS;
}

export default function Certificate() {
  const [certificates, setCertificates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifyCode, setVerifyCode] = useState('');
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [verifying, setVerifying] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [showCongrats, setShowCongrats] = useState(false);
  const [newCertCount, setNewCertCount] = useState(0);

  useEffect(() => {
    loadCertificates();
  }, [page, pageSize]);

  const loadCertificates = async () => {
    try {
      const { data } = await api.get(`/certificates?page=${page}&limit=${pageSize}`);
      const list = data.data || [];
      setCertificates(list);
      if (data.pagination) {
        setTotalItems(data.pagination.total);
        setTotalPages(data.pagination.pages);
      }

      const newCerts = list.filter((c: any) => isNew(c.issued_at || c.certificate?.issued_at));
      setNewCertCount(newCerts.length);

      if (newCerts.length > 0 && page === 1) {
        setShowCongrats(true);
        toast.success(`🎉 You earned ${newCerts.length} new certificate${newCerts.length > 1 ? 's' : ''}!`, { duration: 5000 });
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!verifyCode.trim()) return;
    setVerifying(true);
    setVerifyResult(null);
    try {
      const { data } = await api.get(`/certificates?code=${verifyCode.trim()}`);
      setVerifyResult(data.data);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Certificate not found');
    } finally {
      setVerifying(false);
    }
  };

  const handleShare = (code: string) => {
    const url = `${window.location.origin}/verify-certificate?code=${code}`;
    navigator.clipboard.writeText(url).then(() => toast.success('Verification link copied!'));
  };

  if (loading) return <PageSkeleton />;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">My Certificates</h1>
        <p className="text-gray-500">
          {certificates.length > 0
            ? `You have earned ${certificates.length} certificate${certificates.length > 1 ? 's' : ''}.`
            : 'Complete courses to earn certificates.'}
        </p>
      </div>

      {/* Certificate Verification */}
      <GlassCard className="mb-8 p-5" hover={false}>
        <h2 className="font-semibold mb-3 flex items-center gap-2">
          <Search className="w-4 h-4 text-primary-500" />
          Verify a Certificate
        </h2>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Enter certificate verification code"
            value={verifyCode}
            onChange={(e) => setVerifyCode(e.target.value)}
            className="flex-1 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary-500/50 focus:ring-2 focus:ring-primary-500/30 transition-all"
            onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
            aria-label="Verification code"
          />
          <Button onClick={handleVerify} loading={verifying}>Verify</Button>
        </div>
        {verifyResult && (
          <div className="mt-4 p-4 bg-success-500/10 border border-success-500/30 rounded-xl">
            <div className="flex items-center gap-2 text-success-600 dark:text-success-400 font-medium">
              <Award className="w-5 h-5" />
              Valid Certificate
            </div>
            <p className="text-gray-500 text-sm mt-1">
              {verifyResult.user?.name} completed &ldquo;{verifyResult.course?.title}&rdquo; on {formatDate(verifyResult.issued_at)}
            </p>
          </div>
        )}
      </GlassCard>

      {/* Certificate List */}
      {certificates.length === 0 ? (
        <GlassCard className="text-center py-12" hover={false}>
          <Award className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Certificates Yet</h3>
          <p className="text-gray-500 mb-6">Complete a course to earn your first certificate.</p>
          <Link to="/student/courses" className="inline-block">
            <Button>View My Courses</Button>
          </Link>
        </GlassCard>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {certificates.map((item: any, i: number) => {
            const cert = item.certificate || item;
            const course = item.course || {};
            const isNewCert = isNew(cert.issued_at);
            return (
              <motion.div
                key={cert.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <GlassCard className="p-8 text-center relative overflow-hidden" glow>
                  <div className="absolute top-0 right-0 w-40 h-40 bg-primary-500/5 rounded-full blur-3xl" />
                  <div className="absolute bottom-0 left-0 w-40 h-40 bg-secondary-500/5 rounded-full blur-3xl" />

                  <div className="relative">
                    {isNewCert && (
                      <span className="absolute -top-2 right-0 px-2 py-0.5 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center gap-1 shadow-sm">
                        <Sparkles className="w-3 h-3" /> NEW
                      </span>
                    )}

                    <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-4">
                      <Award className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-bold mb-1">Certificate of Completion</h3>
                    <p className="text-gray-500 text-sm mb-4">This certifies that</p>
                    <p className="text-2xl font-bold gradient-text mb-2">
                      {item.user?.name || 'Student'}
                    </p>
                    <p className="text-gray-500 text-sm mb-4">has successfully completed</p>
                    <p className="text-xl font-semibold mb-6">{course.title || 'Course'}</p>

                    <div className="flex items-center justify-center gap-1 text-sm text-gray-500 mb-6">
                      <Calendar className="w-4 h-4" />
                      Issued: {formatDate(cert.issued_at)}
                    </div>

                    <div className="text-xs text-gray-400 mb-6 font-mono">
                      ID: {cert.verification_code}
                    </div>

                    <div className="flex items-center justify-center gap-3">
                      <Button variant="outline" size="sm" onClick={() => handleShare(cert.verification_code)}>
                        <Share2 className="w-4 h-4 mr-1" /> Share
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => window.open(`/verify-certificate?code=${cert.verification_code}`, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4 mr-1" /> View
                      </Button>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>
      )}

      <Pagination
        page={page}
        totalPages={totalPages}
        totalItems={totalItems}
        onPageChange={setPage}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
      />

      {/* Congratulations Modal */}
      <AnimatePresence>
        {showCongrats && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="glass-card w-full max-w-sm p-8 rounded-2xl text-center"
            >
              <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-4">
                <Award className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-xl font-bold mb-2">Congratulations! 🎉</h2>
              <p className="text-gray-500 mb-6">
                You earned {newCertCount} new certificate{newCertCount > 1 ? 's' : ''}! Check them out below.
              </p>
              <Button onClick={() => setShowCongrats(false)} className="w-full">View Certificates</Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}