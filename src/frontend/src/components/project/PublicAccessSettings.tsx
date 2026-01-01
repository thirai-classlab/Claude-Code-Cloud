'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from '@/stores/toastStore';
import {
  getPublicAccess,
  createPublicAccess,
  updatePublicAccess,
  deletePublicAccess,
  regenerateToken,
  getCommandPublicSettings,
  updateCommandPublicSetting,
  getPublicAccessStats,
  PublicAccessSettings as PublicAccessSettingsType,
  CommandPublicSetting,
  PublicAccessStats,
} from '@/lib/api/publicAccess';

interface Props {
  projectId: string;
}

export function PublicAccessSettings({ projectId }: Props) {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<PublicAccessSettingsType | null>(null);
  const [commands, setCommands] = useState<CommandPublicSetting[]>([]);
  const [stats, setStats] = useState<PublicAccessStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  // Form state
  const [enabled, setEnabled] = useState(false);
  const [password, setPassword] = useState('');
  const [clearPassword, setClearPassword] = useState(false);
  const [allowedIps, setAllowedIps] = useState('');
  const [maxSessionsPerDay, setMaxSessionsPerDay] = useState('');
  const [maxMessagesPerSession, setMaxMessagesPerSession] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);

    try {
      // 設定を取得
      const accessSettings = await getPublicAccess(projectId);
      setSettings(accessSettings);
      setEnabled(accessSettings.enabled);
      setAllowedIps(accessSettings.allowed_ips?.join('\n') || '');
      setMaxSessionsPerDay(accessSettings.max_sessions_per_day?.toString() || '');
      setMaxMessagesPerSession(accessSettings.max_messages_per_session?.toString() || '');
      setExpiresAt(accessSettings.expires_at ? accessSettings.expires_at.split('T')[0] : '');

      // コマンド設定を取得
      const cmdSettings = await getCommandPublicSettings(projectId);
      setCommands(cmdSettings.commands);

      // 統計を取得
      const statsData = await getPublicAccessStats(projectId);
      setStats(statsData);
    } catch (err: any) {
      if (err.status === 404) {
        // 設定がまだ存在しない
        setSettings(null);
        // コマンド設定は取得
        try {
          const cmdSettings = await getCommandPublicSettings(projectId);
          setCommands(cmdSettings.commands);
        } catch {
          // ignore
        }
      } else {
        toast.error(t('editor.publicAccess.loadError'));
      }
    } finally {
      setLoading(false);
    }
  }, [projectId, t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreate = async () => {
    setSaving(true);

    try {
      const newSettings = await createPublicAccess(projectId, {
        enabled,
        password: password || undefined,
        allowed_ips: allowedIps ? allowedIps.split('\n').filter(ip => ip.trim()) : undefined,
        max_sessions_per_day: maxSessionsPerDay ? parseInt(maxSessionsPerDay) : undefined,
        max_messages_per_session: maxMessagesPerSession ? parseInt(maxMessagesPerSession) : undefined,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : undefined,
      });
      setSettings(newSettings);
      setPassword('');
      toast.success(t('editor.publicAccess.created'));
    } catch (err: any) {
      toast.error(err.message || t('editor.publicAccess.createError'));
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    setSaving(true);

    try {
      const updatedSettings = await updatePublicAccess(projectId, {
        enabled,
        password: password || undefined,
        clear_password: clearPassword,
        allowed_ips: allowedIps ? allowedIps.split('\n').filter(ip => ip.trim()) : [],
        max_sessions_per_day: maxSessionsPerDay ? parseInt(maxSessionsPerDay) : undefined,
        max_messages_per_session: maxMessagesPerSession ? parseInt(maxMessagesPerSession) : undefined,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : undefined,
        clear_expires_at: !expiresAt,
      });
      setSettings(updatedSettings);
      setPassword('');
      setClearPassword(false);
      toast.success(t('editor.publicAccess.saved'));
    } catch (err: any) {
      toast.error(err.message || t('editor.publicAccess.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(t('editor.publicAccess.confirmDelete'))) return;

    setSaving(true);

    try {
      await deletePublicAccess(projectId);
      setSettings(null);
      setEnabled(false);
      setPassword('');
      setAllowedIps('');
      setMaxSessionsPerDay('');
      setMaxMessagesPerSession('');
      setExpiresAt('');
      toast.success(t('editor.publicAccess.deleted'));
    } catch (err: any) {
      toast.error(err.message || t('editor.publicAccess.deleteError'));
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerateToken = async () => {
    if (!confirm(t('editor.publicAccess.confirmRegenerate'))) return;

    setSaving(true);

    try {
      const updatedSettings = await regenerateToken(projectId);
      setSettings(updatedSettings);
      toast.success(t('editor.publicAccess.tokenRegenerated'));
    } catch (err: any) {
      toast.error(err.message || t('editor.publicAccess.regenerateError'));
    } finally {
      setSaving(false);
    }
  };

  const handleCommandToggle = async (commandId: string, isPublic: boolean, priority: number) => {
    try {
      await updateCommandPublicSetting(projectId, commandId, { is_public: isPublic, priority });
      setCommands(prev =>
        prev.map(cmd =>
          cmd.command_id === commandId ? { ...cmd, is_public: isPublic } : cmd
        )
      );
      toast.success(t('editor.publicAccess.commandUpdated'));
    } catch (err: any) {
      toast.error(err.message || t('editor.publicAccess.commandUpdateError'));
    }
  };

  const copyToClipboard = () => {
    if (settings?.public_url) {
      navigator.clipboard.writeText(settings.public_url);
      setCopied(true);
      toast.success(t('editor.publicAccess.copied'));
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-bg-tertiary rounded w-1/4 mb-4"></div>
          <div className="h-32 bg-bg-tertiary rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      <h2 className="text-lg font-semibold text-text-primary">{t('editor.publicAccess.title')}</h2>

      {/* 公開設定 */}
      <div className="bg-bg-secondary border border-border rounded-lg p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-text-primary">{t('editor.publicAccess.enableAccess')}</h3>
            <p className="text-xs text-text-tertiary">{t('editor.publicAccess.enableAccessDesc')}</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-bg-tertiary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
          </label>
        </div>

        {/* 公開URL */}
        {settings && (
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">{t('editor.publicAccess.publicUrl')}</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={settings.public_url}
                readOnly
                className="flex-1 bg-bg-tertiary border border-border rounded px-3 py-2 text-sm text-text-secondary font-mono"
              />
              <button
                onClick={copyToClipboard}
                className="px-3 py-2 bg-bg-tertiary hover:bg-bg-hover border border-border rounded text-sm text-text-primary"
              >
                {copied ? t('editor.publicAccess.copied') : t('editor.publicAccess.copy')}
              </button>
              <button
                onClick={handleRegenerateToken}
                disabled={saving}
                className="px-3 py-2 bg-bg-tertiary hover:bg-bg-hover border border-border rounded text-sm text-text-primary disabled:opacity-50"
              >
                {t('editor.publicAccess.regenerate')}
              </button>
            </div>
          </div>
        )}

        {/* パスワード */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            {t('editor.publicAccess.password')}
            {settings?.has_password && <span className="text-status-success ml-2">({t('editor.publicAccess.passwordSet')})</span>}
          </label>
          <div className="flex gap-2 items-center">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={settings?.has_password ? t('editor.publicAccess.passwordChangePlaceholder') : t('editor.publicAccess.passwordPlaceholder')}
              className="flex-1 bg-bg-tertiary border border-border rounded px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary"
            />
            {settings?.has_password && (
              <label className="flex items-center gap-2 text-sm text-text-tertiary">
                <input
                  type="checkbox"
                  checked={clearPassword}
                  onChange={(e) => setClearPassword(e.target.checked)}
                  className="rounded bg-bg-tertiary border-border"
                />
                {t('editor.publicAccess.clearPassword')}
              </label>
            )}
          </div>
        </div>

        {/* IP制限 */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            {t('editor.publicAccess.ipRestrictions')}
          </label>
          <textarea
            value={allowedIps}
            onChange={(e) => setAllowedIps(e.target.value)}
            placeholder="192.168.1.0/24&#10;10.0.0.1"
            rows={3}
            className="w-full bg-bg-tertiary border border-border rounded px-3 py-2 text-sm text-text-primary font-mono placeholder:text-text-tertiary"
          />
        </div>

        {/* 利用制限 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              {t('editor.publicAccess.maxSessionsPerDay')}
            </label>
            <input
              type="number"
              value={maxSessionsPerDay}
              onChange={(e) => setMaxSessionsPerDay(e.target.value)}
              placeholder={t('editor.publicAccess.unlimited')}
              min="1"
              className="w-full bg-bg-tertiary border border-border rounded px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              {t('editor.publicAccess.maxMessagesPerSession')}
            </label>
            <input
              type="number"
              value={maxMessagesPerSession}
              onChange={(e) => setMaxMessagesPerSession(e.target.value)}
              placeholder={t('editor.publicAccess.unlimited')}
              min="1"
              className="w-full bg-bg-tertiary border border-border rounded px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary"
            />
          </div>
        </div>

        {/* 公開期限 */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            {t('editor.publicAccess.expirationDate')}
          </label>
          <input
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="bg-bg-tertiary border border-border rounded px-3 py-2 text-sm text-text-primary"
          />
        </div>

        {/* 保存ボタン */}
        <div className="flex gap-2 pt-2">
          {settings ? (
            <>
              <button
                onClick={handleUpdate}
                disabled={saving}
                className="px-4 py-2 bg-accent hover:bg-accent-hover disabled:bg-bg-tertiary rounded text-sm text-white disabled:text-text-tertiary"
              >
                {saving ? t('common.saving') : t('common.save')}
              </button>
              <button
                onClick={handleDelete}
                disabled={saving}
                className="px-4 py-2 bg-status-error hover:bg-red-600 disabled:bg-bg-tertiary rounded text-sm text-white disabled:text-text-tertiary"
              >
                {t('common.delete')}
              </button>
            </>
          ) : (
            <button
              onClick={handleCreate}
              disabled={saving}
              className="px-4 py-2 bg-accent hover:bg-accent-hover disabled:bg-bg-tertiary rounded text-sm text-white disabled:text-text-tertiary"
            >
              {saving ? t('editor.publicAccess.creating') : t('editor.publicAccess.enableButton')}
            </button>
          )}
        </div>
      </div>

      {/* コマンド公開設定 */}
      <div className="bg-bg-secondary border border-border rounded-lg p-4">
        <h3 className="text-sm font-medium text-text-primary mb-4">{t('editor.publicAccess.publicCommands')}</h3>
        {commands.length === 0 ? (
          <p className="text-sm text-text-tertiary">{t('editor.publicAccess.noCommands')}</p>
        ) : (
          <div className="space-y-2">
            {commands.map((cmd) => (
              <div
                key={cmd.command_id}
                className="flex items-center justify-between p-3 bg-bg-tertiary/50 rounded"
              >
                <div>
                  <div className="text-sm font-medium text-text-primary">{cmd.command_name}</div>
                  {cmd.command_description && (
                    <div className="text-xs text-text-tertiary">{cmd.command_description}</div>
                  )}
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cmd.is_public}
                    onChange={(e) => handleCommandToggle(cmd.command_id, e.target.checked, cmd.priority)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-bg-tertiary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent"></div>
                </label>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 統計 */}
      {stats && (
        <div className="bg-bg-secondary border border-border rounded-lg p-4">
          <h3 className="text-sm font-medium text-text-primary mb-4">{t('editor.publicAccess.statistics')}</h3>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-text-primary">{stats.total_sessions}</div>
              <div className="text-xs text-text-tertiary">{t('editor.publicAccess.totalSessions')}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-text-primary">{stats.today_sessions}</div>
              <div className="text-xs text-text-tertiary">{t('editor.publicAccess.today')}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-text-primary">{stats.total_messages}</div>
              <div className="text-xs text-text-tertiary">{t('editor.publicAccess.totalMessages')}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-text-primary">{stats.unique_ips}</div>
              <div className="text-xs text-text-tertiary">{t('editor.publicAccess.uniqueIps')}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
