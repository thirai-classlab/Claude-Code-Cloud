/**
 * Pricing Editor Component
 * Displays pricing information and usage statistics
 */
'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface PricingEditorProps {
  projectId: string;
}

interface UsageStats {
  totalTokens: number;
  totalCost: number;
  inputTokens: number;
  outputTokens: number;
  sessionCount: number;
  messageCount: number;
}

// Claude model pricing (per 1M tokens)
const PRICING = {
  claude_sonnet: {
    name: 'Claude 3.5 Sonnet',
    input: 3.00,
    output: 15.00,
  },
  claude_opus: {
    name: 'Claude 3 Opus',
    input: 15.00,
    output: 75.00,
  },
  claude_haiku: {
    name: 'Claude 3.5 Haiku',
    input: 0.80,
    output: 4.00,
  },
};

export const PricingEditor: React.FC<PricingEditorProps> = ({ projectId }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<UsageStats>({
    totalTokens: 0,
    totalCost: 0,
    inputTokens: 0,
    outputTokens: 0,
    sessionCount: 0,
    messageCount: 0,
  });

  const loadStats = useCallback(async () => {
    setIsLoading(true);
    try {
      // TODO: Implement actual API call to get usage stats for projectId
      // For now, using placeholder data
      console.log('Loading stats for project:', projectId);
      await new Promise(resolve => setTimeout(resolve, 500));
      setStats({
        totalTokens: 0,
        totalCost: 0,
        inputTokens: 0,
        outputTokens: 0,
        sessionCount: 0,
        messageCount: 0,
      });
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('ja-JP').format(num);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-bg-primary">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-bg-primary overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold text-text-primary">料金・使用量</h2>
        <p className="text-xs text-text-tertiary mt-1">プロジェクトのAPI使用量と料金を確認します</p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-3xl space-y-6">
          {/* Usage Summary */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="p-4 bg-bg-secondary rounded-lg border border-border">
              <div className="text-xs text-text-tertiary uppercase tracking-wider mb-1">総トークン数</div>
              <div className="text-2xl font-semibold text-text-primary">{formatNumber(stats.totalTokens)}</div>
            </div>
            <div className="p-4 bg-bg-secondary rounded-lg border border-border">
              <div className="text-xs text-text-tertiary uppercase tracking-wider mb-1">総コスト</div>
              <div className="text-2xl font-semibold text-accent">{formatCurrency(stats.totalCost)}</div>
            </div>
            <div className="p-4 bg-bg-secondary rounded-lg border border-border">
              <div className="text-xs text-text-tertiary uppercase tracking-wider mb-1">セッション数</div>
              <div className="text-2xl font-semibold text-text-primary">{formatNumber(stats.sessionCount)}</div>
            </div>
            <div className="p-4 bg-bg-secondary rounded-lg border border-border">
              <div className="text-xs text-text-tertiary uppercase tracking-wider mb-1">入力トークン</div>
              <div className="text-xl font-medium text-text-primary">{formatNumber(stats.inputTokens)}</div>
            </div>
            <div className="p-4 bg-bg-secondary rounded-lg border border-border">
              <div className="text-xs text-text-tertiary uppercase tracking-wider mb-1">出力トークン</div>
              <div className="text-xl font-medium text-text-primary">{formatNumber(stats.outputTokens)}</div>
            </div>
            <div className="p-4 bg-bg-secondary rounded-lg border border-border">
              <div className="text-xs text-text-tertiary uppercase tracking-wider mb-1">メッセージ数</div>
              <div className="text-xl font-medium text-text-primary">{formatNumber(stats.messageCount)}</div>
            </div>
          </div>

          {/* Pricing Table */}
          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-3">料金表（100万トークンあたり）</h3>
            <div className="bg-bg-secondary rounded-lg border border-border overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">モデル</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-text-tertiary uppercase tracking-wider">入力</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-text-tertiary uppercase tracking-wider">出力</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {Object.entries(PRICING).map(([key, model]) => (
                    <tr key={key} className="hover:bg-bg-tertiary transition-colors">
                      <td className="px-4 py-3 text-sm text-text-primary">{model.name}</td>
                      <td className="px-4 py-3 text-sm text-text-secondary text-right font-mono">${model.input.toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm text-text-secondary text-right font-mono">${model.output.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-text-tertiary mt-2">
              ※ 料金はAnthropicの公式価格に基づいています。詳細は
              <a
                href="https://www.anthropic.com/pricing"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline ml-1"
              >
                Anthropic Pricing
              </a>
              をご確認ください。
            </p>
          </div>

          {/* Info Box */}
          <div className="p-4 bg-accent/10 border border-accent/30 rounded-lg">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h4 className="text-sm font-medium text-accent mb-1">使用量について</h4>
                <p className="text-xs text-text-secondary">
                  使用量はセッションごとに集計されます。プロジェクトに独自のAPIキーが設定されている場合、
                  そのAPIキーに対する課金が発生します。設定されていない場合は、システムのデフォルトAPIキーに課金されます。
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
