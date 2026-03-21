import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export const AdminGuard = ({ children }: { children: ReactNode }) => {
  const { user, loading, isAdmin } = useAuth()

  if (loading) {
    return (
      <main className="section">
        <div className="container" style={{ textAlign: 'center', padding: '4rem 0' }}>
          <div className="skeleton" style={{ width: 200, height: 20, margin: '0 auto' }} />
        </div>
      </main>
    )
  }

  if (!user) {
    return (
      <main className="section">
        <div className="container">
          <div className="empty-state">
            <h3>Login Required</h3>
            <p>You need to sign in to access the admin dashboard.</p>
            <Link to="/login" className="btn btn-primary">Sign In</Link>
          </div>
        </div>
      </main>
    )
  }

  if (!isAdmin) {
    return (
      <main className="section">
        <div className="container">
          <div className="empty-state">
            <h3>Access Denied</h3>
            <p>You need admin privileges to access this page.</p>
            <Link to="/" className="btn btn-primary">Go Home</Link>
          </div>
        </div>
      </main>
    )
  }

  return <>{children}</>
}
