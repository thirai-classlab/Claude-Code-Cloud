'use client';

import React from 'react';
import { Message, ContentBlock } from '@/types/message';
import { StreamingText } from './StreamingText';
import { ToolUseCard } from './ToolUseCard';

interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isStreaming = false,
}) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-[80%] rounded-lg px-4 py-3 shadow-sm ${
          isUser
            ? 'bg-blue-600 text-white'
            : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700'
        }`}
      >
        {!isUser && (
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
              C
            </div>
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Claude</span>
          </div>
        )}

        <div className="space-y-3">
          {message.content.map((block, index) => (
            <ContentBlockRenderer
              key={index}
              block={block}
              isStreaming={isStreaming && index === message.content.length - 1}
              isUser={isUser}
            />
          ))}
        </div>

        <div className={`text-xs mt-2 ${isUser ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>
          {new Date(message.timestamp).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
};

const ContentBlockRenderer: React.FC<{
  block: ContentBlock;
  isStreaming: boolean;
  isUser: boolean;
}> = ({ block, isStreaming, isUser }) => {
  if (block.type === 'text') {
    return isStreaming ? (
      <StreamingText text={block.text} />
    ) : (
      <div className="whitespace-pre-wrap">{block.text}</div>
    );
  }

  if (block.type === 'tool_use') {
    return <ToolUseCard toolUse={block} />;
  }

  if (block.type === 'thinking') {
    return (
      <div className={`italic text-sm opacity-70 border-l-2 pl-3 ${
        isUser ? 'border-blue-300' : 'border-gray-400 dark:border-gray-500'
      }`}>
        {block.content}
      </div>
    );
  }

  return null;
};
