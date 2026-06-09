export interface MonthData {
  entries: Record<string, Record<string, number>>
  openingBalance: number
  extraGainsTotal: number
  extraGainsLog: number[]
  cashInHand: number
  budgets: Record<string, number>
  savingsTarget: number
  savingsCurrent: number
  columnSeparators: string[]
  highlightedColumns: string[]
}

export interface FinanceState {
  selectedMonth: string
  categories: string[]
  months: Record<string, MonthData>
}

export function createEmptyMonth(): MonthData {
  return {
    entries: {},
    openingBalance: 0,
    extraGainsTotal: 0,
    extraGainsLog: [],
    cashInHand: 0,
    budgets: {},
    savingsTarget: 0,
    savingsCurrent: 0,
    columnSeparators: [],
    highlightedColumns: [],
  }
}

export type FinanceAction =
  | { type: 'SET_MONTH'; payload: string }
  | { type: 'ADD_MONTH'; payload: string }
  | { type: 'DELETE_MONTH'; payload: string }
  | { type: 'ADD_CATEGORY'; payload: string }
  | { type: 'REMOVE_CATEGORY'; payload: string }
  | { type: 'RENAME_CATEGORY'; payload: { oldName: string; newName: string } }
  | { type: 'SET_ENTRY'; payload: { date: number; category: string; value: number } }
  | { type: 'SET_OPENING_BALANCE'; payload: number }
  | { type: 'ADD_EXTRA_GAIN'; payload: number }
  | { type: 'UNDO_EXTRA_GAIN' }
  | { type: 'SET_CASH_IN_HAND'; payload: number }
  | { type: 'SET_BUDGET'; payload: { category: string; value: number } }
  | { type: 'SET_SAVINGS_TARGET'; payload: number }
  | { type: 'SET_SAVINGS_CURRENT'; payload: number }
  | { type: 'TOGGLE_COLUMN_SEPARATOR'; payload: string }
  | { type: 'TOGGLE_COLUMN_HIGHLIGHT'; payload: string }
  | { type: 'LOAD_STATE'; payload: FinanceState }

export function getDaysInMonth(month: string): number {
  const [y, m] = month.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

export function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

export function getMonthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number)
  return new Date(y, m - 1).toLocaleString('default', { month: 'long', year: 'numeric' })
}
