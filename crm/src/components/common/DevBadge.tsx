import React from 'react';

interface DevBadgeProps {
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

export const DevBadge: React.FC<DevBadgeProps> = ({ size = 'xs', className = '' }) => {
  const sizeClasses = {
    xs: 'px-1.5 py-0.2 text-[8px]',
    sm: 'px-1.5 py-0.5 text-[9px]',
    md: 'px-2 py-0.5 text-[10px]',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 font-black uppercase tracking-wider rounded-md bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800/50 shadow-2xs shrink-0 select-none ${sizeClasses[size]} ${className}`}
      title="Developer Account"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-violet-500 dark:bg-violet-400 animate-pulse" />
      DEV
    </span>
  );
};
