export default function Loading() {
  return (
    <main className="section">
      <div className="container" style={{ textAlign: 'center', padding: '4rem 0' }}>
        <div className="skeleton" style={{ width: 200, height: 24, margin: '0 auto 1rem', borderRadius: 8 }} />
        <div className="skeleton" style={{ width: 300, height: 16, margin: '0 auto', borderRadius: 8 }} />
      </div>
    </main>
  );
}
