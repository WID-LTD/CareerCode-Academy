import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Shield, Ban, Mail, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAdminStore } from '@/store/adminStore';

export default function AdminUsers() {
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const { users, usersPagination, isLoading, fetchUsers, updateUserRole, deleteUser } = useAdminStore();

  useEffect(() => {
    fetchUsers(currentPage, 15);
  }, [fetchUsers, currentPage]);

  const handleRoleChange = async (userId: string, currentRole: string) => {
    const nextRole = currentRole === 'student' ? 'instructor' : currentRole === 'instructor' ? 'admin' : 'student';
    if (confirm(`Are you sure you want to change this user's role to ${nextRole}?`)) {
      try {
        await updateUserRole(userId, nextRole);
      } catch (err: any) {
        alert(err.message || 'Failed to update user role');
      }
    }
  };

  const handleDelete = async (userId: string, name: string) => {
    if (confirm(`Are you sure you want to delete user ${name}? This action is permanent.`)) {
      try {
        await deleteUser(userId);
      } catch (err: any) {
        alert(err.message || 'Failed to delete user');
      }
    }
  };

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">User Management</h1>
          <p className="text-gray-500">Manage all platform users, roles, and permissions.</p>
        </div>
      </div>

      <div className="mb-6">
        <Input
          icon={<Search className="w-4 h-4" />}
          placeholder="Search users by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading && users.length === 0 ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto min-h-[350px]">
            <table className="w-full">
              <thead>
                <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-200 dark:border-gray-800">
                  <th className="text-left pb-3 pl-3">User</th>
                  <th className="text-left pb-3">Role</th>
                  <th className="text-left pb-3">Status</th>
                  <th className="text-left pb-3">Joined</th>
                  <th className="text-right pb-3 pr-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {filtered.map((user) => (
                  <tr key={user.id} className="group hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="py-3 pl-3">
                      <div className="flex items-center gap-3">
                        {user.avatar ? (
                          <img src={user.avatar} alt={user.name} className="w-9 h-9 rounded-full object-cover" />
                        ) : (
                          <div className="w-9 h-9 gradient-bg rounded-full flex items-center justify-center text-white text-sm font-semibold">
                            {user.name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-sm text-gray-900 dark:text-white">{user.name}</div>
                          <div className="text-xs text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3">
                      <Badge
                        variant={user.role === 'admin' ? 'danger' : user.role === 'instructor' ? 'primary' : 'default'}
                        size="sm"
                      >
                        {user.role}
                      </Badge>
                    </td>
                    <td className="py-3">
                      <Badge variant={user.is_verified ? 'success' : 'warning'} size="sm">
                        {user.is_verified ? 'Verified' : 'Pending'}
                      </Badge>
                    </td>
                    <td className="py-3 text-sm text-gray-500">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 pr-3 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Change Role"
                          icon={<Shield className="w-3.5 h-3.5" />}
                          onClick={() => handleRoleChange(user.id, user.role)}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Delete User"
                          icon={<Trash2 className="w-3.5 h-3.5 text-red-500" />}
                          onClick={() => handleDelete(user.id, user.name)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {usersPagination && usersPagination.pages > 1 && (
            <div className="flex items-center justify-between mt-6 border-t border-gray-200 dark:border-gray-800 pt-4">
              <span className="text-sm text-gray-500">
                Page {usersPagination.page} of {usersPagination.pages} ({usersPagination.total} total)
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
                  disabled={currentPage >= usersPagination.pages}
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
