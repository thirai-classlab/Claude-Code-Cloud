/**
 * MCP Settings Editor Component
 * Allows editing MCP server configurations using database-backed API
 */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/atoms';
import { projectConfigApi } from '@/lib/api';
import type { ProjectMCPServer, CreateProjectMCPServerRequest, UpdateProjectMCPServerRequest, MCPTool } from '@/types';
import { ToggleSwitch, useSuccessMessage } from './shared';

interface MCPSettingsEditorProps {
  projectId: string;
}

interface ServerFormData {
  name: string;
  command: string;
  args: string;
  env: string;
}

interface TestResult {
  loading: boolean;
  success?: boolean;
  tools?: MCPTool[];
  error?: string;
}

const emptyServerForm: ServerFormData = {
  name: '',
  command: '',
  args: '',
  env: '',
};

// Interface for parsed MCP server from JSON
interface ParsedMCPServer {
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
  enabled_tools?: string[] | null;
}

export const MCPSettingsEditor: React.FC<MCPSettingsEditorProps> = ({ projectId }) => {
  const [servers, setServers] = useState<ProjectMCPServer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, showSuccess] = useSuccessMessage();

  const [isAddingServer, setIsAddingServer] = useState(false);
  const [editingServerId, setEditingServerId] = useState<string | null>(null);
  const [serverForm, setServerForm] = useState<ServerFormData>(emptyServerForm);

  // Import modal state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Test results for each server
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  // Expanded tool panels
  const [expandedTools, setExpandedTools] = useState<Record<string, boolean>>({});

  const loadServers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const serverList = await projectConfigApi.listMCPServers(projectId);
      setServers(serverList);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load MCP servers';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadServers();
  }, [loadServers]);

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
    setEditingServerId(null);
    setServerForm(emptyServerForm);
  };

  const handleEditServer = (server: ProjectMCPServer) => {
    setEditingServerId(server.id);
    setIsAddingServer(false);
    setServerForm({
      name: server.name,
      command: server.command,
      args: (server.args || []).join(' '),
      env: envToString(server.env),
    });
  };

  const handleDeleteServer = async (server: ProjectMCPServer) => {
    if (!confirm(`Are you sure you want to delete the server "${server.name}"?`)) {
      return;
    }

    try {
      setIsSaving(true);
      await projectConfigApi.deleteMCPServer(projectId, server.id);
      setServers(prev => prev.filter(s => s.id !== server.id));
      showSuccess(`Server "${server.name}" deleted successfully`);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete server';
      setError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleEnabled = async (server: ProjectMCPServer) => {
    try {
      setIsSaving(true);
      const updated = await projectConfigApi.updateMCPServer(projectId, server.id, {
        enabled: !server.enabled,
      });
      setServers(prev => prev.map(s => s.id === server.id ? updated : s));
      showSuccess(`Server "${server.name}" ${updated.enabled ? 'enabled' : 'disabled'}`);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update server';
      setError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveServer = async () => {
    if (!serverForm.name.trim() || !serverForm.command.trim()) {
      setError('Server name and command are required');
      return;
    }

    const envObj = parseEnvString(serverForm.env);
    const args = serverForm.args.trim() ? serverForm.args.trim().split(/\s+/) : [];

    try {
      setIsSaving(true);
      setError(null);

      if (editingServerId) {
        // Update existing server
        const updateData: UpdateProjectMCPServerRequest = {
          name: serverForm.name.trim(),
          command: serverForm.command.trim(),
          args,
          env: envObj,
        };
        const updated = await projectConfigApi.updateMCPServer(projectId, editingServerId, updateData);
        setServers(prev => prev.map(s => s.id === editingServerId ? updated : s));
        showSuccess('Server updated successfully');
      } else {
        // Create new server
        const createData: CreateProjectMCPServerRequest = {
          name: serverForm.name.trim(),
          command: serverForm.command.trim(),
          args,
          env: Object.keys(envObj).length > 0 ? envObj : undefined,
          enabled: true,
        };
        const created = await projectConfigApi.createMCPServer(projectId, createData);
        setServers(prev => [...prev, created]);
        showSuccess('Server added successfully');
      }

      setIsAddingServer(false);
      setEditingServerId(null);
      setServerForm(emptyServerForm);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save server configuration';
      setError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsAddingServer(false);
    setEditingServerId(null);
    setServerForm(emptyServerForm);
    setError(null);
  };

  // Parse JSON and extract MCP server configurations
  const parseImportJson = (jsonText: string): ParsedMCPServer[] => {
    const parsed = JSON.parse(jsonText);
    const servers: ParsedMCPServer[] = [];

    // Format 1: mcpServers object (Claude Code format)
    // { "mcpServers": { "server-name": { "command": "...", "args": [...], "env": {...} } } }
    if (parsed.mcpServers && typeof parsed.mcpServers === 'object') {
      for (const [name, config] of Object.entries(parsed.mcpServers)) {
        const serverConfig = config as Record<string, unknown>;
        if (typeof serverConfig.command === 'string') {
          servers.push({
            name,
            command: serverConfig.command,
            args: Array.isArray(serverConfig.args) ? serverConfig.args : undefined,
            env: typeof serverConfig.env === 'object' && serverConfig.env !== null
              ? serverConfig.env as Record<string, string>
              : undefined,
            enabled_tools: Array.isArray(serverConfig.enabled_tools)
              ? serverConfig.enabled_tools
              : undefined,
          });
        }
      }
    }
    // Format 2: Single server object with name field
    // { "name": "server-name", "command": "...", "args": [...], "env": {...} }
    else if (parsed.name && typeof parsed.command === 'string') {
      servers.push({
        name: parsed.name,
        command: parsed.command,
        args: Array.isArray(parsed.args) ? parsed.args : undefined,
        env: typeof parsed.env === 'object' && parsed.env !== null
          ? parsed.env as Record<string, string>
          : undefined,
        enabled_tools: Array.isArray(parsed.enabled_tools)
          ? parsed.enabled_tools
          : undefined,
      });
    }
    // Format 3: Array of servers
    // [{ "name": "...", "command": "...", ... }, ...]
    else if (Array.isArray(parsed)) {
      for (const item of parsed) {
        if (typeof item.name === 'string' && typeof item.command === 'string') {
          servers.push({
            name: item.name,
            command: item.command,
            args: Array.isArray(item.args) ? item.args : undefined,
            env: typeof item.env === 'object' && item.env !== null
              ? item.env as Record<string, string>
              : undefined,
            enabled_tools: Array.isArray(item.enabled_tools)
              ? item.enabled_tools
              : undefined,
          });
        }
      }
    }

    return servers;
  };

  // Handle import JSON
  const handleImportJson = async () => {
    if (!importJsonText.trim()) {
      setImportError('Please paste JSON content');
      return;
    }

    setImportError(null);
    setIsImporting(true);

    try {
      const parsedServers = parseImportJson(importJsonText);

      if (parsedServers.length === 0) {
        setImportError('No valid MCP server configurations found in the JSON. Please check the format.');
        setIsImporting(false);
        return;
      }

      // Create servers one by one
      const createdServers: ProjectMCPServer[] = [];
      const errors: string[] = [];

      for (const serverData of parsedServers) {
        try {
          const created = await projectConfigApi.createMCPServer(projectId, {
            name: serverData.name,
            command: serverData.command,
            args: serverData.args || [],
            env: serverData.env || {},
            enabled: true,
            enabled_tools: serverData.enabled_tools,
          });
          createdServers.push(created);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Unknown error';
          errors.push(`Failed to create "${serverData.name}": ${message}`);
        }
      }

      if (createdServers.length > 0) {
        setServers(prev => [...prev, ...createdServers]);
        showSuccess(`Successfully imported ${createdServers.length} server(s)`);
      }

      if (errors.length > 0) {
        setImportError(errors.join('\n'));
      } else {
        // Close modal on complete success
        setIsImportModalOpen(false);
        setImportJsonText('');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setImportError(`Invalid JSON format: ${message}`);
    } finally {
      setIsImporting(false);
    }
  };

  const handleCloseImportModal = () => {
    setIsImportModalOpen(false);
    setImportJsonText('');
    setImportError(null);
  };

  // Test MCP server connection
  const handleTestConnection = async (server: ProjectMCPServer) => {
    setTestResults(prev => ({
      ...prev,
      [server.id]: { loading: true }
    }));

    try {
      const result = await projectConfigApi.testMCPServer(projectId, server.id);
      setTestResults(prev => ({
        ...prev,
        [server.id]: {
          loading: false,
          success: result.success,
          tools: result.tools,
          error: result.error
        }
      }));

      if (result.success) {
        setExpandedTools(prev => ({ ...prev, [server.id]: true }));
        showSuccess(`Connection successful - ${result.tools.length} tool(s) available`);
      } else {
        setError(result.error || 'Connection test failed');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to test connection';
      setTestResults(prev => ({
        ...prev,
        [server.id]: {
          loading: false,
          success: false,
          error: errorMessage
        }
      }));
      setError(errorMessage);
    }
  };

  // Toggle tool panel expansion
  const handleToggleToolsPanel = (serverId: string) => {
    setExpandedTools(prev => ({
      ...prev,
      [serverId]: !prev[serverId]
    }));
  };

  // Toggle individual tool enabled/disabled
  const handleToolToggle = async (server: ProjectMCPServer, toolName: string, enabled: boolean) => {
    const currentEnabledTools = server.enabled_tools;
    let newEnabledTools: string[];

    if (currentEnabledTools === null || currentEnabledTools === undefined) {
      // If null, all tools are enabled. When disabling one, we need to get all tools first
      const testResult = testResults[server.id];
      if (!testResult?.tools) {
        setError('Please test the connection first to load available tools');
        return;
      }
      // Start with all tools enabled, then remove the one being disabled
      if (enabled) {
        // Already enabled (all are enabled), nothing to do
        return;
      }
      newEnabledTools = testResult.tools
        .map(t => t.name)
        .filter(name => name !== toolName);
    } else {
      if (enabled) {
        // Add tool to enabled list
        newEnabledTools = [...currentEnabledTools, toolName];
      } else {
        // Remove tool from enabled list
        newEnabledTools = currentEnabledTools.filter(name => name !== toolName);
      }
    }

    try {
      setIsSaving(true);
      const updated = await projectConfigApi.updateMCPServer(projectId, server.id, {
        enabled_tools: newEnabledTools.length > 0 ? newEnabledTools : null
      });
      setServers(prev => prev.map(s => s.id === server.id ? updated : s));
      showSuccess(`Tool "${toolName}" ${enabled ? 'enabled' : 'disabled'}`);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update tool settings';
      setError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  // Check if a tool is enabled for a server
  const isToolEnabled = (server: ProjectMCPServer, toolName: string): boolean => {
    // If enabled_tools is null/undefined, all tools are enabled
    if (server.enabled_tools === null || server.enabled_tools === undefined) {
      return true;
    }
    return server.enabled_tools.includes(toolName);
  };

  // Get count of enabled tools
  const getEnabledToolsCount = (server: ProjectMCPServer, totalTools: number): string => {
    if (server.enabled_tools === null || server.enabled_tools === undefined) {
      return `${totalTools}/${totalTools}`;
    }
    return `${server.enabled_tools.length}/${totalTools}`;
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-bg-primary">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const isFormOpen = isAddingServer || editingServerId !== null;

  return (
    <div className="h-full flex flex-col bg-bg-primary overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">MCP Settings</h2>
          <p className="text-xs text-text-tertiary mt-1">
            {servers.length} server{servers.length !== 1 ? 's' : ''} configured
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsImportModalOpen(true)}
            disabled={isFormOpen}
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Import JSON
          </Button>
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
      </div>

      {/* Messages */}
      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-900/20 border border-red-500/30 rounded-md">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}
      {successMessage && (
        <div className="mx-4 mt-4 p-3 bg-green-900/20 border border-green-500/30 rounded-md">
          <p className="text-sm text-green-400">{successMessage}</p>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Add/Edit Form */}
        {isFormOpen && (
          <div className="mb-6 p-4 bg-bg-secondary rounded-lg border border-border">
            <h3 className="text-sm font-semibold text-text-primary mb-4">
              {editingServerId ? 'Edit Server' : 'Add New Server'}
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
                  {isSaving ? 'Saving...' : (editingServerId ? 'Update' : 'Add')}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Server List */}
        {servers.length === 0 && !isFormOpen ? (
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
            {servers.map((server) => {
              const isEditing = editingServerId === server.id;
              const testResult = testResults[server.id];
              const isToolsPanelExpanded = expandedTools[server.id];

              return (
                <div
                  key={server.id}
                  className={`rounded-lg border transition-colors ${
                    isEditing
                      ? 'border-primary bg-primary/5'
                      : server.enabled
                        ? 'border-border bg-bg-secondary hover:border-border-hover'
                        : 'border-border bg-bg-secondary/50 opacity-60'
                  }`}
                >
                  {/* Server Header */}
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`w-8 h-8 rounded flex items-center justify-center ${
                            server.enabled ? 'bg-primary/10' : 'bg-bg-tertiary'
                          }`}>
                            <svg className={`w-4 h-4 ${server.enabled ? 'text-primary' : 'text-text-tertiary'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
                            </svg>
                          </div>
                          <h4 className="font-medium text-text-primary">{server.name}</h4>
                          {!server.enabled && (
                            <span className="text-xs text-text-tertiary bg-bg-tertiary px-2 py-0.5 rounded">
                              Disabled
                            </span>
                          )}
                        </div>

                        <div className="space-y-1 text-sm">
                          <div className="flex items-start gap-2">
                            <span className="text-text-tertiary w-20 flex-shrink-0">Command:</span>
                            <code className="text-text-secondary font-mono bg-bg-tertiary px-1 rounded">
                              {server.command}
                            </code>
                          </div>
                          {server.args && server.args.length > 0 && (
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

                      <div className="flex items-center gap-2 ml-4">
                        {/* Toggle Switch */}
                        <ToggleSwitch
                          checked={server.enabled}
                          onChange={() => handleToggleEnabled(server)}
                          disabled={isSaving}
                          title={server.enabled ? 'Disable server' : 'Enable server'}
                        />

                        <button
                          onClick={() => handleEditServer(server)}
                          disabled={isFormOpen && !isEditing}
                          className="p-2 text-text-secondary hover:text-primary hover:bg-primary/10 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Edit"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteServer(server)}
                          disabled={isSaving}
                          className="p-2 text-text-secondary hover:text-red-400 hover:bg-red-900/20 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Delete"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Connection Test Section */}
                  <div className="px-4 pb-3 border-t border-border/50">
                    <div className="flex items-center gap-3 pt-3">
                      <button
                        onClick={() => handleTestConnection(server)}
                        disabled={testResult?.loading || isSaving || !server.enabled}
                        className="px-3 py-1.5 text-xs font-medium rounded border border-border bg-bg-tertiary text-text-secondary hover:bg-bg-primary hover:text-text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {testResult?.loading ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current" />
                            Testing...
                          </>
                        ) : (
                          <>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            Test Connection
                          </>
                        )}
                      </button>

                      {/* Test Result Status */}
                      {testResult && !testResult.loading && (
                        <div className="flex items-center gap-2">
                          {testResult.success ? (
                            <>
                              <span className="flex items-center gap-1 text-xs text-green-400">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Connected
                              </span>
                              {testResult.tools && testResult.tools.length > 0 && (
                                <button
                                  onClick={() => handleToggleToolsPanel(server.id)}
                                  className="flex items-center gap-1 text-xs text-text-secondary hover:text-primary transition-colors"
                                >
                                  <span className="text-text-tertiary">
                                    ({getEnabledToolsCount(server, testResult.tools.length)} tools)
                                  </span>
                                  <svg
                                    className={`w-4 h-4 transition-transform ${isToolsPanelExpanded ? 'rotate-180' : ''}`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                </button>
                              )}
                            </>
                          ) : (
                            <span className="flex items-center gap-1 text-xs text-red-400">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              {testResult.error || 'Connection failed'}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Tools Panel */}
                  {isToolsPanelExpanded && testResult?.tools && testResult.tools.length > 0 && (
                    <div className="px-4 pb-4 border-t border-border/50">
                      <div className="pt-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-text-secondary">Available Tools</span>
                          <span className="text-xs text-text-tertiary">
                            {getEnabledToolsCount(server, testResult.tools.length)} enabled
                          </span>
                        </div>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {testResult.tools.map((tool) => {
                            const enabled = isToolEnabled(server, tool.name);
                            return (
                              <div
                                key={tool.name}
                                className={`flex items-start gap-3 p-2 rounded border transition-colors ${
                                  enabled
                                    ? 'border-border/50 bg-bg-primary'
                                    : 'border-border/30 bg-bg-primary/50 opacity-60'
                                }`}
                              >
                                {/* Tool Toggle */}
                                <button
                                  onClick={() => handleToolToggle(server, tool.name, !enabled)}
                                  disabled={isSaving}
                                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 focus:ring-offset-bg-primary disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 mt-0.5 ${
                                    enabled ? 'bg-primary' : 'bg-bg-tertiary'
                                  }`}
                                >
                                  <span
                                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                      enabled ? 'translate-x-5' : 'translate-x-0.5'
                                    }`}
                                  />
                                </button>

                                {/* Tool Info */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <code className="text-xs font-medium text-text-primary font-mono">
                                      {tool.name}
                                    </code>
                                  </div>
                                  {tool.description && (
                                    <p className="text-xs text-text-tertiary mt-0.5 line-clamp-2">
                                      {tool.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Import JSON Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-bg-primary rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto border border-border">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-text-primary">Import from JSON</h3>
                <p className="text-sm text-text-tertiary mt-1">
                  Paste MCP server configuration in JSON format
                </p>
              </div>
              <button
                onClick={handleCloseImportModal}
                className="p-2 text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary rounded transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4 space-y-4">
              {importError && (
                <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-md">
                  <p className="text-sm text-red-400 whitespace-pre-wrap">{importError}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  JSON Content
                </label>
                <textarea
                  value={importJsonText}
                  onChange={(e) => setImportJsonText(e.target.value)}
                  placeholder='Paste your JSON here...'
                  rows={12}
                  className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm resize-y"
                />
              </div>

              <div className="text-sm text-text-tertiary">
                <p className="font-medium text-text-secondary mb-2">Supported formats:</p>
                <div className="bg-bg-secondary rounded-md p-3 font-mono text-xs overflow-x-auto">
                  <pre>{`// Claude Code format (mcpServers)
{
  "mcpServers": {
    "server-name": {
      "command": "npx",
      "args": ["-y", "@package/name"],
      "env": { "API_KEY": "..." }
    }
  }
}

// Single server format
{
  "name": "server-name",
  "command": "npx",
  "args": ["-y", "@package/name"],
  "env": {}
}`}</pre>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-border flex justify-end gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCloseImportModal}
                disabled={isImporting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleImportJson}
                disabled={isImporting || !importJsonText.trim()}
              >
                {isImporting ? 'Importing...' : 'Import'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
