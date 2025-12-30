'use client';

import React, { useState } from 'react';
import { ToolUseBlock, ToolResultBlock } from '@/types/message';

interface ToolUseWithResultCardProps {
  toolUse: ToolUseBlock;
  toolResult?: ToolResultBlock;
  isExecuting?: boolean;
}

// SVG Tool Icon Component
const ToolIcon: React.FC<{ name: string; className?: string }> = ({ name, className = "w-4 h-4" }) => {
  const iconProps = { className, fill: "none", stroke: "currentColor", strokeWidth: 1.5, viewBox: "0 0 24 24" };

  switch (name) {
    case 'Read':
    case 'read_file':
      return (
        <svg {...iconProps}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      );
    case 'Write':
    case 'write_file':
      return (
        <svg {...iconProps}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      );
    case 'Edit':
    case 'edit_file':
      return (
        <svg {...iconProps}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
        </svg>
      );
    case 'Bash':
    case 'execute_bash':
      return (
        <svg {...iconProps}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" />
        </svg>
      );
    case 'Glob':
      return (
        <svg {...iconProps}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
        </svg>
      );
    case 'Grep':
      return (
        <svg {...iconProps}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
      );
    case 'Task':
      return (
        <svg {...iconProps}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
        </svg>
      );
    default:
      return (
        <svg {...iconProps}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
        </svg>
      );
  }
};

// Spinner component for executing state
const Spinner: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
  <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

// Status badge
const StatusBadge: React.FC<{ status: 'executing' | 'success' | 'error' }> = ({ status }) => {
  const baseClass = "px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1";

  switch (status) {
    case 'executing':
      return (
        <span className={`${baseClass} bg-amber-500/20 text-amber-400`}>
          <Spinner className="w-3 h-3" />
          Running
        </span>
      );
    case 'success':
      return (
        <span className={`${baseClass} bg-emerald-500/20 text-emerald-400`}>
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          Done
        </span>
      );
    case 'error':
      return (
        <span className={`${baseClass} bg-red-500/20 text-red-400`}>
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
          Error
        </span>
      );
  }
};

// Format tool input for display
const formatInput = (name: string, input: Record<string, any>): string => {
  switch (name) {
    case 'Read':
    case 'read_file':
      return input.file_path || input.path || '';
    case 'Write':
    case 'write_file':
      return input.file_path || input.path || '';
    case 'Edit':
    case 'edit_file':
      return input.file_path || input.path || '';
    case 'Bash':
    case 'execute_bash':
      return input.command || '';
    case 'Glob':
      return input.pattern || '';
    case 'Grep':
      return input.pattern || '';
    default:
      return '';
  }
};

// Truncate long output
const truncateOutput = (output: string, maxLines = 20): { text: string; truncated: boolean } => {
  const lines = output.split('\n');
  if (lines.length <= maxLines) {
    return { text: output, truncated: false };
  }
  return {
    text: lines.slice(0, maxLines).join('\n') + '\n...',
    truncated: true,
  };
};

export const ToolUseWithResultCard: React.FC<ToolUseWithResultCardProps> = ({
  toolUse,
  toolResult,
  isExecuting = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showFullOutput, setShowFullOutput] = useState(false);

  const status: 'executing' | 'success' | 'error' = isExecuting
    ? 'executing'
    : toolResult
      ? (toolResult.is_error ? 'error' : 'success')
      : 'executing';

  const inputSummary = formatInput(toolUse.name, toolUse.input);
  const outputText = toolResult?.content || '';
  const { text: truncatedOutput, truncated } = truncateOutput(outputText);

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-bg-secondary">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-left px-3 py-2.5 hover:bg-bg-tertiary/50 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <ToolIcon name={toolUse.name} className="w-5 h-5 text-text-secondary flex-shrink-0" />
          <span className="font-medium text-sm text-text-primary flex-shrink-0">{toolUse.name}</span>
          {inputSummary && (
            <span className="text-xs text-text-tertiary truncate font-mono">{inputSummary}</span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          <StatusBadge status={status} />
          <svg
            className={`w-4 h-4 transition-transform text-text-tertiary ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-border">
          {/* Input */}
          <div className="px-3 py-2 bg-bg-tertiary/30">
            <div className="text-xs text-text-tertiary mb-1 font-medium">Input</div>
            <pre className="text-xs overflow-x-auto text-text-secondary font-mono whitespace-pre-wrap">
              {JSON.stringify(toolUse.input, null, 2)}
            </pre>
          </div>

          {/* Output */}
          {toolResult && (
            <div className="px-3 py-2">
              <div className="text-xs text-text-tertiary mb-1 font-medium">
                Output {toolResult.is_error && <span className="text-red-400">(Error)</span>}
              </div>
              <div className={`text-xs font-mono ${toolResult.is_error ? 'text-red-400' : 'text-text-secondary'}`}>
                {outputText.length > 0 ? (
                  <>
                    <pre className="whitespace-pre-wrap overflow-x-auto max-h-80 overflow-y-auto">
                      {showFullOutput ? outputText : truncatedOutput}
                    </pre>
                    {truncated && !showFullOutput && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setShowFullOutput(true); }}
                        className="text-accent hover:underline mt-1"
                      >
                        Show full output
                      </button>
                    )}
                  </>
                ) : (
                  <span className="text-text-tertiary italic">No output</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ToolUseWithResultCard;
