import { useState, useEffect } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { useSiteConfig } from '../context/SiteConfigContext'
import { useAuth } from '../context/AuthContext'

export const SiteHeader = () => {
  const { config } = useSiteConfig()
  const { user, isAdmin, logout } = useAuth()
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  return (
    <header className="site-header">
      <div className="container header-wrap">
        <Link to="/" className="brand" aria-label="SearchAnyCars home">
          <div className="brand-icon">S</div>
          <span className="brand-text">Search<span>Any</span>Cars</span>
        </Link>

        <nav className={`header-nav ${isOpen ? 'open' : ''}`}>
          {config.nav_items.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''} ${item.path === '/splus' ? 'nav-link-splus' : ''} ${item.path === '/splus-new' ? 'nav-link-spn' : ''}`}
              onClick={() => setIsOpen(false)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {isOpen && <div className="header-backdrop" onClick={() => setIsOpen(false)} />}

        <div className="header-actions">
          {user ? (
            <>
              {isAdmin && <Link to="/admin" className="btn btn-ghost btn-sm">Admin</Link>}
              <Link to="/change-password" className="btn btn-ghost btn-sm">Change Password</Link>
              <button className="btn btn-ghost btn-sm" onClick={logout} type="button">Logout</button>
            </>
          ) : (
            <Link to="/login" className="btn btn-outline btn-sm">Login</Link>
          )}
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
