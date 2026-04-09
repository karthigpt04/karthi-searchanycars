'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSiteConfig } from '../context/SiteConfigContext';
import { useAuth } from '../context/AuthContext';

export const SiteHeader = () => {
  const { config } = useSiteConfig();
  const { user, isAdmin, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  return (
    <header className="site-header">
      <div className="container header-wrap">
        <Link href="/" className="brand" aria-label="SearchAnyCars home">
          <div className="brand-icon">S</div>
          <span className="brand-text">
            Search<span>Any</span>Cars
          </span>
        </Link>

        <nav className={`header-nav ${isOpen ? 'open' : ''}`}>
          {config.nav_items.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className={`nav-link ${isActive(item.path) ? 'nav-link-active' : ''} ${item.path === '/splus' ? 'nav-link-splus' : ''} ${item.path === '/splus-new' ? 'nav-link-spn' : ''}`}
              onClick={() => setIsOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {isOpen && (
          <div className="header-backdrop" onClick={() => setIsOpen(false)} />
        )}

        <div className="header-actions">
          {user ? (
            <div className="user-menu" ref={userMenuRef}>
              <button
                className="user-menu-trigger"
                type="button"
                onClick={() => setUserMenuOpen((v) => !v)}
                aria-expanded={userMenuOpen}
              >
                <span className="user-menu-avatar">
                  {user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                </span>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ opacity: 0.5 }}>
                  <path d="M3 5L6 8L9 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              {userMenuOpen && (
                <div className="user-menu-dropdown">
                  <div className="user-menu-header">
                    {user.name && <div className="user-menu-name">{user.name}</div>}
                    <div className="user-menu-email">{user.email}</div>
                  </div>
                  {isAdmin && (
                    <Link href="/admin" className="user-menu-item" onClick={() => setUserMenuOpen(false)}>
                      Admin
                    </Link>
                  )}
                  <Link href="/my-bookings" className="user-menu-item" onClick={() => setUserMenuOpen(false)}>
                    My Bookings
                  </Link>
                  <Link href="/change-password" className="user-menu-item" onClick={() => setUserMenuOpen(false)}>
                    Change Password
                  </Link>
                  <button
                    className="user-menu-item user-menu-logout"
                    onClick={() => { logout(); setUserMenuOpen(false); }}
                    type="button"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link href="/login" className="btn btn-outline btn-sm">
              Login
            </Link>
          )}
          <Link href="/wishlist" className="wishlist-icon" aria-label="Wishlist">
            ♡
          </Link>
          <Link href="/search" className="btn btn-primary btn-sm">
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
  );
};
