import React, { useState, useEffect } from 'react';
import { api } from '../../lib/axios';
import { motion } from 'framer-motion';
import { Award, Download, Share2, Calendar, ExternalLink, Search } from 'lucide-react';
import { GlassCard } from '../../components/ui/GlassCard';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Loader } from '../../components/ui/Loader';
import { formatDate } from '../../lib/utils';
import toast from 'react-hot-toast';

export default function Certificate() {
  const [certificates, setCertificates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifyCode, setVerifyCode] = useState('');
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    loadCertificates();
  }, []);

  const loadCertificates = async () => {
    try {
      const { data } = await api.get('/certificates');
      setCertificates(data.data || []);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader size="lg" />
      </div>
    );
  }

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
      <GlassCard className="mb-8">
        <h2 className="text-white font-semibold mb-3 flex items-center gap-2">
          <Search className="w-4 h-4 text-blue-400" />
          Verify a Certificate
        </h2>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Enter certificate verification code"
            value={verifyCode}
            onChange={(e) => setVerifyCode(e.target.value)}
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50"
            onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
          />
          <Button onClick={handleVerify} disabled={verifying}>
            {verifying ? <Loader size="sm" /> : 'Verify'}
          </Button>
        </div>
        {verifyResult && (
          <div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
            <div className="flex items-center gap-2 text-emerald-400 font-medium">
              <Award className="w-5 h-5" />
              Valid Certificate
            </div>
            <p className="text-gray-300 text-sm mt-1">
              {verifyResult.user?.name} completed "{verifyResult.course?.title}" on {formatDate(verifyResult.issued_at)}
            </p>
          </div>
        )}
      </GlassCard>

      {/* Certificate List */}
      {certificates.length === 0 ? (
        <GlassCard className="text-center py-12">
          <Award className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No Certificates Yet</h3>
          <p className="text-gray-500 mb-6">Complete a course to earn your first certificate.</p>
          <Button onClick={() => window.location.href = '/student/courses'}>
            View My Courses
          </Button>
        </GlassCard>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {certificates.map((item: any, i: number) => {
            const cert = item.certificate || item;
            const course = item.course || {};
            return (
              <motion.div
                key={cert.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <GlassCard className="p-8 text-center relative overflow-hidden" glow>
                  <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/5 rounded-full blur-3xl" />
                  <div className="absolute bottom-0 left-0 w-40 h-40 bg-purple-500/5 rounded-full blur-3xl" />

                  <div className="relative">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-4">
                      <Award className="w-8 h-8 text-white" />
                    </div>

                    <h3 className="text-xl font-bold mb-1">Certificate of Completion</h3>
                    <p className="text-gray-500 text-sm mb-4">This certifies that</p>
                    <p className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 mb-2">
                      {item.user?.name || 'Student'}
                    </p>
                    <p className="text-gray-500 text-sm mb-4">has successfully completed</p>
                    <p className="text-xl font-semibold mb-6 text-white">{course.title || 'Course'}</p>

                    <div className="flex items-center justify-center gap-1 text-sm text-gray-500 mb-6">
                      <Calendar className="w-4 h-4" />
                      Issued: {formatDate(cert.issued_at)}
                    </div>

                    <div className="text-xs text-gray-400 mb-6">
                      Certificate ID: {cert.verification_code}
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
    </motion.div>
  );
}
