import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api/client'

export const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  if (!token) {
    return (
      <main>
        <div className="login-page">
          <div className="login-card">
            <div className="login-header">
              <h1>Search<span style={{ color: 'var(--coral)' }}>Any</span>Cars</h1>
              <p>Invalid Reset Link</p>
            </div>
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              This password reset link is invalid or has expired.
            </p>
            <div style={{ textAlign: 'center' }}>
              <Link to="/forgot-password" className="btn btn-primary">Request New Link</Link>
            </div>
          </div>
        </div>
      </main>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      await api.resetPassword(token, password)
      setSuccess(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main>
      <div className="login-page">
        <div className="login-card">
          <div className="login-header">
            <h1>Search<span style={{ color: 'var(--coral)' }}>Any</span>Cars</h1>
            <p>Set your new password</p>
          </div>

          {success ? (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>&#10003;</div>
              <h3 style={{ marginBottom: '0.5rem' }}>Password Reset Successful</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                Your password has been updated. You can now sign in with your new password.
              </p>
              <Link to="/login" className="btn btn-primary">Sign In</Link>
            </div>
          ) : (
            <>
              {error && <div className="login-error">{error}</div>}

              <form onSubmit={handleSubmit} className="login-form">
                <div className="login-field">
                  <label>New Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    required
                    minLength={6}
                  />
                </div>
                <div className="login-field">
                  <label>Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    required
                    minLength={6}
                  />
                </div>
                <button className="btn btn-primary btn-lg login-submit" type="submit" disabled={loading}>
                  {loading ? 'Resetting...' : 'Reset Password'}
                </button>
              </form>

              <p className="login-footer-text">
                <Link to="/login" className="text-link" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                  Back to Sign In
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
