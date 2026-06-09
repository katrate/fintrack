import React, { useRef, useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react'
import { FinanceProvider, useFinance, createDefaultState } from './context/FinanceContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { supabase } from './supabase'
import { getDaysInMonth, getMonthLabel, formatCurrency, FinanceState, FinanceAction } from './types'

/* ── Math Expression Evaluator ── */

function evaluateMathExpression(expr: string): number | null {
  const s = expr.replace(/\s/g, '')
  if (!s) return null
  // Only allow digits, operators, parentheses, and decimal points
  if (!/^[\d+\-*/().]+$/.test(s)) return null
  try {
    const result = Function(`"use strict"; return (${s})`)()
    if (typeof result !== 'number' || !isFinite(result)) return null
    return result
  } catch {
    return null
  }
}

/* ── Cell Selection Context (for Formula Bar) ── */

interface CellSelectionContextType {
  activeCellKey: string | null
  activeCellExpression: string
  isEditing: boolean
  setActiveCell: (key: string, expression: string) => void
  setExpression: (expr: string) => void
  setEditing: (editing: boolean) => void
  clearCellSelection: () => void
}

const CellSelectionContext = createContext<CellSelectionContextType>({
  activeCellKey: null,
  activeCellExpression: '',
  isEditing: false,
  setActiveCell: () => {},
  setExpression: () => {},
  setEditing: () => {},
  clearCellSelection: () => {},
})

function CellSelectionProvider({ children }: { children: ReactNode }) {
  const [activeCellKey, setActiveCellKey] = useState<string | null>(null)
  const [activeCellExpression, setActiveCellExpression] = useState('')
  const [isEditing, setIsEditing] = useState(false)

  const setActiveCell = useCallback((key: string, expression: string) => {
    setActiveCellKey(key)
    setActiveCellExpression(expression)
  }, [])

  const setExpression = useCallback((expr: string) => {
    setActiveCellExpression(expr)
  }, [])

  const setEditing = useCallback((editing: boolean) => {
    setIsEditing(editing)
  }, [])

  const clearCellSelection = useCallback(() => {
    setActiveCellKey(null)
    setActiveCellExpression('')
    setIsEditing(false)
  }, [])

  return (
    <CellSelectionContext.Provider value={{
      activeCellKey, activeCellExpression, isEditing,
      setActiveCell, setExpression, setEditing, clearCellSelection
    }}>
      {children}
    </CellSelectionContext.Provider>
  )
}

function useCellSelection() {
  return useContext(CellSelectionContext)
}

/* ── Theme ── */

type ThemeMode = 'dark' | 'light'
type AccentColor = 'green' | 'blue' | 'purple' | 'orange'

const ACCENT_MAP: Record<AccentColor, { primary: string; hover?: string }> = {
  green: { primary: '#00d4aa' },
  blue: { primary: '#4a90d9' },
  purple: { primary: '#8b5cf6' },
  orange: { primary: '#f59e0b' },
}

interface AppSettings {
  theme: ThemeMode
  accent: AccentColor
}

const DEFAULT_SETTINGS: AppSettings = { theme: 'dark', accent: 'green' }

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem('fintrack-settings')
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch {}
  return DEFAULT_SETTINGS
}

function saveSettings(s: AppSettings) {
  localStorage.setItem('fintrack-settings', JSON.stringify(s))
}

function applyTheme(s: AppSettings) {
  document.documentElement.setAttribute('data-theme', s.theme)
  document.documentElement.setAttribute('data-accent', s.accent)
}

/* ── Update Gate ── */

type UpdateStatus = 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'

function UpdateGate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<UpdateStatus>('checking')
  const [updateInfo, setUpdateInfo] = useState<any>(null)
  const [progress, setProgress] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')
  const skippedRef = useRef(false)
  const isElectron = typeof window.electronAPI?.platform === 'string'

  useEffect(() => {
    if (!isElectron) {
      setStatus('not-available')
      return
    }

    let cancelled = false

    const unsub1 = window.electronAPI!.onUpdateChecking(() => {
      if (!cancelled) setStatus('checking')
    })

    const unsub2 = window.electronAPI!.onUpdateAvailable((info: any) => {
      if (!cancelled && !skippedRef.current) {
        setUpdateInfo(info)
        setStatus('available')
      }
    })

    const unsub3 = window.electronAPI!.onUpdateNotAvailable(() => {
      if (!cancelled) setStatus('not-available')
    })

    const unsub4 = window.electronAPI!.onUpdateDownloadProgress((p: any) => {
      if (!cancelled) {
        setProgress(p.percent || 0)
        setStatus('downloading')
      }
    })

    const unsub5 = window.electronAPI!.onUpdateDownloaded((info: any) => {
      if (!cancelled) {
        setUpdateInfo(info)
        setStatus('downloaded')
      }
    })

    const unsub6 = window.electronAPI!.onUpdateError((err: string) => {
      if (!cancelled) {
        setErrorMsg(err)
        setStatus('error')
      }
    })

    // Trigger check after listeners are registered
    window.electronAPI!.checkForUpdates()

    return () => {
      cancelled = true
      unsub1?.()
      unsub2?.()
      unsub3?.()
      unsub4?.()
      unsub5?.()
      unsub6?.()
    }
  }, [isElectron])

  const handleDownload = async () => {
    if (window.electronAPI?.downloadUpdate) {
      await window.electronAPI.downloadUpdate()
    }
  }

  const handleInstall = async () => {
    if (window.electronAPI?.installUpdate) {
      await window.electronAPI.installUpdate()
    }
  }

  const handleSkip = () => {
    skippedRef.current = true
    setStatus('not-available')
  }

  if (status === 'not-available' || (!isElectron && status === 'checking')) {
    return <>{children}</>
  }

  return (
    <div className="update-gate">
      <div className="ug-card">
        <img src="/logo.png" alt="FinTrack" className="ug-logo" />
        <h1>FinTrack</h1>

        {status === 'checking' && (
          <>
            <p className="ug-status">Checking for updates...</p>
            <div className="auth-loading-spinner" />
          </>
        )}

        {status === 'available' && (
          <>
            <p className="ug-status">Update Available</p>
            <p className="ug-version">v{updateInfo?.version || '?'}</p>
            <button className="ug-btn ug-btn-primary" onClick={handleDownload}>
              Download Update
            </button>
            <button className="ug-btn ug-btn-ghost" onClick={handleSkip}>
              Continue without updating
            </button>
          </>
        )}

        {status === 'downloading' && (
          <>
            <p className="ug-status">Downloading update...</p>
            <div className="ug-progress-track">
              <div className="ug-progress-fill" style={{ width: `${Math.min(progress, 100)}%` }} />
            </div>
            <p className="ug-percent">{Math.round(progress)}%</p>
          </>
        )}

        {status === 'downloaded' && (
          <>
            <p className="ug-status">Update Downloaded</p>
            <p className="ug-version">Restart to install v{updateInfo?.version || '?'}</p>
            <button className="ug-btn ug-btn-primary" onClick={handleInstall}>
              Restart & Install
            </button>
            <button className="ug-btn ug-btn-ghost" onClick={handleSkip}>
              Later
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <p className="ug-status ug-status-error">Update check failed</p>
            <p className="ug-version" style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{errorMsg}</p>
            <button className="ug-btn ug-btn-primary" onClick={handleSkip}>
              Continue
            </button>
          </>
        )}
      </div>
    </div>
  )
}


function TitleBar() {
  const isElectron = typeof window.electronAPI?.platform === 'string'
  const [maximized, setMaximized] = useState(false)

  const handleMinimize = () => window.electronAPI?.minimize?.()
  const handleMaximize = () => {
    if (window.electronAPI?.maximize) {
      window.electronAPI.maximize()
    }
    setMaximized(!maximized)
  }
  const handleClose = () => window.electronAPI?.close?.()

  return (
    <div className="titlebar">
      <div className="titlebar-drag">
        <div className="titlebar-logo">
          <img src="/logo.png" alt="FinTrack" className="titlebar-logo-img" />
          <span>FinTrack</span>
        </div>
      </div>
      {isElectron && (
        <div className="titlebar-actions">
          <button className="tb-btn" onClick={handleMinimize}>
            <svg width="12" height="12" viewBox="0 0 12 12"><rect y="5" width="12" height="2" fill="#a0aec0" /></svg>
          </button>
          <button className="tb-btn" onClick={handleMaximize}>
            <svg width="12" height="12" viewBox="0 0 12 12"><rect x="1" y="1" width="10" height="10" stroke="#a0aec0" strokeWidth="1.5" fill="none" /></svg>
          </button>
          <button className="tb-btn tb-close" onClick={handleClose}>
            <svg width="12" height="12" viewBox="0 0 12 12">
              <line x1="1" y1="1" x2="11" y2="11" stroke="#a0aec0" strokeWidth="1.5" />
              <line x1="11" y1="1" x2="1" y2="11" stroke="#a0aec0" strokeWidth="1.5" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}

function getMonthTotalSpent(entries: Record<string, Record<string, number>>): number {
  let total = 0
  for (const dayData of Object.values(entries)) {
    total += Object.values(dayData).reduce((s, v) => s + v, 0)
  }
  return total
}

function MonthSidebarList() {
  const { state, dispatch } = useFinance()
  const [newMonth, setNewMonth] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const addInputRef = useRef<HTMLInputElement>(null)

  const monthKeys = Object.keys(state.months).sort()

  const handleAddMonth = () => {
    const trimmed = newMonth.trim()
    if (!trimmed) return
    // Validate YYYY-MM format
    if (!/^\d{4}-\d{2}$/.test(trimmed)) return
    dispatch({ type: 'ADD_MONTH', payload: trimmed })
    setNewMonth('')
    setShowAdd(false)
  }

  useEffect(() => {
    if (showAdd && addInputRef.current) {
      addInputRef.current.focus()
    }
  }, [showAdd])

  return (
    <div className="month-sidebar">
      <div className="ms-header">
        <span className="ms-title">Months</span>
        <button
          className="ms-add-btn"
          onClick={() => setShowAdd(true)}
          title="Add month"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      {showAdd && (
        <div className="ms-add-row">
          <input
            ref={addInputRef}
            type="text"
            className="ms-input"
            placeholder="YYYY-MM"
            value={newMonth}
            onChange={e => setNewMonth(e.target.value)}
            onBlur={handleAddMonth}
            onKeyDown={e => {
              if (e.key === 'Enter') handleAddMonth()
              if (e.key === 'Escape') { setShowAdd(false); setNewMonth('') }
            }}
          />
        </div>
      )}

      <div className="ms-list">
        {monthKeys.map(m => {
          const isActive = m === state.selectedMonth
          const [y, monthNum] = m.split('-')
          const label = `${new Date(Number(y), Number(monthNum) - 1).toLocaleString('default', { month: 'short' })} ${y}`
          return (
            <div
              key={m}
              className={`ms-item ${isActive ? 'ms-item-active' : ''}`}
            >
              <button className="ms-item-main" onClick={() => !isActive && dispatch({ type: 'SET_MONTH', payload: m })}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <span className="ms-label">{label}</span>
                <span className="ms-spent">
                  {formatCurrency(getMonthTotalSpent(state.months[m]?.entries || {}))}
                </span>
                {isActive && <span className="ms-dot" />}
              </button>
              <button
                className="ms-del-btn"
                onClick={() => dispatch({ type: 'DELETE_MONTH', payload: m })}
                title="Delete month"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SummaryCards() {
  const { state, dispatch, totalSpent, moneyLeft, currentData } = useFinance()

  const cards = [
    { label: 'Opening Balance', value: currentData.openingBalance, icon: 'wallet', color: '#4a90d9' },
    { label: 'Extra Gains', value: currentData.extraGainsTotal, icon: 'gift', color: '#f59e0b' },
    { label: 'Total Spent', value: totalSpent, icon: 'spent', color: '#ef4444' },
  ]

  return (
    <div className="summary-grid">
      {cards.map(card => (
        <div key={card.label} className="summary-card" style={{ '--accent': card.color } as React.CSSProperties}>
          <div className="sc-icon">
            {card.icon === 'wallet' && (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" /><path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
                <path d="M18 12a2 2 0 0 0 0 4h4v-4z" />
              </svg>
            )}
            {card.icon === 'income' && (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            )}
            {card.icon === 'gift' && (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 12 20 22 4 22 4 12" /><rect x="2" y="7" width="20" height="5" />
                <line x1="12" y1="22" x2="12" y2="7" /><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
                <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
              </svg>
            )}
            {card.icon === 'spent' && (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 1a11 11 0 1 0 0 22 11 11 0 0 0 0-22z" /><line x1="12" y1="6" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            )}
            {card.icon === 'left' && (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            )}
          </div>
          <div className="sc-label">{card.label}</div>
          <div className="sc-value" style={{ color: card.color }}>
            {card.label === 'Extra Gains' ? (
              <ExtraGainsEditor
                total={currentData.extraGainsTotal}
                log={currentData.extraGainsLog}
                dispatch={dispatch}
              />
            ) : (
              <EditableNumber
                value={card.value}
                onChange={v => {
                  if (card.label === 'Opening Balance') dispatch({ type: 'SET_OPENING_BALANCE', payload: v })
                }}
                readonly={card.label === 'Total Spent' || card.label === 'Money Left'}
              />
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function EditableNumber({ value, onChange, readonly = false }: {
  value: number; onChange: (v: number) => void; readonly?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleStart = () => {
    if (readonly) return
    setText(value === 0 ? '' : String(value))
    setEditing(true)
  }

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  const handleFinish = () => {
    setEditing(false)
    // Try math expression first
    let parsed: number | null = evaluateMathExpression(text)
    if (parsed === null) {
      parsed = parseFloat(text)
    }
    if (parsed !== null && !isNaN(parsed) && parsed !== value) {
      onChange(parsed)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { inputRef.current?.blur() }
    if (e.key === 'Escape') { setEditing(false); setText('') }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        className="editable-input"
        value={text}
        onChange={e => setText(e.target.value)}
        onBlur={handleFinish}
        onKeyDown={handleKeyDown}
        inputMode="decimal"
        autoComplete="off"
        spellCheck={false}
      />
    )
  }

  return (
    <span className={`editable-value ${readonly ? 'readonly' : ''}`} onClick={handleStart}>
      {formatCurrency(value)}
    </span>
  )
}

function EditableCell({ value, onChange, cellKey }: {
  value: number; onChange: (v: number) => void; cellKey: string
}) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const { setActiveCell, setExpression, setEditing: setCellEditing } = useCellSelection()

  // Store the raw expression if entered as a math expression
  const expressionRef = useRef('')

  const handleStart = () => {
    const displayText = value === 0 ? '' : String(value)
    // Restore raw expression if it was previously entered — show that in the input
    const saved = expressionRef.current || displayText
    setText(saved)
    setEditing(true)
    setActiveCell(cellKey, saved)
    setCellEditing(true)
    setExpression(saved)
  }

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  const handleFinish = () => {
    setEditing(false)
    setCellEditing(false)
    
    if (text === '') {
      if (value !== 0) onChange(0)
      expressionRef.current = ''
      // Update context to show cleared value
      setActiveCell(cellKey, '0')
      return
    }

    // Try to evaluate as math expression first
    let parsed: number | null = evaluateMathExpression(text)
    
    // If that fails, try as a plain number
    if (parsed === null) {
      parsed = parseFloat(text)
    }
    
    if (parsed !== null && !isNaN(parsed) && parsed !== value) {
      // If the text was a math expression, store it
      if (/[+\-*/]/.test(text)) {
        expressionRef.current = text
      } else {
        expressionRef.current = ''
      }
      onChange(parsed)
    }

    // After editing, update context to show the expression or formatted result
    const displayText = expressionRef.current || (parsed !== null && !isNaN(parsed) ? formatCurrency(parsed) : '')
    setActiveCell(cellKey, displayText)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setText(val)
    setExpression(val)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') inputRef.current?.blur()
    if (e.key === 'Escape') { setEditing(false); setText(''); setCellEditing(false) }
    if (e.key === 'Tab') { inputRef.current?.blur() }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        className="cell-input cell-input-expr"
        value={text}
        onChange={handleChange}
        onBlur={handleFinish}
        onKeyDown={handleKeyDown}
        inputMode="decimal"
        autoComplete="off"
        spellCheck={false}
      />
    )
  }

  return (
    <span className={`cell-value ${value !== 0 ? 'has-value' : ''}`}
      onClick={handleStart}>
      {value !== 0 ? formatCurrency(value) : '—'}
    </span>
  )
}

function ExtraGainsEditor({ total, log, dispatch }: {
  total: number
  log: number[]
  dispatch: React.Dispatch<FinanceAction>
}) {
  const [adding, setAdding] = useState(false)
  const [text, setText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleStart = () => {
    setText('')
    setAdding(true)
  }

  useEffect(() => {
    if (adding && inputRef.current) {
      inputRef.current.focus()
    }
  }, [adding])

  const handleAdd = () => {
    // Try math expression first
    let parsed: number | null = evaluateMathExpression(text)
    if (parsed === null) {
      parsed = parseFloat(text)
    }
    if (parsed !== null && !isNaN(parsed) && parsed > 0) {
      dispatch({ type: 'ADD_EXTRA_GAIN', payload: parsed })
    }
    setAdding(false)
    setText('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAdd()
    if (e.key === 'Escape') { setAdding(false); setText('') }
  }

  return (
    <div className="extra-gains-editor" onClick={!adding ? handleStart : undefined}>
      {adding ? (
        <input
          ref={inputRef}
          type="text"
          className="editable-input eg-input"
          value={text}
          placeholder="Add amount..."
          onChange={e => setText(e.target.value)}
          onBlur={handleAdd}
          onKeyDown={handleKeyDown}
          inputMode="decimal"
          autoComplete="off"
          spellCheck={false}
        />
      ) : (
        <span className="editable-value">{formatCurrency(total)}</span>
      )}
    </div>
  )
}

/* ── Formula Bar ── */

function FormulaBar() {
  const { activeCellKey, activeCellExpression, isEditing } = useCellSelection()

  if (!activeCellKey) {
    return (
      <div className="formula-bar formula-bar-idle">
        <span className="fb-prefix">fx</span>
        <span className="fb-placeholder">Select a cell to view or edit its content</span>
      </div>
    )
  }

  const idx = activeCellKey.indexOf('-')
  const dayNum = activeCellKey.slice(0, idx)
  const catName = activeCellKey.slice(idx + 1)
  const cellRef = `Day ${dayNum} — ${catName}`

  return (
    <div className={`formula-bar ${isEditing ? 'formula-bar-active' : ''}`}>
      <span className="fb-prefix">fx</span>
      <span className="fb-cell-ref" title={cellRef}>{cellRef}</span>
      <span className="fb-expression">{activeCellExpression || '—'}</span>
    </div>
  )
}


function CategoriesManager({ onToast }: { onToast: (msg: string, type: 'success' | 'error') => void }) {
  const { state, dispatch, currentData } = useFinance()
  const [newCat, setNewCat] = useState('')
  const [editingCat, setEditingCat] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleAdd = () => {
    const trimmed = newCat.trim()
    if (!trimmed) return
    if (state.categories.includes(trimmed)) {
      onToast(`"${trimmed}" already exists`, 'error')
      return
    }
    dispatch({ type: 'ADD_CATEGORY', payload: trimmed })
    setNewCat('')
    inputRef.current?.focus()
    onToast(`"${trimmed}" added`, 'success')
  }

  const handleRemove = (cat: string) => {
    if (state.categories.length <= 1) {
      onToast('Need at least one category', 'error')
      return
    }
    dispatch({ type: 'REMOVE_CATEGORY', payload: cat })
    onToast(`"${cat}" removed`, 'success')
  }

  const handleRename = (oldName: string) => {
    const trimmed = editText.trim()
    if (!trimmed || trimmed === oldName) {
      setEditingCat(null)
      return
    }
    if (state.categories.includes(trimmed)) {
      onToast(`"${trimmed}" already exists`, 'error')
      return
    }
    dispatch({ type: 'RENAME_CATEGORY', payload: { oldName, newName: trimmed } })
    setEditingCat(null)
    onToast(`Renamed to "${trimmed}"`, 'success')
  }

  return (
    <div className="categories-manager">
      <div className="cm-header">
        <h3>Categories</h3>
        <div className="cm-add">
          <input
            ref={inputRef}
            type="text"
            className="cm-input"
            placeholder="New category..."
            value={newCat}
            onChange={e => setNewCat(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          <button className="cm-btn" onClick={handleAdd} disabled={!newCat.trim()}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>
      </div>
      <div className="cm-list">
        {state.categories.map(cat => {
          const hasSep = currentData.columnSeparators.includes(cat)
          const hasHl = currentData.highlightedColumns.includes(cat)
          return (
            <div key={cat} className={`cm-item ${hasSep ? 'cm-item-sep' : ''} ${hasHl ? 'cm-item-hl' : ''}`}>
              {editingCat === cat ? (
                <input
                  type="text"
                  className="cm-edit-input"
                  value={editText}
                  onChange={e => setEditText(e.target.value)}
                  onBlur={() => handleRename(cat)}
                  onKeyDown={e => { if (e.key === 'Enter') handleRename(cat); if (e.key === 'Escape') setEditingCat(null) }}
                  autoFocus
                />
              ) : (
                <span className="cm-name" onDoubleClick={() => { setEditingCat(cat); setEditText(cat) }}>{cat}</span>
              )}
              <div className="cm-actions">
                <button
                  className={`cm-marker ${hasSep ? 'cm-marker-on' : ''}`}
                  onClick={() => dispatch({ type: 'TOGGLE_COLUMN_SEPARATOR', payload: cat })}
                  title={hasSep ? 'Remove separator after this column' : 'Add separator after this column'}
                >
                  <svg width="10" height="14" viewBox="0 0 4 14">
                    <line x1="2" y1="1" x2="2" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
                <button
                  className={`cm-marker ${hasHl ? 'cm-marker-hl' : ''}`}
                  onClick={() => dispatch({ type: 'TOGGLE_COLUMN_HIGHLIGHT', payload: cat })}
                  title={hasHl ? 'Remove highlight from this column' : 'Highlight this column'}
                >
                  <svg width="10" height="14" viewBox="0 0 12 14">
                    <rect x="1" y="1" width="10" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
                  </svg>
                </button>
                <button className="cm-remove" onClick={() => handleRemove(cat)} title="Remove category">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function FinanceTable() {
  const { state, dispatch, categoryTotals, dailyTotals, totalSpent, currentData } = useFinance()
  const days = getDaysInMonth(state.selectedMonth)
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const tableRef = useRef<HTMLDivElement>(null)
  const { clearCellSelection } = useCellSelection()

  // Deselect cell when clicking outside the table
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const isCell = target.closest('.td-cell, .cell-input, .th-cat, .td-total, .cell-value')
      if (!isCell && tableRef.current) {
        clearCellSelection()
      }
    }
    document.addEventListener('click', handleDocumentClick)
    return () => document.removeEventListener('click', handleDocumentClick)
  }, [clearCellSelection])

  const getDayName = (d: number) => {
    const [y, m] = state.selectedMonth.split('-').map(Number)
    return weekDays[new Date(y, m - 1, d).getDay()]
  }

  const handleCellChange = (date: number, category: string, value: number) => {
    dispatch({ type: 'SET_ENTRY', payload: { date, category, value } })
  }

  const isWeekend = (d: number) => {
    const [y, m] = state.selectedMonth.split('-').map(Number)
    const day = new Date(y, m - 1, d).getDay()
    return day === 0 || day === 6
  }

  return (
    <div className="table-container" ref={tableRef}>
      <div className="table-wrapper">
        <table className="finance-table">
          <thead>
            <tr>
              <th className="th-date">Date</th>
              <th className="th-day">Day</th>
              {state.categories.map(cat => {
                const classes = ['th-cat']
                if (currentData.columnSeparators.includes(cat)) classes.push('th-cat-sep')
                if (currentData.highlightedColumns.includes(cat)) classes.push('th-cat-hl')
                return <th key={cat} className={classes.join(' ')}>{cat}</th>
              })}
              <th className="th-total">Daily Total</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: days }, (_, i) => i + 1).map(d => {
              const dayKey = String(d)
              const dayData = currentData.entries[dayKey] || {}
              const weekend = isWeekend(d)
              const today = new Date()
              const [y, m] = state.selectedMonth.split('-').map(Number)
              const isToday = y === today.getFullYear() && m === today.getMonth() + 1 && d === today.getDate()

              return (
                <tr key={d} className={`${weekend ? 'row-weekend' : ''} ${isToday ? 'row-today' : ''}`}>
                  <td className="td-date">{String(d).padStart(2, '0')}</td>
                  <td className="td-day">{getDayName(d)}</td>
                  {state.categories.map(cat => {
                    const tdClasses = ['td-cell']
                    if (currentData.columnSeparators.includes(cat)) tdClasses.push('td-cell-sep')
                    if (currentData.highlightedColumns.includes(cat)) tdClasses.push('td-cell-hl')
                    return (
                      <td key={cat} className={tdClasses.join(' ')}>
                        <EditableCell
                          cellKey={`${d}-${cat}`}
                          value={dayData[cat] || 0}
                          onChange={v => handleCellChange(d, cat, v)}
                        />
                      </td>
                    )
                  })}
                  <td className="td-total">{formatCurrency(dailyTotals[dayKey] || 0)}</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="row-total">
              <td className="td-date td-total-label" colSpan={2}>Total</td>
              {state.categories.map(cat => {
                const total = categoryTotals[cat] || 0
                const budget = currentData.budgets[cat]
                const overBudget = budget && total > budget
                const tdClasses = ['td-cell']
                if (currentData.columnSeparators.includes(cat)) tdClasses.push('td-cell-sep')
                if (currentData.highlightedColumns.includes(cat)) tdClasses.push('td-cell-hl')
                if (overBudget) tdClasses.push('cell-over-budget')
                return (
                  <td key={cat} className={tdClasses.join(' ')}>
                    {formatCurrency(total)}
                  </td>
                )
              })}
              <td className="td-total">{formatCurrency(totalSpent)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}



function SavingsGoal() {
  const { state, dispatch, currentData } = useFinance()
  const target = currentData.savingsTarget
  const current = currentData.savingsCurrent
  const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0

  return (
    <div className="savings-section">
      <h3>Savings Goal</h3>
      <div className="savings-content">
        <div className="savings-inputs">
          <div className="savings-field">
            <label>Target</label>
            <input
              type="number"
              step="0.01"
              className="savings-input"
              value={target || ''}
              onChange={e => dispatch({ type: 'SET_SAVINGS_TARGET', payload: parseFloat(e.target.value) || 0 })}
              placeholder="$0"
            />
          </div>
          <div className="savings-field">
            <label>Saved</label>
            <input
              type="number"
              step="0.01"
              className="savings-input"
              value={current || ''}
              onChange={e => dispatch({ type: 'SET_SAVINGS_CURRENT', payload: parseFloat(e.target.value) || 0 })}
              placeholder="$0"
            />
          </div>
        </div>
        {target > 0 && (
          <div className="savings-progress">
            <div className="sp-header">
              <span>{formatCurrency(current)}</span>
              <span>{pct.toFixed(0)}%</span>
            </div>
            <div className="sp-bar-track">
              <div className="sp-bar-fill" style={{ width: `${pct}%` }} />
            </div>
            <div className="sp-remaining">
              {current >= target ? 'Goal reached!' : `${formatCurrency(target - current)} remaining`}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function AuthModal({ onClose }: { onClose: () => void }) {
  const { signUp, signIn } = useAuth()
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setBusy(true)
    if (isSignUp) {
      const { error } = await signUp(email, password)
      if (error) setError(error.message)
      else {
        setSuccess('Check your email to confirm your account!')
        setIsSignUp(false)
      }
    } else {
      const { error } = await signIn(email, password)
      if (error) setError(error.message)
      else onClose()
    }
    setBusy(false)
  }

  return (
    <div className="auth-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={e => e.stopPropagation()}>
        <button className="auth-close" onClick={onClose}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        <h2>{isSignUp ? 'Create Account' : 'Sign In'}</h2>
        <p className="auth-sub">Save your data to the cloud</p>
        <form onSubmit={handleSubmit}>
          <input
            className="auth-input"
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <input
            className="auth-input"
            type="password"
            placeholder="Password (min 6 chars)"
            value={password}
            onChange={e => setPassword(e.target.value)}
            minLength={6}
            required
          />
          {error && <div className="auth-error">{error}</div>}
          {success && <div className="auth-success">{success}</div>}
          <button className="auth-submit" type="submit" disabled={busy}>
            {busy ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In'}
          </button>
        </form>
        <p className="auth-switch">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button className="auth-link" onClick={() => { setIsSignUp(!isSignUp); setError(''); setSuccess('') }}>
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </p>
      </div>
    </div>
  )
}

/* ── Settings Modal ── */

function SettingsModal({ onClose }: { onClose: () => void }) {
  const [settings, setSettings] = useState<AppSettings>(loadSettings)

  const update = (partial: Partial<AppSettings>) => {
    const next = { ...settings, ...partial }
    setSettings(next)
    saveSettings(next)
    applyTheme(next)
  }

  const themes: { value: ThemeMode; label: string; icon: string }[] = [
    { value: 'dark', label: 'Dark', icon: '🌙' },
    { value: 'light', label: 'Light', icon: '☀️' },
  ]

  const accents: { value: AccentColor; label: string }[] = [
    { value: 'green', label: 'Green' },
    { value: 'blue', label: 'Blue' },
    { value: 'purple', label: 'Purple' },
    { value: 'orange', label: 'Orange' },
  ]

  return (
    <div className="auth-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={e => e.stopPropagation()}>
        <button className="auth-close" onClick={onClose}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        <h2>Appearance</h2>
        <p className="auth-sub">Customize your experience</p>

        <div className="st-section">
          <label className="st-label">Theme</label>
          <div className="st-row">
            {themes.map(t => (
              <button
                key={t.value}
                className={`st-chip ${settings.theme === t.value ? 'st-chip-active' : ''}`}
                onClick={() => update({ theme: t.value })}
              >
                <span>{t.icon}</span> {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="st-section">
          <label className="st-label">Accent Color</label>
          <div className="st-row">
            {accents.map(a => (
              <button
                key={a.value}
                className={`st-chip ${settings.accent === a.value ? 'st-chip-active' : ''}`}
                onClick={() => update({ accent: a.value })}
                style={{
                  '--chip-color': ACCENT_MAP[a.value].primary,
                  borderColor: settings.accent === a.value ? ACCENT_MAP[a.value].primary : undefined,
                } as React.CSSProperties}
              >
                <span className="st-dot" style={{ background: ACCENT_MAP[a.value].primary }} />
                {a.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function UserSection({ onToast }: { onToast: (msg: string, type: 'success' | 'error') => void }) {
  const { user, signOut } = useAuth()
  const [showAuth, setShowAuth] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  if (!user) {
    return (
      <>
        <div className="user-section">
          <button className="user-btn" onClick={() => setShowAuth(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            Sign In
          </button>
        </div>
        {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      </>
    )
  }

  return (
    <>
      <div className="user-section">
        <div className="user-info">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <span className="user-email" title={user.email || ''}>
            {user.email?.split('@')[0] || 'User'}
          </span>
        </div>
        <div className="user-actions">
          <button className="user-btn-icon" onClick={() => setShowSettings(true)} title="Settings">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
          <button className="user-btn user-logout" onClick={() => {
            signOut()
            onToast('Signed out', 'success')
          }}>
            Sign Out
          </button>
        </div>
      </div>
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </>
  )
}

function CashReconciliation() {
  const { state, dispatch, moneyLeft, difference, currentData } = useFinance()
  const [cashText, setCashText] = useState('')
  const [focusing, setFocusing] = useState(false)
  const cashInputRef = useRef<HTMLInputElement>(null)

  const handleCashStart = () => {
    setCashText(currentData.cashInHand === 0 ? '' : String(currentData.cashInHand))
    setFocusing(true)
  }

  useEffect(() => {
    if (focusing && cashInputRef.current) {
      cashInputRef.current.focus()
      cashInputRef.current.select()
      setFocusing(false)
    }
  }, [focusing])

  const handleCashFinish = () => {
    // Try math expression first
    let parsed: number | null = evaluateMathExpression(cashText)
    if (parsed === null) {
      parsed = parseFloat(cashText)
    }
    const val = (parsed !== null && !isNaN(parsed)) ? parsed : 0
    if (val !== currentData.cashInHand) {
      dispatch({ type: 'SET_CASH_IN_HAND', payload: val })
    }
  }

  const handleCashKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') cashInputRef.current?.blur()
    if (e.key === 'Escape') { setCashText(''); cashInputRef.current?.blur() }
  }

  return (
    <div className="reconciliation-section">
      <h3>Cash Reconciliation</h3>
      <div className="rec-content">
        <div className="rec-field">
          <label>Money Left (Calculated)</label>
          <div className="rec-value">{formatCurrency(moneyLeft)}</div>
        </div>
        <div className="rec-field">
          <label>Cash in Hand (Actual)</label>
          {focusing || cashInputRef.current === document.activeElement ? (
            <input
              ref={cashInputRef}
              type="text"
              className="rec-input"
              value={cashText}
              onChange={e => setCashText(e.target.value)}
              onBlur={handleCashFinish}
              onKeyDown={handleCashKeyDown}
              inputMode="decimal"
              autoComplete="off"
              spellCheck={false}
            />
          ) : (
            <span className="rec-value rec-clickable" onClick={handleCashStart}>
              {formatCurrency(currentData.cashInHand)}
            </span>
          )}
        </div>
        <div className={`rec-diff ${Math.abs(difference) > 0.01 ? (difference > 0 ? 'diff-positive' : 'diff-negative') : 'diff-zero'}`}>
          <label>Difference</label>
          <div className="rec-value">
            {formatCurrency(difference)}
            {Math.abs(difference) > 0.01 && (
              <span className="rec-hint">
                {difference > 0
                  ? ' (Unrecorded expenses may exist)'
                  : ' (Possible extra income or recording error)'}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

let toastId = 0

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 2500)
    return () => clearTimeout(t)
  }, [onClose])
  return (
    <div className={`toast toast-${type}`} onClick={onClose}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        {type === 'success'
          ? <polyline points="20 6 9 17 4 12" />
          : <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>
        }
      </svg>
      {message}
    </div>
  )
}



function MainHeader() {
  const { state } = useFinance()
  return (
    <div className="main-header">
      <h2>{getMonthLabel(state.selectedMonth)}</h2>
    </div>
  )
}

function AppLayout({ onToast }: { onToast: (msg: string, type: 'success' | 'error') => void }) {
  return (
    <CellSelectionProvider>
      <div className="app">
        <aside className="sidebar">
          <div className="sidebar-header">
            <img src="/logo.png" alt="FinTrack" className="sidebar-logo" />
            <div>
              <span className="sidebar-title">FinTrack</span>
              <span className="sidebar-sub">Finance Tracker</span>
            </div>
          </div>
          <MonthSidebarList />
          <SavingsGoal />
          <UserSection onToast={onToast} />
        </aside>
        <main className="main-content">
          <MainHeader />
          <SummaryCards />
          <CashReconciliation />
          <FormulaBar />
          <CategoriesManager onToast={onToast} />
          <FinanceTable />
        </main>
      </div>
    </CellSelectionProvider>
  )
}

function CloudSync({ children, addToast }: { children: ReactNode; addToast: (msg: string, type: 'success' | 'error') => void }) {
  const { user } = useAuth()
  const { state, dispatch } = useFinance()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!user) { setReady(true); return }
    let cancelled = false
    const loadProgress = async () => {
      const { data, error } = await supabase
        .from('user_progress')
        .select('data')
        .eq('user_id', user.id)
        .single()
      if (cancelled) return
      if (!error && data?.data) {
        dispatch({ type: 'LOAD_STATE', payload: data.data as FinanceState })
      } else {
        dispatch({ type: 'LOAD_STATE', payload: createDefaultState() })
      }
      if (!cancelled) setReady(true)
    }
    loadProgress()
    return () => { cancelled = true }
  }, [user?.id])

  useEffect(() => {
    if (!user || !ready) return
    const saveProgress = async () => {
      await supabase
        .from('user_progress')
        .upsert(
          { user_id: user.id, data: JSON.parse(JSON.stringify(state)), updated_at: new Date().toISOString() },
          { onConflict: 'user_id' }
        )
    }
    saveProgress()
  }, [state, user?.id, ready])

  if (!ready) {
    return (
      <div className="cloud-loading">
        <div className="auth-loading-spinner" />
        <span>Loading your data...</span>
      </div>
    )
  }

  return <>{children}</>
}

function AuthGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const [showAuth, setShowAuth] = useState(false)

  useEffect(() => {
    if (!loading && !user) setShowAuth(true)
    if (!loading && user) setShowAuth(false)
  }, [user, loading])

  if (loading) {
    return (
      <div className="auth-loading">
        <div className="auth-loading-spinner" />
      </div>
    )
  }

  if (!user) {
    return (
      <>
        <TitleBar />
        <div className="auth-landing">
          <div className="auth-landing-content">
            <img src="/logo.png" alt="FinTrack" className="auth-landing-logo" />
            <h1>FinTrack</h1>
            <p className="auth-landing-sub">Professional Finance Tracker</p>
            {showAuth ? (
              <AuthModal onClose={() => setShowAuth(false)} />
            ) : (
              <button className="auth-landing-btn" onClick={() => setShowAuth(true)}>
                Sign In / Sign Up
              </button>
            )}
          </div>
        </div>
      </>
    )
  }

  return <>{children}</>
}

export default function App() {
  const [toasts, setToasts] = useState<{ id: number; message: string; type: 'success' | 'error' }[]>([])

  // Apply saved theme on mount
  useEffect(() => {
    const s = loadSettings()
    applyTheme(s)
  }, [])

  const addToast = useCallback((message: string, type: 'success' | 'error') => {
    const id = ++toastId
    setToasts(prev => [...prev, { id, message, type }])
  }, [])

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <AuthProvider>
      <UpdateGate>
        <AuthGate>
          <TitleBar />
          <FinanceProvider>
            <CloudSync addToast={addToast}>
              <AppLayout onToast={addToast} />
            </CloudSync>
          </FinanceProvider>
        </AuthGate>
      </UpdateGate>
      <div className="toast-container">
        {toasts.map(t => (
          <Toast key={t.id} message={t.message} type={t.type} onClose={() => removeToast(t.id)} />
        ))}
      </div>
    </AuthProvider>
  )
}
