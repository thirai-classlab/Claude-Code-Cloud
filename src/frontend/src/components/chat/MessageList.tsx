'use client';

import React from 'react';
import { MessageBubble } from './MessageBubble';
import { Message } from '@/types/message';

interface MessageListProps {
  messages: Message[];
}

export const MessageList: React.FC<MessageListProps> = ({ messages }) => {
  if (messages.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-text-tertiary">
        <div className="text-center max-w-md px-4">
          <h3 className="text-lg font-semibold text-text-primary mb-2">Start a conversation</h3>
          <p className="text-sm text-text-secondary">
            Ask Claude to help you write code, review files, or debug issues.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-chat mx-auto">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
    </div>
  );
};
