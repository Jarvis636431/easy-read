import { useEffect, useState } from "react"

import "./popup.css"

import {
  defaultQuickThemeIds,
  defaultSettings,
  findMatchingRule,
  readActiveThemeId,
  readExtensionEnabled,
  readQuickThemeIds,
  readRules,
  readSettings,
  readThemes,
  writeActiveThemeId,
  writeExtensionEnabled,
  writeSettings,
  type EasyReadSettings,
  type ReadingTheme
} from "~lib/settings"

function IndexPopup() {
  const [settings, setSettings] = useState<EasyReadSettings>(defaultSettings)
  const [themes, setThemes] = useState<ReadingTheme[]>([])
  const [quickThemeIds, setQuickThemeIds] = useState<string[]>([])
  const [activeThemeId, setActiveThemeId] = useState("native")
  const [extensionEnabled, setExtensionEnabled] = useState(false)
  const [site, setSite] = useState<{
    hostname: string
    supported: boolean
    ruleName?: string
    theme?: ReadingTheme
  } | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    Promise.all([
      readSettings(),
      readRules(),
      readThemes(),
      readQuickThemeIds(),
      readActiveThemeId(),
      readExtensionEnabled(),
      chrome.tabs.query({ active: true, currentWindow: true })
    ]).then(
      ([
        value,
        rules,
        storedThemes,
        storedQuickIds,
        activeId,
        enabled,
        tabs
      ]) => {
        setSettings(value)
        setThemes(storedThemes)
        setQuickThemeIds(storedQuickIds)
        setActiveThemeId(activeId)
        setExtensionEnabled(enabled)

        const url = tabs[0]?.url
        if (!url || !/^https?:\/\//i.test(url)) {
          setSite({ hostname: "浏览器内部页面", supported: false })
        } else {
          const hostname = new URL(url).hostname
          const rule = findMatchingRule(url, rules)
          setSite({
            hostname,
            supported: true,
            ruleName: rule?.name,
            theme: rule
              ? storedThemes.find((theme) => theme.id === rule.themeId)
              : undefined
          })
        }
        setReady(true)
      }
    )
  }, [])

  const update = (patch: Partial<EasyReadSettings>) => {
    const next = { ...settings, ...patch }
    setSettings(next)
    void writeSettings(next)
  }

  const selectTheme = (theme: ReadingTheme) => {
    const next = { ...theme.settings }
    setSettings(next)
    setActiveThemeId(theme.id)
    void Promise.all([writeSettings(next), writeActiveThemeId(theme.id)])
  }

  const quickThemes = quickThemeIds
    .map(
      (id, index) =>
        themes.find((theme) => theme.id === id) ??
        themes.find((theme) => theme.id === defaultQuickThemeIds[index]) ??
        themes[0]
    )
    .filter((theme): theme is ReadingTheme => Boolean(theme))

  return (
    <main className="panel" aria-busy={!ready}>
      <header className="masthead">
        <div>
          <p className="eyebrow">EASY READ</p>
          <h1>阅读校准器</h1>
        </div>
        <label className="power">
          <input
            type="checkbox"
            checked={extensionEnabled}
            onChange={(event) => {
              const enabled = event.target.checked
              setExtensionEnabled(enabled)
              void writeExtensionEnabled(enabled)
            }}
          />
          <span aria-hidden="true" />
          <b>{extensionEnabled ? "已启用" : "已关闭"}</b>
        </label>
      </header>

      <section className="site-card" aria-label="当前网站状态">
        <div className="site-mark" aria-hidden="true">
          {site?.supported ? "◎" : "—"}
        </div>
        <div className="site-copy">
          <span>当前网站</span>
          <strong title={site?.hostname}>
            {site?.hostname ?? "正在识别…"}
          </strong>
          <small>
            {!site
              ? "正在检查 URL 规则"
              : !site.supported
                ? "此页面不允许扩展修改"
                : site.ruleName
                  ? `命中规则：${site.ruleName}`
                  : "未命中规则，使用全局设置"}
          </small>
        </div>
        <div className={site?.ruleName ? "site-source matched" : "site-source"}>
          {site?.theme && (
            <i
              style={{
                background: `linear-gradient(135deg, ${site.theme.settings.pageColor} 50%, ${site.theme.settings.contentColor} 50%)`
              }}
            />
          )}
          <span>
            {site?.theme?.name ?? (site?.supported ? "全局" : "不可用")}
          </span>
        </div>
      </section>

      <section className="section">
        <div className="section-title">
          <h2>快捷主题</h2>
          <span>可在设置页更换</span>
        </div>
        <div className="modes">
          {quickThemes.map((theme, index) => (
            <button
              className={activeThemeId === theme.id ? "mode active" : "mode"}
              key={`${index}-${theme.id}`}
              onClick={() => selectTheme(theme)}>
              <i
                style={{
                  background: `linear-gradient(135deg, ${theme.settings.pageColor} 50%, ${theme.settings.contentColor} 50%)`
                }}
              />
              <strong title={theme.name}>{theme.name}</strong>
              <small>{theme.builtin ? "内置" : "自定义"}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="section controls">
        <div className="section-title">
          <h2>排版</h2>
          <span>应用到正文区域</span>
        </div>
        <Range
          label="字号"
          value={settings.fontSize}
          min={14}
          max={24}
          suffix="px"
          onChange={(fontSize) => update({ fontSize })}
        />
        <Range
          label="行高"
          value={settings.lineHeight}
          min={1.4}
          max={2.2}
          step={0.05}
          onChange={(lineHeight) => update({ lineHeight })}
        />
        <Range
          label="宽度"
          value={settings.contentWidth}
          min={600}
          max={1200}
          step={20}
          suffix="px"
          onChange={(contentWidth) => update({ contentWidth })}
        />
      </section>

      <section className="section cleanup">
        <div className="section-title">
          <h2>页面净化</h2>
          <span>基于常见网页结构</span>
        </div>
        <Toggle
          label="隐藏广告"
          note="移除常见广告和赞助区域"
          checked={settings.hideAds}
          onChange={(hideAds) => update({ hideAds })}
        />
        <Toggle
          label="隐藏侧栏"
          note="收起辅助栏与推荐区域"
          checked={settings.hideSidebars}
          onChange={(hideSidebars) => update({ hideSidebars })}
        />
      </section>

      <footer>
        <span>设置自动保存并应用到所有普通网页</span>
        <button onClick={() => void chrome.runtime.openOptionsPage()}>
          URL 规则 →
        </button>
      </footer>
    </main>
  )
}

function Range({
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
  const progress = ((value - min) / (max - min)) * 100
  return (
    <label className="range-row">
      <span>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        style={{ "--progress": `${progress}%` } as React.CSSProperties}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <output>
        {value}
        {suffix}
      </output>
    </label>
  )
}

function Toggle({
  label,
  note,
  checked,
  onChange
}: {
  label: string
  note: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="toggle-row">
      <span>
        <strong>{label}</strong>
        <small>{note}</small>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <i aria-hidden="true" />
    </label>
  )
}

export default IndexPopup
