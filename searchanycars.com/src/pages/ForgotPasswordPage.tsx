import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'

export const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.forgotPassword(email)
      setSent(true)
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
            <p>Reset your password</p>
          </div>

          {sent ? (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>&#9993;</div>
              <h3 style={{ marginBottom: '0.5rem' }}>Check your email</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                If an account exists for <strong>{email}</strong>, we've sent a password reset link.
                Please check your inbox and spam folder.
              </p>
              <Link to="/login" className="btn btn-primary">Back to Sign In</Link>
            </div>
          ) : (
            <>
              {error && <div className="login-error">{error}</div>}

              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                Enter your email address and we'll send you a link to reset your password.
              </p>

              <form onSubmit={handleSubmit} className="login-form">
                <div className="login-field">
                  <label>Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                  />
                </div>
                <button className="btn btn-primary btn-lg login-submit" type="submit" disabled={loading}>
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>

              <p className="login-footer-text">
                Remember your password?{' '}
                <Link to="/login" className="text-link" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                  Sign In
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
