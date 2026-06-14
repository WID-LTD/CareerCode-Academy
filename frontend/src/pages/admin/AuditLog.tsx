import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, AlertCircle, RefreshCw, Calendar } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useAdminStore } from '@/store/adminStore';

export default function AdminAuditLog() {
  const { auditLogs, isLoading, error, fetchAuditLogs } = useAdminStore();
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  const filtered = auditLogs.filter((l) =>
    !search ||
    l.action?.toLowerCase().includes(search.toLowerCase()) ||
    l.admin_name?.toLowerCase().includes(search.toLowerCase()) ||
    l.resource_type?.toLowerCase().includes(search.toLowerCase()) ||
    l.details?.toLowerCase().includes(search.toLowerCase())
  );

  const actionColor = (action: string) => {
    const map: Record<string, string> = {
      create: 'text-success-500 bg-success-500/10',
      update: 'text-blue-500 bg-blue-500/10',
      delete: 'text-danger-500 bg-danger-500/10',
      suspend: 'text-amber-500 bg-amber-500/10',
      approve: 'text-emerald-500 bg-emerald-500/10',
      reject: 'text-danger-500 bg-danger-500/10',
    };
    return map[action] || 'text-gray-500 bg-gray-500/10';
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Audit Log</h1>
          <p className="text-gray-500 mt-1">Track all administrative actions.</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => fetchAuditLogs()} icon={<RefreshCw className="w-4 h-4" />} />
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-900/50 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-danger-500 flex-shrink-0" />
          <p className="text-sm text-danger-600 dark:text-danger-400 flex-1">{error}</p>
          <Button size="sm" onClick={() => fetchAuditLogs()}>Retry</Button>
        </div>
      )}

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text" placeholder="Search action, admin, resource..."
          value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 border-0 outline-none focus:ring-2 focus:ring-primary-500/30 text-sm"
        />
      </div>

      <GlassCard className="overflow-hidden" hover={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Admin</th>
                <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Action</th>
                <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Resource</th>
                <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Details</th>
                <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase hidden lg:table-cell">IP</th>
                <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((log) => (
                <tr key={log._id} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary-500/10 flex items-center justify-center text-[10px] font-bold text-primary-500">
                        {log.admin_name?.charAt(0) || '?'}
                      </div>
                      <span className="font-medium">{log.admin_name}</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <span className={`inline-block px-2 py-0.5 rounded-lg text-xs font-medium capitalize ${actionColor(log.action)}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex flex-col">
                      <span className="capitalize text-xs text-gray-500">{log.resource_type}</span>
                      <span className="text-[10px] text-gray-400 font-mono">{log.resource_id?.slice(-8)}</span>
                    </div>
                  </td>
                  <td className="p-3 text-gray-500 text-xs max-w-[250px] truncate hidden md:table-cell">{log.details || '—'}</td>
                  <td className="p-3 text-gray-400 text-[10px] font-mono hidden lg:table-cell">{log.ip_address || '—'}</td>
                  <td className="p-3 text-gray-500 text-xs whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="p-12 text-center text-gray-400">No audit logs found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </motion.div>
  );
}
