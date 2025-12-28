/**
 * MCP Settings Editor Component
 * Allows editing MCP server configurations
 */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/common/Button';
import { mcpApi, MCPConfig, MCPServerConfig } from '@/lib/api';

interface MCPSettingsEditorProps {
  projectId: string;
}

interface ServerFormData {
  name: string;
  command: string;
  args: string;
  env: string;
}

const emptyServerForm: ServerFormData = {
  name: '',
  command: '',
  args: '',
  env: '',
};

export const MCPSettingsEditor: React.FC<MCPSettingsEditorProps> = ({ projectId }) => {
  const [config, setConfig] = useState<MCPConfig>({ mcpServers: {} });
  const [configPath, setConfigPath] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [isAddingServer, setIsAddingServer] = useState(false);
  const [editingServer, setEditingServer] = useState<string | null>(null);
  const [serverForm, setServerForm] = useState<ServerFormData>(emptyServerForm);

  const loadConfig = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await mcpApi.getConfig(projectId);
      setConfig(response.config);
      setConfigPath(response.path);
    } catch (err: any) {
      setError(err.message || 'Failed to load MCP configuration');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const parseEnvString = (envStr: string): Record<string, string> => {
    const env: Record<string, string> = {};
    if (!envStr.trim()) return env;

    envStr.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && trimmed.includes('=')) {
        const [key, ...valueParts] = trimmed.split('=');
        env[key.trim()] = valueParts.join('=').trim();
      }
    });
    return env;
  };

  const envToString = (env?: Record<string, string>): string => {
    if (!env) return '';
    return Object.entries(env)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
  };

  const handleAddServer = () => {
    setIsAddingServer(true);
    setEditingServer(null);
    setServerForm(emptyServerForm);
  };

  const handleEditServer = (name: string) => {
    const server = config.mcpServers[name];
    if (!server) return;

    setEditingServer(name);
    setIsAddingServer(false);
    setServerForm({
      name,
      command: server.command,
      args: server.args.join(' '),
      env: envToString(server.env),
    });
  };

  const handleDeleteServer = async (name: string) => {
    if (!confirm(`Are you sure you want to delete the server "${name}"?`)) {
      return;
    }

    try {
      const newConfig = { ...config };
      delete newConfig.mcpServers[name];

      setIsSaving(true);
      await mcpApi.updateConfig(projectId, newConfig);
      setConfig(newConfig);
      showSuccess(`Server "${name}" deleted successfully`);
    } catch (err: any) {
      setError(err.message || 'Failed to delete server');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveServer = async () => {
    if (!serverForm.name.trim() || !serverForm.command.trim()) {
      setError('Server name and command are required');
      return;
    }

    const serverConfig: MCPServerConfig = {
      command: serverForm.command.trim(),
      args: serverForm.args.trim() ? serverForm.args.trim().split(/\s+/) : [],
    };

    const envObj = parseEnvString(serverForm.env);
    if (Object.keys(envObj).length > 0) {
      serverConfig.env = envObj;
    }

    const newConfig = { ...config };

    // If editing and name changed, delete old entry
    if (editingServer && editingServer !== serverForm.name) {
      delete newConfig.mcpServers[editingServer];
    }

    newConfig.mcpServers[serverForm.name.trim()] = serverConfig;

    try {
      setIsSaving(true);
      setError(null);
      await mcpApi.updateConfig(projectId, newConfig);
      setConfig(newConfig);
      setIsAddingServer(false);
      setEditingServer(null);
      setServerForm(emptyServerForm);
      showSuccess(editingServer ? 'Server updated successfully' : 'Server added successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to save server configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsAddingServer(false);
    setEditingServer(null);
    setServerForm(emptyServerForm);
    setError(null);
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-bg-primary">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const serverNames = Object.keys(config.mcpServers);
  const isFormOpen = isAddingServer || editingServer !== null;

  return (
    <div className="h-full flex flex-col bg-bg-primary overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">MCP Settings</h2>
          <p className="text-xs text-text-tertiary mt-1 font-mono">{configPath}</p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={handleAddServer}
          disabled={isFormOpen}
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Server
        </Button>
      </div>

      {/* Messages */}
      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
      {successMessage && (
        <div className="mx-4 mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm text-green-600">{successMessage}</p>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Add/Edit Form */}
        {isFormOpen && (
          <div className="mb-6 p-4 bg-bg-secondary rounded-lg border border-border">
            <h3 className="text-sm font-semibold text-text-primary mb-4">
              {editingServer ? `Edit Server: ${editingServer}` : 'Add New Server'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Server Name *
                </label>
                <input
                  type="text"
                  value={serverForm.name}
                  onChange={(e) => setServerForm({ ...serverForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-bg-primary border border-border rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g., my-server"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Command *
                </label>
                <input
                  type="text"
                  value={serverForm.command}
                  onChange={(e) => setServerForm({ ...serverForm, command: e.target.value })}
                  className="w-full px-3 py-2 bg-bg-primary border border-border rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                  placeholder="e.g., npx, uvx, node"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Arguments (space-separated)
                </label>
                <input
                  type="text"
                  value={serverForm.args}
                  onChange={(e) => setServerForm({ ...serverForm, args: e.target.value })}
                  className="w-full px-3 py-2 bg-bg-primary border border-border rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                  placeholder="e.g., -y @modelcontextprotocol/server-filesystem"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Environment Variables (KEY=VALUE, one per line)
                </label>
                <textarea
                  value={serverForm.env}
                  onChange={(e) => setServerForm({ ...serverForm, env: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 bg-bg-primary border border-border rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                  placeholder="API_KEY=your-api-key
SOME_VAR=value"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="secondary" size="sm" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSaveServer}
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving...' : (editingServer ? 'Update' : 'Add')}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Server List */}
        {serverNames.length === 0 && !isFormOpen ? (
          <div className="text-center py-12">
            <svg
              className="w-16 h-16 mx-auto mb-4 text-text-tertiary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
              />
            </svg>
            <h3 className="text-lg font-medium text-text-secondary mb-2">No MCP Servers Configured</h3>
            <p className="text-text-tertiary mb-4">
              Add MCP servers to extend Claude&apos;s capabilities with external tools and data sources.
            </p>
            <Button variant="primary" onClick={handleAddServer}>
              Add Your First Server
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {serverNames.map((name) => {
              const server = config.mcpServers[name];
              const isEditing = editingServer === name;

              return (
                <div
                  key={name}
                  className={`p-4 rounded-lg border transition-colors ${
                    isEditing
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-bg-secondary hover:border-border-hover'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                          <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
                          </svg>
                        </div>
                        <h4 className="font-medium text-text-primary">{name}</h4>
                      </div>

                      <div className="space-y-1 text-sm">
                        <div className="flex items-start gap-2">
                          <span className="text-text-tertiary w-20 flex-shrink-0">Command:</span>
                          <code className="text-text-secondary font-mono bg-bg-tertiary px-1 rounded">
                            {server.command}
                          </code>
                        </div>
                        {server.args.length > 0 && (
                          <div className="flex items-start gap-2">
                            <span className="text-text-tertiary w-20 flex-shrink-0">Args:</span>
                            <code className="text-text-secondary font-mono bg-bg-tertiary px-1 rounded text-xs break-all">
                              {server.args.join(' ')}
                            </code>
                          </div>
                        )}
                        {server.env && Object.keys(server.env).length > 0 && (
                          <div className="flex items-start gap-2">
                            <span className="text-text-tertiary w-20 flex-shrink-0">Env vars:</span>
                            <span className="text-text-secondary">
                              {Object.keys(server.env).length} variable(s)
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 ml-4">
                      <button
                        onClick={() => handleEditServer(name)}
                        disabled={isFormOpen && !isEditing}
                        className="p-2 text-text-secondary hover:text-primary hover:bg-primary/10 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Edit"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteServer(name)}
                        disabled={isSaving}
                        className="p-2 text-text-secondary hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Delete"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
