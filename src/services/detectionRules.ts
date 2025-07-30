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
      ...this.getPerformanceRules(),
      ...this.getMaliciousPromptRules()
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

  // /**
  //  * 数据质量检查规则
  //  */
  // static getDataQualityRules(): DetectionRule[] {
  //   const now = Date.now();
    
  //   return [
  //     {
  //       id: 'dq_001_suspicious_strings',
  //       name: '可疑字符串检测',
  //       description: '检测可能的测试数据、错误消息或调试信息',
  //       pattern: '(test|demo|example|null|undefined|error|exception|debug|tmp|temp)',
  //       flags: 'gi',
  //       scope: 'output',
  //       category: 'data_quality',
  //       enabled: true,
  //       riskLevel: 'low',
  //       threatType: '数据质量问题',
  //       maskSensitiveData: false,
  //       maxMatches: 10,
  //       isBuiltin: true,
  //       createdAt: now,
  //       updatedAt: now,
  //       tags: ['quality', 'test', 'debug'],
  //       recommendation: '检查是否存在测试数据或调试信息泄漏',
  //       remediation: '数据清理、环境隔离、日志管理',
  //       references: [
  //         'https://owasp.org/www-community/Improper_Error_Handling'
  //       ]
  //     }
  //   ];
  // }

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

  /**
   * 恶意prompt检测规则
   */
  static getMaliciousPromptRules(): DetectionRule[] {
    const now = Date.now();
    
    return [
      {
        id: 'prompt_001_jailbreak',
        name: '越狱攻击检测',
        description: '检测试图绕过AI安全限制的越狱攻击模式',
        pattern: '(ignore\\s+previous\\s+instructions|forget\\s+all\\s+rules|act\\s+as\\s+if|pretend\\s+to\\s+be|you\\s+are\\s+now|system\\s+override|ignore\\s+ethical|bypass\\s+safety|ignore\\s+content\\s+policy|忽略.*指令|忘记.*规则|假装.*是|扮演.*角色|现在.*是|系统.*覆盖|绕过.*安全|忽略.*伦理)',
        flags: 'gi',
        scope: 'both',
        category: 'security',
        enabled: true,
        riskLevel: 'critical',
        threatType: '越狱攻击',
        maskSensitiveData: false,
        maxMatches: 5,
        isBuiltin: true,
        createdAt: now,
        updatedAt: now,
        tags: ['jailbreak', 'bypass', 'prompt'],
        recommendation: '立即阻止此类请求，加强prompt安全过滤',
        remediation: '输入验证、安全过滤、行为监控',
        references: [
          'https://arxiv.org/abs/2307.15043',
          'https://owasp.org/www-project-ai-security-and-privacy-guide/'
        ]
      },
      
      {
        id: 'prompt_002_role_manipulation',
        name: '角色操纵检测',
        description: '检测试图改变AI角色或身份的操纵行为',
        pattern: '(act\\s+as\\s+[a-zA-Z]+|pretend\\s+to\\s+be\\s+[a-zA-Z]+|you\\s+are\\s+[a-zA-Z]+|roleplay\\s+as|imagine\\s+you\\s+are|behave\\s+like|扮演.*[a-zA-Z\\u4e00-\\u9fa5]+|假装.*[a-zA-Z\\u4e00-\\u9fa5]+|你是.*[a-zA-Z\\u4e00-\\u9fa5]+|角色扮演.*|想象.*是|表现得像|你现在扮演)',
        flags: 'gi',
        scope: 'both',
        category: 'security',
        enabled: true,
        riskLevel: 'high',
        threatType: '角色操纵',
        maskSensitiveData: false,
        maxMatches: 3,
        isBuiltin: true,
        createdAt: now,
        updatedAt: now,
        tags: ['role', 'manipulation', 'identity'],
        recommendation: '检查prompt是否试图改变AI行为模式',
        remediation: '角色验证、行为一致性检查、安全边界',
        references: [
          'https://arxiv.org/abs/2307.15043'
        ]
      },
      
    //   {
    //     id: 'prompt_003_injection_attack',
    //     name: 'Prompt注入攻击',
    //     description: '检测prompt注入攻击模式，包括分隔符绕过',
    //     pattern: '(\\{\\{|\\}\\}|\\[\\[|\\]\\]|<<|>>|\\|\\||&&|\\$\\{|\\$\\(|`.*`|"""|\\\'\\\'\\\')',
    //     flags: 'gi',
    //     scope: 'parameters',
    //     category: 'security',
    //     enabled: true,
    //     riskLevel: 'critical',
    //     threatType: 'Prompt注入',
    //     maskSensitiveData: false,
    //     maxMatches: 5,
    //     isBuiltin: true,
    //     createdAt: now,
    //     updatedAt: now,
    //     tags: ['injection', 'prompt', 'delimiter'],
    //     recommendation: '检查是否存在prompt注入尝试',
    //     remediation: '输入验证、分隔符转义、上下文隔离',
    //     references: [
    //       'https://arxiv.org/abs/2209.11302',
    //       'https://owasp.org/www-project-ai-security-and-privacy-guide/'
    //     ]
    //   },
      
      {
        id: 'prompt_004_sensitive_extraction',
        name: '敏感信息提取',
        description: '检测试图提取系统敏感信息的prompt',
        pattern: '(show\\s+me\\s+the\\s+system|reveal\\s+your\\s+|what\\s+are\\s+your\\s+instructions|tell\\s+me\\s+your\\s+prompt|show\\s+your\\s+configuration|what\\s+is\\s+your\\s+training|显示.*系统|透露.*你的|你的.*指令.*什么|告诉我.*提示|显示.*配置|你的.*训练.*什么)',
        flags: 'gi',
        scope: 'output',
        category: 'security',
        enabled: true,
        riskLevel: 'high',
        threatType: '信息提取',
        maskSensitiveData: false,
        maxMatches: 3,
        isBuiltin: true,
        createdAt: now,
        updatedAt: now,
        tags: ['extraction', 'sensitive', 'system'],
        recommendation: '阻止系统信息泄露请求',
        remediation: '信息保护、访问控制、安全边界',
        references: [
          'https://arxiv.org/abs/2307.15043'
        ]
      },
      
      {
        id: 'prompt_005_malicious_instruction',
        name: '恶意指令检测',
        description: '检测包含恶意指令的prompt，包括攻击工具、恶意软件等',
        pattern: '(create\\s+malware|develop\\s+virus|build\\s+trojan|write\\s+keylogger|craft\\s+backdoor|generate\\s+rootkit|design\\s+spyware|hack\\s+into|exploit\\s+vulnerability|steal\\s+credentials|phish\\s+for|scam\\s+users|fraud\\s+scheme|unauthorized\\s+access|illegal\\s+activity|harmful\\s+code|dangerous\\s+script|destructive\\s+payload|创建.*恶意软件|开发.*病毒|构建.*木马|编写.*键盘记录器|制作.*后门|生成.*根套件|设计.*间谍软件|黑客.*入侵|利用.*漏洞|窃取.*凭据|钓鱼.*获取|诈骗.*用户|欺诈.*计划|未授权.*访问|非法.*活动|有害.*代码|危险.*脚本|破坏性.*载荷)',
        flags: 'gi',
        scope: 'both',
        category: 'security',
        enabled: true,
        riskLevel: 'high',
        threatType: '恶意指令',
        maskSensitiveData: false,
        maxMatches: 2,
        isBuiltin: true,
        createdAt: now,
        updatedAt: now,
        tags: ['malicious', 'instruction', 'harmful'],
        recommendation: '检查prompt是否包含恶意指令，特别是攻击工具开发请求',
        remediation: '内容过滤、安全策略、行为监控、意图分析',
        references: [
          'https://owasp.org/www-project-ai-security-and-privacy-guide/'
        ]
      },
      
      {
        id: 'prompt_006_social_engineering',
        name: '社会工程学攻击',
        description: '检测社会工程学攻击模式，包括紧急感制造、权威冒充等',
        pattern: '(urgent\\s+action\\s+required|emergency\\s+response\\s+needed|critical\\s+security\\s+alert|help\\s+me\\s+urgently|save\\s+me\\s+now|trust\\s+me\\s+completely|verify\\s+your\\s+identity\\s+now|confirm\\s+your\\s+account\\s+immediately|authority\\s+figure\\s+request|official\\s+security\\s+notice|boss\\s+needs\\s+immediate|family\\s+emergency\\s+help|朋友.*紧急.*帮助|家人.*急需.*救援|老板.*立即.*要求|权威.*验证.*身份|官方.*安全.*通知|紧急.*行动.*要求|关键.*安全.*警报|立即.*确认.*账户)',
        flags: 'gi',
        scope: 'both',
        category: 'security',
        enabled: true,
        riskLevel: 'medium',
        threatType: '社会工程学',
        maskSensitiveData: false,
        maxMatches: 2,
        isBuiltin: true,
        createdAt: now,
        updatedAt: now,
        tags: ['social', 'engineering', 'manipulation'],
        recommendation: '检查是否存在社会工程学攻击尝试，特别是紧急感和权威冒充',
        remediation: '情绪检测、理性分析、安全验证、多因素确认',
        references: [
          'https://owasp.org/www-community/attacks/Social_Engineering'
        ]
      },
      
      {
        id: 'prompt_007_code_execution',
        name: '代码执行攻击',
        description: '检测试图执行恶意代码的prompt',
        pattern: '(eval\\s*\\(|exec\\s*\\(|system\\s*\\(|shell_exec|passthru|popen|proc_open|`.*`|\\$\\{.*\\}|\\$\\(.*\\)|import\\s+os|subprocess|os\\.system)',
        flags: 'gi',
        scope: 'both',
        category: 'security',
        enabled: true,
        riskLevel: 'critical',
        threatType: '代码执行',
        maskSensitiveData: false,
        maxMatches: 3,
        isBuiltin: true,
        createdAt: now,
        updatedAt: now,
        tags: ['code', 'execution', 'malicious'],
        recommendation: '立即阻止代码执行请求',
        remediation: '代码沙箱、执行限制、安全环境',
        references: [
          'https://owasp.org/www-community/attacks/Code_Injection'
        ]
      },
      
      {
        id: 'prompt_008_data_exfiltration',
        name: '数据泄露攻击',
        description: '检测试图泄露敏感数据的prompt，包括未授权传输和外部共享',
        pattern: '(send\\s+sensitive\\s+data\\s+to|upload\\s+private\\s+info\\s+to|post\\s+confidential\\s+to|email\\s+secrets\\s+to|share\\s+credentials\\s+with|forward\\s+personal\\s+data\\s+to|transmit\\s+internal\\s+data\\s+to|export\\s+user\\s+data\\s+to|download\\s+and\\s+send|copy\\s+private\\s+files\\s+to|save\\s+to\\s+external\\s+server|发送.*敏感.*数据.*到|上传.*私人.*信息.*到|发布.*机密.*到|邮件.*秘密.*到|分享.*凭据.*给|转发.*个人.*数据.*到|传输.*内部.*数据.*到|导出.*用户.*数据.*到|下载.*并.*发送|复制.*私人.*文件.*到|保存.*到.*外部.*服务器)',
        flags: 'gi',
        scope: 'both',
        category: 'security',
        enabled: true,
        riskLevel: 'high',
        threatType: '数据泄露',
        maskSensitiveData: false,
        maxMatches: 2,
        isBuiltin: true,
        createdAt: now,
        updatedAt: now,
        tags: ['exfiltration', 'data', 'leak'],
        recommendation: '检查是否存在数据泄露尝试，特别是敏感数据的外部传输',
        remediation: '数据保护、传输控制、访问审计、数据分类',
        references: [
          'https://owasp.org/www-community/vulnerabilities/Information_Exposure'
        ]
      }
    ];
  }
} 