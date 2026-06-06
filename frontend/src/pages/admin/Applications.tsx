import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Eye, Download, CheckCircle, XCircle, ExternalLink, X, FileText } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import api from '@/lib/axios';

interface Application {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  country: string;
  state: string;
  professional_title: string;
  years_experience: string;
  specialization: string;
  github_url: string;
  linkedin_url: string;
  portfolio_url: string;
  resume_url: string;
  profile_image_url: string;
  bio: string;
  teaching_experience: string;
  interested_courses: string;
  availability: string;
  motivation: string;
  status: 'pending' | 'approved' | 'rejected';
  notes: string;
  created_at: string;
}

export default function AdminApplications() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [notes, setNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchApplications = async () => {
    setIsLoading(true);
    try {
      const url = statusFilter !== 'all' ? `/admin/applications?status=${statusFilter}` : '/admin/applications';
      const { data } = await api.get(url);
      setApplications(data.data || []);
    } catch (error) {
      console.error('Failed to fetch applications', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [statusFilter]);

  const handleUpdateStatus = async (status: 'approved' | 'rejected') => {
    if (!selectedApp) return;
    setIsUpdating(true);
    try {
      const { data } = await api.put(`/admin/applications/${selectedApp.id}`, {
        status,
        notes
      });
      // Update local state
      setApplications(applications.map(app => app.id === selectedApp.id ? data.data : app));
      setSelectedApp(data.data);
    } catch (error) {
      console.error('Failed to update application', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedApp) return;
    setIsUpdating(true);
    try {
      const { data } = await api.put(`/admin/applications/${selectedApp.id}`, {
        notes
      });
      setApplications(applications.map(app => app.id === selectedApp.id ? data.data : app));
      setSelectedApp(data.data);
    } catch (error) {
      console.error('Failed to save notes', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const openModal = (app: Application) => {
    setSelectedApp(app);
    setNotes(app.notes || '');
  };

  const filteredApps = applications.filter(app => 
    app.full_name.toLowerCase().includes(search.toLowerCase()) || 
    app.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Instructor Applications</h1>
          <p className="text-gray-500">Review and manage aspiring instructors.</p>
        </div>
      </div>

      <GlassCard className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <Input
              placeholder="Search by name or email..."
              icon={<Search className="w-4 h-4" />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-primary-500/20 outline-none min-w-[150px]"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 text-sm text-gray-500">
                <th className="pb-3 font-medium px-4">Applicant</th>
                <th className="pb-3 font-medium px-4">Specialization</th>
                <th className="pb-3 font-medium px-4">Experience</th>
                <th className="pb-3 font-medium px-4">Applied On</th>
                <th className="pb-3 font-medium px-4">Status</th>
                <th className="pb-3 font-medium px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-500">Loading applications...</td>
                </tr>
              ) : filteredApps.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-500">No applications found.</td>
                </tr>
              ) : (
                filteredApps.map((app) => (
                  <tr key={app.id} className="border-b border-gray-100 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/20">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
                          {app.profile_image_url ? (
                            <img src={`http://localhost:3000${app.profile_image_url}`} alt="avatar" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-primary-100 text-primary-600 font-bold">
                              {app.full_name.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">{app.full_name}</div>
                          <div className="text-gray-500 text-xs">{app.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-medium">{app.specialization}</div>
                      <div className="text-gray-500 text-xs">{app.professional_title}</div>
                    </td>
                    <td className="py-4 px-4">{app.years_experience}</td>
                    <td className="py-4 px-4 text-gray-500">{new Date(app.created_at).toLocaleDateString()}</td>
                    <td className="py-4 px-4">
                      <Badge variant={app.status === 'approved' ? 'success' : app.status === 'rejected' ? 'danger' : 'warning'}>
                        {app.status}
                      </Badge>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <Button variant="outline" size="sm" onClick={() => openModal(app)}>
                        <Eye className="w-4 h-4 mr-2" /> Review
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* Application Details Modal */}
      <AnimatePresence>
        {selectedApp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setSelectedApp(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold">Application Review</h2>
                  <Badge variant={selectedApp.status === 'approved' ? 'success' : selectedApp.status === 'rejected' ? 'danger' : 'warning'}>
                    {selectedApp.status}
                  </Badge>
                </div>
                <button
                  onClick={() => setSelectedApp(null)}
                  className="p-2 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1 grid md:grid-cols-3 gap-6">
                
                {/* Left Column: Details */}
                <div className="md:col-span-2 space-y-6">
                  <div className="flex items-center gap-4">
                    {selectedApp.profile_image_url ? (
                      <img src={`http://localhost:3000${selectedApp.profile_image_url}`} alt="avatar" className="w-20 h-20 rounded-xl object-cover border border-gray-200" />
                    ) : (
                      <div className="w-20 h-20 rounded-xl bg-gray-200 flex items-center justify-center text-3xl font-bold text-gray-400">
                        {selectedApp.full_name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <h3 className="text-2xl font-bold">{selectedApp.full_name}</h3>
                      <p className="text-gray-500">{selectedApp.professional_title}</p>
                      <p className="text-gray-500 text-sm flex items-center gap-3 mt-1">
                        <span>{selectedApp.email}</span>
                        <span>•</span>
                        <span>{selectedApp.phone}</span>
                        <span>•</span>
                        <span>{selectedApp.state}, {selectedApp.country}</span>
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-800/30 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                    <div>
                      <span className="block text-xs text-gray-500 uppercase font-semibold tracking-wider mb-1">Specialization</span>
                      <span className="font-medium">{selectedApp.specialization}</span>
                    </div>
                    <div>
                      <span className="block text-xs text-gray-500 uppercase font-semibold tracking-wider mb-1">Experience</span>
                      <span className="font-medium">{selectedApp.years_experience}</span>
                    </div>
                    <div>
                      <span className="block text-xs text-gray-500 uppercase font-semibold tracking-wider mb-1">Availability</span>
                      <span className="font-medium">{selectedApp.availability}</span>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Professional Bio</h4>
                    <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed bg-gray-50 dark:bg-gray-800/30 p-4 rounded-xl">
                      {selectedApp.bio || 'Not provided'}
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Teaching Experience</h4>
                    <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                      {selectedApp.teaching_experience || 'Not provided'}
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Interested Courses to Teach</h4>
                    <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                      {selectedApp.interested_courses || 'Not provided'}
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Motivation</h4>
                    <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed italic border-l-4 border-primary-500 pl-4 py-2">
                      "{selectedApp.motivation}"
                    </p>
                  </div>
                </div>

                {/* Right Column: Links & Actions */}
                <div className="space-y-6">
                  <div className="bg-gray-50 dark:bg-gray-800/50 p-5 rounded-xl border border-gray-200 dark:border-gray-700">
                    <h4 className="font-bold mb-4 text-sm uppercase tracking-wider text-gray-500">Resources</h4>
                    <div className="space-y-3">
                      {selectedApp.resume_url && (
                        <a 
                          href={`http://localhost:3000${selectedApp.resume_url}`} 
                          target="_blank" rel="noreferrer"
                          className="flex items-center gap-3 w-full p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-primary-500 transition-colors"
                        >
                          <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center">
                            <Download className="w-4 h-4" />
                          </div>
                          <span className="font-medium text-sm flex-1">Download Resume</span>
                        </a>
                      )}
                      
                      {selectedApp.portfolio_url && (
                        <a 
                          href={selectedApp.portfolio_url} 
                          target="_blank" rel="noreferrer"
                          className="flex items-center gap-3 w-full p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-primary-500 transition-colors"
                        >
                          <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
                            <ExternalLink className="w-4 h-4" />
                          </div>
                          <span className="font-medium text-sm flex-1">View Portfolio</span>
                        </a>
                      )}

                      {selectedApp.github_url && (
                        <a 
                          href={selectedApp.github_url} 
                          target="_blank" rel="noreferrer"
                          className="flex items-center gap-3 w-full p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-primary-500 transition-colors"
                        >
                          <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 flex items-center justify-center">
                            <ExternalLink className="w-4 h-4" />
                          </div>
                          <span className="font-medium text-sm flex-1">View GitHub</span>
                        </a>
                      )}

                      {selectedApp.linkedin_url && (
                        <a 
                          href={selectedApp.linkedin_url} 
                          target="_blank" rel="noreferrer"
                          className="flex items-center gap-3 w-full p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-primary-500 transition-colors"
                        >
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                            <ExternalLink className="w-4 h-4" />
                          </div>
                          <span className="font-medium text-sm flex-1">View LinkedIn</span>
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900/10 p-5 rounded-xl border border-blue-100 dark:border-blue-900/30">
                    <h4 className="font-bold mb-3 text-sm text-blue-900 dark:text-blue-100">Admin Notes</h4>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add private review notes here..."
                      className="w-full h-24 p-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-white dark:bg-gray-900 text-sm resize-none focus:ring-2 focus:ring-blue-500 outline-none mb-3"
                    />
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full bg-white dark:bg-gray-900"
                      onClick={handleSaveNotes}
                      loading={isUpdating}
                    >
                      Save Notes
                    </Button>
                  </div>

                  {selectedApp.status === 'pending' && (
                    <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
                      <Button 
                        variant="outline" 
                        className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:hover:bg-red-900/20"
                        onClick={() => handleUpdateStatus('rejected')}
                        loading={isUpdating}
                      >
                        <XCircle className="w-4 h-4 mr-2" /> Reject
                      </Button>
                      <Button 
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => handleUpdateStatus('approved')}
                        loading={isUpdating}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" /> Approve
                      </Button>
                    </div>
                  )}

                  {selectedApp.status !== 'pending' && (
                    <div className="text-center pt-4 border-t border-gray-200 dark:border-gray-800 text-sm text-gray-500">
                      This application has already been {selectedApp.status}.
                    </div>
                  )}
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
