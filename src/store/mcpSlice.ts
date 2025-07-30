import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  MCPServerConfig,
  MCPConnectionStatus,
  MCPTool,
  MCPResource,
  MCPPrompt,
  MCPCallHistory,
  MCPToolResult,
  MCPResourceContent,
  SecurityCheckResult,
  InitializeResult
} from '@/types/mcp';
import { mcpClient } from '@/services/mcpClient';
import { storage } from '@/utils/storage';
import { v4 as uuidv4 } from 'uuid';

// 应用状态接口
export interface MCPState {
  // 连接状态
  connectionStatus: MCPConnectionStatus;
  serverConfig: MCPServerConfig | null;
  serverInfo: InitializeResult | null;
  
  // 数据
  tools: MCPTool[];
  resources: MCPResource[];
  resourceTemplates: MCPResource[];
  prompts: MCPPrompt[];
  
  // 当前选择
  selectedTool: MCPTool | null;
  selectedResource: MCPResource | null;
  selectedPrompt: MCPPrompt | null;
  
  // 调用状态
  isLoading: boolean;
  currentParameters: Record<string, unknown>;
  lastResult: MCPToolResult | MCPResourceContent | null;
  lastError: string | null;
  
  // 安全检查
  securityCheck: SecurityCheckResult | null;
  
  // 历史记录
  history: MCPCallHistory[];
  
  // UI状态
  currentTab: 'config' | 'explorer' | 'history';
}

// 初始状态
const initialState: MCPState = {
  connectionStatus: 'disconnected',
  serverConfig: storage.getServerConfig(),
  serverInfo: null,
  tools: [],
  resources: [],
  resourceTemplates: [],
  prompts: [],
  selectedTool: null,
  selectedResource: null,
  selectedPrompt: null,
  isLoading: false,
  currentParameters: {},
  lastResult: null,
  lastError: null,
  securityCheck: null,
  history: storage.getHistory(),
  currentTab: 'config'
};

// 异步action：连接到MCP服务器
export const connectToServer = createAsyncThunk(
  'mcp/connectToServer',
  async (config: MCPServerConfig, { dispatch, rejectWithValue }) => {
    try {
      // 连接开始时先清空旧数据
      dispatch(setTools([]));
      dispatch(setResources([]));
      dispatch(setResourceTemplates([]));
      dispatch(setPrompts([]));
      
      mcpClient.configure(config);
      const serverInfo = await mcpClient.connect();
      
      // 连接成功后，独立获取各种数据（避免一个失败导致全部失败）
      let hasAnyData = false;
      
      // 获取工具列表
      try {
        const tools = await mcpClient.listTools();
        console.log('获取工具列表成功:', tools.length, '个工具');
        dispatch(setTools(tools));
        if (tools.length > 0) hasAnyData = true;
      } catch (error) {
        console.warn('获取工具列表失败:', error);
        dispatch(setTools([]));
      }
      
      // 获取资源列表
      try {
        const resources = await mcpClient.listResources();
        console.log('获取资源列表成功:', resources.length, '个资源');
        dispatch(setResources(resources));
        if (resources.length > 0) hasAnyData = true;
      } catch (error) {
        console.warn('获取资源列表失败:', error);
        dispatch(setResources([]));
      }
      
      // 获取资源模板列表
      try {
        const resourceTemplates = await mcpClient.listResourceTemplates();
        console.log('获取资源模板列表成功:', resourceTemplates.length, '个模板');
        dispatch(setResourceTemplates(resourceTemplates));
        if (resourceTemplates.length > 0) hasAnyData = true;
      } catch (error) {
        console.warn('获取资源模板列表失败:', error);
        dispatch(setResourceTemplates([]));
      }
      
      // 获取提示列表
      try {
        const prompts = await mcpClient.listPrompts();
        console.log('获取提示列表成功:', prompts.length, '个提示');
        dispatch(setPrompts(prompts));
        if (prompts.length > 0) hasAnyData = true;
      } catch (error) {
        console.warn('获取提示列表失败:', error);
        dispatch(setPrompts([]));
      }
      
      // 根据获取到的数据决定切换到哪个tab
      if (hasAnyData) {
        // 切换到explorer tab显示数据
        dispatch(setCurrentTab('explorer'));
      } else {
        // 如果没有数据，保持在tools tab
        dispatch(setCurrentTab('explorer'));
      }
      
      return { config, serverInfo };
    } catch (error) {
      console.error('连接失败:', error);
      const errorMessage = error instanceof Error ? error.message : '连接失败，请检查服务器配置';
      return rejectWithValue(errorMessage);
    }
  }
);

// 异步action：断开连接
export const disconnectFromServer = createAsyncThunk(
  'mcp/disconnectFromServer',
  async () => {
    mcpClient.disconnect();
  }
);

// 异步action：获取工具列表
export const fetchTools = createAsyncThunk(
  'mcp/fetchTools',
  async (_, { rejectWithValue }) => {
    try {
      return await mcpClient.listTools();
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch tools');
    }
  }
);

// 异步action：获取资源列表
export const fetchResources = createAsyncThunk(
  'mcp/fetchResources',
  async (_, { rejectWithValue }) => {
    try {
      return await mcpClient.listResources();
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch resources');
    }
  }
);

// 异步action：获取资源模板列表
export const fetchResourceTemplates = createAsyncThunk(
  'mcp/fetchResourceTemplates',
  async (_, { rejectWithValue }) => {
    try {
      return await mcpClient.listResourceTemplates();
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch resource templates');
    }
  }
);

// 异步action：获取提示列表
export const fetchPrompts = createAsyncThunk(
  'mcp/fetchPrompts',
  async (_, { rejectWithValue }) => {
    try {
      return await mcpClient.listPrompts();
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch prompts');
    }
  }
);

// 异步action：调用工具
export const callTool = createAsyncThunk(
  'mcp/callTool',
  async ({ tool, parameters }: { tool: MCPTool; parameters: Record<string, unknown> }, { rejectWithValue, getState }) => {
    try {
      const startTime = Date.now();
      const result = await mcpClient.callTool(tool.name, parameters);
      const endTime = Date.now();
      
      // 创建历史记录
      const historyItem: MCPCallHistory = {
        id: uuidv4(),
        timestamp: startTime,
        type: 'tool',
        name: tool.name,
        parameters,
        result,
        duration: endTime - startTime,
        securityWarnings: (getState() as any).mcp.securityCheck?.warnings || []
      };
      
      return { result, historyItem };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Tool call failed');
    }
  }
);

// 异步action：读取资源
export const readResource = createAsyncThunk(
  'mcp/readResource',
  async ({ resource, parameters }: { resource: MCPResource; parameters?: Record<string, unknown> }, { rejectWithValue }) => {
    try {
      const startTime = Date.now();
      const result = await mcpClient.readResource(resource.uri);
      const endTime = Date.now();
      
      // 创建历史记录
      const historyItem: MCPCallHistory = {
        id: uuidv4(),
        timestamp: startTime,
        type: 'resource',
        name: resource.name || resource.uri,
        parameters,
        result,
        duration: endTime - startTime
      };
      
      return { result, historyItem };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Resource read failed');
    }
  }
);

// 异步action：获取提示
export const getPrompt = createAsyncThunk(
  'mcp/getPrompt',
  async ({ prompt, parameters }: { prompt: MCPPrompt; parameters?: Record<string, unknown> }, { rejectWithValue }) => {
    try {
      const startTime = Date.now();
      const result = await mcpClient.getPrompt(prompt.name, parameters);
      const endTime = Date.now();
      
      // 创建历史记录
      const historyItem: MCPCallHistory = {
        id: uuidv4(),
        timestamp: startTime,
        type: 'prompt',
        name: prompt.name,
        parameters,
        result,
        duration: endTime - startTime
      };
      
      return { result, historyItem };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Prompt get failed');
    }
  }
);

// 创建slice
const mcpSlice = createSlice({
  name: 'mcp',
  initialState,
  reducers: {
    // 设置当前选择的工具
    setSelectedTool: (state, action: PayloadAction<MCPTool | null>) => {
      state.selectedTool = action.payload;
      state.selectedResource = null;
      state.selectedPrompt = null;
      state.currentParameters = {};
      state.securityCheck = null;
      state.lastResult = null;
      state.lastError = null;
    },
    
    // 设置当前选择的资源
    setSelectedResource: (state, action: PayloadAction<MCPResource | null>) => {
      state.selectedResource = action.payload;
      state.selectedTool = null;
      state.selectedPrompt = null;
      state.currentParameters = {};
      state.lastResult = null;
      state.lastError = null;
    },
    
    // 设置当前选择的提示
    setSelectedPrompt: (state, action: PayloadAction<MCPPrompt | null>) => {
      state.selectedPrompt = action.payload;
      state.selectedTool = null;
      state.selectedResource = null;
      state.currentParameters = {};
      state.lastResult = null;
      state.lastError = null;
    },
    
    // 更新参数
    updateParameters: (state, action: PayloadAction<Record<string, unknown>>) => {
      state.currentParameters = action.payload;
      
      // 如果有选中的工具，执行安全检查
      if (state.selectedTool) {
        state.securityCheck = mcpClient.performSecurityCheck(state.selectedTool, action.payload);
      }
    },
    
    // 清除错误
    clearError: (state) => {
      state.lastError = null;
    },
    
    // 切换标签页
    setCurrentTab: (state, action: PayloadAction<MCPState['currentTab']>) => {
      state.currentTab = action.payload;
    },
    
    // 设置工具列表
    setTools: (state, action: PayloadAction<MCPTool[]>) => {
      state.tools = action.payload;
    },
    
    // 设置资源列表
    setResources: (state, action: PayloadAction<MCPResource[]>) => {
      state.resources = action.payload;
    },
    setResourceTemplates: (state, action: PayloadAction<MCPResource[]>) => {
      state.resourceTemplates = action.payload;
    },
    
    // 设置提示列表
    setPrompts: (state, action: PayloadAction<MCPPrompt[]>) => {
      state.prompts = action.payload;
    },
    
    // 清除历史记录
    clearHistory: (state) => {
      state.history = [];
      // 清除localStorage中的历史记录
      storage.saveHistory([]);
    },
    
    // 删除历史记录项
    deleteHistoryItem: (state, action: PayloadAction<string>) => {
      state.history = state.history.filter(item => item.id !== action.payload);
    },
    
    // 重置状态
    resetState: () => initialState,
    
    // 清空安全检测结果
    clearSecurityResults: (state) => {
      state.securityCheck = null;
    }
  },
  
  extraReducers: (builder) => {
    // 连接到服务器
    builder
      .addCase(connectToServer.pending, (state) => {
        state.connectionStatus = 'connecting';
        state.isLoading = true;
        state.lastError = null;
        // 连接开始时清空旧服务器的数据
        state.tools = [];
        state.resources = [];
        state.resourceTemplates = [];
        state.prompts = [];
        state.selectedTool = null;
        state.selectedResource = null;
        state.selectedPrompt = null;
        state.lastResult = null;
        state.securityCheck = null;
        // 清空安全检测结果
        state.securityCheck = null;
      })
      .addCase(connectToServer.fulfilled, (state, action) => {
        state.connectionStatus = 'connected';
        state.isLoading = false;
        
        // 如果用户没有填写名称或使用默认名称，则使用服务器返回的名称
        let finalConfig = action.payload.config;
        if (action.payload.serverInfo && 
            (!action.payload.config.name || action.payload.config.name === 'MCP Server')) {
          finalConfig = {
            ...action.payload.config,
            name: action.payload.serverInfo.serverInfo.name
          };
        }
        
        state.serverConfig = finalConfig;
        state.serverInfo = action.payload.serverInfo;
        // 保存服务器配置到localStorage（使用最终的配置）
        storage.saveServerConfig(finalConfig);
      })
      .addCase(connectToServer.rejected, (state, action) => {
        state.connectionStatus = 'error';
        state.isLoading = false;
        state.lastError = action.payload as string;
      });
    
    // 断开连接
    builder
      .addCase(disconnectFromServer.fulfilled, (state) => {
        state.connectionStatus = 'disconnected';
        state.serverConfig = null;
        state.serverInfo = null;
        state.tools = [];
        state.resources = [];
        state.resourceTemplates = [];
        state.prompts = [];
        state.selectedTool = null;
        state.selectedResource = null;
        state.selectedPrompt = null;
        state.currentTab = 'config';
      });
    
    // 获取工具列表
    builder
      .addCase(fetchTools.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchTools.fulfilled, (state, action) => {
        state.isLoading = false;
        state.tools = action.payload;
      })
      .addCase(fetchTools.rejected, (state, action) => {
        state.isLoading = false;
        state.lastError = action.payload as string;
      });
    
    // 获取资源列表
    builder
      .addCase(fetchResources.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchResources.fulfilled, (state, action) => {
        state.isLoading = false;
        state.resources = action.payload;
      })
      .addCase(fetchResources.rejected, (state, action) => {
        state.isLoading = false;
        state.lastError = action.payload as string;
      });
    
    // 获取提示列表
    builder
      .addCase(fetchPrompts.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchPrompts.fulfilled, (state, action) => {
        state.isLoading = false;
        state.prompts = action.payload;
      })
      .addCase(fetchPrompts.rejected, (state, action) => {
        state.isLoading = false;
        state.lastError = action.payload as string;
      });
    
    // 调用工具
    builder
      .addCase(callTool.pending, (state) => {
        state.isLoading = true;
        state.lastError = null;
      })
      .addCase(callTool.fulfilled, (state, action) => {
        state.isLoading = false;
        state.lastResult = action.payload.result;
        state.history.unshift(action.payload.historyItem);
        // 保存历史记录到localStorage
        storage.saveHistory(state.history);
      })
      .addCase(callTool.rejected, (state, action) => {
        state.isLoading = false;
        state.lastError = action.payload as string;
      });
    
    // 读取资源
    builder
      .addCase(readResource.pending, (state) => {
        state.isLoading = true;
        state.lastError = null;
      })
      .addCase(readResource.fulfilled, (state, action) => {
        state.isLoading = false;
        state.lastResult = action.payload.result;
        state.history.unshift(action.payload.historyItem);
      })
      .addCase(readResource.rejected, (state, action) => {
        state.isLoading = false;
        state.lastError = action.payload as string;
      });
    
    // 获取提示
    builder
      .addCase(getPrompt.pending, (state) => {
        state.isLoading = true;
        state.lastError = null;
      })
      .addCase(getPrompt.fulfilled, (state, action) => {
        state.isLoading = false;
        state.lastResult = action.payload.result;
        state.history.unshift(action.payload.historyItem);
      })
      .addCase(getPrompt.rejected, (state, action) => {
        state.isLoading = false;
        state.lastError = action.payload as string;
      });
  }
});

// 导出actions
export const {
  setSelectedTool,
  setSelectedResource,
  setSelectedPrompt,
  updateParameters,
  clearError,
  setCurrentTab,
  setTools,
  setResources,
  setResourceTemplates,
  setPrompts,
  clearHistory,
  deleteHistoryItem,
  resetState,
  clearSecurityResults
} = mcpSlice.actions;

// 导出reducer
export default mcpSlice.reducer; 