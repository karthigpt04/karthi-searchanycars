import Link from "next/link";

export default function NotFound() {
  return (
    <main className="section">
      <div className="container">
        <div className="empty-state">
          <h2>Page Not Found</h2>
          <p>The page you are looking for does not exist.</p>
          <Link href="/" className="btn btn-primary">
            Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
