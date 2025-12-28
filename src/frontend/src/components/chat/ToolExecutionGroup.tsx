'use client';

import React, { useState } from 'react';
import { ToolExecution } from '@/types/tool';
import { ToolExecutionDisplay } from './ToolExecutionDisplay';

interface ToolExecutionGroupProps {
  executions: ToolExecution[];
}

// グループのサマリーを生成
const generateGroupSummary = (executions: ToolExecution[]): string => {
  const completed = executions.filter(e => e.status === 'success').length;
  const running = executions.filter(e => e.status === 'executing').length;
  const pending = executions.filter(e => e.status === 'pending').length;
  const errors = executions.filter(e => e.status === 'error').length;

  const parts: string[] = [];
  if (running > 0) parts.push(`${running}件 実行中`);
  if (pending > 0) parts.push(`${pending}件 待機中`);
  if (completed > 0) parts.push(`${completed}件 完了`);
  if (errors > 0) parts.push(`${errors}件 失敗`);

  return parts.join('、');
};

// ツール種類別にカウント
const getToolTypeCounts = (executions: ToolExecution[]): Record<string, number> => {
  const counts: Record<string, number> = {};
  for (const exec of executions) {
    counts[exec.name] = (counts[exec.name] || 0) + 1;
  }
  return counts;
};

// ツールアイコンコンポーネント（小さいバージョン）
const ToolIconSmall: React.FC<{ name: string }> = ({ name }) => {
  const iconProps = {
    className: "w-3.5 h-3.5",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    viewBox: "0 0 24 24"
  };

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

export const ToolExecutionGroup: React.FC<ToolExecutionGroupProps> = ({ executions }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (executions.length === 0) return null;

  // 1つだけの場合は直接表示
  if (executions.length === 1) {
    return <ToolExecutionDisplay execution={executions[0]} />;
  }

  const summary = generateGroupSummary(executions);
  const toolCounts = getToolTypeCounts(executions);
  const hasRunning = executions.some(e => e.status === 'executing' || e.status === 'pending');
  const hasErrors = executions.some(e => e.status === 'error');

  // 最新の実行中または最後の実行を取得
  const latestExecution = executions.find(e => e.status === 'executing') || executions[executions.length - 1];

  // ステータスに応じたスタイル
  const getGroupStyles = () => {
    if (hasErrors) {
      return 'border-red-500/30 bg-red-500/10 dark:bg-red-500/20 text-red-700 dark:text-red-300';
    }
    if (hasRunning) {
      return 'border-blue-500/30 bg-blue-500/10 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300';
    }
    return 'border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300';
  };

  return (
    <div className={`border rounded-lg overflow-hidden transition-all ${getGroupStyles()}`}>
      {/* Group Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-left p-3 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="flex items-center gap-1 flex-shrink-0 opacity-70">
            {Object.entries(toolCounts).slice(0, 4).map(([tool]) => (
              <span key={tool} className="flex items-center">
                <ToolIconSmall name={tool} />
              </span>
            ))}
            {Object.keys(toolCounts).length > 4 && (
              <span className="text-xs opacity-60">+{Object.keys(toolCounts).length - 4}</span>
            )}
          </div>
          <span className="font-medium text-sm">
            {executions.length}件のツール実行
          </span>
          <span className="text-xs opacity-60">
            ({summary})
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {hasRunning && (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs bg-blue-500/20 dark:bg-blue-500/30">
              <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
              処理中
            </span>
          )}
          <svg
            className={`w-4 h-4 transition-transform opacity-50 ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Latest Execution Preview (when collapsed) */}
      {!isExpanded && latestExecution && (
        <div className="px-3 pb-2 border-t border-current/10">
          <div className="text-[10px] opacity-50 mb-1 uppercase tracking-wider">最新</div>
          <ToolExecutionDisplay execution={latestExecution} />
        </div>
      )}

      {/* All Executions (when expanded) */}
      {isExpanded && (
        <div className="border-t border-current/10 p-3 space-y-2 bg-white/50 dark:bg-black/20">
          {executions.map((execution) => (
            <ToolExecutionDisplay key={execution.id || execution.tool_use_id} execution={execution} />
          ))}
        </div>
      )}
    </div>
  );
};
