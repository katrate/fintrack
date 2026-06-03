import React, { createContext, useContext, useReducer, useCallback, ReactNode } from 'react'
import { FinanceState, FinanceAction, getDaysInMonth } from '../types'

export function createDefaultState(): FinanceState {
  const now = new Date()
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  return {
    selectedMonth: month,
    categories: ['Food', 'Rent', 'Utilities', 'Transport', 'Entertainment'],
    entries: {},
    openingBalance: 0,
    monthlyIncome: 0,
    extraGains: 0,
    cashInHand: 0,
    budgets: {},
    savingsTarget: 0,
    savingsCurrent: 0,
  }
}

function migrateState(state: FinanceState): FinanceState {
  const days = getDaysInMonth(state.selectedMonth)
  const newEntries = { ...state.entries }
  for (let d = 1; d <= days; d++) {
    if (!newEntries[d]) {
      newEntries[d] = {}
    }
    for (const cat of state.categories) {
      if (newEntries[d][cat] === undefined) {
        newEntries[d][cat] = 0
      }
    }
  }
  const existingKeys = Object.keys(newEntries).map(Number).filter(k => k >= 1 && k <= days)
  for (const key of Object.keys(newEntries)) {
    const numKey = Number(key)
    if (numKey < 1 || numKey > days) {
      delete newEntries[key]
    }
  }
  for (const d of existingKeys) {
    for (const cat of Object.keys(newEntries[d])) {
      if (!state.categories.includes(cat)) {
        delete newEntries[d][cat]
      }
    }
  }
  return { ...state, entries: newEntries }
}

function financeReducer(state: FinanceState, action: FinanceAction): FinanceState {
  switch (action.type) {
    case 'SET_MONTH': {
      const newState = { ...state, selectedMonth: action.payload }
      return migrateState(newState)
    }
    case 'ADD_CATEGORY': {
      if (state.categories.includes(action.payload)) return state
      const categories = [...state.categories, action.payload]
      const entries = { ...state.entries }
      const days = getDaysInMonth(state.selectedMonth)
      for (let d = 1; d <= days; d++) {
        if (entries[d]) {
          entries[d] = { ...entries[d], [action.payload]: 0 }
        }
      }
      return { ...state, categories, entries }
    }
    case 'REMOVE_CATEGORY': {
      const categories = state.categories.filter(c => c !== action.payload)
      const newBudgets = { ...state.budgets }
      delete newBudgets[action.payload]
      return { ...state, categories, budgets: newBudgets }
    }
    case 'RENAME_CATEGORY': {
      const { oldName, newName } = action.payload
      if (oldName === newName || state.categories.includes(newName)) return state
      const categories = state.categories.map(c => c === oldName ? newName : c)
      const entries: Record<string, Record<string, number>> = {}
      for (const [date, cats] of Object.entries(state.entries)) {
        entries[date] = {}
        for (const [cat, val] of Object.entries(cats)) {
          entries[date][cat === oldName ? newName : cat] = val
        }
      }
      const budgets = { ...state.budgets }
      if (oldName in budgets) {
        budgets[newName] = budgets[oldName]
        delete budgets[oldName]
      }
      return { ...state, categories, entries, budgets }
    }
    case 'SET_ENTRY': {
      const { date, category, value } = action.payload
      const dayKey = String(date)
      const entries = {
        ...state.entries,
        [dayKey]: {
          ...(state.entries[dayKey] || {}),
          [category]: value,
        },
      }
      return { ...state, entries }
    }
    case 'SET_OPENING_BALANCE':
      return { ...state, openingBalance: action.payload }
    case 'SET_MONTHLY_INCOME':
      return { ...state, monthlyIncome: action.payload }
    case 'SET_EXTRA_GAINS':
      return { ...state, extraGains: action.payload }
    case 'SET_CASH_IN_HAND':
      return { ...state, cashInHand: action.payload }
    case 'SET_BUDGET': {
      const { category, value } = action.payload
      return { ...state, budgets: { ...state.budgets, [category]: value } }
    }
    case 'SET_SAVINGS_TARGET':
      return { ...state, savingsTarget: action.payload }
    case 'SET_SAVINGS_CURRENT':
      return { ...state, savingsCurrent: action.payload }
    case 'LOAD_STATE':
      return action.payload
    default:
      return state
  }
}

interface FinanceContextValue {
  state: FinanceState
  dispatch: React.Dispatch<FinanceAction>
  totalSpent: number
  moneyLeft: number
  categoryTotals: Record<string, number>
  dailyTotals: Record<string, number>
  difference: number
  loadState: (s: FinanceState) => void
}

const FinanceContext = createContext<FinanceContextValue | null>(null)

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(financeReducer, null, () => createDefaultState())

  const days = getDaysInMonth(state.selectedMonth)

  const categoryTotals: Record<string, number> = {}
  for (const cat of state.categories) {
    let total = 0
    for (let d = 1; d <= days; d++) {
      total += state.entries[String(d)]?.[cat] || 0
    }
    categoryTotals[cat] = total
  }

  const dailyTotals: Record<string, number> = {}
  let totalSpent = 0
  for (let d = 1; d <= days; d++) {
    const dayKey = String(d)
    const dayData = state.entries[dayKey] || {}
    const dayTotal = Object.values(dayData).reduce((s, v) => s + v, 0)
    dailyTotals[dayKey] = dayTotal
    totalSpent += dayTotal
  }

  const moneyLeft = state.openingBalance + state.monthlyIncome + state.extraGains - totalSpent
  const difference = moneyLeft - state.cashInHand

  const loadState = useCallback((s: FinanceState) => {
    dispatch({ type: 'LOAD_STATE', payload: s })
  }, [])

  return (
    <FinanceContext.Provider value={{
      state, dispatch, totalSpent, moneyLeft,
      categoryTotals, dailyTotals, difference, loadState
    }}>
      {children}
    </FinanceContext.Provider>
  )
}

export function useFinance(): FinanceContextValue {
  const ctx = useContext(FinanceContext)
  if (!ctx) throw new Error('useFinance must be used within FinanceProvider')
  return ctx
}
