import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useInstructorExtendedStore } from '@/store/instructorExtendedStore';
import { GlassCard } from '@/components/ui/GlassCard';
import { Calendar as CalendarIcon, Video, FileText } from 'lucide-react';

export default function InstructorSchedule() {
  const { schedule, fetchSchedule, isLoading } = useInstructorExtendedStore();

  useEffect(() => {
    fetchSchedule();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Group by date
  const groupedSchedule = schedule.reduce((acc: any, item: any) => {
    const date = new Date(item.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    if (!acc[date]) acc[date] = [];
    acc[date].push(item);
    return acc;
  }, {});

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Schedule & Timeline</h1>
        <p className="text-gray-500">Your upcoming live classes and assignment deadlines.</p>
      </div>

      <div className="max-w-4xl mx-auto">
        {Object.keys(groupedSchedule).length === 0 ? (
          <div className="text-center py-12 text-gray-500 bg-gray-50 dark:bg-gray-800/50 rounded-2xl">
            <CalendarIcon className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p>Your schedule is clear. No upcoming classes or deadlines.</p>
          </div>
        ) : (
          <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-300 dark:before:via-gray-700 before:to-transparent">
            {Object.keys(groupedSchedule).map((dateStr) => (
              <div key={dateStr} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white dark:border-gray-900 bg-primary-500 text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                  <CalendarIcon className="w-4 h-4" />
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl shadow-sm bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                  <div className="font-bold text-gray-900 dark:text-gray-100 mb-3">{dateStr}</div>
                  <div className="space-y-3">
                    {groupedSchedule[dateStr].map((item: any, idx: number) => (
                      <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                        <div className={`mt-0.5 ${item.type === 'live_class' ? 'text-primary-500' : 'text-orange-500'}`}>
                          {item.type === 'live_class' ? <Video className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="text-sm font-medium">{item.title}</div>
                          <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                            {new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-gray-200 dark:bg-gray-700">
                              {item.type === 'live_class' ? 'Live Class' : 'Assignment Due'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
