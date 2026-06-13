import { cn } from '@/lib/utils';

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-2xl border border-white/20 dark:border-gray-800/50 bg-white/70 dark:bg-gray-900/70 p-5 animate-pulse', className)}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-gray-700" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 w-full bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-3 w-3/4 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
    </div>
  );
}

export function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-white/20 dark:border-gray-800/50 bg-white/70 dark:bg-gray-900/70 p-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-gray-700" />
            <div className="flex-1 space-y-2">
              <div className="h-5 w-12 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function HeroSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-2xl p-6 sm:p-8 animate-pulse bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-800 dark:to-gray-700">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-3 flex-1">
          <div className="h-8 w-64 bg-white/50 dark:bg-gray-600/50 rounded" />
          <div className="h-4 w-48 bg-white/50 dark:bg-gray-600/50 rounded" />
          <div className="flex gap-2 mt-4">
            <div className="h-10 w-36 bg-white/50 dark:bg-gray-600/50 rounded-xl" />
            <div className="h-10 w-36 bg-white/50 dark:bg-gray-600/50 rounded-xl" />
          </div>
        </div>
        <div className="flex gap-4">
          <div className="w-20 h-20 rounded-2xl bg-white/50 dark:bg-gray-600/50" />
        </div>
      </div>
    </div>
  );
}

export function ChartSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-2xl border border-white/20 dark:border-gray-800/50 bg-white/70 dark:bg-gray-900/70 p-5 animate-pulse', className)}>
      <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
      <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-xl" />
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
      <div className="h-4 w-72 bg-gray-200 dark:bg-gray-700 rounded" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-40 rounded-2xl bg-gray-200 dark:bg-gray-700" />
        ))}
      </div>
    </div>
  );
}
