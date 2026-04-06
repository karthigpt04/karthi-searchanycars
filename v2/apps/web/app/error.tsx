'use client';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="section">
      <div className="container">
        <div className="empty-state">
          <h2>Something went wrong</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            {error.message || 'An unexpected error occurred. Please try again.'}
          </p>
          <button className="btn btn-primary" onClick={reset} style={{ marginTop: '1rem' }}>
            Try Again
          </button>
        </div>
      </div>
    </main>
  );
}
