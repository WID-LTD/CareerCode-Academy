import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, MoreHorizontal, Shield, Ban, UserCheck, Mail, Trash2 } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

const users = [
  { name: 'Sarah Johnson', email: 'sarah@example.com', role: 'student', status: 'active', joined: '2025-01-10', courses: 4, avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop' },
  { name: 'Dr. Alex Rivera', email: 'alex@example.com', role: 'instructor', status: 'active', joined: '2024-11-01', courses: 6, avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop' },
  { name: 'Michael Chen', email: 'michael@example.com', role: 'student', status: 'active', joined: '2025-02-20', courses: 2, avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop' },
  { name: 'Maya Patel', email: 'maya@example.com', role: 'instructor', status: 'active', joined: '2024-12-15', courses: 4, avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop' },
  { name: 'James Wilson', email: 'james@example.com', role: 'student', status: 'suspended', joined: '2025-03-05', courses: 1, avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop' },
  { name: 'Admin User', email: 'admin@careercode.com', role: 'admin', status: 'active', joined: '2024-10-01', courses: 0, avatar: '' },
];

export default function AdminUsers() {
  const [search, setSearch] = useState('');

  const filtered = users.filter(u => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">User Management</h1>
          <p className="text-gray-500">Manage all platform users, roles, and permissions.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" icon={<Filter className="w-4 h-4" />}>Filter</Button>
          <Button icon={<UserCheck className="w-4 h-4" />}>Invite User</Button>
        </div>
      </div>

      <div className="mb-6">
        <Input icon={<Search className="w-4 h-4" />} placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-xs text-gray-500 uppercase tracking-wider">
              <th className="text-left pb-3 pl-3">User</th>
              <th className="text-left pb-3">Role</th>
              <th className="text-left pb-3">Status</th>
              <th className="text-left pb-3">Joined</th>
              <th className="text-left pb-3">Courses</th>
              <th className="text-right pb-3 pr-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {filtered.map((user) => (
              <tr key={user.email} className="group hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
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
                  <Badge variant={user.role === 'admin' ? 'danger' : user.role === 'instructor' ? 'primary' : 'default'} size="sm">
                    {user.role}
                  </Badge>
                </td>
                <td className="py-3">
                  <Badge variant={user.status === 'active' ? 'success' : 'warning'} size="sm">{user.status}</Badge>
                </td>
                <td className="py-3 text-sm text-gray-500">{user.joined}</td>
                <td className="py-3 text-sm text-gray-500">{user.courses}</td>
                <td className="py-3 pr-3 text-right">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="sm" icon={<Mail className="w-3.5 h-3.5" />} />
                    <Button variant="ghost" size="sm" icon={<Shield className="w-3.5 h-3.5" />} />
                    <Button variant="ghost" size="sm" icon={<Ban className="w-3.5 h-3.5" />} />
                    <Button variant="ghost" size="sm" icon={<Trash2 className="w-3.5 h-3.5 text-red-500" />} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
