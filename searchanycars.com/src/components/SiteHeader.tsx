import { useState } from 'react'
import { NavLink, Link } from 'react-router-dom'

const navItems = [
  { label: 'Home', path: '/' },
  { label: 'Buy Cars', path: '/search' },
  { label: 'S-Plus', path: '/splus' },
  { label: 'How It Works', path: '/how-it-works' },
  { label: 'About Us', path: '/about' },
  { label: 'FAQs', path: '/faq' },
  { label: 'Contact', path: '/contact' },
]

export const SiteHeader = () => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <header className="site-header">
      <div className="container header-wrap">
        <Link to="/" className="brand" aria-label="SearchAnyCars home">
          <div className="brand-icon">S</div>
          <span className="brand-text">Search<span>Any</span>Cars</span>
        </Link>

        <nav className={`header-nav ${isOpen ? 'open' : ''}`}>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''} ${item.path === '/splus' ? 'nav-link-splus' : ''}`}
              onClick={() => setIsOpen(false)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="header-actions">
          <Link to="/wishlist" className="wishlist-icon" aria-label="Wishlist">
            ♡
          </Link>
          <Link to="/search" className="btn btn-primary btn-sm">
            Find Cars
          </Link>
        </div>

        <button
          className="menu-toggle"
          aria-label="Toggle menu"
          type="button"
          onClick={() => setIsOpen((c) => !c)}
        >
          {isOpen ? '✕' : '☰'}
        </button>
      </div>
    </header>
  )
}
