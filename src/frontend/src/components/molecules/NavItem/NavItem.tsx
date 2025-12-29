'use client';

import { cn } from '@/lib/utils';
import { Indicator } from '@/components/atoms';
import { Badge } from '@/components/atoms';

export interface NavItemProps {
  label: string;
  active?: boolean;
  shortcut?: string;
  onClick?: () => void;
  className?: string;
}

export function NavItem({ label, active = false, shortcut, onClick, className }: NavItemProps) {
  return (
    <div
      className={cn(
        'nav-item',
        { active },
        className
      )}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick?.();
        }
      }}
    >
      <Indicator active={active} />
      <span className="flex-1 truncate">{label}</span>
      {shortcut && <Badge>{shortcut}</Badge>}
    </div>
  );
}
