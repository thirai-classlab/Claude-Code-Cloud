/**
 * Pricing Editor Component
 * Displays pricing information, usage statistics, and cost limit settings
 */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { projectsApi } from '@/lib/api';
import { UsageStats, CostLimitCheck, CostLimitUpdateRequest } from '@/types/project';

interface PricingEditorProps {
  projectId: string;
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
  const [isSaving, setIsSaving] = useState(false);
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [limitCheck, setLimitCheck] = useState<CostLimitCheck | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 利用制限の入力値（空文字は無制限を意味する）
  const [limitDaily, setLimitDaily] = useState<string>('');
  const [limitWeekly, setLimitWeekly] = useState<string>('');
  const [limitMonthly, setLimitMonthly] = useState<string>('');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [usageStats, costCheck] = await Promise.all([
        projectsApi.getUsage(projectId),
        projectsApi.checkCostLimits(projectId),
      ]);
      setStats(usageStats);
      setLimitCheck(costCheck);

      // 入力フィールドに現在の制限値をセット
      setLimitDaily(costCheck.limit_daily !== null ? costCheck.limit_daily.toString() : '');
      setLimitWeekly(costCheck.limit_weekly !== null ? costCheck.limit_weekly.toString() : '');
      setLimitMonthly(costCheck.limit_monthly !== null ? costCheck.limit_monthly.toString() : '');
    } catch (err) {
      console.error('Failed to load usage data:', err);
      setError('使用量データの取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveLimits = async () => {
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const request: CostLimitUpdateRequest = {
        cost_limit_daily: limitDaily === '' ? null : parseFloat(limitDaily),
        cost_limit_weekly: limitWeekly === '' ? null : parseFloat(limitWeekly),
        cost_limit_monthly: limitMonthly === '' ? null : parseFloat(limitMonthly),
      };

      await projectsApi.updateCostLimits(projectId, request);
      setSuccessMessage('利用制限を更新しました');

      // 再読み込み
      await loadData();
    } catch (err) {
      console.error('Failed to update cost limits:', err);
      setError('利用制限の更新に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearLimits = async () => {
    if (!confirm('すべての利用制限を解除しますか？')) return;

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await projectsApi.clearCostLimits(projectId);
      setSuccessMessage('利用制限を解除しました');
      setLimitDaily('');
      setLimitWeekly('');
      setLimitMonthly('');

      // 再読み込み
      await loadData();
    } catch (err) {
      console.error('Failed to clear cost limits:', err);
      setError('利用制限の解除に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

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

  const formatCurrencyShort = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const getUsagePercentage = (current: number, limit: number | null): number | null => {
    if (limit === null || limit === 0) return null;
    return Math.min((current / limit) * 100, 100);
  };

  const getProgressColor = (percentage: number | null): string => {
    if (percentage === null) return 'bg-gray-500';
    if (percentage >= 100) return 'bg-red-500';
    if (percentage >= 80) return 'bg-yellow-500';
    return 'bg-green-500';
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
        <p className="text-xs text-text-tertiary mt-1">プロジェクトのAPI使用量と利用制限を管理します</p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-3xl space-y-6">
          {/* Error / Success Messages */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}
          {successMessage && (
            <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm">
              {successMessage}
            </div>
          )}

          {/* Cost Limit Warning */}
          {limitCheck && !limitCheck.can_use && (
            <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <h4 className="text-sm font-medium text-red-400 mb-1">利用制限に達しました</h4>
                  <p className="text-xs text-red-300">
                    {limitCheck.exceeded_limits.map(limit => {
                      switch (limit) {
                        case 'daily': return '1日';
                        case 'weekly': return '7日';
                        case 'monthly': return '30日';
                        default: return limit;
                      }
                    }).join('、')}の利用制限を超過しています。制限値を変更するか、時間が経過するまでお待ちください。
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Usage Summary */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="p-4 bg-bg-secondary rounded-lg border border-border">
                <div className="text-xs text-text-tertiary uppercase tracking-wider mb-1">総トークン数</div>
                <div className="text-2xl font-semibold text-text-primary">{formatNumber(stats.total_tokens)}</div>
              </div>
              <div className="p-4 bg-bg-secondary rounded-lg border border-border">
                <div className="text-xs text-text-tertiary uppercase tracking-wider mb-1">総コスト</div>
                <div className="text-2xl font-semibold text-accent">{formatCurrency(stats.total_cost)}</div>
              </div>
              <div className="p-4 bg-bg-secondary rounded-lg border border-border">
                <div className="text-xs text-text-tertiary uppercase tracking-wider mb-1">セッション数</div>
                <div className="text-2xl font-semibold text-text-primary">{formatNumber(stats.session_count)}</div>
              </div>
              <div className="p-4 bg-bg-secondary rounded-lg border border-border">
                <div className="text-xs text-text-tertiary uppercase tracking-wider mb-1">メッセージ数</div>
                <div className="text-xl font-medium text-text-primary">{formatNumber(stats.message_count)}</div>
              </div>
            </div>
          )}

          {/* Period-based Usage with Progress Bars */}
          {limitCheck && (
            <div>
              <h3 className="text-sm font-semibold text-text-primary mb-3">期間別使用量</h3>
              <div className="space-y-4">
                {/* Daily */}
                <div className="p-4 bg-bg-secondary rounded-lg border border-border">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-text-primary">過去1日</span>
                    <span className="text-sm font-medium text-text-primary">
                      {formatCurrencyShort(limitCheck.cost_daily)}
                      {limitCheck.limit_daily !== null && (
                        <span className="text-text-tertiary"> / {formatCurrencyShort(limitCheck.limit_daily)}</span>
                      )}
                    </span>
                  </div>
                  {limitCheck.limit_daily !== null && (
                    <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${getProgressColor(getUsagePercentage(limitCheck.cost_daily, limitCheck.limit_daily))}`}
                        style={{ width: `${getUsagePercentage(limitCheck.cost_daily, limitCheck.limit_daily) ?? 0}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* Weekly */}
                <div className="p-4 bg-bg-secondary rounded-lg border border-border">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-text-primary">過去7日</span>
                    <span className="text-sm font-medium text-text-primary">
                      {formatCurrencyShort(limitCheck.cost_weekly)}
                      {limitCheck.limit_weekly !== null && (
                        <span className="text-text-tertiary"> / {formatCurrencyShort(limitCheck.limit_weekly)}</span>
                      )}
                    </span>
                  </div>
                  {limitCheck.limit_weekly !== null && (
                    <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${getProgressColor(getUsagePercentage(limitCheck.cost_weekly, limitCheck.limit_weekly))}`}
                        style={{ width: `${getUsagePercentage(limitCheck.cost_weekly, limitCheck.limit_weekly) ?? 0}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* Monthly */}
                <div className="p-4 bg-bg-secondary rounded-lg border border-border">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-text-primary">過去30日</span>
                    <span className="text-sm font-medium text-text-primary">
                      {formatCurrencyShort(limitCheck.cost_monthly)}
                      {limitCheck.limit_monthly !== null && (
                        <span className="text-text-tertiary"> / {formatCurrencyShort(limitCheck.limit_monthly)}</span>
                      )}
                    </span>
                  </div>
                  {limitCheck.limit_monthly !== null && (
                    <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${getProgressColor(getUsagePercentage(limitCheck.cost_monthly, limitCheck.limit_monthly))}`}
                        style={{ width: `${getUsagePercentage(limitCheck.cost_monthly, limitCheck.limit_monthly) ?? 0}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Cost Limit Settings */}
          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-3">利用制限設定</h3>
            <div className="p-4 bg-bg-secondary rounded-lg border border-border space-y-4">
              <p className="text-xs text-text-tertiary">
                各期間の利用上限（USD）を設定できます。空欄にすると無制限になります。
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Daily Limit */}
                <div>
                  <label className="block text-xs text-text-secondary mb-1">1日の上限 (USD)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={limitDaily}
                    onChange={(e) => setLimitDaily(e.target.value)}
                    placeholder="無制限"
                    className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-md text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>

                {/* Weekly Limit */}
                <div>
                  <label className="block text-xs text-text-secondary mb-1">7日の上限 (USD)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={limitWeekly}
                    onChange={(e) => setLimitWeekly(e.target.value)}
                    placeholder="無制限"
                    className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-md text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>

                {/* Monthly Limit */}
                <div>
                  <label className="block text-xs text-text-secondary mb-1">30日の上限 (USD)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={limitMonthly}
                    onChange={(e) => setLimitMonthly(e.target.value)}
                    placeholder="無制限"
                    className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-md text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSaveLimits}
                  disabled={isSaving}
                  className="px-4 py-2 bg-accent text-white text-sm rounded-md hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? '保存中...' : '保存'}
                </button>
                <button
                  onClick={handleClearLimits}
                  disabled={isSaving}
                  className="px-4 py-2 bg-bg-tertiary text-text-secondary text-sm rounded-md hover:bg-bg-tertiary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  すべて解除
                </button>
              </div>
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
                  利用制限に達すると、新しいメッセージを送信できなくなります。
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
