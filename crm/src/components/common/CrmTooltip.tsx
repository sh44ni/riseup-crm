import React, { useState } from 'react';

export interface CrmTooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export function CrmTooltip({
  content,
  children,
  position = 'top',
  className = '',
}: CrmTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  if (!content) {
    return <>{children}</>;
  }

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-1.5',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-1.5',
    left: 'right-full top-1/2 -translate-y-1/2 mr-1.5',
    right: 'left-full top-1/2 -translate-y-1/2 ml-1.5',
  }[position];

  return (
    <div
      className={`relative inline-flex items-center ${className}`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}

      {isVisible && (
        <div
          role="tooltip"
          className={`absolute ${positionClasses} z-[99999] pointer-events-none whitespace-nowrap px-2.5 py-1 rounded-xl bg-slate-900/90 dark:bg-[#0B1320]/95 backdrop-blur-xl border border-white/20 dark:border-white/10 text-white text-[10.5px] font-bold shadow-[0_8px_24px_rgba(0,0,0,0.3)] animate-in fade-in zoom-in-95 duration-150`}
        >
          {content}
        </div>
      )}
    </div>
  );
}

export default CrmTooltip;
