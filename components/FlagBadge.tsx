'use client';

import { clsx } from 'clsx';

interface FlagBadgeProps {
  flag: 'RED' | 'YELLOW' | 'GREEN';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const flagConfig = {
  RED: {
    label: 'ĐỎ - KHẨN CẤP',
    dot: 'bg-red-500',
    badge: 'bg-red-50 border border-red-500 text-red-700',
    pulse: true,
  },
  YELLOW: {
    label: 'VÀNG - THEO DÕI',
    dot: 'bg-amber-400',
    badge: 'bg-amber-50 border border-amber-400 text-amber-700',
    pulse: false,
  },
  GREEN: {
    label: 'XANH - BÌNH THƯỜNG',
    dot: 'bg-green-500',
    badge: 'bg-green-50 border border-green-500 text-green-700',
    pulse: false,
  },
};

export function FlagBadge({ flag, size = 'md', showLabel = true }: FlagBadgeProps) {
  const config = flagConfig[flag];

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-sm px-3 py-1 gap-1.5',
    lg: 'text-base px-4 py-2 gap-2',
  };

  const dotSizes = {
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full font-semibold',
        config.badge,
        sizeClasses[size]
      )}
    >
      <span className={clsx('rounded-full flex-shrink-0', config.dot, dotSizes[size], config.pulse && 'animate-pulse')} />
      {showLabel && config.label}
    </span>
  );
}
