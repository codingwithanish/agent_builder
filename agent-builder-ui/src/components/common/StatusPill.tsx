import React from 'react';
import { clsx } from 'clsx';
import type { Status } from '@/lib/types';

interface StatusPillProps {
  status: Status;
  className?: string;
}

export function StatusPill({ status, className }: StatusPillProps) {
  return (
    <span
      className={clsx(
        'status-pill',
        {
          'status-pill-draft': status === 'draft',
          'status-pill-deploying': status === 'deploying',
          'status-pill-deployed': status === 'deployed',
          'status-pill-failed': status === 'failed',
        },
        className
      )}
    >
      {status === 'deploying' && (
        <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-yellow-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}