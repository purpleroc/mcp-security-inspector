import { LLMConfig, LLMRequest, LLMResponse } from '../types/mcp';
import { getLLMConfigs, callLLM } from '../utils/storage';

/**
 * LLM客户端服务
 * 提供统一的LLM调用接口，支持多种模型
 */
export class LLMClientService {
  private static instance: LLMClientService;

  private constructor() {
    // 构造函数中不再异步加载配置
  }

  public static getInstance(): LLMClientService {
    if (!LLMClientService.instance) {
      LLMClientService.instance = new LLMClientService();
    }
    return LLMClientService.instance;
  }

  /**
   * 获取所有LLM配置（实时从存储获取）
   */
  private getConfigs(): LLMConfig[] {
    try {
      return getLLMConfigs();
    } catch (error) {
      console.error('获取LLM配置失败:', error);
      return [];
    }
  }

  /**
   * 获取所有启用的LLM配置
   */
  public getEnabledConfigs(): LLMConfig[] {
    return this.getConfigs().filter(config => config.enabled);
  }

  /**
   * 根据ID获取配置
   */
  public getConfigById(id: string): LLMConfig | undefined {
    return this.getConfigs().find(config => config.id === id);
  }

  /**
   * 获取默认配置（第一个启用的配置）
   */
  public getDefaultConfig(): LLMConfig | undefined {
    return this.getEnabledConfigs()[0];
  }

  /**
   * 调用指定的LLM
   */
  public async callLLM(configId: string, request: LLMRequest, abortSignal?: AbortSignal): Promise<LLMResponse> {
    const config = this.getConfigById(configId);
    if (!config) {
      console.error(`LLM配置查找失败 - 请求的ID: ${configId}`);
      console.error('可用的配置:', this.getConfigs().map(c => ({ id: c.id, name: c.name, enabled: c.enabled })));
      throw new Error(`未找到ID为 ${configId} 的LLM配置`);
    }

    if (!config.enabled) {
      throw new Error(`LLM配置 ${config.name} 已被禁用`);
    }

    console.log(`使用LLM配置: ${config.name} (${config.type}) - ${config.endpoint}`);
    return await callLLM(config, request, abortSignal);
  }

  /**
   * 使用默认配置调用LLM
   */
  public async callDefaultLLM(request: LLMRequest): Promise<LLMResponse> {
    const config = this.getDefaultConfig();
    if (!config) {
      throw new Error('没有可用的LLM配置');
    }

    return await callLLM(config, request);
  }

  /**
   * 批量调用LLM（用于对比不同模型的响应）
   */
  public async callMultipleLLMs(
    configIds: string[], 
    request: LLMRequest
  ): Promise<Array<{ configId: string; response?: LLMResponse; error?: string }>> {
    const results = await Promise.allSettled(
      configIds.map(async (configId) => {
        const response = await this.callLLM(configId, request);
        return { configId, response };
      })
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          configId: configIds[index],
          error: result.reason instanceof Error ? result.reason.message : String(result.reason)
        };
      }
    });
  }

  /**
   * 生成安全分析提示词
   */
  public generateSecurityAnalysisPrompt(
    type: 'tool' | 'prompt' | 'resource',
    target: any,
    configId: string
  ): LLMRequest {
    let systemPrompt = '';
    let userPrompt = '';

    switch (type) {
      case 'tool':
        systemPrompt = `你是一个MCP工具安全分析专家。请分析给定的MCP工具，识别潜在的安全风险。

请从以下几个维度进行分析：
1. 权限风险：工具是否可能执行危险操作
2. 输入验证：参数是否可能被注入恶意内容
3. 数据泄露：工具是否可能暴露敏感信息
4. 访问控制：工具是否缺少适当的权限检查
5. 副作用：工具执行是否可能产生意外后果

请以JSON格式返回分析结果，格式如下：

\`\`\`json
{
  "riskLevel": "critical|high|medium|low",
  "vulnerabilities": [
    {
      "type": "injection|privilege|leak|access",
      "severity": "critical|high|medium|low",
      "description": "漏洞描述",
      "recommendation": "修复建议"
    }
  ]
}
\`\`\`

漏洞类型说明：
- injection: 注入攻击风险
- privilege: 权限提升风险
- leak: 信息泄露风险
- access: 访问控制问题`;

        userPrompt = `请分析以下MCP工具的安全性：

工具名称: ${target.name}
工具描述: ${target.description || '无描述'}
输入参数: ${JSON.stringify(target.inputSchema, null, 2)}

请以JSON格式返回详细的安全分析结果。`;
        break;

      case 'prompt':
        systemPrompt = `你是一个提示注入和恶意提示检测专家。请分析给定的MCP提示，识别潜在的安全威胁。

请从以下几个维度进行分析：
1. 提示注入：是否包含可能绕过安全限制的指令
2. 恶意引导：是否试图引导用户执行危险操作
3. 信息泄露：是否可能导致敏感信息泄露
4. 权限提升：是否试图获取超出预期的权限
5. 社会工程：是否包含欺骗或操纵元素

请以JSON格式返回分析结果，格式如下：

\`\`\`json
{
  "riskLevel": "critical|high|medium|low",
  "threats": [
    {
      "type": "injection|manipulation|leak|malicious",
      "severity": "critical|high|medium|low", 
      "description": "威胁描述",
      "evidence": "检测到的具体证据",
      "recommendation": "修复建议"
    }
  ]
}
\`\`\`

威胁类型说明：
- injection: 提示注入攻击
- manipulation: 恶意操纵和引导  
- leak: 信息泄露风险
- malicious: 其他恶意行为`;

        userPrompt = `请分析以下MCP提示的安全性：

提示名称: ${target.name}
提示描述: ${target.description || '无描述'}
参数要求: ${JSON.stringify(target.arguments || [], null, 2)}

请以JSON格式返回详细的安全威胁分析结果。`;
        break;

      case 'resource':
        systemPrompt = `你是一个资源访问安全分析专家。请分析给定的MCP资源，识别潜在的安全风险。

请从以下几个维度进行分析：
1. 访问控制：资源是否缺少适当的权限检查
2. 路径遍历：URI是否可能被利用进行路径遍历攻击
3. 信息泄露：资源是否可能暴露敏感数据
4. 注入攻击：资源访问是否可能被注入恶意代码
5. 资源滥用：资源是否可能被恶意滥用

请以JSON格式返回分析结果，格式如下：

\`\`\`json
{
  "riskLevel": "critical|high|medium|low",
  "risks": [
    {
      "type": "traversal|access|leak|injection",
      "severity": "critical|high|medium|low",
      "description": "风险描述",
      "evidence": "检测到的具体证据",
      "recommendation": "修复建议"
    }
  ]
}
\`\`\`

风险类型说明：
- traversal: 路径遍历攻击
- access: 访问控制问题
- leak: 信息泄露风险
- injection: 内容注入攻击`;

        userPrompt = `请分析以下MCP资源的安全性：

资源URI: ${target.uri}
资源名称: ${target.name || '无名称'}
资源描述: ${target.description || '无描述'}
MIME类型: ${target.mimeType || '未知'}

请以JSON格式返回详细的安全风险分析结果。`;
        break;
    }

    // 获取LLM配置
    const config = this.getConfigById(configId);
    const temperature = config?.temperature ?? 0.1; // 使用较低的温度确保分析的一致性
    const maxTokens = config?.maxTokens ?? 2000;

    return {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: temperature,
      maxTokens: maxTokens
    };
  }

  /**
   * 生成增强的提示安全分析提示词
   */
  public generateEnhancedPromptSecurityAnalysis(prompt: any, configId: string): LLMRequest {
    const systemPrompt = `你是一个专业的提示注入和AI安全专家。请对给定的MCP提示进行全面的安全风险分析。

分析维度：

1. **提示注入风险**：
   - 检查是否包含可能被利用的指令分隔符或转义序列
   - 分析参数插入点是否可能被恶意利用
   - 评估提示结构是否容易被绕过

2. **恶意引导风险**：
   - 检查是否包含误导性或欺骗性语言
   - 分析是否可能引导用户泄露敏感信息
   - 评估是否存在社会工程学攻击元素

3. **上下文污染风险**：
   - 检查是否包含偏见或误导信息
   - 分析是否可能影响AI模型的判断
   - 评估信息的准确性和中立性

4. **隐私泄露风险**：
   - 检查是否可能诱导泄露训练数据
   - 分析是否包含个人信息提取技巧
   - 评估对用户隐私的潜在威胁

5. **权限提升风险**：
   - 检查是否试图获取超出预期的权限
   - 分析是否包含系统级操作指令
   - 评估对系统安全的潜在影响

请以JSON格式返回分析结果，格式如下：

\`\`\`json
{
  "riskLevel": "critical|high|medium|low",
  "threats": [
    {
      "type": "injection|manipulation|leak|malicious",
      "severity": "critical|high|medium|low", 
      "description": "威胁描述",
      "evidence": "检测到的具体证据",
      "recommendation": "修复建议"
    }
  ]
}
\`\`\`

威胁类型说明：
- injection: 提示注入攻击
- manipulation: 恶意操纵和引导  
- leak: 信息泄露风险
- malicious: 其他恶意行为`;

    const userPrompt = `请分析以下MCP提示的安全性：

提示名称: ${prompt.name || '未知'}
提示描述: ${prompt.description || '无描述'}
参数定义: ${JSON.stringify(prompt.arguments || [], null, 2)}

请以JSON格式返回详细的安全风险分析结果。`;

    // 获取LLM配置
    const config = this.getConfigById(configId);
    const temperature = config?.temperature ?? 0.1;
    const maxTokens = config?.maxTokens ?? 2000;

    return {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: temperature,
      maxTokens: maxTokens
    };
  }

  /**
   * 生成增强的资源安全分析提示词
   */
  public generateEnhancedResourceSecurityAnalysis(resource: any, configId: string): LLMRequest {
    const systemPrompt = `你是一个专业的资源访问安全专家。请对给定的MCP资源进行全面的安全风险分析。

分析维度：

1. **路径遍历风险**：
   - 分析URI结构是否存在路径遍历漏洞
   - 检查是否包含危险的路径模式（如../、..\\等）
   - 评估路径验证机制的有效性

2. **访问控制风险**：
   - 分析是否缺少适当的权限验证
   - 检查是否可能绕过访问控制
   - 评估认证和授权机制

3. **信息泄露风险**：
   - 分析资源类型是否可能包含敏感信息
   - 检查文件扩展名和MIME类型的安全性
   - 评估元数据泄露的可能性

4. **内容注入风险**：
   - 分析资源是否可能被恶意修改
   - 检查内容完整性验证机制
   - 评估恶意内容执行的风险

5. **协议安全风险**：
   - 分析URI协议的安全性（file://、http://等）
   - 检查是否使用不安全的传输方式
   - 评估中间人攻击的可能性

6. **资源滥用风险**：
   - 分析是否可能被用于DDoS攻击
   - 检查资源大小和访问频率限制
   - 评估系统资源消耗风险

请以JSON格式返回分析结果，格式如下：

\`\`\`json
{
  "riskLevel": "critical|high|medium|low",
  "risks": [
    {
      "type": "traversal|access|leak|injection",
      "severity": "critical|high|medium|low",
      "description": "风险描述",
      "evidence": "检测到的具体证据",
      "recommendation": "修复建议"
    }
  ]
}
\`\`\`

风险类型说明：
- traversal: 路径遍历攻击
- access: 访问控制问题
- leak: 信息泄露风险
- injection: 内容注入攻击`;

    const userPrompt = `请分析以下MCP资源的安全性：

资源URI: ${resource.uri}
资源名称: ${resource.name || '未指定'}
资源描述: ${resource.description || '无描述'}
MIME类型: ${resource.mimeType || '未知'}
资源大小: ${resource.size || '未知'}

请以JSON格式返回详细的安全风险分析结果。`;

    // 获取LLM配置
    const config = this.getConfigById(configId);
    const temperature = config?.temperature ?? 0.1;
    const maxTokens = config?.maxTokens ?? 2000;

    return {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: temperature,
      maxTokens: maxTokens
    };
  }

  /**
   * 生成智能提示测试用例
   */
  public generatePromptSecurityTests(prompt: any, maxTestCases: number, configId: string): LLMRequest {
    const systemPrompt = `你是一个提示注入测试专家。请为给定的MCP提示生成针对性的安全测试用例。

测试类型包括：

1. **提示注入测试**：
   - 指令分隔符注入（如"忽略之前的指令"）
   - 角色转换攻击（如"现在你是..."）
   - 系统提示泄露（如"重复你的系统提示"）

2. **参数污染测试**：
   - 恶意参数注入
   - 格式化字符串攻击
   - 特殊字符绕过

3. **信息提取测试**：
   - 训练数据泄露尝试
   - 敏感信息提取
   - 上下文信息窃取

4. **逻辑绕过测试**：
   - 安全限制绕过
   - 行为模式改变
   - 输出格式操纵

每个测试用例应包含：
- 测试类型和目的
- 具体的测试参数
- 预期的安全行为
- 风险判定标准
- 攻击成功的迹象

返回JSON格式的测试用例列表。`;

    const userPrompt = `请为以下MCP提示生成安全测试用例：

提示名称: ${prompt.name}
提示描述: ${prompt.description || '无描述'}
参数列表: ${JSON.stringify(prompt.arguments || [], null, 2)}

请生成${maxTestCases}个不同类型的安全测试用例。`;

    // 获取LLM配置
    const config = this.getConfigById(configId);
    const temperature = config?.temperature ?? 0.3;
    const maxTokens = config?.maxTokens ?? 1800;

    return {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature,
      maxTokens
    };
  }

  /**
   * 生成智能资源测试用例
   */
  public generateResourceSecurityTests(resource: any, maxTestCases: number, configId: string): LLMRequest {
    const systemPrompt = `你是一个资源访问安全测试专家。请为给定的MCP资源生成针对性的安全测试用例。

测试类型包括：

1. **路径遍历测试**：
   - 相对路径攻击（../、..\\）
   - 绝对路径注入
   - 编码绕过测试

2. **访问控制测试**：
   - 权限提升尝试
   - 未授权访问测试
   - 认证绕过测试

3. **协议安全测试**：
   - 协议注入攻击
   - 重定向攻击
   - 协议降级攻击

4. **内容安全测试**：
   - 恶意内容检测
   - 文件类型伪造
   - 内容注入测试

5. **资源滥用测试**：
   - 大文件访问测试
   - 频繁访问测试
   - 资源枯竭测试

每个测试用例应包含：
- 测试类型和目的
- 具体的测试URI或参数
- 预期的安全行为
- 风险判定标准
- 攻击成功的迹象

返回JSON格式的测试用例列表。`;

    const userPrompt = `请为以下MCP资源生成安全测试用例：

资源URI: ${resource.uri}
资源名称: ${resource.name || '未指定'}
资源类型: ${resource.mimeType || '未知'}

请生成${maxTestCases}个不同类型的安全测试用例。`;

    // 获取LLM配置
    const config = this.getConfigById(configId);
    const temperature = config?.temperature ?? 0.3;
    const maxTokens = config?.maxTokens ?? 1800;

    return {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature,
      maxTokens
    };
  }

  /**
   * 生成测试用例生成提示词
   */
  public generateTestCasePrompt(tool: any): LLMRequest {
    const systemPrompt = `你是一个MCP工具测试用例生成专家。请为给定的工具生成全面的测试用例，包括：

1. 正常用例：验证工具基本功能
2. 边界用例：测试参数边界和极值
3. 异常用例：测试错误处理
4. 安全用例：测试潜在的安全漏洞

每个测试用例应包含：
- 测试目的
- 输入参数
- 预期行为
- 风险等级

请以JSON格式返回测试用例列表。`;

    const userPrompt = `请为以下MCP工具生成测试用例：

工具名称: ${tool.name}
工具描述: ${tool.description || '无描述'}
输入参数定义: ${JSON.stringify(tool.inputSchema, null, 2)}

请生成5-10个不同类型的测试用例。`;

    return {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      maxTokens: 1500
    };
  }

  /**
   * 生成智能安全测试用例（增强版）
   */
  public generateAdvancedSecurityTestCases(tool: any, maxTestCases: number,configId: string): LLMRequest {
    const systemPrompt = `你是一个专业的安全测试专家，专门为MCP工具生成全面的安全测试用例。

重要安全原则：
1. 绝对禁止生成任何可能造成系统损害的命令（如rm -rf、format、delete等）
2. 所有测试参数必须是安全的，不会对系统造成实际危害
3. 测试参数应该便于从返回结果中判断是否存在安全问题
4. 重点关注输入验证、边界检查、权限控制等逻辑层面的安全问题
5. 测试参数应该根据工具的实际功能和参数架构来设计，确保测试的有效性

请根据工具的功能和参数架构分析潜在的安全风险，并生成对应的测试用例。每个测试用例应包含：

1. riskType：风险类型（injection/validation/privilege/disclosure/dos）
2. purpose：测试目的的简短描述
3. parameters：根据工具参数架构设计的测试参数
4. expectedBehavior：期望的安全行为
5. judgmentCriteria：如何从返回结果判断是否存在风险
6. riskLevel：风险等级（low/medium/high/critical）
7. riskDescription：风险描述

测试用例设计原则：
- 参数应该符合工具的实际参数架构
- 根据工具描述推断其功能，设计相应的测试场景
- 对于数值参数，测试边界值和异常值
- 对于字符串参数，测试特殊字符和注入模式
- 对于布尔参数，测试权限相关的场景

返回格式为JSON数组，确保生成 **${maxTestCases}** 个不同类型的安全测试用例。`;

    const userPrompt = `请为以下MCP工具生成安全的测试用例：

工具名称: ${tool.name}
工具描述: ${tool.description || '无描述'}
输入参数架构: ${JSON.stringify(tool.inputSchema, null, 2)}

请根据工具描述和参数架构，生成符合实际功能的测试用例。确保测试参数与工具的参数定义匹配。`;

    // 获取LLM配置
    const config = this.getConfigById(configId);
    const temperature = config?.temperature ?? 0.2;
    const maxTokens = config?.maxTokens ?? 2500;

    return {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: temperature,
      maxTokens: maxTokens
    };
  }

  /**
   * 生成智能结果安全评估提示词
   */
  public generateIntelligentResultEvaluation(
    testCase: {
      riskType: string;
      purpose: string;
      parameters: Record<string, unknown>;
      expectedBehavior: string;
      judgmentCriteria: string;
      riskLevel: string;
      riskDescription: string;
    },
    actualResult: any,
    error?: string,
    configId?: string
  ): LLMRequest {
    const systemPrompt = `你是一个安全测试结果分析专家。请根据测试用例的预期行为和判定条件，分析实际的执行结果是否存在安全风险。

分析时请考虑：
1. 实际结果是否符合预期的安全行为
2. 错误消息是否泄露了敏感信息
3. 执行是否产生了预期外的副作用
4. 是否存在注入攻击成功的迹象
5. 权限控制是否被绕过

请严格按照以下JSON格式返回结果：
{
  "riskLevel": "low|medium|high|critical",
  "description": "详细的安全评估描述，说明测试结果的安全状态和具体发现的问题",
  "evidence": "基于什么证据得出的结论",
  "recommendation": "建议的改进措施"
}

注意：
- riskLevel必须是：low、medium、high、critical之一，表示风险等级
  - low: 安全，无明显风险
  - medium: 中等风险，存在潜在安全问题
  - high: 高风险，存在明确的安全威胁
  - critical: 严重风险，存在可被立即利用的安全漏洞
- 所有字段都必须提供，不能为空
- 只返回JSON格式，不要其他内容`;

    const userPrompt = `请分析以下安全测试的执行结果：

测试用例信息：
- 风险类型：${testCase.riskType}
- 测试目的：${testCase.purpose}
- 输入参数：${JSON.stringify(testCase.parameters, null, 2)}
- 期望行为：${testCase.expectedBehavior}
- 判定条件：${testCase.judgmentCriteria}
- 预期风险等级：${testCase.riskLevel}

实际执行结果：
结果：${JSON.stringify(actualResult, null, 2)}

请根据上述信息进行安全性评估，严格按照指定的JSON格式返回结果。`;

    // 获取LLM配置
    const config = configId ? this.getConfigById(configId) : null;
    const temperature = config?.temperature ?? 0.1;
    const maxTokens = config?.maxTokens ?? 1200;

    return {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: temperature,
      maxTokens: maxTokens
    };
  }

}

// 导出单例实例
export const llmClient = LLMClientService.getInstance(); 