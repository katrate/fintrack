import React, { useRef, useState, useEffect, useCallback, ReactNode } from 'react'
import { FinanceProvider, useFinance, createDefaultState } from './context/FinanceContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { supabase } from './supabase'
import { getDaysInMonth, getMonthLabel, formatCurrency, FinanceState } from './types'

function generateMonthOptions(): string[] {
  const options: string[] = []
  const now = new Date()
  for (let i = -12; i <= 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    options.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return options
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
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00d4aa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
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

function MonthSelector() {
  const { state, dispatch } = useFinance()
  const months = generateMonthOptions()

  return (
    <div className="month-selector">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
      <select
        value={state.selectedMonth}
        onChange={e => dispatch({ type: 'SET_MONTH', payload: e.target.value })}
        className="month-select"
      >
        {months.map(m => (
          <option key={m} value={m}>{getMonthLabel(m)}</option>
        ))}
      </select>
    </div>
  )
}

function SummaryCards() {
  const { state, dispatch, totalSpent, moneyLeft } = useFinance()

  const cards = [
    { label: 'Opening Balance', value: state.openingBalance, icon: 'wallet', color: '#4a90d9' },
    { label: 'Monthly Income', value: state.monthlyIncome, icon: 'income', color: '#00d4aa' },
    { label: 'Extra Gains', value: state.extraGains, icon: 'gift', color: '#f59e0b' },
    { label: 'Total Spent', value: totalSpent, icon: 'spent', color: '#ef4444' },
    { label: 'Money Left', value: moneyLeft, icon: 'left', color: moneyLeft >= 0 ? '#00d4aa' : '#ef4444' },
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
            <EditableNumber
              value={card.value}
              onChange={v => {
                if (card.label === 'Opening Balance') dispatch({ type: 'SET_OPENING_BALANCE', payload: v })
                if (card.label === 'Monthly Income') dispatch({ type: 'SET_MONTHLY_INCOME', payload: v })
                if (card.label === 'Extra Gains') dispatch({ type: 'SET_EXTRA_GAINS', payload: v })
              }}
              readonly={card.label === 'Total Spent' || card.label === 'Money Left'}
            />
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
    const parsed = parseFloat(text)
    if (!isNaN(parsed) && parsed !== value) {
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
        type="number"
        step="0.01"
        className="editable-input"
        value={text}
        onChange={e => setText(e.target.value)}
        onBlur={handleFinish}
        onKeyDown={handleKeyDown}
      />
    )
  }

  return (
    <span className={`editable-value ${readonly ? 'readonly' : ''}`} onClick={handleStart}>
      {formatCurrency(value)}
    </span>
  )
}

function EditableCell({ value, onChange }: {
  value: number; onChange: (v: number) => void
}) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleStart = () => {
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
    const parsed = parseFloat(text)
    if (!isNaN(parsed) && parsed !== value) {
      onChange(parsed)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') inputRef.current?.blur()
    if (e.key === 'Escape') { setEditing(false); setText('') }
    if (e.key === 'Tab') { inputRef.current?.blur() }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        step="0.01"
        className="cell-input"
        value={text}
        onChange={e => setText(e.target.value)}
        onBlur={handleFinish}
        onKeyDown={handleKeyDown}
      />
    )
  }

  return (
    <span className={`cell-value ${value !== 0 ? 'has-value' : ''}`} onClick={handleStart}>
      {value !== 0 ? formatCurrency(value) : '—'}
    </span>
  )
}

function CategoriesManager({ onToast }: { onToast: (msg: string, type: 'success' | 'error') => void }) {
  const { state, dispatch } = useFinance()
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
        {state.categories.map(cat => (
          <div key={cat} className="cm-item">
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
            <button className="cm-remove" onClick={() => handleRemove(cat)} title="Remove category">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function FinanceTable() {
  const { state, dispatch, categoryTotals, dailyTotals, totalSpent } = useFinance()
  const days = getDaysInMonth(state.selectedMonth)
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

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
    <div className="table-container">
      <div className="table-wrapper">
        <table className="finance-table">
          <thead>
            <tr>
              <th className="th-date">Date</th>
              <th className="th-day">Day</th>
              {state.categories.map(cat => (
                <th key={cat} className="th-cat">{cat}</th>
              ))}
              <th className="th-total">Daily Total</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: days }, (_, i) => i + 1).map(d => {
              const dayKey = String(d)
              const dayData = state.entries[dayKey] || {}
              const weekend = isWeekend(d)
              const today = new Date()
              const [y, m] = state.selectedMonth.split('-').map(Number)
              const isToday = y === today.getFullYear() && m === today.getMonth() + 1 && d === today.getDate()

              return (
                <tr key={d} className={`${weekend ? 'row-weekend' : ''} ${isToday ? 'row-today' : ''}`}>
                  <td className="td-date">{String(d).padStart(2, '0')}</td>
                  <td className="td-day">{getDayName(d)}</td>
                  {state.categories.map(cat => (
                    <td key={cat} className="td-cell">
                      <EditableCell
                        value={dayData[cat] || 0}
                        onChange={v => handleCellChange(d, cat, v)}
                      />
                    </td>
                  ))}
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
                const budget = state.budgets[cat]
                const overBudget = budget && total > budget
                return (
                  <td key={cat} className={`td-cell ${overBudget ? 'cell-over-budget' : ''}`}>
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

function BudgetManager() {
  const { state, dispatch, categoryTotals } = useFinance()

  return (
    <div className="budget-section">
      <h3>Category Budgets</h3>
      <div className="budget-grid">
        {state.categories.map(cat => {
          const spent = categoryTotals[cat] || 0
          const budget = state.budgets[cat] || 0
          const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0
          const overBudget = budget > 0 && spent > budget

          return (
            <div key={cat} className={`budget-item ${overBudget ? 'over-budget' : ''}`}>
              <div className="bi-header">
                <span className="bi-name">{cat}</span>
                <span className="bi-spent">{formatCurrency(spent)}</span>
                <span className="bi-sep">/</span>
                <input
                  type="number"
                  step="0.01"
                  className="bi-input"
                  value={budget || ''}
                  onChange={e => dispatch({
                    type: 'SET_BUDGET',
                    payload: { category: cat, value: parseFloat(e.target.value) || 0 }
                  })}
                  placeholder="Budget"
                />
              </div>
              {budget > 0 && (
                <div className="bi-bar-track">
                  <div
                    className={`bi-bar-fill ${overBudget ? 'bar-over' : pct > 80 ? 'bar-warn' : ''}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              )}
              {overBudget && <div className="bi-alert">Over budget by {formatCurrency(spent - budget)}</div>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SavingsGoal() {
  const { state, dispatch } = useFinance()
  const target = state.savingsTarget
  const current = state.savingsCurrent
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

function UserSection({ onToast }: { onToast: (msg: string, type: 'success' | 'error') => void }) {
  const { user, signOut } = useAuth()
  const [showAuth, setShowAuth] = useState(false)

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
      <button className="user-btn user-logout" onClick={() => {
        signOut()
        onToast('Signed out', 'success')
      }}>
        Sign Out
      </button>
    </div>
  )
}

function CashReconciliation() {
  const { state, dispatch, moneyLeft, difference } = useFinance()

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
          <input
            type="number"
            step="0.01"
            className="rec-input"
            value={state.cashInHand || ''}
            onChange={e => dispatch({ type: 'SET_CASH_IN_HAND', payload: parseFloat(e.target.value) || 0 })}
            placeholder="$0"
          />
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

function DataControls() {
  const { state, loadState } = useFinance()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `fintrack-${state.selectedMonth}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string)
        loadState(data)
      } catch { alert('Invalid file') }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleReset = () => {
    if (confirm('Reset all data for this session?')) {
      window.location.reload()
    }
  }

  return (
    <div className="data-controls">
      <button className="dc-btn dc-export" onClick={handleExport}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        Export
      </button>
      <button className="dc-btn dc-import" onClick={() => fileInputRef.current?.click()}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        Import
      </button>
      <input ref={fileInputRef} type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
      <button className="dc-btn dc-reset" onClick={handleReset}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
        </svg>
        Reset
      </button>
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
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-header">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#00d4aa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
          <div>
            <span className="sidebar-title">FinTrack</span>
            <span className="sidebar-sub">Finance Tracker</span>
          </div>
        </div>
        <MonthSelector />
        <SavingsGoal />
        <BudgetManager />
        <UserSection onToast={onToast} />
        <DataControls />
      </aside>
      <main className="main-content">
        <MainHeader />
        <SummaryCards />
        <CategoriesManager onToast={onToast} />
        <FinanceTable />
        <CashReconciliation />
      </main>
    </div>
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
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#00d4aa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
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

  const addToast = useCallback((message: string, type: 'success' | 'error') => {
    const id = ++toastId
    setToasts(prev => [...prev, { id, message, type }])
  }, [])

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <AuthProvider>
      <AuthGate>
        <TitleBar />
        <FinanceProvider>
          <CloudSync addToast={addToast}>
            <AppLayout onToast={addToast} />
          </CloudSync>
        </FinanceProvider>
      </AuthGate>
      <div className="toast-container">
        {toasts.map(t => (
          <Toast key={t.id} message={t.message} type={t.type} onClose={() => removeToast(t.id)} />
        ))}
      </div>
    </AuthProvider>
  )
}
