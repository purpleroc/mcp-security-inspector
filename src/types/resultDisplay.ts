/**
 * MCP 调用结果展示配置
 */
export interface ResultDisplaySettings {
  /**
   * 展示模板。支持：
   * - {{auto}} 按结构自动美化
   * - {{path}} 路径取值，path 可含 [*]、[?type=text] 通配
   * - print(path) 输出并换行
   */
  template: string;
  showRaw: boolean;
  showPretty: boolean;
  /** 自动解析字符串中的 JSON（含 content[].text 及嵌套字段） */
  autoParseJsonText: boolean;
}

/** 空模板等价于 {{auto}} */
export const AUTO_DISPLAY_TOKEN = '{{auto}}';

export const DEFAULT_RESULT_DISPLAY_TEMPLATE = AUTO_DISPLAY_TOKEN;

export const DEFAULT_RESULT_DISPLAY_SETTINGS: ResultDisplaySettings = {
  template: DEFAULT_RESULT_DISPLAY_TEMPLATE,
  showRaw: true,
  showPretty: true,
  autoParseJsonText: true,
};
