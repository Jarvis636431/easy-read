import { useEffect, useState } from "react"

import "./options.css"

import {
  presets,
  readRules,
  writeRules,
  type ReadingMode,
  type UrlRule
} from "~lib/settings"

const modeNames: Record<ReadingMode, string> = {
  native: "原生",
  comfortable: "舒适",
  night: "夜间",
  immersive: "沉浸"
}

function createRule(): UrlRule {
  return {
    id: crypto.randomUUID(),
    name: "新网站规则",
    pattern: "*.example.com/*",
    enabled: true,
    settings: { ...presets.comfortable }
  }
}

function OptionsPage() {
  const [rules, setRules] = useState<UrlRule[]>([])
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    readRules().then(setRules)
  }, [])

  const persist = (next: UrlRule[]) => {
    setRules(next)
    setSaved(false)
    void writeRules(next).then(() => {
      setSaved(true)
      window.setTimeout(() => setSaved(false), 1400)
    })
  }

  const update = (id: string, patch: Partial<UrlRule>) => {
    persist(
      rules.map((rule) => (rule.id === id ? { ...rule, ...patch } : rule))
    )
  }

  const updateSettings = (id: string, patch: Partial<UrlRule["settings"]>) => {
    persist(
      rules.map((rule) =>
        rule.id === id
          ? { ...rule, settings: { ...rule.settings, ...patch } }
          : rule
      )
    )
  }

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= rules.length) return
    const next = [...rules]
    ;[next[index], next[target]] = [next[target], next[index]]
    persist(next)
  }

  return (
    <main className="options-shell">
      <header className="options-header">
        <div>
          <p className="options-eyebrow">EASY READ / URL RULES</p>
          <h1>网站阅读规则</h1>
          <p className="intro">
            让不同网站使用不同的阅读方式。规则从上到下匹配，第一条命中的规则生效。
          </p>
        </div>
        <button
          className="add-rule"
          onClick={() => persist([...rules, createRule()])}>
          <span>＋</span> 添加规则
        </button>
      </header>

      <aside className="syntax-note">
        <strong>匹配示例</strong>
        <code>*.zhihu.com/*</code>
        <code>https://news.example.com/article/*</code>
        <span>星号代表任意内容，也可以填写完整 URL。</span>
      </aside>

      <section className="rules" aria-live="polite">
        {rules.length === 0 ? (
          <div className="empty">
            <span>∅</span>
            <h2>还没有网站规则</h2>
            <p>添加第一条规则，为常读的网站指定阅读模式。</p>
            <button onClick={() => persist([createRule()])}>
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
                      update(rule.id, { name: event.target.value })
                    }
                  />
                  <div className="rule-actions">
                    <button
                      disabled={index === 0}
                      onClick={() => move(index, -1)}
                      aria-label="上移">
                      ↑
                    </button>
                    <button
                      disabled={index === rules.length - 1}
                      onClick={() => move(index, 1)}
                      aria-label="下移">
                      ↓
                    </button>
                    <label className="rule-switch">
                      <input
                        type="checkbox"
                        checked={rule.enabled}
                        onChange={(event) =>
                          update(rule.id, { enabled: event.target.checked })
                        }
                      />
                      <i />
                      <span>{rule.enabled ? "启用" : "停用"}</span>
                    </label>
                  </div>
                </div>

                <label className="pattern-field">
                  <span>URL 匹配</span>
                  <input
                    value={rule.pattern}
                    placeholder="*.example.com/*"
                    onChange={(event) =>
                      update(rule.id, { pattern: event.target.value })
                    }
                  />
                </label>

                <div className="rule-grid">
                  <label>
                    <span>阅读模式</span>
                    <select
                      value={rule.settings.mode}
                      onChange={(event) =>
                        update(rule.id, {
                          settings: {
                            ...presets[event.target.value as ReadingMode]
                          }
                        })
                      }>
                      {(Object.keys(modeNames) as ReadingMode[]).map((mode) => (
                        <option key={mode} value={mode}>
                          {modeNames[mode]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <NumberField
                    label="字号"
                    value={rule.settings.fontSize}
                    min={14}
                    max={24}
                    suffix="px"
                    onChange={(fontSize) =>
                      updateSettings(rule.id, { fontSize, enabled: true })
                    }
                  />
                  <NumberField
                    label="行高"
                    value={rule.settings.lineHeight}
                    min={1.4}
                    max={2.2}
                    step={0.05}
                    onChange={(lineHeight) =>
                      updateSettings(rule.id, { lineHeight, enabled: true })
                    }
                  />
                  <NumberField
                    label="正文宽度"
                    value={rule.settings.contentWidth}
                    min={600}
                    max={1200}
                    step={20}
                    suffix="px"
                    onChange={(contentWidth) =>
                      updateSettings(rule.id, { contentWidth, enabled: true })
                    }
                  />
                </div>

                <div className="rule-footer">
                  <label>
                    <input
                      type="checkbox"
                      checked={rule.settings.hideAds}
                      onChange={(event) =>
                        updateSettings(rule.id, {
                          hideAds: event.target.checked
                        })
                      }
                    />{" "}
                    隐藏广告
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={rule.settings.hideSidebars}
                      onChange={(event) =>
                        updateSettings(rule.id, {
                          hideSidebars: event.target.checked
                        })
                      }
                    />{" "}
                    隐藏侧栏
                  </label>
                  <button
                    className="delete"
                    onClick={() =>
                      persist(rules.filter((item) => item.id !== rule.id))
                    }>
                    删除规则
                  </button>
                </div>
              </div>
            </article>
          ))
        )}
      </section>

      <div className={saved ? "save-status visible" : "save-status"}>
        已保存，打开的网页将自动更新
      </div>
    </main>
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

export default OptionsPage
