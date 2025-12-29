'use client';

import React from 'react';

interface StreamingTextProps {
  text: string;
}

export const StreamingText: React.FC<StreamingTextProps> = ({ text }) => {
  return (
    <div className="whitespace-pre-wrap text-text-primary">
      {text}
      <span className="inline-block w-1 h-4 ml-1 bg-accent animate-pulse" />
    </div>
  );
};
