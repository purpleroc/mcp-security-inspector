import { 
  DetectionRule, 
  DetectionRuleMatch, 
  SecurityRiskLevel, 
  DetectionScope,
  RuleValidationResult 
} from '../types/mcp';
import { BuiltinDetectionRules } from './detectionRules';
import { detectionRuleStorage } from '../utils/storage';

/**
 * 检测引擎 - 负责执行检测规则
 */
export class DetectionEngine {
  private static instance: DetectionEngine;
  private rules: DetectionRule[] = [];
  private compiledRules: Map<string, RegExp> = new Map();

  private constructor() {
    this.loadRules();
  }

  static getInstance(): DetectionEngine {
    if (!DetectionEngine.instance) {
      DetectionEngine.instance = new DetectionEngine();
    }
    return DetectionEngine.instance;
  }

  /**
   * 加载所有规则（内置规则 + 自定义规则）
   */
  private loadRules(): void {
    // 加载内置规则
    const builtinRules = BuiltinDetectionRules.getAllBuiltinRules();
    
    // 加载保存的自定义规则
    const savedCustomRules = detectionRuleStorage.getDetectionRules();
    
    // 合并规则，确保内置规则不被覆盖
    const allRules = [...builtinRules];
    
    // 添加自定义规则，但要检查是否与内置规则冲突
    for (const customRule of savedCustomRules) {
      const existingBuiltin = builtinRules.find(r => r.id === customRule.id);
      if (!existingBuiltin) {
        // 确保自定义规则有正确的标识
        customRule.isBuiltin = false;
        allRules.push(customRule);
      }
    }
    
    this.rules = allRules;
    this.compileRules();
  }

  /**
   * 保存自定义规则到本地存储
   */
  private saveCustomRules(): void {
    const customRules = this.rules.filter(rule => !rule.isBuiltin);
    detectionRuleStorage.saveDetectionRules(customRules);
  }

  /**
   * 编译正则表达式规则
   */
  private compileRules(): void {
    this.compiledRules.clear();
    
    for (const rule of this.rules) {
      if (rule.enabled) {
        try {
          const regex = new RegExp(rule.pattern, rule.flags || 'gi');
          this.compiledRules.set(rule.id, regex);
        } catch (error) {
          console.error(`规则 ${rule.id} 编译失败:`, error);
        }
      }
    }
  }

  /**
   * 执行检测
   */
  async detectThreats(
    parameters: Record<string, unknown>,
    output: any,
    scope?: DetectionScope
  ): Promise<DetectionRuleMatch[]> {
    const matches: DetectionRuleMatch[] = [];
    
    // 准备检测文本
    const parameterText = JSON.stringify(parameters);
    const outputText = JSON.stringify(output);
    
    for (const rule of this.rules) {
      if (!rule.enabled || !this.compiledRules.has(rule.id)) {
        continue;
      }

      // 检查作用域
      if (scope && rule.scope !== scope && rule.scope !== 'both') {
        continue;
      }

      const regex = this.compiledRules.get(rule.id)!;
      const ruleMatches: DetectionRuleMatch = {
        rule,
        matches: [],
        severity: rule.riskLevel
      };

      // 根据规则范围执行检测
      const textsToCheck: Array<{text: string, type: string}> = [];
      
      if (rule.scope === 'parameters' || rule.scope === 'both') {
        textsToCheck.push({text: parameterText, type: 'parameters'});
      }
      
      if (rule.scope === 'output' || rule.scope === 'both') {
        textsToCheck.push({text: outputText, type: 'output'});
      }

      // 执行正则匹配
      for (const {text, type} of textsToCheck) {
        regex.lastIndex = 0; // 重置正则位置
        let match;
        let matchCount = 0;
        
        while (
          (match = regex.exec(text)) !== null && 
          matchCount < (rule.maxMatches || 10)
        ) {
          const fullMatch = match[0];
          const capturedGroups = match.slice(1);
          const startIndex = match.index;
          const endIndex = match.index + fullMatch.length;
          
          // 获取上下文（前后50个字符）
          const contextStart = Math.max(0, startIndex - 50);
          const contextEnd = Math.min(text.length, endIndex + 50);
          const context = text.substring(contextStart, contextEnd);
          
          ruleMatches.matches.push({
            fullMatch,
            capturedGroups: capturedGroups.length > 0 ? capturedGroups : undefined,
            startIndex,
            endIndex,
            context: `...${context}...`
          });
          
          matchCount++;
          
          // 如果不是全局匹配，跳出循环
          if (!rule.flags?.includes('g')) {
            break;
          }
        }
      }

      // 如果有匹配结果，添加到结果列表
      if (ruleMatches.matches.length > 0) {
        // 处理敏感数据遮蔽
        if (rule.maskSensitiveData) {
          ruleMatches.maskedContent = this.maskSensitiveContent(
            ruleMatches.matches,
            rule
          );
        }
        
        matches.push(ruleMatches);
      }
    }

    return matches;
  }

  /**
   * 遮蔽敏感内容
   */
  private maskSensitiveContent(
    matches: DetectionRuleMatch['matches'],
    rule: DetectionRule
  ): string {
    const maskedItems: string[] = [];
    
    for (const match of matches) {
      if (match.capturedGroups && match.capturedGroups.length > 0) {
        // 遮蔽捕获组内容
        for (const captured of match.capturedGroups) {
          const masked = this.maskString(captured);
          maskedItems.push(`${rule.threatType}: ${masked}`);
        }
      } else {
        // 遮蔽完整匹配内容
        const masked = this.maskString(match.fullMatch);
        maskedItems.push(`${rule.threatType}: ${masked}`);
      }
    }
    
    return maskedItems.join(', ');
  }

  /**
   * 字符串遮蔽处理
   */
  private maskString(str: string): string {
    if (str.length <= 4) {
      return '*'.repeat(str.length);
    }
    
    return str.substring(0, 2) + '*'.repeat(str.length - 4) + str.substring(str.length - 2);
  }

  /**
   * 验证规则正确性
   */
  validateRule(rule: Partial<DetectionRule>): RuleValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // 基本字段验证
    if (!rule.name?.trim()) {
      errors.push('规则名称不能为空');
    }
    
    if (!rule.pattern?.trim()) {
      errors.push('正则表达式模式不能为空');
    }
    
    if (!rule.threatType?.trim()) {
      errors.push('威胁类型不能为空');
    }

    // 正则表达式验证
    if (rule.pattern) {
      try {
        const regex = new RegExp(rule.pattern, rule.flags || 'gi');
        
        // 测试一些常见输入
        const testInputs = [
          'test string',
          'password=secret123',
          'api_key=abcd1234567890',
          'rm -rf /',
          '<script>alert("xss")</script>',
          "'; DROP TABLE users; --"
        ];
        
        const testResults: RuleValidationResult['testResults'] = [];
        
        for (const input of testInputs) {
          regex.lastIndex = 0;
          const matches = regex.test(input);
          const captured = matches ? regex.exec(input)?.slice(1) : undefined;
          
          testResults.push({
            input,
            matches,
            captured
          });
        }
        
        // 如果正则表达式匹配所有输入，给出警告
        if (testResults.every(result => result.matches)) {
          warnings.push('正则表达式可能过于宽泛，匹配了所有测试输入');
        }
        
        return {
          valid: errors.length === 0,
          errors,
          warnings,
          testResults
        };
        
      } catch (error) {
        errors.push(`正则表达式语法错误: ${(error as Error).message}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 添加自定义规则
   */
  addCustomRule(rule: DetectionRule): void {
    const validation = this.validateRule(rule);
    if (!validation.valid) {
      throw new Error(`规则验证失败: ${validation.errors.join(', ')}`);
    }
    
    // 移除同ID的现有规则
    this.rules = this.rules.filter(r => r.id !== rule.id);
    
    // 添加新规则
    this.rules.push(rule);
    
    // 重新编译规则
    this.compileRules();
    
    // 保存自定义规则到本地存储
    this.saveCustomRules();
  }

  /**
   * 更新规则
   */
  updateRule(rule: DetectionRule): void {
    const validation = this.validateRule(rule);
    if (!validation.valid) {
      throw new Error(`规则验证失败: ${validation.errors.join(', ')}`);
    }
    
    const index = this.rules.findIndex(r => r.id === rule.id);
    if (index === -1) {
      throw new Error(`规则 ${rule.id} 不存在`);
    }
    
    this.rules[index] = rule;
    this.compileRules();
    
    // 保存自定义规则到本地存储
    this.saveCustomRules();
  }

  /**
   * 删除规则
   */
  removeRule(ruleId: string): void {
    // 不能删除内置规则
    const rule = this.rules.find(r => r.id === ruleId);
    if (rule?.isBuiltin) {
      throw new Error('不能删除内置规则');
    }
    
    this.rules = this.rules.filter(r => r.id !== ruleId);
    this.compiledRules.delete(ruleId);
    
    // 保存自定义规则到本地存储
    this.saveCustomRules();
  }

  /**
   * 启用/禁用规则
   */
  toggleRule(ruleId: string, enabled: boolean): void {
    const rule = this.rules.find(r => r.id === ruleId);
    if (!rule) {
      throw new Error(`规则 ${ruleId} 不存在`);
    }
    
    rule.enabled = enabled;
    rule.updatedAt = Date.now();
    
    if (enabled) {
      try {
        const regex = new RegExp(rule.pattern, rule.flags || 'gi');
        this.compiledRules.set(rule.id, regex);
      } catch (error) {
        console.error(`规则 ${rule.id} 编译失败:`, error);
      }
    } else {
      this.compiledRules.delete(rule.id);
    }
    
    // 如果是自定义规则，保存到本地存储
    if (!rule.isBuiltin) {
      this.saveCustomRules();
    }
  }

  /**
   * 获取所有规则
   */
  getAllRules(): DetectionRule[] {
    return [...this.rules];
  }

  /**
   * 根据分类获取规则
   */
  getRulesByCategory(category: string): DetectionRule[] {
    return this.rules.filter(rule => rule.category === category);
  }

  /**
   * 获取启用的规则
   */
  getEnabledRules(): DetectionRule[] {
    return this.rules.filter(rule => rule.enabled);
  }

  /**
   * 搜索规则
   */
  searchRules(query: string): DetectionRule[] {
    const lowercaseQuery = query.toLowerCase();
    
    return this.rules.filter(rule => 
      rule.name.toLowerCase().includes(lowercaseQuery) ||
      rule.description.toLowerCase().includes(lowercaseQuery) ||
      rule.threatType.toLowerCase().includes(lowercaseQuery) ||
      rule.tags?.some(tag => tag.toLowerCase().includes(lowercaseQuery))
    );
  }

  /**
   * 导出规则配置
   */
  exportRules(): string {
    const customRules = this.rules.filter(rule => !rule.isBuiltin);
    return JSON.stringify(customRules, null, 2);
  }

  /**
   * 导入规则配置
   */
  importRules(rulesJson: string): void {
    try {
      const importedRules: DetectionRule[] = JSON.parse(rulesJson);
      
      for (const rule of importedRules) {
        // 验证规则
        const validation = this.validateRule(rule);
        if (!validation.valid) {
          throw new Error(`规则 ${rule.name} 验证失败: ${validation.errors.join(', ')}`);
        }
        
        // 确保不是内置规则
        rule.isBuiltin = false;
        rule.updatedAt = Date.now();
        
        // 添加规则
        this.addCustomRule(rule);
      }
      
    } catch (error) {
      throw new Error(`导入规则失败: ${(error as Error).message}`);
    }
  }

  /**
   * 重置为默认规则
   */
  resetToDefaults(): void {
    // 清除保存的自定义规则
    detectionRuleStorage.clearDetectionRules();
    
    // 重新加载规则（只包含内置规则）
    this.loadRules();
  }
} 