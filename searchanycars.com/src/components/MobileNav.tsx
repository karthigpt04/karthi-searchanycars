import { NavLink } from 'react-router-dom'

export const MobileNav = () => {
  return (
    <nav className="mobile-nav">
      <div className="mobile-nav-grid">
        <NavLink to="/" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`} end>
          <span className="mobile-nav-icon">🏠</span>
          Home
        </NavLink>
        <NavLink to="/search" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
          <span className="mobile-nav-icon">🔍</span>
          Search
        </NavLink>
        <NavLink to="/wishlist" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
          <span className="mobile-nav-icon">♡</span>
          Wishlist
        </NavLink>
        <NavLink to="/contact" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
          <span className="mobile-nav-icon">💬</span>
          Contact
        </NavLink>
      </div>
    </nav>
  )
}
