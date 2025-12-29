'use client';

import { cn } from '@/lib/utils';
import { Avatar } from '@/components/atoms';

export interface MessageHeaderProps {
  role: 'user' | 'assistant';
  name?: string;
  timestamp?: string;
  className?: string;
}

export function MessageHeader({ role, name, timestamp, className }: MessageHeaderProps) {
  const displayName = name || (role === 'user' ? 'You' : 'Claude');
  const initial = role === 'user' ? 'U' : 'C';

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <Avatar name={initial} variant={role} />
      <div className="flex items-center gap-2">
        <span className="text-base font-semibold text-text-primary">{displayName}</span>
        {timestamp && (
          <span className="text-sm text-text-tertiary">{timestamp}</span>
        )}
      </div>
    </div>
  );
}
