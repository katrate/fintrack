export function Downloads() {
  const RELEASES_URL = 'https://github.com/katrate/fintrack/releases/latest'

  return (
    <section className="downloads" id="downloads">
      <div className="container">
        <div className="section-header">
          <h2>Download FinTrack</h2>
          <p>Free and open source. Available for Windows and macOS.</p>
        </div>
        <div className="downloads-grid">
          <div className="download-card">
            <div className="platform-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 12V6.697l7-1V12zm0 5.303V12h7v6.303zM10 12V5.397l11-1.57V12zm0 0v7.173l11 1.57V12z"/>
              </svg>
            </div>
            <h3>Windows</h3>
            <p>Installer (.exe) & MSI package for Windows 10/11</p>
            <a href={RELEASES_URL} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
              Download for Windows
            </a>
          </div>

          <div className="download-card">
            <div className="platform-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
            </div>
            <h3>macOS</h3>
            <p>Native app (.dmg) & zip for Apple Silicon & Intel</p>
            <a href={RELEASES_URL} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
              Download for macOS
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
