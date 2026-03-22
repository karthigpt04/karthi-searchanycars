import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export const LoginPage = () => {
  const { login, register, user } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (user) {
    navigate(user.role === 'admin' ? '/admin' : '/')
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') {
        await login(email, password)
      } else {
        await register(email, password, name)
      }
      navigate('/')
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
            <p>{mode === 'login' ? 'Sign in to your account' : 'Create a new account'}</p>
          </div>

          <div className="login-tabs">
            <button className={`login-tab ${mode === 'login' ? 'active' : ''}`} onClick={() => { setMode('login'); setError('') }} type="button">Sign In</button>
            <button className={`login-tab ${mode === 'register' ? 'active' : ''}`} onClick={() => { setMode('register'); setError('') }} type="button">Register</button>
          </div>

          {error && <div className="login-error">{error}</div>}

          <form onSubmit={handleSubmit} className="login-form">
            {mode === 'register' && (
              <div className="login-field">
                <label>Full Name</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Enter your name" required />
              </div>
            )}
            <div className="login-field">
              <label>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
            </div>
            <div className="login-field">
              <label>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={mode === 'register' ? 'Min 6 characters' : 'Your password'} required minLength={6} />
            </div>
            <button className="btn btn-primary btn-lg login-submit" type="submit" disabled={loading}>
              {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
            {mode === 'login' && (
              <div style={{ textAlign: 'right', marginTop: '0.5rem' }}>
                <Link to="/forgot-password" className="text-link" style={{ fontSize: '0.875rem', color: 'var(--coral)' }}>
                  Forgot Password?
                </Link>
              </div>
            )}
          </form>

          <p className="login-footer-text">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button className="text-link" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }} type="button" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
              {mode === 'login' ? 'Register' : 'Sign In'}
            </button>
          </p>
        </div>
      </div>
    </main>
  )
}
