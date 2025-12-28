'use client';

import React from 'react';

interface StreamingTextProps {
  text: string;
}

export const StreamingText: React.FC<StreamingTextProps> = ({ text }) => {
  return (
    <div className="whitespace-pre-wrap">
      {text}
      <span className="inline-block w-1 h-4 ml-1 bg-current animate-pulse" />
    </div>
  );
};
