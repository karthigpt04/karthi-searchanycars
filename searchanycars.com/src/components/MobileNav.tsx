import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export const MobileNav = () => {
  const { user } = useAuth()

  return (
    <nav className="mobile-nav" aria-label="Mobile navigation">
      <div className="mobile-nav-grid">
        <NavLink to="/" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`} end>
          <span className="mobile-nav-icon-wrap mnav-home">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l9 8v10a1 1 0 01-1 1h-5v-6h-6v6H4a1 1 0 01-1-1V11l9-8z"/></svg>
          </span>
          <span>Home</span>
        </NavLink>
        <NavLink to="/search" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
          <span className="mobile-nav-icon-wrap mnav-search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="10.5" cy="10.5" r="7"/><line x1="21" y1="21" x2="15.8" y2="15.8"/></svg>
          </span>
          <span>Search</span>
        </NavLink>
        <NavLink to="/splus" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
          <span className="mobile-nav-icon-wrap mnav-splus">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
          </span>
          <span>S-Plus</span>
        </NavLink>
        <NavLink to="/splus-new" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
          <span className="mobile-nav-icon-wrap mnav-new">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2zm-3 10h-3v3a1 1 0 11-2 0v-3H8a1 1 0 110-2h3V8a1 1 0 112 0v3h3a1 1 0 110 2z"/></svg>
          </span>
          <span>New Cars</span>
        </NavLink>
        <NavLink to="/wishlist" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
          <span className="mobile-nav-icon-wrap mnav-wishlist">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
          </span>
          <span>Wishlist</span>
        </NavLink>
        <NavLink to={user ? '/change-password' : '/login'} className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
          <span className="mobile-nav-icon-wrap mnav-account">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
          </span>
          <span>{user ? 'Account' : 'Login'}</span>
        </NavLink>
      </div>
    </nav>
  )
}
