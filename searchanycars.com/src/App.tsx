import { useEffect } from 'react'
import { Link, Route, Routes, useLocation } from 'react-router-dom'
import { SiteFooter } from './components/SiteFooter'
import { SiteHeader } from './components/SiteHeader'
import { MobileNav } from './components/MobileNav'
import { AdminPage } from './pages/AdminPage'
import { AdminCarFormPage } from './pages/AdminCarFormPage'
import { CarDetailPage } from './pages/CarDetailPage'
import { HomePage } from './pages/HomePage'
import { SearchPage } from './pages/SearchPage'
import { AboutPage } from './pages/AboutPage'
import { HowItWorksPage } from './pages/HowItWorksPage'
import { FAQPage } from './pages/FAQPage'
import { ContactPage } from './pages/ContactPage'
import { WishlistPage } from './pages/WishlistPage'
import { SPlusPage } from './pages/SPlusPage'

const ScrollToTop = () => {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [pathname])
  return null
}

const NotFoundPage = () => (
  <main className="section">
    <div className="container">
      <div className="empty-state">
        <h2>Page Not Found</h2>
        <p>The page you are looking for does not exist.</p>
        <Link to="/" className="btn btn-primary">Back to Home</Link>
      </div>
    </div>
  </main>
)

function App() {
  return (
    <>
      <ScrollToTop />
      <SiteHeader />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/splus" element={<SPlusPage />} />
        <Route path="/car/:id" element={<CarDetailPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/how-it-works" element={<HowItWorksPage />} />
        <Route path="/faq" element={<FAQPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/wishlist" element={<WishlistPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/admin/car/new" element={<AdminCarFormPage />} />
        <Route path="/admin/car/:id/edit" element={<AdminCarFormPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <SiteFooter />
      <MobileNav />
    </>
  )
}

export default App
