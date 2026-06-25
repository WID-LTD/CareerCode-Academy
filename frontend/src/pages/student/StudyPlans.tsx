import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Target, Plus, Trash2, Clock, BookOpen, CheckCircle, TrendingUp } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import api from '@/lib/axios';

interface StudyPlan {
  id: string;
  week_start: string;
  week_end: string;
  goal_hours: number;
  goal_topics: string[];
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

export default function StudyPlans() {
  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [goalHours, setGoalHours] = useState(5);
  const [goalTopics, setGoalTopics] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchPlans(); }, []);

  const fetchPlans = async () => {
    try {
      const { data } = await api.get('/student/study-plans');
      setPlans(data.data || []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const createPlan = async () => {
    setSaving(true);
    try {
      const topics = goalTopics.split(',').map(t => t.trim()).filter(Boolean);
      await api.post('/student/study-plans', {
        goal_hours: goalHours,
        goal_topics: topics,
        notes: notes || null,
      });
      setGoalTopics('');
      setNotes('');
      await fetchPlans();
    } catch { /* ignore */ }
    setSaving(false);
  };

  const deletePlan = async (id: string) => {
    try {
      await api.delete(`/student/study-plans/${id}`);
      setPlans(prev => prev.filter(p => p.id !== id));
    } catch { /* ignore */ }
  };

  const getWeekLabel = (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Study Plans</h1>
          <p className="text-gray-500 mt-1">Set weekly learning goals and track your progress.</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Create Plan Form */}
        <div className="lg:col-span-1">
          <GlassCard className="p-5" hover={false}>
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Target className="w-4 h-4 text-primary-500" /> New Weekly Plan
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1.5">Weekly Goal (hours)</label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setGoalHours(Math.max(1, goalHours - 1))}
                    className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  >-</button>
                  <span className="text-lg font-bold w-12 text-center">{goalHours}</span>
                  <button
                    onClick={() => setGoalHours(Math.min(40, goalHours + 1))}
                    className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  >+</button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1.5">Topics (comma separated)</label>
                <input
                  type="text"
                  value={goalTopics}
                  onChange={e => setGoalTopics(e.target.value)}
                  placeholder="JavaScript, React, Node.js"
                  className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1.5">Notes</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="What do you want to focus on this week?"
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                />
              </div>
              <button
                onClick={createPlan}
                disabled={saving}
                className="w-full py-2 px-4 rounded-xl bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {saving ? 'Saving...' : <><Plus className="w-4 h-4" /> Create Plan</>}
              </button>
            </div>
          </GlassCard>
        </div>

        {/* Plans List */}
        <div className="lg:col-span-2">
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading...</div>
          ) : plans.length === 0 ? (
            <GlassCard className="p-8 text-center" hover={false}>
              <Target className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-lg font-semibold mb-1">No Study Plans Yet</h3>
              <p className="text-sm text-gray-500">Create your first weekly study plan to start tracking goals.</p>
            </GlassCard>
          ) : (
            <div className="space-y-4">
              {plans.map((plan, idx) => {
                const hoursPerDay = (plan.goal_hours / 7).toFixed(1);
                return (
                  <motion.div
                    key={plan.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <GlassCard className="p-5" hover={false}>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-sm font-semibold">{getWeekLabel(plan.week_start, plan.week_end)}</h3>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {new Date(plan.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <button
                          onClick={() => deletePlan(plan.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-4 mb-3">
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-50 dark:bg-blue-900/10">
                          <Clock className="w-4 h-4 text-blue-500" />
                          <div>
                            <p className="text-xs text-gray-500">Goal</p>
                            <p className="text-sm font-semibold">{plan.goal_hours}h</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-green-50 dark:bg-green-900/10">
                          <TrendingUp className="w-4 h-4 text-green-500" />
                          <div>
                            <p className="text-xs text-gray-500">Daily Avg</p>
                            <p className="text-sm font-semibold">{hoursPerDay}h</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-purple-50 dark:bg-purple-900/10">
                          <BookOpen className="w-4 h-4 text-purple-500" />
                          <div>
                            <p className="text-xs text-gray-500">Topics</p>
                            <p className="text-sm font-semibold">{plan.goal_topics.length}</p>
                          </div>
                        </div>
                      </div>

                      {plan.goal_topics.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {plan.goal_topics.map((topic, i) => (
                            <Badge key={i} variant="primary" size="sm">{topic}</Badge>
                          ))}
                        </div>
                      )}

                      {plan.notes && (
                        <p className="text-xs text-gray-500 italic mt-2">{plan.notes}</p>
                      )}
                    </GlassCard>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}