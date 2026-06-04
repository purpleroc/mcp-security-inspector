import React, { useEffect, useMemo, useState } from 'react';
import { Button, Checkbox, Collapse, Input, Space, Tag, Tooltip, Typography, message } from 'antd';
import { CopyOutlined, DownOutlined, SettingOutlined } from '@ant-design/icons';
import { useI18n } from '../hooks/useI18n';
import { storage } from '../utils/storage';
import {
  AUTO_DISPLAY_TOKEN,
  DEFAULT_RESULT_DISPLAY_SETTINGS,
  DEFAULT_RESULT_DISPLAY_TEMPLATE,
  ResultDisplaySettings
} from '../types/resultDisplay';
import {
  applyResultTemplate,
  buildDisplayContext,
  formatPrettyResult,
  formatRawResult,
  getDisplayPathHints,
  normalizeResultDisplaySettings
} from '../utils/resultDisplay';

const { TextArea } = Input;
const { Text } = Typography;

interface McpResultViewerProps {
  value: unknown;
  isError?: boolean;
  expanded?: boolean;
}

/** 通用预设；commandOutput 仅作可选示例，非默认 */
const buildTemplatePresets = () => [
  { key: 'auto', template: AUTO_DISPLAY_TOKEN },
  { key: 'allContentText', template: '{{content[*].text}}' },
  { key: 'textByType', template: '{{content[?type=text].text}}' },
  { key: 'allParsed', template: '{{parsed[*]}}' },
  { key: 'firstText', template: '{{content.0.text}}' },
  { key: 'printEachText', template: 'print(content[*].text)' },
  {
    key: 'commandOutput',
    template: `exit_code: {{parsed.exit_code}}

--- stdout ---
{{parsed.stdout}}

--- stderr ---
{{parsed.stderr}}`
  }
];

const McpResultViewer: React.FC<McpResultViewerProps> = ({
  value,
  isError = false,
  expanded = false
}) => {
  const { t } = useI18n();
  const rd = t.resultDisplay;
  const templatePresets = useMemo(() => buildTemplatePresets(), []);

  const [settings, setSettings] = useState<ResultDisplaySettings>(() =>
    storage.getResultDisplaySettings()
  );
  const [templateDraft, setTemplateDraft] = useState(settings.template);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [prettyExpanded, setPrettyExpanded] = useState(false);
  const [resultPanelKeys, setResultPanelKeys] = useState<string[]>(['pretty']);

  useEffect(() => {
    setTemplateDraft(settings.template);
  }, [settings.template]);

  useEffect(() => {
    setResultPanelKeys(['pretty']);
    setPrettyExpanded(false);
  }, [value]);

  const rawText = useMemo(() => {
    if (isError) return typeof value === 'string' ? value : formatRawResult(value);
    return formatRawResult(value);
  }, [value, isError]);

  const prettyText = useMemo(() => {
    if (isError) return '';
    return formatPrettyResult(value, settings);
  }, [value, isError, settings]);

  const pathHints = useMemo(() => {
    if (isError || value == null) return [];
    return getDisplayPathHints(value, settings.autoParseJsonText);
  }, [value, isError, settings.autoParseJsonText]);

  const previewText = useMemo(() => {
    if (isError) return '';
    const ctx = buildDisplayContext(value, settings.autoParseJsonText);
    ctx._autoParse = settings.autoParseJsonText;
    const tpl = templateDraft.trim() || DEFAULT_RESULT_DISPLAY_TEMPLATE;
    return applyResultTemplate(tpl, ctx, settings.autoParseJsonText) || rd.previewEmpty;
  }, [value, isError, templateDraft, settings.autoParseJsonText, rd.previewEmpty]);

  const persistSettings = (next: ResultDisplaySettings) => {
    const normalized = normalizeResultDisplaySettings(next);
    setSettings(normalized);
    storage.saveResultDisplaySettings(normalized);
  };

  const applyTemplate = () => {
    persistSettings({ ...settings, template: templateDraft });
    message.success(rd.templateSaved);
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    message.success(rd.copied);
  };

  const applyPreset = (template: string) => {
    setTemplateDraft(template);
    persistSettings({ ...settings, template });
  };

  const insertHint = (hint: string) => {
    setTemplateDraft((prev) => (prev.trim() ? `${prev}\n${hint}` : hint));
  };

  if (isError) {
    return (
      <div className={`result-content ${expanded ? 'expanded' : ''} error`}>
        <pre>{rawText}</pre>
      </div>
    );
  }

  return (
    <div className="mcp-result-viewer">
      <Collapse
        ghost
        activeKey={settingsOpen ? ['display'] : []}
        onChange={(keys) => setSettingsOpen(keys.includes('display'))}
        items={[
          {
            key: 'display',
            label: (
              <Space size={4}>
                <SettingOutlined />
                <span>{rd.settingsTitle}</span>
              </Space>
            ),
            children: (
              <div className="result-display-settings">
                <Space wrap style={{ marginBottom: 8 }}>
                  <Text type="secondary">{rd.presets}:</Text>
                  {templatePresets.map((preset) => (
                    <Button
                      key={preset.key}
                      size="small"
                      onClick={() => applyPreset(preset.template)}
                    >
                      {rd.presetLabels[preset.key as keyof typeof rd.presetLabels]}
                    </Button>
                  ))}
                </Space>

                <Text type="secondary" className="result-display-hint">
                  {rd.templateHint}
                </Text>
                <TextArea
                  value={templateDraft}
                  onChange={(e) => setTemplateDraft(e.target.value)}
                  autoSize={{ minRows: 4, maxRows: 12 }}
                  className="modern-textarea result-display-template"
                  placeholder={DEFAULT_RESULT_DISPLAY_TEMPLATE}
                />

                {pathHints.length > 0 && (
                  <div className="result-display-path-hints">
                    <Text type="secondary">{rd.pathHints}:</Text>
                    <div className="result-display-path-tags">
                      {pathHints.map((hint) => (
                        <Tag
                          key={hint}
                          className="result-path-hint-tag"
                          onClick={() => insertHint(hint)}
                        >
                          {hint}
                        </Tag>
                      ))}
                    </div>
                  </div>
                )}

                <div className="result-display-preview">
                  <Text type="secondary">{rd.preview}:</Text>
                  <pre className="result-display-preview-pre">{previewText}</pre>
                </div>

                <Space wrap style={{ marginTop: 8 }}>
                  <Checkbox
                    checked={settings.showRaw}
                    onChange={(e) => persistSettings({ ...settings, showRaw: e.target.checked })}
                  >
                    {rd.showRaw}
                  </Checkbox>
                  <Checkbox
                    checked={settings.showPretty}
                    onChange={(e) => persistSettings({ ...settings, showPretty: e.target.checked })}
                  >
                    {rd.showPretty}
                  </Checkbox>
                  <Checkbox
                    checked={settings.autoParseJsonText}
                    onChange={(e) =>
                      persistSettings({ ...settings, autoParseJsonText: e.target.checked })
                    }
                  >
                    {rd.autoParseJson}
                  </Checkbox>
                  <Button type="primary" size="small" onClick={applyTemplate}>
                    {rd.saveTemplate}
                  </Button>
                  <Button
                    size="small"
                    onClick={() => {
                      setTemplateDraft(DEFAULT_RESULT_DISPLAY_TEMPLATE);
                      persistSettings({ ...DEFAULT_RESULT_DISPLAY_SETTINGS });
                    }}
                  >
                    {rd.resetTemplate}
                  </Button>
                </Space>
              </div>
            )
          }
        ]}
      />

      <Collapse
        className="result-output-collapse"
        activeKey={resultPanelKeys}
        onChange={(keys) => setResultPanelKeys(Array.isArray(keys) ? keys : [keys])}
        items={[
          ...(settings.showPretty
            ? [
                {
                  key: 'pretty',
                  label: (
                    <div className="result-collapse-label">
                      <Text strong>{rd.prettyTitle}</Text>
                      <Space size={4} onClick={(e) => e.stopPropagation()}>
                        <Tooltip title={prettyExpanded ? rd.collapsePretty : rd.expandPretty}>
                          <Button
                            type="text"
                            size="small"
                            icon={
                              <DownOutlined
                                className={`result-expand-icon ${prettyExpanded ? 'expanded' : ''}`}
                              />
                            }
                            onClick={() => setPrettyExpanded((v) => !v)}
                          />
                        </Tooltip>
                        <Tooltip title={rd.copyPretty}>
                          <Button
                            type="text"
                            size="small"
                            icon={<CopyOutlined />}
                            onClick={() => copyText(prettyText)}
                          />
                        </Tooltip>
                      </Space>
                    </div>
                  ),
                  children: (
                    <div
                      className={`result-panel-body-scroll success ${
                        prettyExpanded || expanded ? 'expanded' : ''
                      }`}
                    >
                      <pre>{prettyText || rd.previewEmpty}</pre>
                    </div>
                  )
                }
              ]
            : []),
          ...(settings.showRaw
            ? [
                {
                  key: 'raw',
                  label: (
                    <div className="result-collapse-label">
                      <Text strong>{rd.rawTitle}</Text>
                      <span onClick={(e) => e.stopPropagation()}>
                        <Tooltip title={rd.copyRaw}>
                          <Button
                            type="text"
                            size="small"
                            icon={<CopyOutlined />}
                            onClick={() => copyText(rawText)}
                          />
                        </Tooltip>
                      </span>
                    </div>
                  ),
                  children: (
                    <div className="result-panel-body-scroll raw-scroll">
                      <pre>{rawText}</pre>
                    </div>
                  )
                }
              ]
            : [])
        ]}
      />
    </div>
  );
};

export default McpResultViewer;
