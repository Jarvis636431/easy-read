import { useEffect, useMemo, useState } from "react"

import "./options.css"

import {
  builtinThemes,
  readNetworkBlocking,
  readQuickThemeIds,
  readRules,
  readThemes,
  writeCustomThemes,
  writeNetworkBlocking,
  writeQuickThemeIds,
  writeRules,
  type EasyReadSettings,
  type ReadingTheme,
  type UrlRule
} from "~lib/settings"

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

function OptionsPage() {
  const [themes, setThemes] = useState<ReadingTheme[]>(builtinThemes)
  const [rules, setRules] = useState<UrlRule[]>([])
  const [selectedId, setSelectedId] = useState("comfortable")
  const [saved, setSaved] = useState(false)
  const [networkBlocking, setNetworkBlocking] = useState(true)
  const [quickThemeIds, setQuickThemeIds] = useState<string[]>([])

  useEffect(() => {
    Promise.all([
      readThemes(),
      readRules(),
      readNetworkBlocking(),
      readQuickThemeIds()
    ]).then(
      ([storedThemes, storedRules, storedNetworkBlocking, storedQuickIds]) => {
        setThemes(storedThemes)
        setRules(storedRules)
        setNetworkBlocking(storedNetworkBlocking)
        setQuickThemeIds(storedQuickIds)
      }
    )
  }, [])

  const selected = useMemo(
    () => themes.find((theme) => theme.id === selectedId) ?? themes[0],
    [selectedId, themes]
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

  const moveRule = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= rules.length) return
    const next = [...rules]
    ;[next[index], next[target]] = [next[target], next[index]]
    persistRules(next)
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
