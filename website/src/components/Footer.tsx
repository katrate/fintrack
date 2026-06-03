export function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <p>&copy; {new Date().getFullYear()} FinTrack. Open source under MIT License.</p>
        <div className="footer-links">
          <a href="https://github.com/katrate/fintrack" target="_blank" rel="noopener noreferrer">GitHub</a>
          <a href="#">Privacy</a>
          <a href="#">License</a>
        </div>
      </div>
    </footer>
  )
}
