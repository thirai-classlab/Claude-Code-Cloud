/**
 * Pricing Editor Component
 * Displays pricing information, usage statistics, and cost limit settings
 */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { projectsApi } from '@/lib/api';
import { UsageStats, CostLimitCheck, CostLimitUpdateRequest } from '@/types/project';
import { toast } from '@/stores/toastStore';

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
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [limitCheck, setLimitCheck] = useState<CostLimitCheck | null>(null);

  // 利用制限の入力値（空文字は無制限を意味する）
  const [limitDaily, setLimitDaily] = useState<string>('');
  const [limitWeekly, setLimitWeekly] = useState<string>('');
  const [limitMonthly, setLimitMonthly] = useState<string>('');

  const loadData = useCallback(async () => {
    setIsLoading(true);
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
      toast.error(t('editor.pricing.loadError'));
    } finally {
      setIsLoading(false);
    }
  }, [projectId, t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveLimits = async () => {
    setIsSaving(true);

    try {
      const request: CostLimitUpdateRequest = {
        cost_limit_daily: limitDaily === '' ? null : parseFloat(limitDaily),
        cost_limit_weekly: limitWeekly === '' ? null : parseFloat(limitWeekly),
        cost_limit_monthly: limitMonthly === '' ? null : parseFloat(limitMonthly),
      };

      await projectsApi.updateCostLimits(projectId, request);
      toast.success(t('editor.pricing.limitUpdated'));

      // 再読み込み
      await loadData();
    } catch (err) {
      console.error('Failed to update cost limits:', err);
      toast.error(t('editor.pricing.limitUpdateError'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearLimits = async () => {
    if (!confirm(t('editor.pricing.confirmClearAll'))) return;

    setIsSaving(true);

    try {
      await projectsApi.clearCostLimits(projectId);
      toast.success(t('editor.pricing.limitCleared'));
      setLimitDaily('');
      setLimitWeekly('');
      setLimitMonthly('');

      // 再読み込み
      await loadData();
    } catch (err) {
      console.error('Failed to clear cost limits:', err);
      toast.error(t('editor.pricing.limitClearError'));
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
        <h2 className="text-lg font-semibold text-text-primary">{t('editor.pricing.title')}</h2>
        <p className="text-xs text-text-tertiary mt-1">{t('editor.pricing.description')}</p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-3xl space-y-6">
          {/* Cost Limit Warning */}
          {limitCheck && !limitCheck.can_use && (
            <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <h4 className="text-sm font-medium text-red-400 mb-1">{t('editor.pricing.limitReached')}</h4>
                  <p className="text-xs text-red-300">
                    {limitCheck.exceeded_limits.map(limit => {
                      switch (limit) {
                        case 'daily': return t('editor.pricing.past1Day');
                        case 'weekly': return t('editor.pricing.past7Days');
                        case 'monthly': return t('editor.pricing.past30Days');
                        default: return limit;
                      }
                    }).join(', ')}{t('editor.pricing.limitExceeded')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Usage Summary */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="p-4 bg-bg-secondary rounded-lg border border-border">
                <div className="text-xs text-text-tertiary uppercase tracking-wider mb-1">{t('editor.pricing.totalTokens')}</div>
                <div className="text-2xl font-semibold text-text-primary">{formatNumber(stats.total_tokens)}</div>
              </div>
              <div className="p-4 bg-bg-secondary rounded-lg border border-border">
                <div className="text-xs text-text-tertiary uppercase tracking-wider mb-1">{t('editor.pricing.totalCost')}</div>
                <div className="text-2xl font-semibold text-accent">{formatCurrency(stats.total_cost)}</div>
              </div>
              <div className="p-4 bg-bg-secondary rounded-lg border border-border">
                <div className="text-xs text-text-tertiary uppercase tracking-wider mb-1">{t('editor.pricing.sessionCount')}</div>
                <div className="text-2xl font-semibold text-text-primary">{formatNumber(stats.session_count)}</div>
              </div>
              <div className="p-4 bg-bg-secondary rounded-lg border border-border">
                <div className="text-xs text-text-tertiary uppercase tracking-wider mb-1">{t('editor.pricing.messageCount')}</div>
                <div className="text-xl font-medium text-text-primary">{formatNumber(stats.message_count)}</div>
              </div>
            </div>
          )}

          {/* Period-based Usage with Progress Bars */}
          {limitCheck && (
            <div>
              <h3 className="text-sm font-semibold text-text-primary mb-3">{t('editor.pricing.periodUsage')}</h3>
              <div className="space-y-4">
                {/* Daily */}
                <div className="p-4 bg-bg-secondary rounded-lg border border-border">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-text-primary">{t('editor.pricing.past1Day')}</span>
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
                    <span className="text-sm text-text-primary">{t('editor.pricing.past7Days')}</span>
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
                    <span className="text-sm text-text-primary">{t('editor.pricing.past30Days')}</span>
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
            <h3 className="text-sm font-semibold text-text-primary mb-3">{t('editor.pricing.limitSettings')}</h3>
            <div className="p-4 bg-bg-secondary rounded-lg border border-border space-y-4">
              <p className="text-xs text-text-tertiary">
                {t('editor.pricing.limitNote')}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Daily Limit */}
                <div>
                  <label className="block text-xs text-text-secondary mb-1">{t('editor.pricing.dailyLimitLabel')}</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={limitDaily}
                    onChange={(e) => setLimitDaily(e.target.value)}
                    placeholder={t('editor.pricing.unlimited')}
                    className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-md text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>

                {/* Weekly Limit */}
                <div>
                  <label className="block text-xs text-text-secondary mb-1">{t('editor.pricing.weeklyLimitLabel')}</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={limitWeekly}
                    onChange={(e) => setLimitWeekly(e.target.value)}
                    placeholder={t('editor.pricing.unlimited')}
                    className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-md text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>

                {/* Monthly Limit */}
                <div>
                  <label className="block text-xs text-text-secondary mb-1">{t('editor.pricing.monthlyLimitLabel')}</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={limitMonthly}
                    onChange={(e) => setLimitMonthly(e.target.value)}
                    placeholder={t('editor.pricing.unlimited')}
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
                  {isSaving ? t('editor.pricing.saving') : t('editor.pricing.save')}
                </button>
                <button
                  onClick={handleClearLimits}
                  disabled={isSaving}
                  className="px-4 py-2 bg-bg-tertiary text-text-secondary text-sm rounded-md hover:bg-bg-tertiary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('editor.pricing.clearAll')}
                </button>
              </div>
            </div>
          </div>

          {/* Pricing Table */}
          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-3">{t('editor.pricing.pricingTable')}</h3>
            <div className="bg-bg-secondary rounded-lg border border-border overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">{t('editor.pricing.model')}</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-text-tertiary uppercase tracking-wider">{t('editor.pricing.input')}</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-text-tertiary uppercase tracking-wider">{t('editor.pricing.output')}</th>
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
              {t('editor.pricing.pricingNote')}
              <a
                href="https://www.anthropic.com/pricing"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline ml-1"
              >
                Anthropic Pricing
              </a>
            </p>
          </div>

          {/* Info Box */}
          <div className="p-4 bg-accent/10 border border-accent/30 rounded-lg">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h4 className="text-sm font-medium text-accent mb-1">{t('editor.pricing.usageNote')}</h4>
                <p className="text-xs text-text-secondary">
                  {t('editor.pricing.usageNoteText')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
