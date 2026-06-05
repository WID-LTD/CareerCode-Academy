import React from 'react';
import { cn } from '@/lib/utils';

interface LoaderProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

const sizes = {
  sm: 'w-5 h-5 border-2',
  md: 'w-8 h-8 border-3',
  lg: 'w-12 h-12 border-4',
};

export function Loader({ size = 'md', text, className }: LoaderProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
      <div
        className={cn(
          'rounded-full border-primary-500/30 border-t-primary-500 animate-spin',
          sizes[size]
        )}
      />
      {text && (
        <p className="text-sm text-gray-500 dark:text-gray-400 animate-pulse">
          {text}
        </p>
      )}
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Loader size="lg" text="Loading..." />
    </div>
  );
}
