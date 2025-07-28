import { DetectionRule, DetectionRuleSet, SecurityRiskLevel } from '../types/mcp';

/**
 * 内置检测规则集合
 */
export class BuiltinDetectionRules {
  
  /**
   * 获取所有内置规则
   */
  static getAllBuiltinRules(): DetectionRule[] {
    return [
      ...this.getSecurityRules(),
      ...this.getPrivacyRules(),
      ...this.getComplianceRules(),
      ...this.getDataQualityRules(),
      ...this.getPerformanceRules()
    ];
  }

  /**
   * 安全威胁检测规则
   */
  static getSecurityRules(): DetectionRule[] {
    const now = Date.now();
    
    return [
      {
        id: 'sec_001_command_injection',
        name: '命令注入检测',
        description: '检测潜在的命令注入攻击，包括shell命令、系统调用等',
        category: 'security',
        enabled: true,
        pattern: '(rm\\s+(-[rf]+\\s+)?[/\\\\]|del\\s+[/\\\\]|format\\s+[a-z]:|sudo\\s+rm|exec\\s*\\(|system\\s*\\(|shell_exec|passthru|eval\\s*\\()',
        flags: 'gi',
        scope: 'both',
        riskLevel: 'critical',
        threatType: '命令注入',
        maskSensitiveData: false,
        maxMatches: 10,
        isBuiltin: true,
        createdAt: now,
        updatedAt: now,
        tags: ['injection', 'command', 'system'],
        recommendation: '立即检查输入验证和命令执行逻辑，避免直接执行用户输入',
        remediation: '使用参数化命令执行、输入白名单验证、最小权限原则',
        references: [
          'https://owasp.org/www-community/attacks/Command_Injection',
          'https://cwe.mitre.org/data/definitions/78.html'
        ]
      },
      
      {
        id: 'sec_002_path_traversal',
        name: '路径遍历检测',
        description: '检测目录遍历攻击模式，防止未授权文件访问',
        pattern: '(\\.\\./|\\.\\\\\\.|%2e%2e[/\\\\]|%252e%252e[/\\\\]|\\\\\\.\\.\\\\|\\.\\.\\\\)',
        flags: 'gi',
        scope: 'both',
        category: 'security',
        enabled: true,
        riskLevel: 'high',
        threatType: '路径遍历',
        maskSensitiveData: false,
        maxMatches: 5,
        isBuiltin: true,
        createdAt: now,
        updatedAt: now,
        tags: ['traversal', 'file', 'path'],
        recommendation: '检查文件路径验证逻辑，确保只能访问授权目录',
        remediation: '使用绝对路径、路径白名单、chroot环境',
        references: [
          'https://owasp.org/www-community/attacks/Path_Traversal',
          'https://cwe.mitre.org/data/definitions/22.html'
        ]
      },
      
      {
        id: 'sec_003_xss_patterns',
        name: 'XSS攻击模式',
        description: '检测跨站脚本攻击模式，包括各种绕过技术',
        pattern: '(<script[^>]*>|javascript\\s*:|vbscript\\s*:|on\\w+\\s*=|<iframe[^>]*>|<object[^>]*>|<embed[^>]*>|<svg[^>]*>)',
        flags: 'gi',
        scope: 'both',
        category: 'security',
        enabled: true,
        riskLevel: 'high',
        threatType: 'XSS攻击',
        maskSensitiveData: false,
        maxMatches: 5,
        isBuiltin: true,
        createdAt: now,
        updatedAt: now,
        tags: ['xss', 'script', 'injection'],
        recommendation: '检查输出编码和内容安全策略(CSP)配置',
        remediation: 'HTML编码、CSP头部、输入验证和输出过滤',
        references: [
          'https://owasp.org/www-community/attacks/xss/',
          'https://cwe.mitre.org/data/definitions/79.html'
        ]
      },
      
      {
        id: 'sec_004_sql_injection',
        name: 'SQL注入检测',
        description: '检测SQL注入攻击模式',
        pattern: "('\\s*(or|and)\\s+'?1'?\\s*=\\s*'?1|union\\s+(all\\s+)?select|insert\\s+into|update\\s+\\w+\\s+set|delete\\s+from|drop\\s+(table|database)|exec\\s*\\(|sp_|xp_)",
        flags: 'gi',
        scope: 'both',
        category: 'security',
        enabled: true,
        riskLevel: 'critical',
        threatType: 'SQL注入',
        maskSensitiveData: false,
        maxMatches: 5,
        isBuiltin: true,
        createdAt: now,
        updatedAt: now,
        tags: ['sql', 'injection', 'database'],
        recommendation: '使用参数化查询和输入验证',
        remediation: '预编译语句、存储过程、最小权限数据库账户',
        references: [
          'https://owasp.org/www-community/attacks/SQL_Injection',
          'https://cwe.mitre.org/data/definitions/89.html'
        ]
      },
      
      {
        id: 'sec_005_ldap_injection',
        name: 'LDAP注入检测',
        description: '检测LDAP注入攻击模式',
        pattern: '(\\*\\)|\\|\\s*\\)|&\\s*\\)|!\\s*\\)|\\(\\s*\\||\\(\\s*&|\\(\\s*!)',
        flags: 'gi',
        scope: 'both',
        category: 'security',
        enabled: true,
        riskLevel: 'high',
        threatType: 'LDAP注入',
        maskSensitiveData: false,
        maxMatches: 5,
        isBuiltin: true,
        createdAt: now,
        updatedAt: now,
        tags: ['ldap', 'injection', 'directory'],
        recommendation: '验证LDAP查询输入并使用安全的查询构建方法',
        remediation: 'LDAP过滤器验证、特殊字符转义、最小权限查询',
        references: [
          'https://owasp.org/www-community/attacks/LDAP_Injection',
          'https://cwe.mitre.org/data/definitions/90.html'
        ]
      }
    ];
  }

  /**
   * 隐私泄漏检测规则
   */
  static getPrivacyRules(): DetectionRule[] {
    const now = Date.now();
    
    return [
      {
        id: 'priv_001_password',
        name: '密码泄漏检测',
        description: '检测可能的密码泄漏',
        pattern: '(?:password|pwd|pass|passwd)\\s*[:=]\\s*["\']?([^\\s"\'\\n]{4,})["\']?',
        flags: 'gi',
        scope: 'both',
        category: 'privacy',
        enabled: true,
        riskLevel: 'critical',
        threatType: '密码泄漏',
        captureGroups: ['password'],
        maskSensitiveData: true,
        maxMatches: 3,
        isBuiltin: true,
        createdAt: now,
        updatedAt: now,
        tags: ['password', 'credentials', 'leak'],
        recommendation: '立即更换泄漏的密码，检查密码存储和传输安全',
        remediation: '使用安全的密码存储、传输加密、密码策略',
        references: [
          'https://owasp.org/www-community/vulnerabilities/Password_Plaintext_Storage'
        ]
      },
      
      {
        id: 'priv_002_api_key',
        name: 'API密钥泄漏',
        description: '检测API密钥、访问令牌等凭据泄漏',
        pattern: '(?:api[_\\s]*key|apikey|access[_\\s]*token|bearer[_\\s]*token|secret[_\\s]*key)\\s*[:=]\\s*["\']?([a-zA-Z0-9\\-_]{16,})["\']?',
        flags: 'gi',
        scope: 'both',
        category: 'privacy',
        enabled: true,
        riskLevel: 'critical',
        threatType: 'API密钥泄漏',
        captureGroups: ['apiKey'],
        maskSensitiveData: true,
        maxMatches: 3,
        isBuiltin: true,
        createdAt: now,
        updatedAt: now,
        tags: ['api', 'key', 'token', 'leak'],
        recommendation: '立即撤销泄漏的API密钥，重新生成新的凭据',
        remediation: 'API密钥轮换、访问权限最小化、密钥管理服务',
        references: [
          'https://owasp.org/www-community/vulnerabilities/Insufficiently_Protected_Credentials'
        ]
      },
      
      {
        id: 'priv_003_email',
        name: '邮箱地址泄漏',
        description: '检测电子邮箱地址泄漏',
        pattern: '([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,})',
        flags: 'gi',
        scope: 'output',
        category: 'privacy',
        enabled: true,
        riskLevel: 'medium',
        threatType: '邮箱泄漏',
        captureGroups: ['email'],
        maskSensitiveData: true,
        maxMatches: 10,
        isBuiltin: true,
        createdAt: now,
        updatedAt: now,
        tags: ['email', 'pii', 'contact'],
        recommendation: '检查是否应该暴露邮箱地址，考虑使用脱敏处理',
        remediation: '邮箱脱敏、访问控制、数据最小化原则',
        references: [
          'https://gdpr.eu/personal-data/'
        ]
      },
      
      {
        id: 'priv_004_phone',
        name: '电话号码泄漏',
        description: '检测电话号码泄漏',
        pattern: '(?:\\+?1[-\\s]?)?\\(?[0-9]{3}\\)?[-\\s]?[0-9]{3}[-\\s]?[0-9]{4}|(?:\\+86[-\\s]?)?1[3-9][0-9][-\\s]?[0-9]{4}[-\\s]?[0-9]{4}',
        flags: 'gi',
        scope: 'output',
        category: 'privacy',
        enabled: true,
        riskLevel: 'medium',
        threatType: '电话号码泄漏',
        maskSensitiveData: true,
        maxMatches: 5,
        isBuiltin: true,
        createdAt: now,
        updatedAt: now,
        tags: ['phone', 'pii', 'contact'],
        recommendation: '检查电话号码暴露的必要性，考虑脱敏处理',
        remediation: '号码脱敏、访问控制、用户同意机制',
        references: [
          'https://gdpr.eu/personal-data/'
        ]
      },
      
      {
        id: 'priv_005_credit_card',
        name: '信用卡号检测',
        description: '检测信用卡号码泄漏',
        pattern: '(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3[0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})',
        flags: 'gi',
        scope: 'both',
        category: 'privacy',
        enabled: true,
        riskLevel: 'critical',
        threatType: '信用卡号泄漏',
        maskSensitiveData: true,
        maxMatches: 3,
        isBuiltin: true,
        createdAt: now,
        updatedAt: now,
        tags: ['credit_card', 'payment', 'pci'],
        recommendation: '立即检查支付处理流程，确保符合PCI DSS标准',
        remediation: 'PCI DSS合规、数据加密、访问控制',
        references: [
          'https://www.pcisecuritystandards.org/',
          'https://owasp.org/www-project-application-security-verification-standard/'
        ]
      }
    ];
  }

  /**
   * 合规检查规则
   */
  static getComplianceRules(): DetectionRule[] {
    const now = Date.now();
    
    return [
      {
        id: 'comp_001_gdpr_pii',
        name: 'GDPR个人信息检测',
        description: '检测可能的个人身份信息，确保GDPR合规',
        pattern: '(?:姓名|name|身份证|identity|户籍|residence|地址|address)\\s*[:=]\\s*["\']?([^\\s"\'\\n]{2,})["\']?',
        flags: 'gi',
        scope: 'both',
        category: 'compliance',
        enabled: true,
        riskLevel: 'medium',
        threatType: 'PII泄漏',
        captureGroups: ['pii'],
        maskSensitiveData: true,
        maxMatches: 5,
        isBuiltin: true,
        createdAt: now,
        updatedAt: now,
        tags: ['gdpr', 'pii', 'compliance'],
        recommendation: '确保个人信息处理符合GDPR要求',
        remediation: '用户同意、数据最小化、删除权实现',
        references: [
          'https://gdpr.eu/',
          'https://ec.europa.eu/info/law/law-topic/data-protection_en'
        ]
      }
    ];
  }

  /**
   * 数据质量检查规则
   */
  static getDataQualityRules(): DetectionRule[] {
    const now = Date.now();
    
    return [
      {
        id: 'dq_001_suspicious_strings',
        name: '可疑字符串检测',
        description: '检测可能的测试数据、错误消息或调试信息',
        pattern: '(test|demo|example|null|undefined|error|exception|debug|tmp|temp)',
        flags: 'gi',
        scope: 'output',
        category: 'data_quality',
        enabled: true,
        riskLevel: 'low',
        threatType: '数据质量问题',
        maskSensitiveData: false,
        maxMatches: 10,
        isBuiltin: true,
        createdAt: now,
        updatedAt: now,
        tags: ['quality', 'test', 'debug'],
        recommendation: '检查是否存在测试数据或调试信息泄漏',
        remediation: '数据清理、环境隔离、日志管理',
        references: [
          'https://owasp.org/www-community/Improper_Error_Handling'
        ]
      }
    ];
  }

  /**
   * 性能问题检测规则
   */
  static getPerformanceRules(): DetectionRule[] {
    const now = Date.now();
    
    return [
      {
        id: 'perf_001_large_response',
        name: '大响应数据检测',
        description: '检测可能导致性能问题的大型响应',
        pattern: '(.{10000,})',
        flags: 'g',
        scope: 'output',
        category: 'performance',
        enabled: false, // 默认禁用，因为可能有很多误报
        riskLevel: 'low',
        threatType: '性能风险',
        maskSensitiveData: false,
        maxMatches: 1,
        isBuiltin: true,
        createdAt: now,
        updatedAt: now,
        tags: ['performance', 'size', 'response'],
        recommendation: '考虑对大型响应进行分页或压缩处理',
        remediation: '响应分页、数据压缩、缓存策略',
        references: [
          'https://web.dev/performance-scoring/'
        ]
      }
    ];
  }

  /**
   * 获取默认规则集
   */
  static getDefaultRuleSet(): DetectionRuleSet {
    const now = Date.now();
    return {
      id: 'builtin_default',
      name: '内置默认规则集',
      description: '包含常见安全威胁和隐私检查的内置规则集合',
      version: '1.0.0',
      rules: this.getAllBuiltinRules(),
      enabled: true,
      createdAt: now,
      updatedAt: now
    };
  }

  /**
   * 根据分类获取规则
   */
  static getRulesByCategory(category: string): DetectionRule[] {
    return this.getAllBuiltinRules().filter(rule => rule.category === category);
  }

  /**
   * 根据风险等级获取规则
   */
  static getRulesByRiskLevel(riskLevel: SecurityRiskLevel): DetectionRule[] {
    return this.getAllBuiltinRules().filter(rule => rule.riskLevel === riskLevel);
  }
} 