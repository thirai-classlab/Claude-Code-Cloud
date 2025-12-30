'use client';

import React, { memo, useMemo } from 'react';
import { Message, ContentBlock, ToolUseBlock, ToolResultBlock } from '@/types/message';
import { StreamingText } from './StreamingText';
import { ToolUseWithResultCard } from './ToolUseWithResultCard';
import { MarkdownContent } from './MarkdownContent';

interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
}

// Process content blocks to pair tool_use with tool_result
interface ProcessedBlock {
  type: 'text' | 'thinking' | 'tool_use_with_result';
  textBlock?: ContentBlock & { type: 'text' };
  thinkingBlock?: ContentBlock & { type: 'thinking' };
  toolUse?: ToolUseBlock;
  toolResult?: ToolResultBlock;
}

const processContentBlocks = (blocks: ContentBlock[]): ProcessedBlock[] => {
  const result: ProcessedBlock[] = [];
  const toolResults = new Map<string, ToolResultBlock>();

  // First pass: collect all tool_results by tool_use_id
  for (const block of blocks) {
    if (block.type === 'tool_result') {
      toolResults.set(block.tool_use_id, block);
    }
  }

  // Second pass: create processed blocks
  for (const block of blocks) {
    if (block.type === 'text') {
      result.push({ type: 'text', textBlock: block });
    } else if (block.type === 'thinking') {
      result.push({ type: 'thinking', thinkingBlock: block });
    } else if (block.type === 'tool_use') {
      const toolResult = toolResults.get(block.id);
      result.push({ type: 'tool_use_with_result', toolUse: block, toolResult });
    }
    // Skip tool_result blocks as they're already paired with tool_use
  }

  return result;
};

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

    if (prevBlock.type === 'tool_result' && nextBlock.type === 'tool_result') {
      if (prevBlock.tool_use_id !== nextBlock.tool_use_id) return false;
      if (prevBlock.content !== nextBlock.content) return false;
    }
  }

  return true;
};

// ProcessedBlockRenderer component
const ProcessedBlockRenderer: React.FC<{
  block: ProcessedBlock;
  isStreaming: boolean;
  isUser: boolean;
}> = ({ block, isStreaming, isUser }) => {
  if (block.type === 'text' && block.textBlock) {
    return isStreaming ? (
      <StreamingText text={block.textBlock.text} />
    ) : (
      <MarkdownContent content={block.textBlock.text} />
    );
  }

  if (block.type === 'tool_use_with_result' && block.toolUse) {
    return (
      <ToolUseWithResultCard
        toolUse={block.toolUse}
        toolResult={block.toolResult}
        isExecuting={false}
      />
    );
  }

  if (block.type === 'thinking' && block.thinkingBlock) {
    return (
      <div className={`italic text-sm opacity-70 border-l-2 pl-3 ${
        isUser ? 'border-white/50' : 'border-border'
      }`}>
        {block.thinkingBlock.content}
      </div>
    );
  }

  return null;
};

// Memoized ProcessedBlockRenderer
const MemoizedProcessedBlockRenderer = memo(ProcessedBlockRenderer);

// MessageBubble component
const MessageBubbleComponent: React.FC<MessageBubbleProps> = ({
  message,
  isStreaming = false,
}) => {
  const isUser = message.role === 'user';

  // Process content blocks to pair tool_use with tool_result
  const processedBlocks = useMemo(
    () => processContentBlocks(message.content),
    [message.content]
  );

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
          {processedBlocks.map((block, index) => (
            <MemoizedProcessedBlockRenderer
              key={`${message.id}-${index}-${block.type}`}
              block={block}
              isStreaming={isStreaming && index === processedBlocks.length - 1}
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
