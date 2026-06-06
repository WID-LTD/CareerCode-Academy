import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useInstructorExtendedStore } from '@/store/instructorExtendedStore';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Plus, CheckCircle, Clock, XCircle, BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';

export default function InstructorCourseProposals() {
  const { courseProposals, fetchCourseProposals, createCourseProposal, isLoading } = useInstructorExtendedStore();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '', category: '', level: 'beginner', description: '', learning_outcomes: '', 
    prerequisites: '', duration: '', lesson_count: '', teaching_format: '', 
    technologies: '', projects: '', recommended_price: '', thumbnail_url: '',
    notes: ''
  });

  useEffect(() => {
    fetchCourseProposals();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createCourseProposal({
        ...formData,
        duration: Number(formData.duration) || 0,
        lesson_count: Number(formData.lesson_count) || 0,
        recommended_price: Number(formData.recommended_price) || 0,
      });
      toast.success('Course proposal submitted successfully!');
      setShowForm(false);
      setFormData({
        title: '', category: '', level: 'beginner', description: '', learning_outcomes: '', 
        prerequisites: '', duration: '', lesson_count: '', teaching_format: '', 
        technologies: '', projects: '', recommended_price: '', thumbnail_url: '',
        notes: ''
      });
    } catch (error) {
      toast.error('Failed to submit proposal');
    }
  };

  if (isLoading && courseProposals.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Course Proposals</h1>
          <p className="text-gray-500">Pitch new courses to the admin for approval.</p>
        </div>
        <Button variant="primary" onClick={() => setShowForm(!showForm)}>
          <Plus className="w-5 h-5 mr-2" />
          Submit New Proposal
        </Button>
      </div>

      {showForm && (
        <GlassCard className="p-6 mb-8 border-primary-500/30">
          <h2 className="text-lg font-semibold mb-6">New Course Proposal</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-1">Course Title</label>
                <input required type="text" name="title" value={formData.title} onChange={handleChange} className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Category</label>
                  <input required type="text" name="category" value={formData.category} onChange={handleChange} className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700" placeholder="e.g. Web Dev" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Level</label>
                  <select name="level" value={formData.level} onChange={handleChange} className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea required rows={3} name="description" value={formData.description} onChange={handleChange} className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 resize-none"></textarea>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Learning Outcomes</label>
                <textarea rows={3} name="learning_outcomes" value={formData.learning_outcomes} onChange={handleChange} placeholder="What will students learn?" className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 resize-none"></textarea>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Prerequisites</label>
                <textarea rows={3} name="prerequisites" value={formData.prerequisites} onChange={handleChange} placeholder="What should they know beforehand?" className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 resize-none"></textarea>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Total Duration (hrs)</label>
                  <input type="number" name="duration" value={formData.duration} onChange={handleChange} className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Est. Lesson Count</label>
                  <input type="number" name="lesson_count" value={formData.lesson_count} onChange={handleChange} className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Teaching Format</label>
                  <input type="text" name="teaching_format" value={formData.teaching_format} onChange={handleChange} placeholder="e.g. Video, Text, Interactive" className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Recommended Price ($)</label>
                  <input type="number" name="recommended_price" value={formData.recommended_price} onChange={handleChange} className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Technologies Used</label>
                <input type="text" name="technologies" value={formData.technologies} onChange={handleChange} placeholder="e.g. React, Node, Python" className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Projects Included</label>
                <input type="text" name="projects" value={formData.projects} onChange={handleChange} placeholder="Briefly list projects" className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700" />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Thumbnail Image URL (Optional)</label>
                <input type="url" name="thumbnail_url" value={formData.thumbnail_url} onChange={handleChange} className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700" placeholder="https://..." />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Pitch Notes (Instructor Pitch / Comments)</label>
                <textarea rows={3} name="notes" value={formData.notes} onChange={handleChange} placeholder="Add any private comments or pitch details for the administrator..." className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 resize-none"></textarea>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit" variant="primary">Submit Proposal</Button>
            </div>
          </form>
        </GlassCard>
      )}

      <div className="space-y-4">
        {courseProposals.map((proposal) => (
          <GlassCard key={proposal.id} className="p-6">
            <div className="flex flex-col md:flex-row gap-6 justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-semibold text-xl">{proposal.title}</h3>
                  {proposal.status === 'approved' && <Badge variant="success"><CheckCircle className="w-3 h-3 mr-1" /> Approved</Badge>}
                  {proposal.status === 'pending' && <Badge variant="warning"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>}
                  {proposal.status === 'rejected' && <Badge variant="danger"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>}
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                  <span className="capitalize">{proposal.category}</span>
                  <span>•</span>
                  <span className="capitalize">{proposal.level}</span>
                  <span>•</span>
                  <span>Submitted {new Date(proposal.created_at).toLocaleDateString()}</span>
                </div>
                <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-2">{proposal.description}</p>
                
                {proposal.notes && (
                  <div className="mt-4 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/30 border border-gray-100 dark:border-gray-700 text-sm">
                    <span className="font-semibold block mb-1 text-gray-500">My Pitch Notes:</span>
                    <p className="text-gray-700 dark:text-gray-300">{proposal.notes}</p>
                  </div>
                )}
                {proposal.review_notes && (
                  <div className="mt-4 p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 text-sm">
                    <span className="font-semibold block mb-1 text-indigo-600 dark:text-indigo-400">Admin Feedback:</span>
                    <p className="text-gray-700 dark:text-gray-200">{proposal.review_notes}</p>
                  </div>
                )}
              </div>
              <div className="hidden md:flex w-32 h-20 bg-gray-100 dark:bg-gray-800 rounded-xl items-center justify-center overflow-hidden flex-shrink-0 border border-gray-200 dark:border-gray-700">
                {proposal.thumbnail_url ? (
                  <img src={proposal.thumbnail_url} alt="Thumbnail" className="w-full h-full object-cover" />
                ) : (
                  <BookOpen className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                )}
              </div>
            </div>
          </GlassCard>
        ))}

        {courseProposals.length === 0 && !showForm && (
          <div className="text-center py-16 text-gray-500 bg-gray-50 dark:bg-gray-800/20 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
            <BookOpen className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-1">No Proposals Yet</p>
            <p className="text-sm">Pitch your first great course idea to the administration.</p>
            <Button variant="primary" className="mt-6" onClick={() => setShowForm(true)}>Submit a Proposal</Button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
