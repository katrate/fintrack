import React, { createContext, useContext, useReducer, useCallback, ReactNode } from 'react'
import { FinanceState, FinanceAction, MonthData, getDaysInMonth, createEmptyMonth } from '../types'

export function createDefaultState(): FinanceState {
  const now = new Date()
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  return {
    selectedMonth: month,
    categories: ['Food', 'Rent', 'Utilities', 'Transport', 'Entertainment'],
    months: { [month]: createEmptyMonth() },
  }
}

function getCurrentMonthData(state: FinanceState): MonthData {
  return state.months[state.selectedMonth] || createEmptyMonth()
}

function setCurrentMonthData(state: FinanceState, data: Partial<MonthData>): FinanceState {
  return {
    ...state,
    months: {
      ...state.months,
      [state.selectedMonth]: { ...getCurrentMonthData(state), ...data },
    },
  }
}

function migrateMonthEntries(
  entries: Record<string, Record<string, number>>,
  categories: string[],
  month: string
): Record<string, Record<string, number>> {
  const days = getDaysInMonth(month)
  const newEntries = { ...entries }
  for (let d = 1; d <= days; d++) {
    if (!newEntries[d]) {
      newEntries[d] = {}
    }
    for (const cat of categories) {
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
      if (!categories.includes(cat)) {
        delete newEntries[d][cat]
      }
    }
  }
  return newEntries
}

function migrateState(state: any): FinanceState {
  // Old format: flat fields (entries, openingBalance, etc.) → convert to months map
  if (!state.months && 'entries' in state) {
    const old = state as any
    let extraGainsTotal = old.extraGainsTotal || 0
    let extraGainsLog: number[] = old.extraGainsLog || []

    // Migrate old monthlyIncome / extraGains
    if ('monthlyIncome' in old || 'extraGains' in old) {
      extraGainsTotal = (extraGainsTotal || 0) + (old.extraGains || 0) + (old.monthlyIncome || 0)
      extraGainsLog = extraGainsTotal > 0 ? [extraGainsTotal] : []
    }

    const month = old.selectedMonth || createDefaultState().selectedMonth
    const monthData: MonthData = {
      entries: migrateMonthEntries(old.entries || {}, old.categories || [], month),
      openingBalance: old.openingBalance || 0,
      extraGainsTotal,
      extraGainsLog,
      cashInHand: old.cashInHand || 0,
      budgets: old.budgets || {},
      savingsTarget: old.savingsTarget || 0,
      savingsCurrent: old.savingsCurrent || 0,
      columnSeparators: old.columnSeparators || [],
      highlightedColumns: old.highlightedColumns || [],
    }

    return {
      selectedMonth: month,
      categories: old.categories || ['Food', 'Rent', 'Utilities', 'Transport', 'Entertainment'],
      months: { [month]: monthData },
    }
  }

  // New format: just ensure current month exists and entries are migrated
  const months = { ...state.months }
  const currentMonth = state.selectedMonth
  // Spread createEmptyMonth() first to fill any missing fields (e.g. after adding new features)
  months[currentMonth] = {
    ...createEmptyMonth(),
    ...(months[currentMonth] || {}),
    entries: migrateMonthEntries((months[currentMonth]?.entries || {}), state.categories, currentMonth),
  }

  return { ...state, months }
}

function financeReducer(state: FinanceState, action: FinanceAction): FinanceState {
  switch (action.type) {
    case 'SET_MONTH': {
      const targetMonth = action.payload
      if (targetMonth === state.selectedMonth) return state

      // Save current month data
      const currentData = getCurrentMonthData(state)
      let months = { ...state.months, [state.selectedMonth]: currentData }

      // Load or create target month
      if (!months[targetMonth]) {
        months[targetMonth] = createEmptyMonth()
      }

      // Migrate entries for target month
      months[targetMonth] = {
        ...months[targetMonth],
        entries: migrateMonthEntries(months[targetMonth].entries || {}, state.categories, targetMonth),
      }

      return { ...state, selectedMonth: targetMonth, months }
    }
    case 'ADD_MONTH': {
      const newMonth = action.payload
      if (state.months[newMonth]) return state // already exists

      const monthData = createEmptyMonth()
      monthData.entries = migrateMonthEntries({}, state.categories, newMonth)

      // Save current month and switch
      const currentData = getCurrentMonthData(state)
      return {
        ...state,
        selectedMonth: newMonth,
        months: {
          ...state.months,
          [state.selectedMonth]: currentData,
          [newMonth]: monthData,
        },
      }
    }
    case 'DELETE_MONTH': {
      const deleteMonth = action.payload
      if (deleteMonth === state.selectedMonth) return state // can't delete active month
      if (!state.months[deleteMonth]) return state
      const { [deleteMonth]: _, ...remaining } = state.months
      return { ...state, months: remaining }
    }
    case 'ADD_CATEGORY': {
      if (state.categories.includes(action.payload)) return state
      const categories = [...state.categories, action.payload]

      // Add category to all months' entries
      const months: Record<string, MonthData> = {}
      for (const [m, data] of Object.entries(state.months)) {
        const entries = { ...data.entries }
        const days = getDaysInMonth(m)
        for (let d = 1; d <= days; d++) {
          if (entries[d]) {
            entries[d] = { ...entries[d], [action.payload]: 0 }
          }
        }
        months[m] = { ...data, entries }
      }

      return { ...state, categories, months }
    }
    case 'REMOVE_CATEGORY': {
      const categories = state.categories.filter(c => c !== action.payload)
      const months: Record<string, MonthData> = {}
      for (const [m, data] of Object.entries(state.months)) {
        const budgets = { ...data.budgets }
        delete budgets[action.payload]
        months[m] = { ...data, budgets }
      }
      return { ...state, categories, months }
    }
    case 'RENAME_CATEGORY': {
      const { oldName, newName } = action.payload
      if (oldName === newName || state.categories.includes(newName)) return state
      const categories = state.categories.map(c => c === oldName ? newName : c)

      // Rename in all months
      const months: Record<string, MonthData> = {}
      for (const [m, data] of Object.entries(state.months)) {
        const entries: Record<string, Record<string, number>> = {}
        for (const [date, cats] of Object.entries(data.entries)) {
          entries[date] = {}
          for (const [cat, val] of Object.entries(cats)) {
            entries[date][cat === oldName ? newName : cat] = val
          }
        }
        const budgets = { ...data.budgets }
        if (oldName in budgets) {
          budgets[newName] = budgets[oldName]
          delete budgets[oldName]
        }
        months[m] = { ...data, entries, budgets }
      }

      return { ...state, categories, months }
    }
    case 'SET_ENTRY': {
      const { date, category, value } = action.payload
      const data = getCurrentMonthData(state)
      const dayKey = String(date)
      const entries = {
        ...data.entries,
        [dayKey]: {
          ...(data.entries[dayKey] || {}),
          [category]: value,
        },
      }
      return setCurrentMonthData(state, { entries })
    }
    case 'SET_OPENING_BALANCE':
      return setCurrentMonthData(state, { openingBalance: action.payload })
    case 'ADD_EXTRA_GAIN': {
      const amount = action.payload
      if (amount <= 0) return state
      const data = getCurrentMonthData(state)
      return setCurrentMonthData(state, {
        extraGainsTotal: data.extraGainsTotal + amount,
        extraGainsLog: [...data.extraGainsLog, amount],
      })
    }
    case 'UNDO_EXTRA_GAIN': {
      const data = getCurrentMonthData(state)
      if (data.extraGainsLog.length === 0) return state
      const log = [...data.extraGainsLog]
      const last = log.pop()!
      return setCurrentMonthData(state, {
        extraGainsTotal: data.extraGainsTotal - last,
        extraGainsLog: log,
      })
    }
    case 'SET_CASH_IN_HAND':
      return setCurrentMonthData(state, { cashInHand: action.payload })
    case 'SET_BUDGET': {
      const { category, value } = action.payload
      const data = getCurrentMonthData(state)
      return setCurrentMonthData(state, {
        budgets: { ...data.budgets, [category]: value },
      })
    }
    case 'SET_SAVINGS_TARGET':
      return setCurrentMonthData(state, { savingsTarget: action.payload })
    case 'SET_SAVINGS_CURRENT':
      return setCurrentMonthData(state, { savingsCurrent: action.payload })
    case 'TOGGLE_COLUMN_SEPARATOR': {
      const cat = action.payload
      const data = getCurrentMonthData(state)
      const list = data.columnSeparators.includes(cat)
        ? data.columnSeparators.filter(c => c !== cat)
        : [...data.columnSeparators, cat]
      return setCurrentMonthData(state, { columnSeparators: list })
    }
    case 'TOGGLE_COLUMN_HIGHLIGHT': {
      const cat = action.payload
      const data = getCurrentMonthData(state)
      const list = data.highlightedColumns.includes(cat)
        ? data.highlightedColumns.filter(c => c !== cat)
        : [...data.highlightedColumns, cat]
      return setCurrentMonthData(state, { highlightedColumns: list })
    }
    case 'LOAD_STATE':
      return migrateState(action.payload)
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
  currentData: MonthData
}

const FinanceContext = createContext<FinanceContextValue | null>(null)

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(financeReducer, null, () => createDefaultState())

  const currentData = getCurrentMonthData(state)
  const days = getDaysInMonth(state.selectedMonth)

  const categoryTotals: Record<string, number> = {}
  for (const cat of state.categories) {
    let total = 0
    for (let d = 1; d <= days; d++) {
      total += currentData.entries[String(d)]?.[cat] || 0
    }
    categoryTotals[cat] = total
  }

  const dailyTotals: Record<string, number> = {}
  let totalSpent = 0
  for (let d = 1; d <= days; d++) {
    const dayKey = String(d)
    const dayData = currentData.entries[dayKey] || {}
    const dayTotal = Object.values(dayData).reduce((s, v) => s + v, 0)
    dailyTotals[dayKey] = dayTotal
    totalSpent += dayTotal
  }

  const moneyLeft = currentData.openingBalance + currentData.extraGainsTotal - totalSpent
  const difference = moneyLeft - currentData.cashInHand

  const loadState = useCallback((s: FinanceState) => {
    dispatch({ type: 'LOAD_STATE', payload: s })
  }, [])

  return (
    <FinanceContext.Provider value={{
      state, dispatch, totalSpent, moneyLeft,
      categoryTotals, dailyTotals, difference, loadState,
      currentData
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
