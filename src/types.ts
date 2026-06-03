export interface FinanceState {
  selectedMonth: string
  categories: string[]
  entries: Record<string, Record<string, number>>
  openingBalance: number
  monthlyIncome: number
  extraGains: number
  cashInHand: number
  budgets: Record<string, number>
  savingsTarget: number
  savingsCurrent: number
}

export type FinanceAction =
  | { type: 'SET_MONTH'; payload: string }
  | { type: 'ADD_CATEGORY'; payload: string }
  | { type: 'REMOVE_CATEGORY'; payload: string }
  | { type: 'RENAME_CATEGORY'; payload: { oldName: string; newName: string } }
  | { type: 'SET_ENTRY'; payload: { date: number; category: string; value: number } }
  | { type: 'SET_OPENING_BALANCE'; payload: number }
  | { type: 'SET_MONTHLY_INCOME'; payload: number }
  | { type: 'SET_EXTRA_GAINS'; payload: number }
  | { type: 'SET_CASH_IN_HAND'; payload: number }
  | { type: 'SET_BUDGET'; payload: { category: string; value: number } }
  | { type: 'SET_SAVINGS_TARGET'; payload: number }
  | { type: 'SET_SAVINGS_CURRENT'; payload: number }
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
