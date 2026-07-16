import { useEffect, useMemo, useState } from "react"

import "./options.css"

import {
  builtinLayoutTemplates,
  builtinShareTemplates,
  builtinThemes,
  defaultLlmSettings,
  readActiveShareTemplateId,
  readLlmSettings,
  readNetworkBlocking,
  readQuickThemeIds,
  readRules,
  readShareTemplates,
  readThemes,
  writeActiveShareTemplateId,
  writeCustomShareTemplates,
  writeCustomThemes,
  writeLlmSettings,
  writeNetworkBlocking,
  writeQuickThemeIds,
  writeRules,
  type EasyReadSettings,
  type LayoutRegion,
  type LayoutTemplateId,
  type LlmProvider,
  type LlmProviderType,
  type LlmSettings,
  type PageType,
  type ReadingTheme,
  type ShareCardTemplate,
  type SiteLayoutRule,
  type UrlRule
} from "~lib/settings"

const layoutRegions: Array<{ id: LayoutRegion; label: string }> = [
  { id: "header", label: "页头" },
  { id: "navigation", label: "导航" },
  { id: "content", label: "主要内容" },
  { id: "sidebar", label: "侧栏" },
  { id: "comments", label: "评论" },
  { id: "footer", label: "页脚" }
]

function createEmptyLayout(): SiteLayoutRule {
  const now = Date.now()
  return {
    source: "manual",
    status: "draft",
    pageType: "conservative",
    templateId: "preserve",
    regions: {},
    confidence: 0,
    createdAt: now,
    updatedAt: now
  }
}

function createTheme(source: ReadingTheme = builtinThemes[1]): ReadingTheme {
  return {
    id: crypto.randomUUID(),
    name: `${source.name}副本`,
    builtin: false,
    settings: { ...source.settings, mode: "comfortable" }
  }
}

function createRule(themeId: string): UrlRule {
  return {
    id: crypto.randomUUID(),
    name: "新网站规则",
    pattern: "*.example.com/*",
    enabled: true,
    themeId,
    customHideSelectors: ""
  }
}

function createProvider(type: LlmProviderType): LlmProvider {
  return {
    id: crypto.randomUUID(),
    name: type === "anthropic" ? "Anthropic" : "OpenAI compatible",
    type,
    baseUrl:
      type === "anthropic"
        ? "https://api.anthropic.com"
        : "https://api.openai.com/v1",
    model: "",
    apiKey: ""
  }
}

function createShareTemplate(
  source: ShareCardTemplate = builtinShareTemplates[0]
): ShareCardTemplate {
  return {
    ...source,
    id: crypto.randomUUID(),
    name: `${source.name}副本`,
    builtin: false
  }
}

function OptionsPage() {
  const [themes, setThemes] = useState<ReadingTheme[]>(builtinThemes)
  const [rules, setRules] = useState<UrlRule[]>([])
  const [selectedId, setSelectedId] = useState("comfortable")
  const [saved, setSaved] = useState(false)
  const [networkBlocking, setNetworkBlocking] = useState(true)
  const [quickThemeIds, setQuickThemeIds] = useState<string[]>([])
  const [llmSettings, setLlmSettings] =
    useState<LlmSettings>(defaultLlmSettings)
  const [shareTemplates, setShareTemplates] = useState<ShareCardTemplate[]>(
    builtinShareTemplates
  )
  const [activeShareTemplateId, setActiveShareTemplateId] =
    useState("theme-spine")
  const [selectedShareTemplateId, setSelectedShareTemplateId] =
    useState("theme-spine")

  useEffect(() => {
    Promise.all([
      readThemes(),
      readRules(),
      readNetworkBlocking(),
      readQuickThemeIds(),
      readLlmSettings(),
      readShareTemplates(),
      readActiveShareTemplateId()
    ]).then(
      ([
        storedThemes,
        storedRules,
        storedNetworkBlocking,
        storedQuickIds,
        storedLlmSettings,
        storedShareTemplates,
        storedActiveShareTemplateId
      ]) => {
        setThemes(storedThemes)
        setRules(storedRules)
        setNetworkBlocking(storedNetworkBlocking)
        setQuickThemeIds(storedQuickIds)
        setLlmSettings(storedLlmSettings)
        setShareTemplates(storedShareTemplates)
        setActiveShareTemplateId(storedActiveShareTemplateId)
        setSelectedShareTemplateId(storedActiveShareTemplateId)
      }
    )
  }, [])

  const selected = useMemo(
    () => themes.find((theme) => theme.id === selectedId) ?? themes[0],
    [selectedId, themes]
  )

  const selectedShareTemplate = useMemo(
    () =>
      shareTemplates.find(
        (template) => template.id === selectedShareTemplateId
      ) ?? shareTemplates[0],
    [selectedShareTemplateId, shareTemplates]
  )

  const showSaved = () => {
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1400)
  }

  const persistThemes = (next: ReadingTheme[]) => {
    setThemes(next)
    void writeCustomThemes(next).then(showSaved)
  }

  const persistRules = (next: UrlRule[]) => {
    setRules(next)
    void writeRules(next).then(showSaved)
  }

  const persistLlmSettings = (next: LlmSettings) => {
    setLlmSettings(next)
    void writeLlmSettings(next).then(showSaved)
  }

  const persistShareTemplates = (next: ShareCardTemplate[]) => {
    setShareTemplates(next)
    void writeCustomShareTemplates(next).then(showSaved)
  }

  const updateShareTemplate = (patch: Partial<ShareCardTemplate>) => {
    if (!selectedShareTemplate || selectedShareTemplate.builtin) return
    persistShareTemplates(
      shareTemplates.map((template) =>
        template.id === selectedShareTemplate.id
          ? { ...template, ...patch }
          : template
      )
    )
  }

  const addShareTemplate = (source = selectedShareTemplate) => {
    const template = createShareTemplate(source)
    persistShareTemplates([...shareTemplates, template])
    setSelectedShareTemplateId(template.id)
  }

  const activateShareTemplate = (templateId: string) => {
    setActiveShareTemplateId(templateId)
    void writeActiveShareTemplateId(templateId).then(showSaved)
  }

  const deleteShareTemplate = () => {
    if (!selectedShareTemplate || selectedShareTemplate.builtin) return
    const next = shareTemplates.filter(
      (template) => template.id !== selectedShareTemplate.id
    )
    persistShareTemplates(next)
    if (activeShareTemplateId === selectedShareTemplate.id)
      activateShareTemplate("theme-spine")
    setSelectedShareTemplateId("theme-spine")
  }

  const updateProvider = (id: string, patch: Partial<LlmProvider>) => {
    persistLlmSettings({
      ...llmSettings,
      providers: llmSettings.providers.map((provider) =>
        provider.id === id ? { ...provider, ...patch } : provider
      )
    })
  }

  const addProvider = (type: LlmProviderType) => {
    const provider = createProvider(type)
    persistLlmSettings({
      ...llmSettings,
      activeProviderId: provider.id,
      providers: [...llmSettings.providers, provider]
    })
  }

  const deleteProvider = (id: string) => {
    const providers = llmSettings.providers.filter(
      (provider) => provider.id !== id
    )
    persistLlmSettings({
      ...llmSettings,
      providers,
      activeProviderId:
        llmSettings.activeProviderId === id
          ? providers[0]?.id ?? ""
          : llmSettings.activeProviderId
    })
  }

  const updateQuickTheme = (index: number, themeId: string) => {
    const next = [...quickThemeIds]
    next[index] = themeId
    setQuickThemeIds(next)
    void writeQuickThemeIds(next).then(showSaved)
  }

  const addTheme = (source = selected) => {
    const theme = createTheme(source)
    persistThemes([...themes, theme])
    setSelectedId(theme.id)
  }

  const updateTheme = (patch: Partial<EasyReadSettings>) => {
    if (!selected || selected.builtin) return
    persistThemes(
      themes.map((theme) =>
        theme.id === selected.id
          ? { ...theme, settings: { ...theme.settings, ...patch } }
          : theme
      )
    )
  }

  const renameTheme = (name: string) => {
    if (!selected || selected.builtin) return
    persistThemes(
      themes.map((theme) =>
        theme.id === selected.id ? { ...theme, name } : theme
      )
    )
  }

  const deleteTheme = () => {
    if (!selected || selected.builtin) return
    persistRules(
      rules.map((rule) =>
        rule.themeId === selected.id
          ? { ...rule, themeId: "comfortable" }
          : rule
      )
    )
    persistThemes(themes.filter((theme) => theme.id !== selected.id))
    const nextQuickIds = quickThemeIds.map((id) =>
      id === selected.id ? "comfortable" : id
    )
    setQuickThemeIds(nextQuickIds)
    void writeQuickThemeIds(nextQuickIds)
    setSelectedId("comfortable")
  }

  const updateRule = (id: string, patch: Partial<UrlRule>) => {
    persistRules(
      rules.map((rule) => (rule.id === id ? { ...rule, ...patch } : rule))
    )
  }

  const updateLayout = (
    rule: UrlRule,
    patch: Partial<SiteLayoutRule>,
    region?: { id: LayoutRegion; selector: string }
  ) => {
    const current = rule.layout ?? createEmptyLayout()
    const layout: SiteLayoutRule = {
      ...current,
      ...patch,
      source: region || Object.keys(patch).length ? "manual" : current.source,
      status: "confirmed",
      regions: region
        ? { ...current.regions, [region.id]: region.selector || undefined }
        : current.regions,
      updatedAt: Date.now()
    }
    updateRule(rule.id, { layout })
  }

  const moveRule = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= rules.length) return
    const next = [...rules]
    ;[next[index], next[target]] = [next[target], next[index]]
    persistRules(next)
  }

  const confirmLayout = (rule: UrlRule) => {
    if (!rule.layout) return
    updateRule(rule.id, {
      layout: { ...rule.layout, status: "confirmed", updatedAt: Date.now() }
    })
  }

  const sharePreviewTheme = selected?.settings ?? builtinThemes[1].settings
  const sharePreviewColors = selectedShareTemplate?.followTheme
    ? {
        page: sharePreviewTheme.pageColor,
        card: sharePreviewTheme.contentColor,
        text: sharePreviewTheme.textColor,
        accent: sharePreviewTheme.linkColor,
        font: sharePreviewTheme.fontFamily
      }
    : {
        page: selectedShareTemplate?.pageColor ?? "#f3f0e7",
        card: selectedShareTemplate?.cardColor ?? "#fbfaf5",
        text: selectedShareTemplate?.textColor ?? "#2b3437",
        accent: selectedShareTemplate?.accentColor ?? "#176b78",
        font: selectedShareTemplate?.fontFamily ?? "sans-serif"
      }

  return (
    <main className="options-shell">
      <header className="options-header">
        <div>
          <p className="options-eyebrow">EASY READ / WORKSHOP</p>
          <h1>阅读工作台</h1>
          <p className="intro">
            创建自己的阅读主题，再根据 URL 将主题分配给不同网站。
          </p>
        </div>
        <button className="add-rule" onClick={() => addTheme()}>
          <span>＋</span> 新建主题
        </button>
      </header>

      <section className="workspace-section">
        <div className="section-heading">
          <div>
            <span>THEMES</span>
            <h2>主题库</h2>
          </div>
          <p>内置主题可以复制，自定义主题可以随时编辑。</p>
        </div>

        <div className="theme-workbench">
          <nav className="theme-list" aria-label="主题列表">
            {themes.map((theme) => (
              <button
                className={
                  theme.id === selected?.id ? "theme-tile active" : "theme-tile"
                }
                key={theme.id}
                onClick={() => setSelectedId(theme.id)}>
                <i
                  style={{
                    background: `linear-gradient(135deg, ${theme.settings.pageColor} 50%, ${theme.settings.contentColor} 50%)`,
                    color: theme.settings.textColor
                  }}>
                  Aa
                </i>
                <span>
                  <strong>{theme.name}</strong>
                  <small>{theme.builtin ? "内置主题" : "自定义主题"}</small>
                </span>
              </button>
            ))}
          </nav>

          {selected && (
            <div className="theme-editor">
              <div className="editor-title">
                <div>
                  <label>主题名称</label>
                  <input
                    value={selected.name}
                    disabled={selected.builtin}
                    onChange={(event) => renameTheme(event.target.value)}
                  />
                </div>
                <div className="editor-actions">
                  <button onClick={() => addTheme(selected)}>复制主题</button>
                  {!selected.builtin && (
                    <button className="danger" onClick={deleteTheme}>
                      删除
                    </button>
                  )}
                </div>
              </div>

              <div
                className="theme-preview"
                style={{ background: selected.settings.pageColor }}>
                <article
                  style={{
                    background: selected.settings.contentColor,
                    color: selected.settings.textColor,
                    maxWidth: Math.min(selected.settings.contentWidth / 2, 430)
                  }}>
                  <small>PREVIEW / 阅读预览</small>
                  <h3>让文字回到舒适的位置</h3>
                  <p
                    style={{
                      fontSize: selected.settings.fontSize * 0.72,
                      lineHeight: selected.settings.lineHeight
                    }}>
                    好的阅读体验不应抢走注意力，而是让页面的节奏、留白与色彩安静地服务于内容。
                  </p>
                  <a style={{ color: selected.settings.linkColor }}>
                    查看示例链接 →
                  </a>
                </article>
              </div>

              <fieldset disabled={selected.builtin} className="editor-fields">
                <legend>
                  {selected.builtin ? "复制此主题后即可调整" : "主题参数"}
                </legend>
                <div className="color-grid">
                  <ColorField
                    label="页面背景"
                    value={selected.settings.pageColor}
                    onChange={(pageColor) => updateTheme({ pageColor })}
                  />
                  <ColorField
                    label="正文背景"
                    value={selected.settings.contentColor}
                    onChange={(contentColor) => updateTheme({ contentColor })}
                  />
                  <ColorField
                    label="正文颜色"
                    value={selected.settings.textColor}
                    onChange={(textColor) => updateTheme({ textColor })}
                  />
                  <ColorField
                    label="链接颜色"
                    value={selected.settings.linkColor}
                    onChange={(linkColor) => updateTheme({ linkColor })}
                  />
                </div>
                <div className="parameter-grid">
                  <NumberField
                    label="字号"
                    value={selected.settings.fontSize}
                    min={14}
                    max={24}
                    suffix="px"
                    onChange={(fontSize) => updateTheme({ fontSize })}
                  />
                  <NumberField
                    label="行高"
                    value={selected.settings.lineHeight}
                    min={1.4}
                    max={2.2}
                    step={0.05}
                    onChange={(lineHeight) => updateTheme({ lineHeight })}
                  />
                  <NumberField
                    label="正文宽度"
                    value={selected.settings.contentWidth}
                    min={600}
                    max={1200}
                    step={20}
                    suffix="px"
                    onChange={(contentWidth) => updateTheme({ contentWidth })}
                  />
                  <NumberField
                    label="图片亮度"
                    value={selected.settings.imageBrightness}
                    min={0.3}
                    max={1.2}
                    step={0.05}
                    onChange={(imageBrightness) =>
                      updateTheme({ imageBrightness })
                    }
                  />
                </div>
                <div className="font-grid">
                  <TextField
                    label="正文字体栈"
                    value={selected.settings.fontFamily}
                    onChange={(fontFamily) => updateTheme({ fontFamily })}
                  />
                  <TextField
                    label="标题字体栈"
                    value={selected.settings.headingFontFamily}
                    onChange={(headingFontFamily) =>
                      updateTheme({ headingFontFamily })
                    }
                  />
                </div>
                <div className="theme-switches">
                  <CheckField
                    label="默认隐藏广告"
                    checked={selected.settings.hideAds}
                    onChange={(hideAds) => updateTheme({ hideAds })}
                  />
                  <CheckField
                    label="默认隐藏侧栏"
                    checked={selected.settings.hideSidebars}
                    onChange={(hideSidebars) => updateTheme({ hideSidebars })}
                  />
                </div>
              </fieldset>
            </div>
          )}
        </div>
      </section>

      <section className="workspace-section shortcuts-section">
        <div className="section-heading">
          <div>
            <span>POPUP SHORTCUTS</span>
            <h2>快捷主题</h2>
          </div>
          <p>设置 Popup 中从左到右显示的四个主题。</p>
        </div>
        <div className="shortcut-grid">
          {quickThemeIds.map((themeId, index) => {
            const theme =
              themes.find((item) => item.id === themeId) ?? themes[0]
            return (
              <label className="shortcut-slot" key={index}>
                <b>{String(index + 1).padStart(2, "0")}</b>
                {theme && (
                  <i
                    style={{
                      background: `linear-gradient(135deg, ${theme.settings.pageColor} 50%, ${theme.settings.contentColor} 50%)`
                    }}
                  />
                )}
                <span>快捷位置 {index + 1}</span>
                <select
                  value={theme?.id ?? "native"}
                  onChange={(event) =>
                    updateQuickTheme(index, event.target.value)
                  }>
                  {themes.map((item) => (
                    <option value={item.id} key={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
            )
          })}
        </div>
      </section>

      <section className="workspace-section share-template-section">
        <div className="section-heading">
          <div>
            <span>SHARE CARDS</span>
            <h2>分享模板</h2>
          </div>
          <button
            className="secondary-action"
            onClick={() => addShareTemplate()}>
            ＋ 新建模板
          </button>
        </div>
        <div className="share-template-workbench">
          <nav className="share-template-list" aria-label="分享模板列表">
            {shareTemplates.map((template) => (
              <button
                className={
                  template.id === selectedShareTemplate?.id
                    ? "share-template-item active"
                    : "share-template-item"
                }
                key={template.id}
                onClick={() => setSelectedShareTemplateId(template.id)}>
                <i
                  style={{
                    background: template.followTheme
                      ? "linear-gradient(135deg, #f3f0e7 50%, #17212a 50%)"
                      : `linear-gradient(135deg, ${template.pageColor} 50%, ${template.cardColor} 50%)`
                  }}
                />
                <span>
                  <strong>{template.name}</strong>
                  <small>
                    {template.id === activeShareTemplateId
                      ? "正在使用"
                      : template.builtin
                        ? "内置模板"
                        : "自定义模板"}
                  </small>
                </span>
              </button>
            ))}
          </nav>
          {selectedShareTemplate && (
            <div className="share-template-editor">
              <div className="share-template-toolbar">
                <div>
                  <label>模板名称</label>
                  <input
                    value={selectedShareTemplate.name}
                    disabled={selectedShareTemplate.builtin}
                    onChange={(event) =>
                      updateShareTemplate({ name: event.target.value })
                    }
                  />
                </div>
                <div>
                  <button
                    className="use-template"
                    disabled={
                      activeShareTemplateId === selectedShareTemplate.id
                    }
                    onClick={() =>
                      activateShareTemplate(selectedShareTemplate.id)
                    }>
                    {activeShareTemplateId === selectedShareTemplate.id
                      ? "正在使用"
                      : "设为当前模板"}
                  </button>
                  <button
                    onClick={() => addShareTemplate(selectedShareTemplate)}>
                    复制
                  </button>
                  {!selectedShareTemplate.builtin && (
                    <button className="danger" onClick={deleteShareTemplate}>
                      删除
                    </button>
                  )}
                </div>
              </div>
              <div
                className="share-card-preview"
                style={{ background: sharePreviewColors.page }}>
                <article
                  style={{
                    color: sharePreviewColors.text,
                    background: sharePreviewColors.card,
                    borderLeftColor: sharePreviewColors.accent,
                    borderRadius: selectedShareTemplate.cornerRadius / 2,
                    fontFamily: sharePreviewColors.font
                  }}>
                  <b style={{ color: sharePreviewColors.accent }}>“</b>
                  <p
                    style={{
                      fontSize: `${14 * selectedShareTemplate.fontScale}px`
                    }}>
                    阅读不是把页面变得更复杂，而是把注意力重新交还给文字。
                  </p>
                  <footer>
                    <span>
                      {selectedShareTemplate.showSource ? "example.com" : ""}
                    </span>
                    <strong style={{ color: sharePreviewColors.accent }}>
                      {selectedShareTemplate.showBranding ? "EASY READ" : ""}
                    </strong>
                  </footer>
                </article>
              </div>
              <fieldset
                className="share-template-fields"
                disabled={selectedShareTemplate.builtin}>
                <legend>
                  {selectedShareTemplate.builtin
                    ? "复制此模板后即可编辑"
                    : "模板参数"}
                </legend>
                <div className="share-template-switches">
                  <CheckField
                    label="跟随当前阅读主题"
                    checked={selectedShareTemplate.followTheme}
                    onChange={(followTheme) =>
                      updateShareTemplate({ followTheme })
                    }
                  />
                  <CheckField
                    label="显示来源"
                    checked={selectedShareTemplate.showSource}
                    onChange={(showSource) =>
                      updateShareTemplate({ showSource })
                    }
                  />
                  <CheckField
                    label="显示 Easy Read"
                    checked={selectedShareTemplate.showBranding}
                    onChange={(showBranding) =>
                      updateShareTemplate({ showBranding })
                    }
                  />
                </div>
                <div
                  className={
                    selectedShareTemplate.followTheme
                      ? "share-template-colors theme-linked"
                      : "share-template-colors"
                  }>
                  <ColorField
                    label="画布背景"
                    value={selectedShareTemplate.pageColor}
                    onChange={(pageColor) => updateShareTemplate({ pageColor })}
                  />
                  <ColorField
                    label="卡片背景"
                    value={selectedShareTemplate.cardColor}
                    onChange={(cardColor) => updateShareTemplate({ cardColor })}
                  />
                  <ColorField
                    label="文字颜色"
                    value={selectedShareTemplate.textColor}
                    onChange={(textColor) => updateShareTemplate({ textColor })}
                  />
                  <ColorField
                    label="强调颜色"
                    value={selectedShareTemplate.accentColor}
                    onChange={(accentColor) =>
                      updateShareTemplate({ accentColor })
                    }
                  />
                </div>
                <div className="share-template-parameters">
                  <TextField
                    label="字体栈"
                    value={selectedShareTemplate.fontFamily}
                    onChange={(fontFamily) =>
                      updateShareTemplate({ fontFamily })
                    }
                  />
                  <NumberField
                    label="字号比例"
                    value={selectedShareTemplate.fontScale}
                    min={0.75}
                    max={1.35}
                    step={0.05}
                    onChange={(fontScale) => updateShareTemplate({ fontScale })}
                  />
                  <NumberField
                    label="卡片圆角"
                    value={selectedShareTemplate.cornerRadius}
                    min={0}
                    max={40}
                    suffix="px"
                    onChange={(cornerRadius) =>
                      updateShareTemplate({ cornerRadius })
                    }
                  />
                </div>
              </fieldset>
            </div>
          )}
        </div>
      </section>

      <section className="workspace-section ai-section">
        <div className="section-heading">
          <div>
            <span>AI PROVIDERS</span>
            <h2>页面分析模型</h2>
          </div>
          <label className="ai-master-switch">
            <input
              type="checkbox"
              checked={llmSettings.enabled}
              onChange={(event) =>
                persistLlmSettings({
                  ...llmSettings,
                  enabled: event.target.checked
                })
              }
            />
            <i aria-hidden="true" />
            <span>{llmSettings.enabled ? "已启用" : "未启用"}</span>
          </label>
        </div>
        <div className="ai-toolbar">
          <label>
            <span>当前供应商</span>
            <select
              value={llmSettings.activeProviderId}
              onChange={(event) =>
                persistLlmSettings({
                  ...llmSettings,
                  activeProviderId: event.target.value
                })
              }>
              {llmSettings.providers.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.name}
                </option>
              ))}
            </select>
          </label>
          <div>
            <button onClick={() => addProvider("openai-compatible")}>
              ＋ OpenAI-compatible
            </button>
            <button onClick={() => addProvider("anthropic")}>
              ＋ Anthropic
            </button>
          </div>
        </div>
        <div className="provider-list">
          {llmSettings.providers.map((provider) => (
            <article
              className={
                provider.id === llmSettings.activeProviderId
                  ? "provider-card active"
                  : "provider-card"
              }
              key={provider.id}>
              <header>
                <b>
                  {provider.type === "anthropic"
                    ? "ANTHROPIC MESSAGES"
                    : "OPENAI CHAT COMPLETIONS"}
                </b>
                <button onClick={() => deleteProvider(provider.id)}>
                  删除
                </button>
              </header>
              <div className="provider-fields">
                <label>
                  <span>名称</span>
                  <input
                    value={provider.name}
                    onChange={(event) =>
                      updateProvider(provider.id, { name: event.target.value })
                    }
                  />
                </label>
                <label>
                  <span>协议</span>
                  <select
                    value={provider.type}
                    onChange={(event) =>
                      updateProvider(provider.id, {
                        type: event.target.value as LlmProviderType
                      })
                    }>
                    <option value="openai-compatible">OpenAI-compatible</option>
                    <option value="anthropic">Anthropic</option>
                  </select>
                </label>
                <label className="provider-url">
                  <span>Base URL</span>
                  <input
                    value={provider.baseUrl}
                    placeholder="https://api.example.com/v1"
                    onChange={(event) =>
                      updateProvider(provider.id, {
                        baseUrl: event.target.value
                      })
                    }
                  />
                </label>
                <label>
                  <span>模型名称</span>
                  <input
                    value={provider.model}
                    placeholder="填写供应商提供的模型 ID"
                    onChange={(event) =>
                      updateProvider(provider.id, { model: event.target.value })
                    }
                  />
                </label>
                <label className="provider-key">
                  <span>API Key</span>
                  <input
                    type="password"
                    value={provider.apiKey}
                    autoComplete="off"
                    placeholder="仅保存在浏览器本地存储"
                    onChange={(event) =>
                      updateProvider(provider.id, {
                        apiKey: event.target.value
                      })
                    }
                  />
                </label>
              </div>
            </article>
          ))}
        </div>
        <p className="ai-safety-note">
          API Key 保存在扩展的本地存储中，但不会被加密。AI
          仅接收当前页面的结构摘要，不发送正文、表单值或 Cookie。
        </p>
      </section>

      <section className="workspace-section rules-section">
        <div className="section-heading">
          <div>
            <span>URL RULES</span>
            <h2>网站规则</h2>
          </div>
          <button
            className="secondary-action"
            onClick={() =>
              persistRules([
                ...rules,
                createRule(selected?.id ?? "comfortable")
              ])
            }>
            ＋ 添加规则
          </button>
        </div>
        <label className="network-blocking-card">
          <div className="network-icon" aria-hidden="true">
            ⊘
          </div>
          <span>
            <strong>网络广告拦截</strong>
            <small>在第三方广告脚本、图片和 iframe 下载前阻止请求</small>
          </span>
          <input
            type="checkbox"
            checked={networkBlocking}
            onChange={(event) => {
              const enabled = event.target.checked
              setNetworkBlocking(enabled)
              void writeNetworkBlocking(enabled).then(showSaved)
            }}
          />
          <i aria-hidden="true" />
          <b>{networkBlocking ? "已开启" : "已关闭"}</b>
        </label>
        <aside className="syntax-note">
          <strong>匹配示例</strong>
          <code>*.zhihu.com/*</code>
          <code>https://news.example.com/article/*</code>
          <span>从上到下匹配，首条命中规则生效。</span>
        </aside>
        <div className="rules">
          {rules.length === 0 ? (
            <div className="empty">
              <span>∅</span>
              <h2>还没有网站规则</h2>
              <p>添加规则，为常读的网站指定一个主题。</p>
              <button
                onClick={() =>
                  persistRules([createRule(selected?.id ?? "comfortable")])
                }>
                添加第一条规则
              </button>
            </div>
          ) : (
            rules.map((rule, index) => (
              <article
                className={rule.enabled ? "rule-card" : "rule-card muted"}
                key={rule.id}>
                <div className="rule-index">
                  {String(index + 1).padStart(2, "0")}
                </div>
                <div className="rule-main">
                  <div className="rule-topline">
                    <input
                      className="rule-name"
                      aria-label="规则名称"
                      value={rule.name}
                      onChange={(event) =>
                        updateRule(rule.id, { name: event.target.value })
                      }
                    />
                    <div className="rule-actions">
                      <button
                        disabled={index === 0}
                        onClick={() => moveRule(index, -1)}
                        aria-label="上移">
                        ↑
                      </button>
                      <button
                        disabled={index === rules.length - 1}
                        onClick={() => moveRule(index, 1)}
                        aria-label="下移">
                        ↓
                      </button>
                      <label className="rule-switch">
                        <input
                          type="checkbox"
                          checked={rule.enabled}
                          onChange={(event) =>
                            updateRule(rule.id, {
                              enabled: event.target.checked
                            })
                          }
                        />
                        <i />
                        <span>{rule.enabled ? "启用" : "停用"}</span>
                      </label>
                    </div>
                  </div>
                  <div className="rule-binding">
                    <label className="pattern-field">
                      <span>URL 匹配</span>
                      <input
                        value={rule.pattern}
                        placeholder="*.example.com/*"
                        onChange={(event) =>
                          updateRule(rule.id, { pattern: event.target.value })
                        }
                      />
                    </label>
                    <label>
                      <span>使用主题</span>
                      <select
                        value={rule.themeId}
                        onChange={(event) =>
                          updateRule(rule.id, { themeId: event.target.value })
                        }>
                        {themes.map((theme) => (
                          <option key={theme.id} value={theme.id}>
                            {theme.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <label className="custom-selectors">
                    <span>自定义隐藏选择器</span>
                    <textarea
                      value={rule.customHideSelectors ?? ""}
                      placeholder={
                        "每行一个 CSS 选择器，例如：\n.promotion-banner\n#sticky-ad"
                      }
                      onChange={(event) =>
                        updateRule(rule.id, {
                          customHideSelectors: event.target.value
                        })
                      }
                    />
                    <small>仅在该规则主题开启“隐藏广告”时生效。</small>
                  </label>
                  <details
                    className="layout-rule-editor"
                    open={Boolean(rule.layout)}>
                    <summary>
                      <span>页面结构与重排</span>
                      <b
                        className={
                          rule.layout ? "layout-ready" : "layout-empty"
                        }>
                        {rule.layout
                          ? `${rule.layout.source === "local" ? "本地" : rule.layout.source === "llm" ? "AI" : "手动"} · ${Math.round(rule.layout.confidence * 100)}%`
                          : "尚未分析"}
                      </b>
                    </summary>
                    <div className="layout-editor-body">
                      <div className="layout-meta-grid">
                        <label>
                          <span>页面类型</span>
                          <select
                            value={rule.layout?.pageType ?? "conservative"}
                            onChange={(event) =>
                              updateLayout(rule, {
                                pageType: event.target.value as PageType
                              })
                            }>
                            <option value="article">文章</option>
                            <option value="documentation">文档</option>
                            <option value="forum">论坛</option>
                            <option value="feed">信息流</option>
                            <option value="conservative">保守</option>
                          </select>
                        </label>
                        <label>
                          <span>布局模板</span>
                          <select
                            value={rule.layout?.templateId ?? "preserve"}
                            onChange={(event) =>
                              updateLayout(rule, {
                                templateId: event.target
                                  .value as LayoutTemplateId
                              })
                            }>
                            {builtinLayoutTemplates.map((template) => (
                              <option key={template.id} value={template.id}>
                                {template.name}
                              </option>
                            ))}
                          </select>
                          <small>
                            {
                              builtinLayoutTemplates.find(
                                (template) =>
                                  template.id ===
                                  (rule.layout?.templateId ?? "preserve")
                              )?.description
                            }
                          </small>
                        </label>
                        <button
                          disabled={rule.layout?.status !== "draft"}
                          onClick={() => confirmLayout(rule)}>
                          {rule.layout?.status === "draft"
                            ? "确认并应用草稿"
                            : "规则已确认"}
                        </button>
                      </div>
                      <div className="region-selector-grid">
                        {layoutRegions.map((region) => (
                          <label key={region.id}>
                            <span>{region.label}</span>
                            <input
                              value={rule.layout?.regions[region.id] ?? ""}
                              placeholder={`CSS selector for ${region.id}`}
                              onChange={(event) =>
                                updateLayout(
                                  rule,
                                  {},
                                  {
                                    id: region.id,
                                    selector: event.target.value
                                  }
                                )
                              }
                            />
                          </label>
                        ))}
                      </div>
                      <p>
                        从 Popup 使用本地或 AI 分析生成规则；AI
                        结果会先保存为草稿，确认后才会应用。
                      </p>
                    </div>
                  </details>
                  <div className="rule-footer">
                    <span>主题参数由主题库统一管理</span>
                    <button
                      className="delete"
                      onClick={() =>
                        persistRules(
                          rules.filter((item) => item.id !== rule.id)
                        )
                      }>
                      删除规则
                    </button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
      <div className={saved ? "save-status visible" : "save-status"}>
        已保存，打开的网页将自动更新
      </div>
    </main>
  )
}

function ColorField({
  label,
  value,
  onChange
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="color-field">
      <span>{label}</span>
      <div>
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <code>{value.toUpperCase()}</code>
      </div>
    </label>
  )
}

function NumberField({
  label,
  value,
  min,
  max,
  step = 1,
  suffix = "",
  onChange
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  suffix?: string
  onChange: (value: number) => void
}) {
  return (
    <label>
      <span>{label}</span>
      <div className="number-input">
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        {suffix && <b>{suffix}</b>}
      </div>
    </label>
  )
}

function CheckField({
  label,
  checked,
  onChange
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />{" "}
      {label}
    </label>
  )
}

function TextField({
  label,
  value,
  onChange
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label>
      <span>{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

export default OptionsPage
