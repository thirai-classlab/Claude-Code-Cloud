'use client';

import React from 'react';

export const ThinkingIndicator: React.FC = () => {
  return (
    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-4">
      <div className="flex gap-1">
        <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span className="text-sm">Claude が考え中...</span>
    </div>
  );
};
