import { motion } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';

interface DayData {
  date: string;
  count: number;
}

interface StreakHeatmapProps {
  data: DayData[];
  days?: number;
}

export function StreakHeatmap({ data, days = 91 }: StreakHeatmapProps) {
  const today = new Date();
  const dayMap = new Map(data.map(d => [d.date, d.count]));
  const dayLabels = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

  const cells: { date: string; count: number; dayOfWeek: number; weekIndex: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const count = dayMap.get(dateStr) || 0;
    const dayOfWeek = d.getDay();
    cells.push({ date: dateStr, count, dayOfWeek, weekIndex: Math.floor(i / 7) });
  }

  const weeks = Math.ceil(days / 7);
  const colorMap = [
    'bg-gray-100 dark:bg-gray-800',
    'bg-primary-200 dark:bg-primary-900/40',
    'bg-primary-300 dark:bg-primary-800/60',
    'bg-primary-400 dark:bg-primary-700/80',
    'bg-primary-500',
  ];

  const getColor = (count: number) => {
    if (count === 0) return colorMap[0];
    if (count <= 2) return colorMap[1];
    if (count <= 5) return colorMap[2];
    if (count <= 10) return colorMap[3];
    return colorMap[4];
  };

  const totalActive = data.filter(d => d.count > 0).length;
  const maxStreak = (() => {
    let max = 0, cur = 0;
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      if (dayMap.get(dateStr) && dayMap.get(dateStr)! > 0) {
        cur++;
        max = Math.max(max, cur);
      } else {
        cur = 0;
      }
    }
    return max;
  })();

  return (
    <GlassCard className="p-5" hover={false}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold">Learning Streak</h3>
          <p className="text-xs text-gray-500 mt-0.5">Past {days} days</p>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span><strong className="text-primary-500">{totalActive}</strong> active days</span>
          <span><strong className="text-amber-500">{maxStreak}</strong> day streak</span>
        </div>
      </div>

      <div className="flex gap-0.5 overflow-x-auto pb-2">
        {Array.from({ length: weeks }).map((_, weekIdx) => (
          <div key={weekIdx} className="flex flex-col gap-0.5">
            {weekIdx === 0 && dayLabels.map((label, di) => (
              <div key={di} className="w-3 h-3 text-[6px] text-gray-400 flex items-center justify-center">
                {label}
              </div>
            ))}
            {[0, 1, 2, 3, 4, 5, 6].map(dayOfWeek => {
              const cell = cells.find(c => c.weekIndex === weekIdx && c.dayOfWeek === dayOfWeek);
              return (
                <motion.div
                  key={`${weekIdx}-${dayOfWeek}`}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: (weekIdx + dayOfWeek) * 0.005 }}
                  className={`w-3 h-3 rounded-sm ${cell ? getColor(cell.count) : 'bg-transparent'}`}
                  title={cell ? `${cell.date}: ${cell.count} lessons` : ''}
                />
              );
            })}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-end gap-1 mt-2">
        <span className="text-[10px] text-gray-400">Less</span>
        {colorMap.map((color, i) => (
          <div key={i} className={`w-3 h-3 rounded-sm ${color}`} />
        ))}
        <span className="text-[10px] text-gray-400">More</span>
      </div>
    </GlassCard>
  );
}
