import { 
  SecurityCheckConfig, 
  SecurityReport, 
  ToolSecurityResult, 
  PromptSecurityResult, 
  ResourceSecurityResult,
  SecurityRiskLevel,
  MCPTool,
  MCPPrompt,
  MCPResource
} from '../types/mcp';
import { llmClient } from './llmClient';
import { mcpClient } from './mcpClient';

/**
 * 安全检测核心引擎
 * 协调各类安全检测任务，生成综合安全报告
 */
export class SecurityEngine {
  private static instance: SecurityEngine;
  private isScanning = false;
  private currentScanId: string | null = null;

  private constructor() {}

  public static getInstance(): SecurityEngine {
    if (!SecurityEngine.instance) {
      SecurityEngine.instance = new SecurityEngine();
    }
    return SecurityEngine.instance;
  }

  /**
   * 开始全面安全扫描
   */
  public async startComprehensiveScan(
    config: SecurityCheckConfig,
    onProgress?: (progress: number, message: string) => void
  ): Promise<SecurityReport> {
    if (this.isScanning) {
      throw new Error('安全扫描已在进行中');
    }

    this.isScanning = true;
    this.currentScanId = `scan_${Date.now()}`;
    
    try {
      onProgress?.(0, '开始安全扫描...');

      // 获取MCP服务器的所有组件
      const [tools, prompts, resources] = await Promise.all([
        mcpClient.listTools(),
        mcpClient.listPrompts(),
        mcpClient.listResources()
      ]);

      onProgress?.(10, '获取MCP组件完成');

      const report: SecurityReport = {
        id: this.currentScanId,
        serverName: 'MCP Server', // TODO: 从连接配置获取
        timestamp: Date.now(),
        overallRisk: 'low',
        toolResults: [],
        promptResults: [],
        resourceResults: [],
        summary: {
          totalIssues: 0,
          criticalIssues: 0,
          highIssues: 0,
          mediumIssues: 0,
          lowIssues: 0
        },
        recommendations: []
      };

      // 分步骤执行检测
      const totalSteps = tools.length + prompts.length + resources.length;
      let currentStep = 0;

      // 检测工具安全性
      onProgress?.(20, `开始检测 ${tools.length} 个工具...`);
      for (const tool of tools) {
        try {
          const result = await this.analyzeTool(tool, config);
          report.toolResults.push(result);
          currentStep++;
          onProgress?.(20 + (currentStep / totalSteps) * 50, `检测工具: ${tool.name}`);
        } catch (error) {
          console.error(`检测工具 ${tool.name} 失败:`, error);
        }
      }

      // 检测提示安全性
      onProgress?.(70, `开始检测 ${prompts.length} 个提示...`);
      for (const prompt of prompts) {
        try {
          const result = await this.analyzePrompt(prompt, config);
          report.promptResults.push(result);
          currentStep++;
          onProgress?.(20 + (currentStep / totalSteps) * 50, `检测提示: ${prompt.name}`);
        } catch (error) {
          console.error(`检测提示 ${prompt.name} 失败:`, error);
        }
      }

      // 检测资源安全性
      onProgress?.(85, `开始检测 ${resources.length} 个资源...`);
      for (const resource of resources) {
        try {
          const result = await this.analyzeResource(resource, config);
          report.resourceResults.push(result);
          currentStep++;
          onProgress?.(20 + (currentStep / totalSteps) * 50, `检测资源: ${resource.name || resource.uri}`);
        } catch (error) {
          console.error(`检测资源 ${resource.uri} 失败:`, error);
        }
      }

      // 生成综合报告
      onProgress?.(95, '生成安全报告...');
      this.generateSummary(report);

      onProgress?.(100, '安全扫描完成');
      return report;

    } finally {
      this.isScanning = false;
      this.currentScanId = null;
    }
  }

  /**
   * 分析单个工具的安全性
   */
  public async analyzeTool(tool: MCPTool, config: SecurityCheckConfig): Promise<ToolSecurityResult> {
    const result: ToolSecurityResult = {
      toolName: tool.name,
      riskLevel: 'low',
      vulnerabilities: [],
      testResults: [],
      llmAnalysis: '',
      timestamp: Date.now()
    };

    try {
      // 使用LLM进行静态分析
      const analysisRequest = llmClient.generateSecurityAnalysisPrompt('tool', tool);
      const analysisResponse = await llmClient.callLLM(config.llmConfigId, analysisRequest);
      result.llmAnalysis = analysisResponse.content;

      // 解析LLM分析结果（简化版本，实际需要更复杂的解析）
      this.parseToolAnalysis(result, analysisResponse.content);

      // 如果启用了自动测试生成，则生成并执行测试用例
      if (config.autoGenerate) {
        await this.generateAndExecuteToolTests(tool, config, result);
      }

    } catch (error) {
      console.error(`分析工具 ${tool.name} 失败:`, error);
      result.vulnerabilities.push({
        type: 'analysis_error',
        severity: 'medium',
        description: '工具分析过程中出现错误',
        recommendation: '建议手动检查此工具的安全性'
      });
    }

    return result;
  }

  /**
   * 分析提示安全性
   */
  public async analyzePrompt(prompt: MCPPrompt, config: SecurityCheckConfig): Promise<PromptSecurityResult> {
    const result: PromptSecurityResult = {
      promptName: prompt.name,
      riskLevel: 'low',
      threats: [],
      llmAnalysis: '',
      timestamp: Date.now()
    };

    try {
      // 使用LLM进行提示安全分析
      const analysisRequest = llmClient.generateSecurityAnalysisPrompt('prompt', prompt);
      const analysisResponse = await llmClient.callLLM(config.llmConfigId, analysisRequest);
      result.llmAnalysis = analysisResponse.content;

      // 解析分析结果
      this.parsePromptAnalysis(result, analysisResponse.content);

    } catch (error) {
      console.error(`分析提示 ${prompt.name} 失败:`, error);
      result.threats.push({
        type: 'injection',
        severity: 'medium',
        description: '提示分析过程中出现错误',
        evidence: error instanceof Error ? error.message : '未知错误',
        recommendation: '建议手动检查此提示的安全性'
      });
    }

    return result;
  }

  /**
   * 分析资源安全性
   */
  public async analyzeResource(resource: MCPResource, config: SecurityCheckConfig): Promise<ResourceSecurityResult> {
    const result: ResourceSecurityResult = {
      resourceUri: resource.uri,
      riskLevel: 'low',
      risks: [],
      accessTests: [],
      llmAnalysis: '',
      timestamp: Date.now()
    };

    try {
      // 使用LLM进行资源安全分析
      const analysisRequest = llmClient.generateSecurityAnalysisPrompt('resource', resource);
      const analysisResponse = await llmClient.callLLM(config.llmConfigId, analysisRequest);
      result.llmAnalysis = analysisResponse.content;

      // 解析分析结果
      this.parseResourceAnalysis(result, analysisResponse.content);

      // 执行基本的访问测试
      await this.performResourceAccessTests(resource, result);

    } catch (error) {
      console.error(`分析资源 ${resource.uri} 失败:`, error);
      result.risks.push({
        type: 'access',
        severity: 'medium',
        description: '资源分析过程中出现错误',
        evidence: error instanceof Error ? error.message : '未知错误',
        recommendation: '建议手动检查此资源的安全性'
      });
    }

    return result;
  }

  /**
   * 生成并执行工具测试用例
   */
  private async generateAndExecuteToolTests(
    tool: MCPTool, 
    config: SecurityCheckConfig, 
    result: ToolSecurityResult
  ): Promise<void> {
    try {
      // 使用LLM生成测试用例
      const testCaseRequest = llmClient.generateTestCasePrompt(tool);
      const testCaseResponse = await llmClient.callLLM(config.llmConfigId, testCaseRequest);
      
      // 解析测试用例（这里简化处理，实际需要更复杂的JSON解析）
      const testCases = this.parseTestCases(testCaseResponse.content);
      
      // 执行测试用例（限制数量）
      const maxTests = Math.min(testCases.length, config.maxTestCases);
      for (let i = 0; i < maxTests; i++) {
        const testCase = testCases[i];
        try {
          const startTime = Date.now();
          const testResult = await mcpClient.callTool(tool.name, testCase.parameters);
          const duration = Date.now() - startTime;

          // 使用LLM评估测试结果
          const evaluationRequest = llmClient.generateTestResultEvaluationPrompt(
            testCase.description,
            testCase.parameters,
            testResult
          );
          const evaluationResponse = await llmClient.callLLM(config.llmConfigId, evaluationRequest);

          result.testResults.push({
            testCase: testCase.description,
            parameters: testCase.parameters,
            result: testResult,
            riskAssessment: evaluationResponse.content,
            passed: !evaluationResponse.content.toLowerCase().includes('危险') && 
                    !evaluationResponse.content.toLowerCase().includes('严重')
          });

        } catch (error) {
          result.testResults.push({
            testCase: testCase.description,
            parameters: testCase.parameters,
            result: { error: error instanceof Error ? error.message : '测试执行失败' },
            riskAssessment: '测试执行失败，可能存在安全风险',
            passed: false
          });
        }
      }

    } catch (error) {
      console.error('生成测试用例失败:', error);
    }
  }

  /**
   * 执行资源访问测试
   */
  private async performResourceAccessTests(
    resource: MCPResource, 
    result: ResourceSecurityResult
  ): Promise<void> {
    try {
      // 基本访问测试
      const accessResult = await mcpClient.readResource(resource.uri);
      result.accessTests.push({
        testType: 'basic_access',
        uri: resource.uri,
        success: true,
        riskAssessment: '资源访问成功'
      });

      // 检查返回内容是否包含敏感信息
      if (accessResult.text) {
        const sensitivePatterns = [
          /password\s*[:=]\s*\S+/gi,
          /api[_\s]*key\s*[:=]\s*\S+/gi,
          /secret\s*[:=]\s*\S+/gi,
          /token\s*[:=]\s*\S+/gi
        ];

        for (const pattern of sensitivePatterns) {
          if (pattern.test(accessResult.text)) {
            result.risks.push({
              type: 'leak',
              severity: 'high',
              description: '资源内容可能包含敏感信息',
              evidence: '检测到疑似密码、API密钥或令牌格式的内容',
              recommendation: '审查资源内容，确保不暴露敏感信息'
            });
            break;
          }
        }
      }

    } catch (error) {
      result.accessTests.push({
        testType: 'basic_access',
        uri: resource.uri,
        success: false,
        riskAssessment: `访问失败: ${error instanceof Error ? error.message : '未知错误'}`
      });
    }
  }

  /**
   * 解析工具安全分析结果
   */
  private parseToolAnalysis(result: ToolSecurityResult, analysis: string): void {
    const content = analysis.toLowerCase();
    
    // 简化的风险等级判断
    if (content.includes('严重') || content.includes('critical')) {
      result.riskLevel = 'critical';
    } else if (content.includes('高') || content.includes('high')) {
      result.riskLevel = 'high';
    } else if (content.includes('中') || content.includes('medium')) {
      result.riskLevel = 'medium';
    }

    // 检测常见漏洞类型
    if (content.includes('注入') || content.includes('injection')) {
      result.vulnerabilities.push({
        type: 'injection',
        severity: result.riskLevel,
        description: '可能存在注入攻击风险',
        recommendation: '加强输入验证和参数过滤'
      });
    }

    if (content.includes('权限') || content.includes('privilege')) {
      result.vulnerabilities.push({
        type: 'privilege',
        severity: result.riskLevel,
        description: '可能存在权限提升风险',
        recommendation: '加强权限控制和访问验证'
      });
    }
  }

  /**
   * 解析提示安全分析结果
   */
  private parsePromptAnalysis(result: PromptSecurityResult, analysis: string): void {
    const content = analysis.toLowerCase();
    
    if (content.includes('严重') || content.includes('critical')) {
      result.riskLevel = 'critical';
    } else if (content.includes('高') || content.includes('high')) {
      result.riskLevel = 'high';
    } else if (content.includes('中') || content.includes('medium')) {
      result.riskLevel = 'medium';
    }

    // 检测威胁类型
    if (content.includes('注入') || content.includes('injection')) {
      result.threats.push({
        type: 'injection',
        severity: result.riskLevel,
        description: '可能存在提示注入风险',
        evidence: '分析发现潜在的提示注入模式',
        recommendation: '加强提示内容过滤和验证'
      });
    }
  }

  /**
   * 解析资源安全分析结果
   */
  private parseResourceAnalysis(result: ResourceSecurityResult, analysis: string): void {
    const content = analysis.toLowerCase();
    
    if (content.includes('严重') || content.includes('critical')) {
      result.riskLevel = 'critical';
    } else if (content.includes('高') || content.includes('high')) {
      result.riskLevel = 'high';
    } else if (content.includes('中') || content.includes('medium')) {
      result.riskLevel = 'medium';
    }

    // 检测风险类型
    if (content.includes('路径') || content.includes('traversal')) {
      result.risks.push({
        type: 'traversal',
        severity: result.riskLevel,
        description: '可能存在路径遍历风险',
        evidence: '分析发现潜在的路径遍历模式',
        recommendation: '加强路径验证和访问控制'
      });
    }
  }

  /**
   * 解析测试用例
   */
  private parseTestCases(content: string): Array<{description: string, parameters: Record<string, unknown>}> {
    // 简化的测试用例解析
    // 实际应该使用更复杂的JSON解析和验证
    const testCases = [];
    
    try {
      // 尝试直接解析JSON
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch (e) {
      // 如果不是有效JSON，使用简单的模式匹配
    }

    // 生成基本测试用例
    testCases.push({
      description: '空参数测试',
      parameters: {}
    });

    testCases.push({
      description: '恶意字符串测试',
      parameters: { test: '<script>alert("xss")</script>' }
    });

    testCases.push({
      description: '路径遍历测试',
      parameters: { path: '../../../etc/passwd' }
    });

    return testCases;
  }

  /**
   * 生成安全报告摘要
   */
  private generateSummary(report: SecurityReport): void {
    let totalIssues = 0;
    let criticalIssues = 0;
    let highIssues = 0;
    let mediumIssues = 0;
    let lowIssues = 0;
    let maxRiskLevel: SecurityRiskLevel = 'low';

    // 统计工具问题
    report.toolResults.forEach(result => {
      result.vulnerabilities.forEach(vuln => {
        totalIssues++;
        switch (vuln.severity) {
          case 'critical': criticalIssues++; break;
          case 'high': highIssues++; break;
          case 'medium': mediumIssues++; break;
          case 'low': lowIssues++; break;
        }
      });
      
      if (this.getRiskLevelPriority(result.riskLevel) > this.getRiskLevelPriority(maxRiskLevel)) {
        maxRiskLevel = result.riskLevel;
      }
    });

    // 统计提示问题
    report.promptResults.forEach(result => {
      result.threats.forEach(threat => {
        totalIssues++;
        switch (threat.severity) {
          case 'critical': criticalIssues++; break;
          case 'high': highIssues++; break;
          case 'medium': mediumIssues++; break;
          case 'low': lowIssues++; break;
        }
      });
      
      if (this.getRiskLevelPriority(result.riskLevel) > this.getRiskLevelPriority(maxRiskLevel)) {
        maxRiskLevel = result.riskLevel;
      }
    });

    // 统计资源问题
    report.resourceResults.forEach(result => {
      result.risks.forEach(risk => {
        totalIssues++;
        switch (risk.severity) {
          case 'critical': criticalIssues++; break;
          case 'high': highIssues++; break;
          case 'medium': mediumIssues++; break;
          case 'low': lowIssues++; break;
        }
      });
      
      if (this.getRiskLevelPriority(result.riskLevel) > this.getRiskLevelPriority(maxRiskLevel)) {
        maxRiskLevel = result.riskLevel;
      }
    });

    report.summary = {
      totalIssues,
      criticalIssues,
      highIssues,
      mediumIssues,
      lowIssues
    };

    report.overallRisk = maxRiskLevel;

    // 生成建议
    if (criticalIssues > 0) {
      report.recommendations.push('发现严重安全问题，建议立即修复');
    }
    if (highIssues > 0) {
      report.recommendations.push('发现高风险问题，建议优先处理');
    }
    if (totalIssues === 0) {
      report.recommendations.push('未发现明显安全问题，但建议定期进行安全检测');
    }
  }

  /**
   * 获取风险等级优先级
   */
  private getRiskLevelPriority(level: SecurityRiskLevel): number {
    switch (level) {
      case 'low': return 1;
      case 'medium': return 2;
      case 'high': return 3;
      case 'critical': return 4;
      default: return 0;
    }
  }

  /**
   * 取消当前扫描
   */
  public cancelCurrentScan(): void {
    this.isScanning = false;
    this.currentScanId = null;
  }

  /**
   * 检查是否正在扫描
   */
  public isCurrentlyScanning(): boolean {
    return this.isScanning;
  }
}

// 导出单例实例
export const securityEngine = SecurityEngine.getInstance(); 