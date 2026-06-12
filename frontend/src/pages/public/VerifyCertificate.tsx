import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../../lib/axios';
import { GlassCard } from '../../components/ui/GlassCard';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Loader } from '../../components/ui/Loader';
import { Award, Calendar, CheckCircle, XCircle, ExternalLink, Search } from 'lucide-react';
import { formatDate } from '../../lib/utils';

export default function VerifyCertificate() {
  const [searchParams] = useSearchParams();
  const codeFromUrl = searchParams.get('code');
  const [code, setCode] = useState(codeFromUrl || '');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (codeFromUrl) {
      handleVerify(codeFromUrl);
    }
  }, [codeFromUrl]);

  const handleVerify = async (verifyCode?: string) => {
    const searchCode = verifyCode || code;
    if (!searchCode.trim()) return;

    setLoading(true);
    setError('');
    setResult(null);
    setSearched(true);

    try {
      const { data } = await api.get(`/certificates/verify/${searchCode.trim()}`);
      if (data.data) {
        setResult(data.data);
      } else {
        setError('Certificate not found');
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Certificate not found');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a1a] pt-20 pb-12">
      <div className="max-w-2xl mx-auto px-4">
        <div className="text-center mb-8">
          <Award className="w-16 h-16 text-blue-400 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-white mb-2">Certificate Verification</h1>
          <p className="text-gray-500">Verify the authenticity of a CareerCode Academy certificate</p>
        </div>

        {/* Search */}
        <GlassCard className="mb-8">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Enter certificate verification code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500/50"
              onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
            />
            <Button onClick={() => handleVerify()} disabled={loading}>
              {loading ? <Loader size="sm" /> : <Search className="w-4 h-4 mr-1" />}
              Verify
            </Button>
          </div>
        </GlassCard>

        {/* Result */}
        {loading && (
          <div className="flex justify-center py-12">
            <Loader size="lg" />
          </div>
        )}

        {error && (
          <GlassCard className="text-center py-12">
            <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Certificate Not Found</h2>
            <p className="text-gray-500 mb-6">{error}</p>
            <p className="text-gray-600 text-sm">
              Please check the verification code and try again.
            </p>
          </GlassCard>
        )}

        {result && (
          <GlassCard className="p-8 text-center relative overflow-hidden" glow>
            <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl" />

            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10 text-emerald-400" />
              </div>

              <Badge className="bg-emerald-500/20 text-emerald-400 mb-4">Valid Certificate</Badge>

              <h2 className="text-2xl font-bold text-white mb-1">Certificate of Completion</h2>
              <p className="text-gray-500 mb-4">This certifies that</p>
              <p className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 mb-2">
                {result.user?.name || 'Student'}
              </p>
              <p className="text-gray-500 mb-4">has successfully completed</p>
              <p className="text-2xl font-semibold text-white mb-6">
                {result.course?.title || 'a Course'}
              </p>

              <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-4">
                <Calendar className="w-4 h-4" />
                Issued: {formatDate(result.issued_at)}
              </div>

              <div className="inline-block bg-white/5 border border-white/10 rounded-lg px-4 py-2 mb-6">
                <p className="text-xs text-gray-500">Verification Code</p>
                <p className="text-sm text-white font-mono">{result.verification_code}</p>
              </div>

              <div className="flex items-center justify-center gap-2">
                <Button variant="outline" onClick={() => window.print()}>
                  Print
                </Button>
                <Link to="/courses">
                  <Button>
                    Browse Courses <ExternalLink className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </div>
          </GlassCard>
        )}

        {!searched && !codeFromUrl && (
          <GlassCard className="text-center py-8">
            <Search className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500">Enter a certificate verification code above to verify its authenticity.</p>
          </GlassCard>
        )}
      </div>
    </div>
  );
}
