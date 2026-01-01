'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from '@/stores/toastStore';
import { confirm } from '@/stores/confirmStore';
import { Toggle } from '@/components/atoms';
import {
  getPublicAccess,
  createPublicAccess,
  updatePublicAccess,
  deletePublicAccess,
  regenerateToken,
  getCommandPublicSettings,
  updateCommandPublicSetting,
  PublicAccessSettings as PublicAccessSettingsType,
  CommandPublicSetting,
} from '@/lib/api/publicAccess';

interface Props {
  projectId: string;
}

export function PublicAccessSettings({ projectId }: Props) {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<PublicAccessSettingsType | null>(null);
  const [commands, setCommands] = useState<CommandPublicSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [enabled, setEnabled] = useState(false);
  const [password, setPassword] = useState('');
  const [ipInput, setIpInput] = useState('');
  const [fetchingIp, setFetchingIp] = useState(false);

  // 初期設定時の選択状態（ローカル）
  const [selectedCommands, setSelectedCommands] = useState<Set<string>>(new Set());

  // 選択されたコマンド数
  const selectedCount = useMemo(() => selectedCommands.size, [selectedCommands]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const accessSettings = await getPublicAccess(projectId);
      setSettings(accessSettings);
      setEnabled(accessSettings.enabled);

      const cmdSettings = await getCommandPublicSettings(projectId);
      setCommands(cmdSettings.commands);
    } catch (err: any) {
      if (err.status === 404) {
        setSettings(null);
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

  // 初期設定時のコマンド選択トグル
  const handleInitialCommandToggle = (commandId: string, selected: boolean) => {
    setSelectedCommands(prev => {
      const next = new Set(prev);
      if (selected) {
        next.add(commandId);
      } else {
        next.delete(commandId);
      }
      return next;
    });
  };

  // 共有URLを取得（選択したコマンドも公開設定）
  const handleGetShareUrl = async () => {
    if (selectedCount === 0) {
      toast.error('公開するコマンドを1つ以上選択してください');
      return;
    }

    setSaving(true);
    try {
      // 選択したコマンドを公開設定
      const updatePromises = Array.from(selectedCommands).map(commandId => {
        const cmd = commands.find(c => c.command_id === commandId);
        if (cmd) {
          return updateCommandPublicSetting(projectId, commandId, { is_public: true, priority: cmd.priority });
        }
        return Promise.resolve();
      });
      await Promise.all(updatePromises);

      // 公開アクセス作成
      const newSettings = await createPublicAccess(projectId, { enabled: true });
      setSettings(newSettings);
      setEnabled(true);

      // コマンドの状態を更新
      setCommands(prev =>
        prev.map(cmd => selectedCommands.has(cmd.command_id) ? { ...cmd, is_public: true } : cmd)
      );

      await navigator.clipboard.writeText(newSettings.public_url);
      setCopied(true);
      toast.success('共有URLをコピーしました');
      setTimeout(() => setCopied(false), 3000);
    } catch (err: any) {
      toast.error(err.message || t('editor.publicAccess.createError'));
    } finally {
      setSaving(false);
    }
  };

  // URLをコピー
  const handleCopyUrl = async () => {
    if (!settings?.public_url) return;
    try {
      await navigator.clipboard.writeText(settings.public_url);
      setCopied(true);
      toast.success('コピーしました');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('コピーに失敗しました');
    }
  };

  // 共有ON/OFF
  const handleToggleEnabled = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const updatedSettings = await updatePublicAccess(projectId, { enabled: !enabled });
      setSettings(updatedSettings);
      setEnabled(!enabled);
      toast.success(!enabled ? '共有を有効にしました' : '共有を停止しました');
    } catch (err: any) {
      toast.error(err.message || t('editor.publicAccess.saveError'));
    } finally {
      setSaving(false);
    }
  };

  // パスワード設定
  const handleSavePassword = async () => {
    if (!settings || !password) return;
    setSaving(true);
    try {
      const updatedSettings = await updatePublicAccess(projectId, { password });
      setSettings(updatedSettings);
      setPassword('');
      toast.success('パスワードを設定しました');
    } catch (err: any) {
      toast.error(err.message || t('editor.publicAccess.saveError'));
    } finally {
      setSaving(false);
    }
  };

  // パスワード解除
  const handleClearPassword = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const updatedSettings = await updatePublicAccess(projectId, { clear_password: true });
      setSettings(updatedSettings);
      toast.success('パスワードを解除しました');
    } catch (err: any) {
      toast.error(err.message || t('editor.publicAccess.saveError'));
    } finally {
      setSaving(false);
    }
  };

  // 現在のIPを取得
  const handleFetchCurrentIp = async () => {
    setFetchingIp(true);
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      if (data.ip) {
        setIpInput(data.ip);
      }
    } catch {
      toast.error('IPアドレスの取得に失敗しました');
    } finally {
      setFetchingIp(false);
    }
  };

  // IP追加（カンマ、スペース、改行区切りで複数対応）
  const handleAddIp = async () => {
    if (!settings || !ipInput.trim()) return;

    // カンマ、スペース、改行で分割
    const rawInputs = ipInput.split(/[,\s\n]+/).filter(ip => ip.trim());
    if (rawInputs.length === 0) return;

    // 簡易バリデーション（IPv4, IPv6, CIDR形式）
    const ipPattern = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$|^([0-9a-fA-F:]+)(\/\d{1,3})?$/;
    const validIps: string[] = [];
    const invalidIps: string[] = [];
    const currentIps = settings.allowed_ips || [];

    for (const ip of rawInputs) {
      const trimmed = ip.trim();
      if (!ipPattern.test(trimmed)) {
        invalidIps.push(trimmed);
      } else if (currentIps.includes(trimmed) || validIps.includes(trimmed)) {
        // 重複はスキップ（エラーにはしない）
      } else {
        validIps.push(trimmed);
      }
    }

    if (invalidIps.length > 0) {
      toast.error(`無効な形式: ${invalidIps.join(', ')}`);
      return;
    }

    if (validIps.length === 0) {
      toast.error('追加するIPがありません（重複を除外）');
      return;
    }

    setSaving(true);
    try {
      const newIps = [...currentIps, ...validIps];
      const updatedSettings = await updatePublicAccess(projectId, { allowed_ips: newIps });
      setSettings(updatedSettings);
      setIpInput('');
      toast.success(`${validIps.length}件のIPを追加しました`);
    } catch (err: any) {
      toast.error(err.message || 'IP追加に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  // IP削除
  const handleRemoveIp = async (ipToRemove: string) => {
    if (!settings) return;
    const currentIps = settings.allowed_ips || [];
    const newIps = currentIps.filter(ip => ip !== ipToRemove);
    setSaving(true);
    try {
      const updatedSettings = await updatePublicAccess(projectId, {
        allowed_ips: newIps.length > 0 ? newIps : []
      });
      setSettings(updatedSettings);
      toast.success('IPを削除しました');
    } catch (err: any) {
      toast.error(err.message || 'IP削除に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  // URL再発行
  const handleRegenerateToken = async () => {
    const confirmed = await confirm({
      title: 'URLを再発行',
      message: '現在のURLは無効になります。続けますか？',
      confirmLabel: '再発行',
      cancelLabel: 'キャンセル',
      variant: 'warning',
    });
    if (!confirmed) return;

    setSaving(true);
    try {
      const updatedSettings = await regenerateToken(projectId);
      setSettings(updatedSettings);
      toast.success('URLを再発行しました');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  // 共有削除
  const handleDelete = async () => {
    const confirmed = await confirm({
      title: '外部共有を削除',
      message: 'URLは完全に無効になります。この操作は取り消せません。',
      confirmLabel: '削除',
      cancelLabel: 'キャンセル',
      variant: 'danger',
    });
    if (!confirmed) return;

    setSaving(true);
    try {
      await deletePublicAccess(projectId);
      setSettings(null);
      setEnabled(false);
      setPassword('');
      setShowAdvanced(false);
      toast.success('削除しました');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  // コマンド公開設定
  const handleCommandToggle = async (commandId: string, isPublic: boolean, priority: number) => {
    try {
      await updateCommandPublicSetting(projectId, commandId, { is_public: isPublic, priority });
      setCommands(prev =>
        prev.map(cmd => cmd.command_id === commandId ? { ...cmd, is_public: isPublic } : cmd)
      );
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // 初回：設定がない
  if (!settings) {
    // コマンドがない場合
    if (commands.length === 0) {
      return (
        <div className="h-full flex items-center justify-center p-6">
          <div className="max-w-sm w-full text-center">
            <div className="w-14 h-14 mx-auto mb-5 rounded-xl bg-zinc-500/10 flex items-center justify-center">
              <svg className="w-7 h-7 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-text-primary mb-2">コマンドがありません</h2>
            <p className="text-sm text-text-tertiary">
              外部共有するには、まずコマンドを作成してください。
              コマンドは外部ユーザーが実行できる機能です。
            </p>
          </div>
        </div>
      );
    }

    // コマンドがある場合 - 選択画面
    return (
      <div className="p-4 space-y-4 overflow-y-auto h-full">
        {/* 機能説明 */}
        <div className="rounded-lg border border-accent/30 bg-accent/5 p-4">
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-text-primary mb-1">外部共有について</h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                URLを発行すると、ログインなしでブラウザからアクセスできるようになります。
                選択したコマンドのみが外部ユーザーに公開され、実行可能になります。
              </p>
            </div>
          </div>
        </div>

        {/* コマンド選択 */}
        <div className="rounded-lg border border-border bg-bg-secondary p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-text-primary font-medium">公開するコマンドを選択</div>
            <div className="text-xs text-text-tertiary">
              {selectedCount > 0 ? `${selectedCount}件選択中` : '必須'}
            </div>
          </div>
          <div className="divide-y divide-border">
            {commands.map((cmd) => (
              <div key={cmd.command_id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                <div className="flex-1 min-w-0 mr-3">
                  <div className="text-sm text-text-primary">{cmd.command_name}</div>
                  {cmd.command_description && (
                    <div className="text-xs text-text-tertiary mt-0.5 truncate">{cmd.command_description}</div>
                  )}
                </div>
                <Toggle
                  checked={selectedCommands.has(cmd.command_id)}
                  onChange={(checked) => handleInitialCommandToggle(cmd.command_id, checked)}
                  size="sm"
                />
              </div>
            ))}
          </div>
        </div>

        {/* 共有ボタン */}
        <button
          onClick={handleGetShareUrl}
          disabled={saving || selectedCount === 0}
          className={`w-full py-3 rounded-lg font-medium transition-all ${
            selectedCount > 0
              ? 'bg-accent hover:bg-accent-hover text-white'
              : 'bg-bg-tertiary text-text-tertiary cursor-not-allowed'
          } disabled:opacity-50`}
        >
          {saving ? '作成中...' : selectedCount > 0 ? '共有URLを取得' : 'コマンドを選択してください'}
        </button>
      </div>
    );
  }

  // 設定あり
  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full">
      {/* URL + ステータス */}
      <div className={`rounded-lg border p-4 ${enabled ? 'bg-green-500/5 border-green-500/30' : 'bg-zinc-500/5 border-zinc-500/30'}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${enabled ? 'bg-green-500' : 'bg-zinc-500'}`} />
            <span className={`text-sm font-medium ${enabled ? 'text-green-400' : 'text-zinc-400'}`}>
              {enabled ? '共有中' : '停止中'}
            </span>
          </div>
          <button
            onClick={handleToggleEnabled}
            disabled={saving}
            className="text-xs px-3 py-1 rounded bg-bg-tertiary hover:bg-bg-hover text-text-secondary transition-colors disabled:opacity-50"
          >
            {enabled ? '停止' : '再開'}
          </button>
        </div>

        <button
          onClick={handleCopyUrl}
          className={`w-full p-3 rounded-lg text-left transition-all ${
            copied ? 'bg-green-500/20' : 'bg-bg-primary/50 hover:bg-bg-primary/80'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0 font-mono text-sm text-text-primary truncate">
              {settings.public_url}
            </div>
            <span className={`text-xs px-2 py-1 rounded ${copied ? 'bg-green-500 text-white' : 'bg-accent text-white'}`}>
              {copied ? '✓' : 'コピー'}
            </span>
          </div>
        </button>
      </div>

      {/* パスワード */}
      <div className="rounded-lg border border-border bg-bg-secondary p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-text-primary">パスワード保護</span>
          {settings.has_password && (
            <span className="text-xs px-2 py-0.5 bg-green-500/10 text-green-400 rounded">設定済</span>
          )}
        </div>
        <div className="flex gap-2">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={settings.has_password ? '新しいパスワード' : 'パスワードを入力'}
            className="flex-1 bg-bg-tertiary border border-border rounded px-3 py-1.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent"
          />
          {password ? (
            <button
              onClick={handleSavePassword}
              disabled={saving}
              className="px-3 py-1.5 bg-accent text-white text-sm rounded transition-colors disabled:opacity-50"
            >
              設定
            </button>
          ) : settings.has_password ? (
            <button
              onClick={handleClearPassword}
              disabled={saving}
              className="px-3 py-1.5 text-red-400 text-sm hover:bg-red-500/10 rounded transition-colors disabled:opacity-50"
            >
              解除
            </button>
          ) : null}
        </div>
      </div>

      {/* IP制限 */}
      <div className="rounded-lg border border-border bg-bg-secondary p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-text-primary">IP制限</span>
          {settings.allowed_ips && settings.allowed_ips.length > 0 && (
            <span className="text-xs px-2 py-0.5 bg-green-500/10 text-green-400 rounded">
              {settings.allowed_ips.length}件設定済
            </span>
          )}
        </div>
        <p className="text-xs text-text-tertiary mb-3">
          指定したIPアドレスからのみアクセスを許可します。カンマやスペース区切りで複数入力可能です。
        </p>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={ipInput}
            onChange={(e) => setIpInput(e.target.value)}
            placeholder="192.168.1.1, 10.0.0.0/8"
            className="flex-1 bg-bg-tertiary border border-border rounded px-3 py-1.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent font-mono"
          />
          <button
            onClick={handleFetchCurrentIp}
            disabled={fetchingIp}
            className="px-3 py-1.5 text-text-secondary text-xs hover:bg-bg-hover border border-border rounded transition-colors disabled:opacity-50 whitespace-nowrap"
            title="現在のIPアドレスを取得"
          >
            {fetchingIp ? '...' : '現在のIP'}
          </button>
          <button
            onClick={handleAddIp}
            disabled={saving || !ipInput.trim()}
            className="px-3 py-1.5 bg-accent text-white text-sm rounded transition-colors disabled:opacity-50"
          >
            追加
          </button>
        </div>

        {/* 指定中のIPアドレス */}
        <div className="text-xs text-text-secondary mb-2">指定中のIPアドレス</div>
        {settings.allowed_ips && settings.allowed_ips.length > 0 ? (
          <div className="space-y-1">
            {settings.allowed_ips.map((ip) => (
              <div
                key={ip}
                className="flex items-center justify-between py-1.5 px-2 bg-bg-tertiary rounded"
              >
                <span className="text-sm text-text-primary font-mono">{ip}</span>
                <button
                  onClick={() => handleRemoveIp(ip)}
                  disabled={saving}
                  className="text-xs text-text-tertiary hover:text-red-400 transition-colors disabled:opacity-50"
                >
                  削除
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-3 px-2 bg-bg-tertiary rounded text-center">
            <span className="text-xs text-text-tertiary">IPアドレスが指定されていません（全てのIPからアクセス可能）</span>
          </div>
        )}
      </div>

      {/* 公開コマンド（コマンドがある場合のみ） */}
      {commands.length > 0 && (
        <div className="rounded-lg border border-border bg-bg-secondary p-4">
          <div className="text-sm text-text-primary mb-3">公開コマンド</div>
          <div className="divide-y divide-border">
            {commands.map((cmd) => (
              <div key={cmd.command_id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                <div className="flex-1 min-w-0 mr-3">
                  <div className="text-sm text-text-primary">{cmd.command_name}</div>
                  {cmd.command_description && (
                    <div className="text-xs text-text-tertiary mt-0.5 truncate">{cmd.command_description}</div>
                  )}
                </div>
                <Toggle
                  checked={cmd.is_public}
                  onChange={(checked) => handleCommandToggle(cmd.command_id, checked, cmd.priority)}
                  size="sm"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 詳細設定（アコーディオン） */}
      <div className="rounded-lg border border-border bg-bg-secondary overflow-hidden">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full p-3 flex items-center justify-between text-sm text-text-secondary hover:bg-bg-hover transition-colors"
        >
          <span>詳細設定</span>
          <svg className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {showAdvanced && (
          <div className="p-3 pt-0 space-y-2 border-t border-border">
            <button
              onClick={handleRegenerateToken}
              disabled={saving}
              className="w-full p-2 text-left text-sm text-text-secondary hover:bg-bg-hover rounded transition-colors disabled:opacity-50"
            >
              URLを再発行
            </button>
            <button
              onClick={handleDelete}
              disabled={saving}
              className="w-full p-2 text-left text-sm text-red-400 hover:bg-red-500/10 rounded transition-colors disabled:opacity-50"
            >
              外部共有を削除
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
