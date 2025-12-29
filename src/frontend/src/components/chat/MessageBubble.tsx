'use client';

import React, { memo } from 'react';
import { Message, ContentBlock } from '@/types/message';
import { StreamingText } from './StreamingText';
import { ToolUseCard } from './ToolUseCard';

interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
}

// Custom comparison function for React.memo
const areMessageBubblePropsEqual = (
  prevProps: MessageBubbleProps,
  nextProps: MessageBubbleProps
): boolean => {
  // Compare message id
  if (prevProps.message.id !== nextProps.message.id) return false;

  // Compare streaming state
  if (prevProps.isStreaming !== nextProps.isStreaming) return false;

  // Compare content length (for streaming updates)
  if (prevProps.message.content.length !== nextProps.message.content.length) return false;

  // Deep compare content blocks - check the last block for streaming
  const prevContent = prevProps.message.content;
  const nextContent = nextProps.message.content;

  for (let i = 0; i < prevContent.length; i++) {
    const prevBlock = prevContent[i];
    const nextBlock = nextContent[i];

    if (prevBlock.type !== nextBlock.type) return false;

    if (prevBlock.type === 'text' && nextBlock.type === 'text') {
      if (prevBlock.text !== nextBlock.text) return false;
    }

    if (prevBlock.type === 'thinking' && nextBlock.type === 'thinking') {
      if (prevBlock.content !== nextBlock.content) return false;
    }

    if (prevBlock.type === 'tool_use' && nextBlock.type === 'tool_use') {
      if (prevBlock.id !== nextBlock.id) return false;
    }
  }

  return true;
};

// ContentBlockRenderer component
const ContentBlockRenderer: React.FC<{
  block: ContentBlock;
  isStreaming: boolean;
  isUser: boolean;
}> = ({ block, isStreaming, isUser }) => {
  if (block.type === 'text') {
    return isStreaming ? (
      <StreamingText text={block.text} />
    ) : (
      <div className="whitespace-pre-wrap text-md leading-relaxed">{block.text}</div>
    );
  }

  if (block.type === 'tool_use') {
    return <ToolUseCard toolUse={block} />;
  }

  if (block.type === 'thinking') {
    return (
      <div className={`italic text-sm opacity-70 border-l-2 pl-3 ${
        isUser ? 'border-white/50' : 'border-border'
      }`}>
        {block.content}
      </div>
    );
  }

  return null;
};

// Memoized ContentBlockRenderer
const MemoizedContentBlockRenderer = memo(ContentBlockRenderer);

// MessageBubble component
const MessageBubbleComponent: React.FC<MessageBubbleProps> = ({
  message,
  isStreaming = false,
}) => {
  const isUser = message.role === 'user';

  return (
    <div className={`message ${isUser ? 'flex justify-end' : ''}`}>
      <div
        className={`max-w-[80%] rounded-lg px-4 py-3 ${
          isUser
            ? 'bg-accent text-white'
            : 'bg-bg-secondary text-text-primary border border-border'
        }`}
      >
        {!isUser && (
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-7 h-7 rounded-md bg-accent text-white flex items-center justify-center text-xs font-semibold">
              C
            </div>
            <span className="text-base font-semibold text-text-primary">Claude</span>
          </div>
        )}

        <div className="space-y-3">
          {message.content.map((block, index) => (
            <MemoizedContentBlockRenderer
              key={`${message.id}-${index}-${block.type}`}
              block={block}
              isStreaming={isStreaming && index === message.content.length - 1}
              isUser={isUser}
            />
          ))}
        </div>

        <div className={`text-sm mt-2 ${isUser ? 'text-white/70' : 'text-text-tertiary'}`}>
          {new Date(message.timestamp).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
};

// Export memoized component
export const MessageBubble = memo(MessageBubbleComponent, areMessageBubblePropsEqual);
