import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Eye, CheckCircle, XCircle, X, BookOpen, Clock } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import api from '@/lib/axios';

interface CourseProposal {
  id: string;
  instructor_name: string;
  instructor_email: string;
  title: string;
  category: string;
  level: string;
  description: string;
  learning_outcomes: string;
  prerequisites: string;
  duration: number;
  lesson_count: number;
  teaching_format: string;
  technologies: string;
  projects: string;
  recommended_price: string;
  thumbnail_url: string;
  status: 'pending' | 'approved' | 'rejected';
  notes: string;
  created_at: string;
  updated_at: string;
}

export default function AdminCourseProposals() {
  const [proposals, setProposals] = useState<CourseProposal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedProposal, setSelectedProposal] = useState<CourseProposal | null>(null);
  const [notes, setNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchProposals = async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get('/admin/course-proposals');
      let filtered = data.data;
      if (statusFilter !== 'all') {
        filtered = filtered.filter((p: CourseProposal) => p.status === statusFilter);
      }
      setProposals(filtered || []);
    } catch (error) {
      console.error('Failed to fetch course proposals', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProposals();
  }, [statusFilter]);

  const handleUpdateStatus = async (status: 'approved' | 'rejected') => {
    if (!selectedProposal) return;
    setIsUpdating(true);
    try {
      const { data } = await api.put(`/admin/course-proposals/${selectedProposal.id}`, {
        status,
        notes
      });
      setProposals(proposals.map(p => p.id === selectedProposal.id ? data.data : p));
      setSelectedProposal(data.data);
    } catch (error) {
      console.error('Failed to update proposal', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedProposal) return;
    setIsUpdating(true);
    try {
      const { data } = await api.put(`/admin/course-proposals/${selectedProposal.id}`, {
        notes
      });
      setProposals(proposals.map(p => p.id === selectedProposal.id ? data.data : p));
      setSelectedProposal(data.data);
    } catch (error) {
      console.error('Failed to save notes', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const openModal = (proposal: CourseProposal) => {
    setSelectedProposal(proposal);
    setNotes(proposal.notes || '');
  };

  const filteredProposals = proposals.filter(p => 
    p.title.toLowerCase().includes(search.toLowerCase()) || 
    p.instructor_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Course Proposals</h1>
          <p className="text-gray-500">Review, approve, or reject instructor course pitches.</p>
        </div>
      </div>

      <GlassCard className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <Input
              placeholder="Search by course title or instructor name..."
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
                <th className="pb-3 font-medium px-4">Course Details</th>
                <th className="pb-3 font-medium px-4">Instructor</th>
                <th className="pb-3 font-medium px-4">Category/Level</th>
                <th className="pb-3 font-medium px-4">Submitted On</th>
                <th className="pb-3 font-medium px-4">Status</th>
                <th className="pb-3 font-medium px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-500">Loading proposals...</td>
                </tr>
              ) : filteredProposals.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-500">No proposals found.</td>
                </tr>
              ) : (
                filteredProposals.map((proposal) => (
                  <tr key={proposal.id} className="border-b border-gray-100 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/20">
                    <td className="py-4 px-4">
                      <div className="font-medium text-gray-900 dark:text-gray-100">{proposal.title}</div>
                      <div className="text-gray-500 text-xs line-clamp-1 max-w-xs">{proposal.description}</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-medium">{proposal.instructor_name}</div>
                      <div className="text-gray-500 text-xs">{proposal.instructor_email}</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="capitalize">{proposal.category}</div>
                      <div className="text-gray-500 text-xs capitalize">{proposal.level}</div>
                    </td>
                    <td className="py-4 px-4 text-gray-500">{new Date(proposal.created_at).toLocaleDateString()}</td>
                    <td className="py-4 px-4">
                      <Badge variant={proposal.status === 'approved' ? 'success' : proposal.status === 'rejected' ? 'danger' : 'warning'}>
                        {proposal.status}
                      </Badge>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <Button variant="outline" size="sm" onClick={() => openModal(proposal)}>
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

      {/* Proposal Details Modal */}
      <AnimatePresence>
        {selectedProposal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setSelectedProposal(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold">Proposal Review</h2>
                  <Badge variant={selectedProposal.status === 'approved' ? 'success' : selectedProposal.status === 'rejected' ? 'danger' : 'warning'}>
                    {selectedProposal.status}
                  </Badge>
                </div>
                <button
                  onClick={() => setSelectedProposal(null)}
                  className="p-2 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1 grid md:grid-cols-3 gap-6">
                
                {/* Left Column: Details */}
                <div className="md:col-span-2 space-y-6">
                  <div>
                    <h3 className="text-2xl font-bold mb-2">{selectedProposal.title}</h3>
                    <p className="text-gray-500 flex items-center gap-3 text-sm">
                      <span className="capitalize">{selectedProposal.category}</span>
                      <span>•</span>
                      <span className="capitalize">{selectedProposal.level}</span>
                      <span>•</span>
                      <span>By {selectedProposal.instructor_name} ({selectedProposal.instructor_email})</span>
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-gray-50 dark:bg-gray-800/30 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                    <div>
                      <span className="block text-xs text-gray-500 uppercase font-semibold mb-1">Duration</span>
                      <span className="font-medium">{selectedProposal.duration} hrs</span>
                    </div>
                    <div>
                      <span className="block text-xs text-gray-500 uppercase font-semibold mb-1">Lessons</span>
                      <span className="font-medium">{selectedProposal.lesson_count}</span>
                    </div>
                    <div>
                      <span className="block text-xs text-gray-500 uppercase font-semibold mb-1">Price</span>
                      <span className="font-medium">${selectedProposal.recommended_price}</span>
                    </div>
                    <div>
                      <span className="block text-xs text-gray-500 uppercase font-semibold mb-1">Format</span>
                      <span className="font-medium">{selectedProposal.teaching_format || 'N/A'}</span>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Description</h4>
                    <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed bg-gray-50 dark:bg-gray-800/30 p-4 rounded-xl">
                      {selectedProposal.description}
                    </p>
                  </div>

                  {selectedProposal.learning_outcomes && (
                    <div>
                      <h4 className="font-semibold mb-2">Learning Outcomes</h4>
                      <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                        {selectedProposal.learning_outcomes}
                      </p>
                    </div>
                  )}

                  {selectedProposal.prerequisites && (
                    <div>
                      <h4 className="font-semibold mb-2">Prerequisites</h4>
                      <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                        {selectedProposal.prerequisites}
                      </p>
                    </div>
                  )}

                  {selectedProposal.technologies && (
                    <div>
                      <h4 className="font-semibold mb-2">Technologies</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedProposal.technologies.split(',').map((tech, i) => (
                          <span key={i} className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-xs rounded-md border border-gray-200 dark:border-gray-700">
                            {tech.trim()}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {selectedProposal.projects && (
                    <div>
                      <h4 className="font-semibold mb-2">Included Projects</h4>
                      <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed italic border-l-4 border-primary-500 pl-4 py-2">
                        {selectedProposal.projects}
                      </p>
                    </div>
                  )}
                </div>

                {/* Right Column: Links & Actions */}
                <div className="space-y-6">
                  <div className="bg-gray-50 dark:bg-gray-800/50 p-5 rounded-xl border border-gray-200 dark:border-gray-700">
                    <h4 className="font-bold mb-4 text-sm uppercase tracking-wider text-gray-500">Thumbnail Preview</h4>
                    <div className="w-full aspect-video bg-gray-200 dark:bg-gray-800 rounded-lg overflow-hidden flex items-center justify-center border border-gray-300 dark:border-gray-700">
                      {selectedProposal.thumbnail_url ? (
                        <img src={selectedProposal.thumbnail_url} alt="Thumbnail" className="w-full h-full object-cover" />
                      ) : (
                        <BookOpen className="w-8 h-8 text-gray-400" />
                      )}
                    </div>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900/10 p-5 rounded-xl border border-blue-100 dark:border-blue-900/30">
                    <h4 className="font-bold mb-3 text-sm text-blue-900 dark:text-blue-100">Admin Notes</h4>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add private review notes here or explain rejection..."
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

                  {selectedProposal.status === 'pending' && (
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

                  {selectedProposal.status !== 'pending' && (
                    <div className="text-center pt-4 border-t border-gray-200 dark:border-gray-800 text-sm text-gray-500 flex flex-col items-center">
                      <Clock className="w-5 h-5 mb-2 text-gray-400" />
                      This proposal was {selectedProposal.status} on {new Date(selectedProposal.updated_at || Date.now()).toLocaleDateString()}.
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
