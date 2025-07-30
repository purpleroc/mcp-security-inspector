import { LLMConfig, LLMRequest, LLMResponse } from '../types/mcp';
import { getLLMConfigs, callLLM } from '../utils/storage';
import { getCurrentLanguage } from '../i18n';

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
   * 获取当前语言设置
   */
  private getCurrentLanguage(): string {
    return getCurrentLanguage();
  }

  /**
   * 生成语言感知的输出要求
   */
  public getLanguageOutputRequirement(): string {
    const currentLanguage = this.getCurrentLanguage();
    
    if (currentLanguage === 'zh-CN') {
      return `
重要：请用中文回复，除json数据外，其他内容使用中文。
`;
    } else {
      return `
Important: Please respond in English, all field names and descriptions should be in English.`;
    }
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

    const languageRequirement = this.getLanguageOutputRequirement();

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
- access: 访问控制问题

${languageRequirement}`;

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
- malicious: 其他恶意行为

${languageRequirement}`;

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
- injection: 内容注入攻击

${languageRequirement}`;

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
   * 生成智能提示测试用例
   */
  public generatePromptSecurityTests(prompt: any, maxTestCases: number, configId: string): LLMRequest {
    const languageRequirement = this.getLanguageOutputRequirement();
    
    const userPrompt = `
你是一个提示注入测试专家。请为给定的MCP提示生成针对性的安全测试用例。

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
    
请为以下MCP提示生成安全测试用例：

提示名称: ${prompt.name}
提示描述: ${prompt.description || '无描述'}
参数列表: ${JSON.stringify(prompt.arguments || [], null, 2)}

## 安全要求
1. 绝对禁止生成任何可能造成系统损害的测试用例。（比如：删除文件、删除数据库、删除系统等）
2. 所有测试参数必须是安全的，不会对系统造成实际危害
3. 测试参数应该便于从返回结果中判断是否存在安全问题
4. 重点关注输入验证、边界检查、权限控制等逻辑层面的安全问题
5. 测试参数应该根据工具的实际功能和参数架构来设计，确保测试的有效性
6. 确保生成的JSON为正确的JSON格式。不要出现nan、undefined、null等字段。

请严格遵守安全要求，生成${maxTestCases}个不同测试目的的安全测试用例，JSON格式输出测试用例列表。
${languageRequirement}`;

    // 获取LLM配置
    const config = this.getConfigById(configId);
    const temperature = config?.temperature ?? 0.3;
    const maxTokens = config?.maxTokens ?? 1800;

    return {
      messages: [
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
    const languageRequirement = this.getLanguageOutputRequirement();
    
    const userPrompt = `
你是一个资源访问安全测试专家。请为给定的MCP资源生成针对性的安全测试用例。

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


## 安全要求
1. 绝对禁止生成任何可能造成系统损害的测试用例。（比如：删除文件、删除数据库、删除系统等）
2. 所有测试参数必须是安全的，不会对系统造成实际危害
3. 测试参数应该便于从返回结果中判断是否存在安全问题
4. 重点关注输入验证、边界检查、权限控制等逻辑层面的安全问题
5. 测试参数应该根据工具的实际功能和参数架构来设计，确保测试的有效性
6. 确保生成的JSON为正确的JSON格式。不要出现nan、undefined、null等字段。
    
请为以下MCP资源生成安全测试用例：

资源URI: ${resource.uri}
资源名称: ${resource.name || '未指定'}
资源类型: ${resource.mimeType || '未知'}


请严格遵守安全要求，生成${maxTestCases}个不同测试目的的安全测试用例，JSON格式输出测试用例列表。
${languageRequirement}`;

    // 获取LLM配置
    const config = this.getConfigById(configId);
    const temperature = config?.temperature ?? 0.3;
    const maxTokens = config?.maxTokens ?? 1800;

    return {
      messages: [
        { role: 'user', content: userPrompt }
      ],
      temperature,
      maxTokens
    };
  }

  /**
   * 生成智能安全测试用例（增强版）
   */
  public generateAdvancedToolTestCases(tool: any, maxTestCases: number,configId: string): LLMRequest {
    const languageRequirement = this.getLanguageOutputRequirement();
    
    const systemPrompt = `你是一个专业的安全测试专家，专门为MCP工具生成全面的安全测试用例。

## 严格禁止的危险命令和操作
以下命令和操作绝对禁止在任何测试用例中出现：
- 文件删除命令：rm, del, delete, unlink, rmdir, remove
- 系统操作命令：shutdown, reboot, restart, poweroff, halt
- 网络操作命令：ifconfig down, ip link down, netstat, iptables
- 进程操作命令：kill, pkill, killall, taskkill
- 数据库操作命令：DROP, DELETE, TRUNCATE, DROP DATABASE
- 权限提升命令：sudo, su, runas, elevate
- 系统信息收集：cat /etc/passwd, cat /etc/shadow, whoami, id
- 网络扫描命令：nmap, ping, telnet, nc, netcat
- 任何包含路径遍历的测试：../../../, ..\\\\..\\\\..\\\\
- 超长输入测试：超过1000字符的输入
- 特殊字符注入：<script>, javascript:, data:, vbscript:
- 命令注入测试：; rm -rf, | rm -rf, && rm -rf, || rm -rf
- 任何可能导致系统损害的测试用例

## 安全测试用例要求
每个测试用例应包含：
1. riskType：风险类型
2. purpose：测试目的的简短描述
3. parameters：根据工具参数架构设计的测试参数（必须是安全的）
4. expectedBehavior：期望的安全行为
5. judgmentCriteria：如何从返回结果判断是否存在风险
6. riskLevel：风险等级（low/medium/high/critical）
7. riskDescription：风险描述

## 测试用例设计原则
- 参数必须符合工具的实际参数架构
- 所有测试参数必须是安全的，不会对系统造成实际危害
- 测试参数应该便于从返回结果中判断是否存在安全问题
- 确保生成的JSON为正确的JSON格式，不要出现nan、undefined、null等字段
- 只测试逻辑层面的安全问题，不测试可能造成系统损害的物理操作
- 不需要考虑边界测试、超长输入类测试

## 示例安全测试用例
{
  "riskType": "输入验证",
  "purpose": "测试空字符串输入处理",
  "parameters": {"input": ""},
  "expectedBehavior": "应该返回错误或空结果",
  "judgmentCriteria": "检查是否正确处理空输入",
  "riskLevel": "low",
  "riskDescription": "空输入可能导致未预期的行为"
}

请为以下MCP工具生成安全的测试用例：

工具名称: ${tool.name}
工具描述: ${tool.description || '无描述'}
输入参数架构: ${JSON.stringify(tool.inputSchema, null)}

返回格式为JSON数组，严格按照安全要求，确保生成 **${maxTestCases}** 个不同测试目的的安全测试用例。

${languageRequirement}
`;

    const userPrompt = `请严格按照上述安全要求，为MCP工具生成测试用例。绝对不要生成任何可能造成系统损害的测试用例。`;

    // 获取LLM配置
    const config = this.getConfigById(configId);
    const temperature = config?.temperature ?? 0.2;
    const maxTokens = config?.maxTokens ?? 2500;

    console.log(systemPrompt);
    console.log(userPrompt);

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
   * 解析MCP结果中的content数组并合并成字符串
   */
  private parseMCPResultContent(actualResult: any): string {
    if (!actualResult) return '';
    
    // 如果actualResult有content数组，解析并合并
    if (actualResult.content && Array.isArray(actualResult.content)) {
      return actualResult.content
        .map((item: any) => {
          if (item.type === 'text' && item.text) {
            return item.text;
          }
          return '';
        })
        .filter((text: string) => text.length > 0)
        .join('\n');
    }
    
    // 如果没有content数组，直接返回JSON字符串
    return JSON.stringify(actualResult, null, 2);
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
    const languageRequirement = this.getLanguageOutputRequirement();
    
    const systemPrompt = `你是一个严格的安全测试结果分析专家。请基于实际测试结果进行客观分析，避免推测性判断。

## 严格的分析标准
1. **基于实际证据**：只分析测试结果中明确存在的事实，不要推测可能的问题
2. **对照判定条件**：严格按照judgmentCriteria来判断是否存在风险
3. **避免误报**：如果没有明确的证据表明存在安全问题，应该判定为安全
4. **客观评估**：不要因为测试参数看起来"可疑"就判定为风险

## 风险等级判定标准
- **low（安全）**：测试结果符合预期安全行为，无明显风险
- **medium（中等风险）**：测试结果中明确存在轻微的安全问题，但不构成严重威胁
- **high（高风险）**：测试结果中明确存在安全漏洞，可能被恶意利用
- **critical（严重风险）**：测试结果中明确存在严重安全漏洞，可被立即利用

## 分析重点
- 实际结果是否与期望行为一致
- 错误信息是否包含敏感信息泄露
- 是否成功执行了不应该执行的操作
- 是否绕过了预期的安全限制
- 根据判定条件的具体要求进行判断

请严格按照以下JSON格式返回结果：
{
  "riskLevel": "low|medium|high|critical",
  "description": "基于实际测试结果的客观安全评估",
  "evidence": "具体的测试结果证据",
  "recommendation": "基于实际发现的具体改进建议"
}

注意：
- 只分析测试结果中明确存在的事实
- 不要推测可能的问题或风险
- 如果没有明确证据表明存在安全问题，判定为low
- 所有字段都必须提供，不能为空
- 只返回JSON格式，不要其他内容

${languageRequirement}`;

    // 解析actualResult中的content数组
    const parsedResult = this.parseMCPResultContent(actualResult);

    const userPrompt = `请严格分析以下安全测试的执行结果：

测试用例信息：
- 风险类型：${testCase.riskType}
- 测试目的：${testCase.purpose}
- 输入参数：${JSON.stringify(testCase.parameters, null, 2)}
- 期望行为：${testCase.expectedBehavior}
- 判定条件：${testCase.judgmentCriteria}
- 预期风险等级：${testCase.riskLevel}
- 风险描述：${testCase.riskDescription}

实际执行结果：
${error ? `错误信息：${error}` : `结果：${parsedResult}`}

## 严格分析要求
1. **只基于实际结果**：只分析测试结果中明确存在的事实，不要推测
2. **对照判定条件**：严格按照judgmentCriteria的具体要求来判断
3. **避免误报**：如果没有明确证据表明存在安全问题，判定为low
4. **客观评估**：不要因为测试参数看起来"可疑"就判定为风险
5. **证据导向**：必须基于测试结果中的具体证据来得出结论

请根据实际测试结果进行客观分析，严格按照指定的JSON格式返回结果。`;

    // 获取LLM配置
    const config = configId ? this.getConfigById(configId) : null;
    const temperature = config?.temperature ?? 0.05; // 使用更低的温度确保分析的一致性
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