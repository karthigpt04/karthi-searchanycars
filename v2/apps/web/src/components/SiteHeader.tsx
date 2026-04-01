'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSiteConfig } from '../context/SiteConfigContext';
import { useAuth } from '../context/AuthContext';

export const SiteHeader = () => {
  const { config } = useSiteConfig();
  const { user, isAdmin, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
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
            <>
              {isAdmin && (
                <Link href="/admin" className="btn btn-ghost btn-sm">
                  Admin
                </Link>
              )}
              <Link href="/my-bookings" className="btn btn-ghost btn-sm">
                My Bookings
              </Link>
              <Link href="/change-password" className="btn btn-ghost btn-sm">
                Change Password
              </Link>
              <button
                className="btn btn-ghost btn-sm"
                onClick={logout}
                type="button"
              >
                Logout
              </button>
            </>
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
