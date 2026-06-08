/**
 * MCP 配置文件解析工具
 * 支持本应用格式、Cursor、Claude Desktop、VS Code、Windsurf 等工具的 MCP 配置格式
 */

import { AuthConfig, CombinedAuth, MCPServerConfig, MCPTransportMode } from '../types/mcp';

export type McpConfigSource = 'native' | 'legacy' | 'cursor' | 'claude' | 'vscode' | 'windsurf' | 'unknown';

export interface SkippedServer {
  name: string;
  reason: 'stdio' | 'oauth' | 'invalid' | 'no_url';
}

export interface McpConfigParseResult {
  configs: MCPServerConfig[];
  skipped: SkippedServer[];
  source: McpConfigSource;
}

export interface McpServerEntry {
  url?: string;
  serverUrl?: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  headers?: Record<string, string>;
  auth?: Record<string, unknown>;
  type?: string;
  transport?: string;
}

export interface UniversalMcpConfig {
  mcpServers: Record<string, McpServerEntry>;
}

/**
 * 解析 URL 为 host + path，并提取 URL 查询参数
 */
function parseMcpUrl(url: string): {
  host: string;
  ssePath: string;
  urlParams: Array<{ name: string; value: string }>;
} | null {
  try {
    const parsed = new URL(url);
    const host = `${parsed.protocol}//${parsed.host}`;
    const rawPath = parsed.pathname;
    const ssePath = !rawPath || rawPath === '/' ? '/sse' : rawPath;
    const urlParams = Array.from(parsed.searchParams.entries()).map(([name, value]) => ({
      name,
      value
    }));
    return { host, ssePath, urlParams };
  } catch {
    return null;
  }
}

/**
 * 解析外部配置中显式声明的传输模式
 */
function parseExplicitTransport(explicit?: string): MCPTransportMode | undefined {
  if (!explicit) return undefined;
  const lower = explicit.toLowerCase();
  if (lower === 'sse') return 'sse';
  if (
    lower === 'streamable' ||
    lower === 'http' ||
    lower === 'http-streamable' ||
    lower === 'streamable-http'
  ) {
    return 'streamable';
  }
  return undefined;
}

/**
 * 根据路径推断传输模式（导入时默认 SSE）
 */
function detectTransport(path: string, explicit?: string): MCPTransportMode {
  const declared = parseExplicitTransport(explicit);
  if (declared) return declared;

  const lowerPath = path.toLowerCase();
  if (lowerPath.includes('/mcp') || lowerPath.endsWith('/mcp')) {
    return 'streamable';
  }
  if (lowerPath.includes('/sse') || lowerPath.endsWith('/sse')) {
    return 'sse';
  }
  return 'sse';
}

/**
 * 将 HTTP headers 转换为本应用的认证配置
 */
function headersToAuth(headers: Record<string, string>): AuthConfig {
  const customHeaders: Array<{ name: string; value: string }> = [];
  let apiKey: CombinedAuth['apiKey'];
  let basicAuth: CombinedAuth['basicAuth'];

  for (const [name, value] of Object.entries(headers)) {
    if (!name || !value) continue;

    if (name.toLowerCase() === 'authorization') {
      if (value.startsWith('Bearer ')) {
        apiKey = { apiKey: value.slice(7), headerName: 'Authorization', prefix: 'Bearer ' };
      } else if (value.startsWith('Basic ')) {
        try {
          const decoded = atob(value.slice(6));
          const colonIndex = decoded.indexOf(':');
          if (colonIndex >= 0) {
            basicAuth = {
              username: decoded.slice(0, colonIndex),
              password: decoded.slice(colonIndex + 1)
            };
          }
        } catch {
          customHeaders.push({ name, value });
        }
      } else {
        apiKey = { apiKey: value, headerName: 'Authorization', prefix: '' };
      }
    } else {
      customHeaders.push({ name, value });
    }
  }

  const hasAuth = apiKey || basicAuth || customHeaders.length > 0;
  if (!hasAuth) return { type: 'none' };

  const auth: CombinedAuth = { type: 'combined' };
  if (apiKey) auth.apiKey = apiKey;
  if (basicAuth) auth.basicAuth = basicAuth;
  if (customHeaders.length > 0) auth.customHeaders = customHeaders;
  return auth;
}

/**
 * 合并 URL 参数到认证配置
 */
function mergeUrlParams(auth: AuthConfig, urlParams: Array<{ name: string; value: string }>): AuthConfig {
  if (urlParams.length === 0) return auth;

  if (auth.type === 'none') {
    return { type: 'combined', urlParams };
  }

  if (auth.type === 'combined') {
    return { ...auth, urlParams: [...(auth.urlParams || []), ...urlParams] };
  }

  return auth;
}

/**
 * 将外部工具的单条服务器配置转换为本应用格式
 */
function convertExternalServer(name: string, entry: McpServerEntry): MCPServerConfig | SkippedServer {
  const url = entry.url || entry.serverUrl;

  if (!url) {
    if (entry.command) {
      return { name, reason: 'stdio' };
    }
    if (entry.auth) {
      return { name, reason: 'oauth' };
    }
    return { name, reason: 'no_url' };
  }

  const parsed = parseMcpUrl(url);
  if (!parsed) {
    return { name, reason: 'invalid' };
  }

  let auth: AuthConfig = entry.headers ? headersToAuth(entry.headers) : { type: 'none' };
  auth = mergeUrlParams(auth, parsed.urlParams);

  return {
    name,
    host: parsed.host,
    ssePath: parsed.ssePath,
    messagePath: '',
    transport: detectTransport(parsed.ssePath, entry.transport || entry.type),
    auth
  };
}

/**
 * 从 mcpServers / servers 对象中提取服务器列表
 */
function extractServersMap(data: Record<string, unknown>): Record<string, McpServerEntry> | null {
  const serversKey = ['mcpServers', 'servers', 'mcp_servers'];
  for (const key of serversKey) {
    const servers = data[key];
    if (servers && typeof servers === 'object' && !Array.isArray(servers)) {
      return servers as Record<string, McpServerEntry>;
    }
  }
  return null;
}

/**
 * 将认证配置转换为标准 MCP headers
 */
export function authToHeaders(auth?: AuthConfig): Record<string, string> | undefined {
  if (!auth || auth.type === 'none') return undefined;

  const headers: Record<string, string> = {};

  if (auth.apiKey?.apiKey) {
    const headerName = auth.apiKey.headerName || 'Authorization';
    const prefix = auth.apiKey.prefix ?? 'Bearer ';
    headers[headerName] = `${prefix}${auth.apiKey.apiKey}`;
  }

  if (auth.basicAuth?.username && auth.basicAuth.password) {
    headers['Authorization'] = `Basic ${btoa(`${auth.basicAuth.username}:${auth.basicAuth.password}`)}`;
  }

  if (auth.customHeaders) {
    auth.customHeaders.forEach((header) => {
      if (header.name && header.value) {
        headers[header.name] = header.value;
      }
    });
  }

  return Object.keys(headers).length > 0 ? headers : undefined;
}

/**
 * 将单条内部配置转换为标准 MCP 服务器条目（仅远程 HTTP/SSE）
 */
export function configToMcpServerEntry(config: MCPServerConfig): McpServerEntry {
  const path = config.ssePath || (config.transport === 'sse' ? '/sse' : '/mcp');
  let url = `${config.host.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;

  if (config.auth?.type === 'combined' && config.auth.urlParams?.length) {
    try {
      const urlObj = new URL(url);
      config.auth.urlParams.forEach((param) => {
        if (param.name && param.value) {
          urlObj.searchParams.set(param.name, param.value);
        }
      });
      url = urlObj.toString();
    } catch {
      // 保持原始 URL
    }
  }

  const entry: McpServerEntry = { url };
  const headers = authToHeaders(config.auth);
  if (headers) {
    entry.headers = headers;
  }
  return entry;
}

/**
 * 将内部配置列表转换为通用 mcpServers 格式（可直接用于 Cursor、Claude 等）
 */
export function configsToUniversalFormat(configs: MCPServerConfig[]): UniversalMcpConfig {
  const mcpServers: Record<string, McpServerEntry> = {};
  configs.forEach((config) => {
    mcpServers[config.name] = configToMcpServerEntry(config);
  });
  return { mcpServers };
}

/**
 * 检测配置来源
 */
function detectSource(data: Record<string, unknown>, fileName?: string): McpConfigSource {
  if (data.configs && Array.isArray(data.configs)) {
    return 'legacy';
  }

  if (data.mcpServers || data.servers) {
    const lowerName = (fileName || '').toLowerCase();
    if (lowerName.includes('claude')) return 'claude';
    if (lowerName.includes('cursor')) return 'cursor';
    if (lowerName.includes('windsurf') || lowerName.includes('codeium')) return 'windsurf';
    if (lowerName.includes('vscode')) return 'vscode';
    return 'native';
  }

  return 'unknown';
}

/**
 * 验证并规范化本应用原生配置
 */
function normalizeNativeConfig(config: unknown): MCPServerConfig | null {
  if (!config || typeof config !== 'object') return null;
  const c = config as Record<string, unknown>;

  if (!c.name || !c.host || !c.transport) return null;

  return {
    name: String(c.name),
    host: String(c.host),
    ssePath: c.ssePath
      ? String(c.ssePath)
      : c.transport === 'streamable'
        ? '/mcp'
        : '/sse',
    messagePath: c.messagePath ? String(c.messagePath) : '',
    transport: c.transport as MCPTransportMode,
    sessionId: c.sessionId ? String(c.sessionId) : undefined,
    headers: c.headers as Record<string, string> | undefined,
    auth: (c.auth as AuthConfig) || { type: 'none' }
  };
}

/**
 * 解析 MCP 配置文件内容（JSON 字符串或对象）
 */
export function parseMcpConfigFile(
  content: string | Record<string, unknown>,
  fileName?: string
): McpConfigParseResult {
  let data: Record<string, unknown>;

  try {
    data = typeof content === 'string' ? JSON.parse(content) : content;
  } catch {
    return { configs: [], skipped: [], source: 'unknown' };
  }

  if (!data || typeof data !== 'object') {
    return { configs: [], skipped: [], source: 'unknown' };
  }

  const source = detectSource(data, fileName);

  // 本应用原生格式
  if (data.configs && Array.isArray(data.configs)) {
    const configs: MCPServerConfig[] = [];
    for (const item of data.configs) {
      const normalized = normalizeNativeConfig(item);
      if (normalized) configs.push(normalized);
    }
    return { configs, skipped: [], source: 'legacy' };
  }

  // 外部工具格式
  const serversMap = extractServersMap(data);
  if (!serversMap) {
    return { configs: [], skipped: [], source };
  }

  const configs: MCPServerConfig[] = [];
  const skipped: SkippedServer[] = [];

  for (const [name, entry] of Object.entries(serversMap)) {
    if (!entry || typeof entry !== 'object') {
      skipped.push({ name, reason: 'invalid' });
      continue;
    }

    const result = convertExternalServer(name, entry);
    if ('reason' in result) {
      skipped.push(result);
    } else {
      configs.push(result);
    }
  }

  return { configs, skipped, source };
}

export interface ImportConfigsResult {
  success: boolean;
  imported: number;
  skipped: number;
  source?: McpConfigSource;
}
