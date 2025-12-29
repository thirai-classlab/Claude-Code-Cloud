/**
 * Toggle Switch Component
 *
 * A reusable toggle switch for enabling/disabling items in editor components.
 */

'use client';

import React from 'react';

export interface ToggleSwitchProps {
  /** Current checked state */
  checked: boolean;
  /** Callback when toggle state changes */
  onChange: (checked: boolean) => void;
  /** Optional label to display next to the switch */
  label?: string;
  /** Whether the switch is disabled */
  disabled?: boolean;
  /** Size variant */
  size?: 'sm' | 'md';
  /** Title for accessibility */
  title?: string;
}

/**
 * Toggle switch with consistent styling across all editor components
 */
export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  checked,
  onChange,
  label,
  disabled = false,
  size = 'md',
  title,
}) => {
  const sizeClasses = size === 'sm'
    ? {
        track: 'h-5 w-9',
        thumb: 'h-3.5 w-3.5',
        translateOn: 'translate-x-5',
        translateOff: 'translate-x-0.5',
      }
    : {
        track: 'h-6 w-11',
        thumb: 'h-5 w-5',
        translateOn: 'translate-x-5',
        translateOff: 'translate-x-0',
      };

  const handleClick = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  const switchElement = (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={`relative inline-flex ${sizeClasses.track} flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-bg-primary disabled:opacity-50 disabled:cursor-not-allowed ${
        checked ? 'bg-primary' : 'bg-gray-600'
      }`}
      role="switch"
      aria-checked={checked}
      title={title}
    >
      <span
        className={`pointer-events-none inline-block ${sizeClasses.thumb} transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          checked ? sizeClasses.translateOn : sizeClasses.translateOff
        }`}
      />
    </button>
  );

  if (label) {
    return (
      <div className="flex items-center gap-3">
        {switchElement}
        <span className="text-sm text-text-secondary">{label}</span>
      </div>
    );
  }

  return switchElement;
};

export default ToggleSwitch;
