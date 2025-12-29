'use client';

import React, { memo } from 'react';
import { MessageBubble } from './MessageBubble';
import { Message } from '@/types/message';

interface MessageListProps {
  messages: Message[];
}

// Empty state component (memoized)
const EmptyState = memo(() => (
  <div className="h-full flex items-center justify-center text-text-tertiary">
    <div className="text-center max-w-md px-4">
      <h3 className="text-lg font-semibold text-text-primary mb-2">Start a conversation</h3>
      <p className="text-sm text-text-secondary">
        Ask Claude to help you write code, review files, or debug issues.
      </p>
    </div>
  </div>
));

EmptyState.displayName = 'EmptyState';

// Custom comparison for MessageList
const areMessageListPropsEqual = (
  prevProps: MessageListProps,
  nextProps: MessageListProps
): boolean => {
  // Quick length check
  if (prevProps.messages.length !== nextProps.messages.length) return false;

  // Check if all message IDs and content lengths match
  for (let i = 0; i < prevProps.messages.length; i++) {
    const prev = prevProps.messages[i];
    const next = nextProps.messages[i];

    if (prev.id !== next.id) return false;
    if (prev.content.length !== next.content.length) return false;

    // For the last message, check content (might be streaming)
    if (i === prevProps.messages.length - 1) {
      const prevLastBlock = prev.content[prev.content.length - 1];
      const nextLastBlock = next.content[next.content.length - 1];

      if (prevLastBlock?.type === 'text' && nextLastBlock?.type === 'text') {
        if (prevLastBlock.text !== nextLastBlock.text) return false;
      }
    }
  }

  return true;
};

const MessageListComponent: React.FC<MessageListProps> = ({ messages }) => {
  if (messages.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="max-w-chat mx-auto">
      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          message={message}
          isStreaming={false}
        />
      ))}
    </div>
  );
};

export const MessageList = memo(MessageListComponent, areMessageListPropsEqual);
