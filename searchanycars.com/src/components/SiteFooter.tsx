import { Link } from 'react-router-dom'

export const SiteFooter = () => {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <h3 style={{ fontFamily: "'Poppins', sans-serif", fontSize: '1.15rem' }}>
              Search<span style={{ color: 'var(--coral)' }}>Any</span>Cars
            </h3>
            <p>
              India's most trusted used car broker platform. We search across 100+ verified dealers so you don't have to. Every car comes with quality inspection, warranty, and a money-back guarantee.
            </p>
            <div className="footer-social">
              <a href="#" aria-label="Facebook">f</a>
              <a href="#" aria-label="Instagram">ig</a>
              <a href="#" aria-label="Twitter">tw</a>
              <a href="#" aria-label="YouTube">yt</a>
            </div>
          </div>

          <div className="footer-col">
            <h4>Company</h4>
            <Link to="/about">About Us</Link>
            <Link to="/how-it-works">How It Works</Link>
            <Link to="/splus">S-Plus Premium</Link>
            <Link to="/contact">Contact Us</Link>
            <Link to="/faq">FAQs</Link>
          </div>

          <div className="footer-col">
            <h4>Buy Cars</h4>
            <Link to="/search?brand=Maruti+Suzuki">Maruti Suzuki Cars</Link>
            <Link to="/search?brand=Hyundai">Hyundai Cars</Link>
            <Link to="/search?brand=Tata">Tata Cars</Link>
            <Link to="/search?brand=Honda">Honda Cars</Link>
            <Link to="/search?brand=Kia">Kia Cars</Link>
            <Link to="/search">View All Brands</Link>
          </div>

          <div className="footer-col">
            <h4>Browse By</h4>
            <Link to="/search?body_style=SUV">SUVs</Link>
            <Link to="/search?body_style=Sedan">Sedans</Link>
            <Link to="/search?body_style=Hatchback">Hatchbacks</Link>
            <Link to="/search?fuel_type=Diesel">Diesel Cars</Link>
            <Link to="/search?fuel_type=Electric">Electric Cars</Link>
          </div>

          <div className="footer-col">
            <h4>Support</h4>
            <Link to="/faq">Return Policy</Link>
            <Link to="/faq">Warranty Details</Link>
            <Link to="/faq">Privacy Policy</Link>
            <Link to="/faq">Terms & Conditions</Link>
          </div>
        </div>

        <div className="footer-bottom">
          <span>&copy; {new Date().getFullYear()} SearchAnyCars.com. All rights reserved.</span>
          <span>Made with care in India</span>
        </div>
      </div>
    </footer>
  )
}
