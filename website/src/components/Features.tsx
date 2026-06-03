const features = [
  {
    icon: '💰',
    color: '#00f5a0',
    title: 'Income & Expense Tracking',
    desc: 'Log every transaction with categories, dates, and notes. See where your money goes at a glance.',
  },
  {
    icon: '📊',
    color: '#00d9f5',
    title: 'Beautiful Charts & Insights',
    desc: 'Visualize your spending patterns with interactive charts. Monthly trends, category breakdowns, and more.',
  },
  {
    icon: '🎯',
    color: '#7c3aed',
    title: 'Savings Goals',
    desc: 'Set and track savings targets. Watch your progress grow with visual indicators and milestones.',
  },
  {
    icon: '🏷️',
    color: '#f59e0b',
    title: 'Smart Categories',
    desc: 'Organize expenses with customizable categories. Add, rename, and color-code to match your lifestyle.',
  },
  {
    icon: '🔒',
    color: '#ef4444',
    title: 'Private & Secure',
    desc: 'Your financial data stays on your machine. No cloud uploads, no tracking, no subscriptions.',
  },
  {
    icon: '📱',
    color: '#06b6d4',
    title: 'Desktop Native',
    desc: 'Built with Electron for a smooth native experience. Works offline, starts fast, feels great.',
  },
]

export function Features() {
  return (
    <section className="features" id="features">
      <div className="container">
        <div className="section-header">
          <h2>Everything You Need</h2>
          <p>Track, analyze, and optimize your personal finances with a clean, focused interface.</p>
        </div>
        <div className="features-grid">
          {features.map((f, i) => (
            <div className="feature-card" key={i}>
              <div className="feature-icon" style={{ background: `${f.color}20`, color: f.color }}>
                {f.icon}
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
