import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAdminStore } from '@/store/adminStore';

export default function Payments() {
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const { payments, paymentsPagination, isLoading, fetchPayments } = useAdminStore();

  useEffect(() => {
    fetchPayments(currentPage, 15);
  }, [fetchPayments, currentPage]);

  const filtered = payments.filter(
    (p) =>
      p.user_name.toLowerCase().includes(search.toLowerCase()) ||
      p.reference.toLowerCase().includes(search.toLowerCase()) ||
      p.course_title.toLowerCase().includes(search.toLowerCase())
  );

  // Calculate gross completed revenue for currently loaded page
  const pageCompletedRevenue = filtered
    .filter((p) => p.status === 'completed')
    .reduce((sum, p) => sum + parseFloat(p.amount as any), 0);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Payments</h1>
          <p className="text-gray-500">Track and manage all transactions.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-sm text-gray-500">Page Gross Revenue</div>
            <div className="text-2xl font-bold gradient-text">₦{pageCompletedRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <Input
          icon={<Search className="w-4 h-4" />}
          placeholder="Search by user, course, or reference..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading && payments.length === 0 ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto min-h-[350px]">
            <table className="w-full">
              <thead>
                <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-200 dark:border-gray-800">
                  <th className="text-left pb-3 pl-3">Reference</th>
                  <th className="text-left pb-3">User</th>
                  <th className="text-left pb-3">Course</th>
                  <th className="text-left pb-3">Amount</th>
                  <th className="text-left pb-3">Provider</th>
                  <th className="text-left pb-3">Status</th>
                  <th className="text-left pb-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {filtered.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="py-3 pl-3 text-sm font-mono text-gray-500">{payment.reference}</td>
                    <td className="py-3">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{payment.user_name}</div>
                        <div className="text-xs text-gray-500">{payment.user_email}</div>
                      </div>
                    </td>
                    <td className="py-3 text-sm text-gray-500">{payment.course_title}</td>
                    <td className="py-3 text-sm font-semibold text-gray-900 dark:text-white">
                      ₦{parseFloat(payment.amount as any).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 text-sm text-gray-500 uppercase">{payment.provider}</td>
                    <td className="py-3">
                      <Badge
                        variant={
                          payment.status === 'completed'
                            ? 'success'
                            : payment.status === 'pending'
                            ? 'warning'
                            : 'danger'
                        }
                        size="sm"
                      >
                        {payment.status}
                      </Badge>
                    </td>
                    <td className="py-3 text-sm text-gray-500">
                      {new Date(payment.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {paymentsPagination && paymentsPagination.pages > 1 && (
            <div className="flex items-center justify-between mt-6 border-t border-gray-200 dark:border-gray-800 pt-4">
              <span className="text-sm text-gray-500">
                Page {paymentsPagination.page} of {paymentsPagination.pages} ({paymentsPagination.total} total)
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                  icon={<ChevronLeft className="w-4 h-4" />}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= paymentsPagination.pages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  icon={<ChevronRight className="w-4 h-4" />}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}
