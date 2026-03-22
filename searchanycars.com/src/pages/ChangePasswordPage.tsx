import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/client'

export const ChangePasswordPage = () => {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  if (!user) {
    navigate('/login')
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match')
      return
    }

    if (currentPassword === newPassword) {
      setError('New password must be different from current password')
      return
    }

    setLoading(true)
    try {
      await api.changePassword(currentPassword, newPassword)
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
            <p>Change your password</p>
          </div>

          {success ? (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>&#10003;</div>
              <h3 style={{ marginBottom: '0.5rem' }}>Password Changed</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                Your password has been updated successfully.
              </p>
              <button className="btn btn-primary" onClick={() => navigate(-1)}>Go Back</button>
            </div>
          ) : (
            <>
              {error && <div className="login-error">{error}</div>}

              <form onSubmit={handleSubmit} className="login-form">
                <div className="login-field">
                  <label>Current Password</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    required
                  />
                </div>
                <div className="login-field">
                  <label>New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
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
                    placeholder="Re-enter new password"
                    required
                    minLength={6}
                  />
                </div>
                <button className="btn btn-primary btn-lg login-submit" type="submit" disabled={loading}>
                  {loading ? 'Updating...' : 'Change Password'}
                </button>
              </form>

              <p className="login-footer-text">
                <button
                  className="text-link"
                  onClick={() => navigate(-1)}
                  type="button"
                  style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
