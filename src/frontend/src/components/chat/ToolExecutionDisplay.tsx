'use client';

import React, { useState } from 'react';
import { ToolExecution } from '@/types/tool';

interface ToolExecutionDisplayProps {
  execution: ToolExecution;
}

// Generate summary for tool execution
const generateSummary = (execution: ToolExecution): string => {
  const { name, input, output, status, error } = execution;

  const getInputSummary = (): string => {
    if (!input) return '';

    switch (name) {
      case 'Read':
      case 'read_file': {
        const filePath = input.file_path || input.path || '';
        const fileName = filePath.split('/').pop() || filePath;
        return `Reading ${fileName}`;
      }
      case 'Write':
      case 'write_file': {
        const filePath = input.file_path || input.path || '';
        const fileName = filePath.split('/').pop() || filePath;
        return `Writing to ${fileName}`;
      }
      case 'Edit':
      case 'edit_file': {
        const filePath = input.file_path || input.path || '';
        const fileName = filePath.split('/').pop() || filePath;
        return `Editing ${fileName}`;
      }
      case 'Bash':
      case 'execute_bash': {
        const command = input.command || '';
        const shortCommand = command.length > 50 ? command.substring(0, 50) + '...' : command;
        return shortCommand;
      }
      case 'Glob': {
        const pattern = input.pattern || '';
        return `File search: ${pattern}`;
      }
      case 'Grep': {
        const pattern = input.pattern || '';
        return `Search: ${pattern}`;
      }
      case 'Task': {
        const description = input.description || input.prompt?.substring(0, 40) || 'Executing task';
        return description;
      }
      case 'WebSearch': {
        const query = input.query || '';
        return `Web search: ${query}`;
      }
      case 'WebFetch': {
        const url = input.url || '';
        return `Fetching: ${url}`;
      }
      default:
        return JSON.stringify(input).substring(0, 50);
    }
  };

  const getOutputSummary = (): string => {
    if (error) {
      return `Error: ${error.substring(0, 50)}${error.length > 50 ? '...' : ''}`;
    }
    if (!output) return '';

    switch (name) {
      case 'Read':
      case 'read_file': {
        const lines = output.split('\n').length;
        return `${lines} lines`;
      }
      case 'Glob': {
        const matches = output.split('\n').filter(Boolean).length;
        return `${matches} files found`;
      }
      case 'Grep': {
        const matches = output.split('\n').filter(Boolean).length;
        return `${matches} matches`;
      }
      case 'Bash':
      case 'execute_bash': {
        const lines = output.split('\n').filter(Boolean).length;
        if (lines === 0) return 'No output';
        if (lines === 1) return output.substring(0, 60);
        return `${lines} lines of output`;
      }
      default:
        return '';
    }
  };

  const inputSummary = getInputSummary();
  const outputSummary = status === 'success' || status === 'error' ? getOutputSummary() : '';

  if (outputSummary) {
    return `${inputSummary} -> ${outputSummary}`;
  }
  return inputSummary;
};

// SVG Icon Component
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
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
        </svg>
      );
    case 'WebSearch':
      return (
        <svg {...iconProps}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
        </svg>
      );
    case 'WebFetch':
      return (
        <svg {...iconProps}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
        </svg>
      );
    case 'LSP':
      return (
        <svg {...iconProps}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
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

export const ToolExecutionDisplay: React.FC<ToolExecutionDisplayProps> = ({ execution }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-500/10 border-amber-500/30 text-amber-400';
      case 'executing':
        return 'bg-accent-muted border-accent/30 text-accent';
      case 'success':
        return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400';
      case 'error':
        return 'bg-red-500/10 border-red-500/30 text-red-400';
      default:
        return 'bg-bg-secondary border-border text-text-secondary';
    }
  };

  const getStatusIndicator = (status: string) => {
    switch (status) {
      case 'pending':
      case 'executing':
        return (
          <div className="flex items-center gap-1.5 text-xs">
            <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
            <span>Running</span>
          </div>
        );
      case 'success':
        return (
          <div className="flex items-center gap-1 text-xs">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            <span>Done</span>
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center gap-1 text-xs">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span>Error</span>
          </div>
        );
      default:
        return null;
    }
  };

  const formatDuration = (startTime: number, endTime?: number) => {
    const duration = (endTime || Date.now()) - startTime;
    if (duration < 1000) return `${duration}ms`;
    return `${(duration / 1000).toFixed(1)}s`;
  };

  const statusStyles = getStatusStyles(execution.status);
  const summary = generateSummary(execution);

  return (
    <div className={`border rounded-lg overflow-hidden transition-all ${statusStyles}`}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-left px-3 py-2 hover:bg-bg-hover/50 transition-colors"
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <ToolIcon name={execution.name} className="w-4 h-4 flex-shrink-0 opacity-70" />
          <span className="font-medium text-xs flex-shrink-0">{execution.name}</span>
          <span className="text-xs opacity-60 truncate" title={summary}>
            {summary}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          {getStatusIndicator(execution.status)}
          {execution.endTime && (
            <span className="text-xs opacity-40 tabular-nums">
              {formatDuration(execution.startTime, execution.endTime)}
            </span>
          )}
          <svg
            className={`w-4 h-4 transition-transform opacity-40 ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t border-current/10 p-3 space-y-3 bg-bg-secondary/50">
          {/* Input */}
          <div>
            <div className="text-[10px] font-medium mb-1.5 text-text-tertiary uppercase tracking-wider">Input</div>
            <pre className="text-xs overflow-x-auto bg-bg-tertiary text-text-secondary p-3 rounded-md font-mono leading-relaxed">
              {JSON.stringify(execution.input, null, 2)}
            </pre>
          </div>

          {/* Output */}
          {execution.output && (
            <div>
              <div className="text-[10px] font-medium mb-1.5 text-text-tertiary uppercase tracking-wider">Output</div>
              <pre className="text-xs overflow-x-auto bg-bg-tertiary text-text-secondary p-3 rounded-md font-mono max-h-80 overflow-y-auto leading-relaxed">
                {execution.output}
              </pre>
            </div>
          )}

          {/* Error */}
          {execution.error && (
            <div>
              <div className="text-[10px] font-medium mb-1.5 text-red-400 uppercase tracking-wider">Error</div>
              <pre className="text-xs overflow-x-auto bg-red-950/50 text-red-300 p-3 rounded-md font-mono leading-relaxed">
                {execution.error}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
