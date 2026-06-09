import React from 'react'

const features = [
  {
    icon: 'wallet',
    color: '#00d4aa',
    title: 'Expense Tracking',
    desc: 'Log transactions with categories and dates. Track where your money goes with detailed monthly summaries and spending breakdowns.',
  },
  {
    icon: 'target',
    color: '#8b5cf6',
    title: 'Savings Goals',
    desc: 'Set and track savings targets with visual progress indicators. Watch your goals become reality with real-time tracking.',
  },
  {
    icon: 'chart',
    color: '#06b6d4',
    title: 'Spending Analytics',
    desc: 'Visualize your spending patterns with interactive charts. Understand where your money goes and identify opportunities to save.',
  },
  {
    icon: 'reconcile',
    color: '#f59e0b',
    title: 'Cash Reconciliation',
    desc: 'Auto-calculate daily balances and reconcile your cash. Know exactly how much you should have at any given time.',
  },
  {
    icon: 'lock',
    color: '#ef4444',
    title: 'Private & Offline',
    desc: 'Your financial data stays on your machine. No cloud uploads, no tracking, no subscriptions. Your data, your control.',
  },
  {
    icon: 'download',
    color: '#4a90d9',
    title: 'Cross-Platform',
    desc: 'Native desktop apps for Windows and macOS. Built with Electron for a smooth, responsive experience on any platform.',
  },
]

const ICONS: Record<string, React.ReactNode> = {
  wallet: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" /><path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4z" />
    </svg>
  ),
  target: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
    </svg>
  ),
  chart: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
  reconcile: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  ),
  lock: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
  download: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
}

export function Features() {
  return (
    <section className="features" id="features">
      <div className="container">
        <div className="section-header">
          <h2>Everything You Need</h2>
          <p>Powerful tools to help you track, analyze, and take control of your personal finances.</p>
        </div>
        <div className="features-grid">
          {features.map((f, i) => (
            <div className="feature-card fade-up" key={i}>
              <div className="feature-icon" style={{ background: `${f.color}15`, color: f.color }}>
                {ICONS[f.icon] || f.icon}
              </div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
