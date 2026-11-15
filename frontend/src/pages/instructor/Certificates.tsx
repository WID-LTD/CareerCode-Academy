import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Award, Download, RefreshCw, ShieldCheck, FileText, Loader2, AlertCircle } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DataTable, Column } from '@/components/ui/DataTable';
import SEO from '@/components/seo/SEO';
import { useInstructorStore, Certificate } from '@/store/instructorStore';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

const statusVariant: Record<string, 'success' | 'warning' | 'danger'> = {
  verified: 'success',
  pending: 'warning',
  invalid: 'danger',
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function Certificates() {
  const { certificates, isLoading, error, fetchCertificates, reissueCertificate } = useInstructorStore();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [localLoading, setLocalLoading] = useState(true);
  const [localError, setLocalError] = useState<string | null>(null);

  React.useEffect(() => {
    loadCertificates();
  }, []);

  const loadCertificates = async () => {
    setLocalLoading(true);
    setLocalError(null);
    try {
      await fetchCertificates();
    } catch (err: any) {
      setLocalError(err?.response?.data?.message || 'Failed to load certificates');
    } finally {
      setLocalLoading(false);
    }
  };

  const total = certificates.length;
  const verified = certificates.filter((c) => c.verificationStatus === 'verified').length;
  const pending = certificates.filter((c) => c.verificationStatus === 'pending').length;

  const handleReissue = async (cert: Certificate) => {
    if (!window.confirm(`Reissue certificate for ${cert.studentName}?`)) return;
    setActionLoading(cert.id);
    try {
      await reissueCertificate(cert.id);
      toast.success('Certificate reissued successfully');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to reissue certificate');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDownload = (cert: Certificate) => {
    if (cert.certificateUrl) {
      toast.success('Download link ready');
      window.open(cert.certificateUrl, '_blank');
    } else {
      toast.error('No certificate link available');
    }
  };

  const handleVerify = (cert: Certificate) => {
    if (cert.verificationStatus === 'verified') {
      toast.success('Certificate is already verified');
    } else {
      toast.success('Verification request submitted');
    }
  };

  const columns: Column<Certificate>[] = [
    {
      key: 'studentName',
      label: 'Student',
      sortable: true,
      render: (cert) => (
        <div className="flex flex-col">
          <span className="font-medium text-gray-900 dark:text-white">{cert.studentName}</span>
          <span className="text-xs text-gray-500">{cert.studentEmail}</span>
        </div>
      ),
      mobileRender: (cert) => (
        <div className="flex items-center justify-between">
          <span className="font-medium text-gray-900 dark:text-white">{cert.studentName}</span>
          <Badge variant={statusVariant[cert.verificationStatus]} size="sm">
            {cert.verificationStatus}
          </Badge>
        </div>
      ),
    },
    {
      key: 'courseTitle',
      label: 'Course',
      sortable: true,
      render: (cert) => (
        <span className="text-gray-700 dark:text-gray-300">{cert.courseTitle}</span>
      ),
    },
    {
      key: 'issueDate',
      label: 'Issue Date',
      sortable: true,
      render: (cert) => (
        <span className="text-gray-600 dark:text-gray-400">{formatDate(cert.issueDate)}</span>
      ),
    },
    {
      key: 'verificationStatus',
      label: 'Status',
      sortable: true,
      render: (cert) => (
        <Badge variant={statusVariant[cert.verificationStatus]} size="sm">
          {cert.verificationStatus}
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      className: 'text-right',
      render: (cert) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            icon={<RefreshCw className="w-4 h-4 text-blue-500" />}
            onClick={() => handleReissue(cert)}
            loading={actionLoading === cert.id}
            title="Reissue certificate"
          />
          <Button
            variant="ghost"
            size="sm"
            icon={<Download className="w-4 h-4 text-green-500" />}
            onClick={() => handleDownload(cert)}
            title="Download certificate"
          />
          <Button
            variant="ghost"
            size="sm"
            icon={<ShieldCheck className={cn('w-4 h-4', cert.verificationStatus === 'verified' ? 'text-green-500' : 'text-gray-400')} />}
            onClick={() => handleVerify(cert)}
            title="Verify certificate"
          />
        </div>
      ),
      mobileRender: (cert) => (
        <div className="flex items-center gap-2 mt-2">
          <Button variant="outline" size="sm" icon={<RefreshCw className="w-4 h-4" />} onClick={() => handleReissue(cert)} loading={actionLoading === cert.id}>
            Reissue
          </Button>
          <Button variant="outline" size="sm" icon={<Download className="w-4 h-4" />} onClick={() => handleDownload(cert)}>
            Download
          </Button>
          <Button variant="outline" size="sm" icon={<ShieldCheck className="w-4 h-4" />} onClick={() => handleVerify(cert)}>
            Verify
          </Button>
        </div>
      ),
    },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <SEO title="Certificates | Instructor" />

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Certificates</h1>
          <p className="text-gray-500">Manage student certificates and verification status.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <GlassCard hover={false} className="p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Award className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{total}</p>
              <p className="text-sm text-gray-500">Total Issued</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard hover={false} className="p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{verified}</p>
              <p className="text-sm text-gray-500">Verified</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard hover={false} className="p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{pending}</p>
              <p className="text-sm text-gray-500">Pending Verification</p>
            </div>
          </div>
        </GlassCard>
      </div>

      {localError ? (
        <GlassCard hover={false} className="p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Failed to load certificates</h3>
            <p className="text-sm text-gray-500 mb-4">{localError}</p>
            <Button onClick={loadCertificates}>
              <RefreshCw className="w-4 h-4 mr-2" /> Retry
            </Button>
          </div>
        </GlassCard>
      ) : (
        <DataTable
          columns={columns}
          data={certificates}
          keyExtractor={(cert) => cert.id}
          isLoading={localLoading}
          emptyTitle="No certificates issued yet"
          emptyDescription="Certificates will appear here once students complete your courses."
          emptyAction={{
            label: 'Refresh',
            onClick: loadCertificates,
          }}
        />
      )}
    </motion.div>
  );
}
