import { useEffect } from 'react'
import { Link, Route, Routes, useLocation } from 'react-router-dom'
import { SiteConfigProvider } from './context/SiteConfigContext'
import { AuthProvider } from './context/AuthContext'
import { WishlistProvider } from './context/WishlistContext'
import { LoginPage } from './pages/LoginPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { ChangePasswordPage } from './pages/ChangePasswordPage'
import { AdminGuard } from './components/AdminGuard'
import { SiteFooter } from './components/SiteFooter'
import { SiteHeader } from './components/SiteHeader'
import { MobileNav } from './components/MobileNav'
import { AdminPage } from './pages/AdminPage'
import { AdminCarFormPage } from './pages/AdminCarFormPage'
import { AdminSettingsPage } from './pages/AdminSettingsPage'
import { CarDetailPage } from './pages/CarDetailPage'
import { HomePage } from './pages/HomePage'
import { SearchPage } from './pages/SearchPage'
import { AboutPage } from './pages/AboutPage'
import { HowItWorksPage } from './pages/HowItWorksPage'
import { FAQPage } from './pages/FAQPage'
import { ContactPage } from './pages/ContactPage'
import { WishlistPage } from './pages/WishlistPage'
import { SPlusPage } from './pages/SPlusPage'
import { SPlusNewPage } from './pages/SPlusNewPage'
import { SellCarPage } from './pages/SellCarPage'
import { MyBookingsPage } from './pages/MyBookingsPage'

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
    <SiteConfigProvider>
      <AuthProvider>
      <WishlistProvider>
      <ScrollToTop />
      <SiteHeader />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/splus" element={<SPlusPage />} />
        <Route path="/splus-new" element={<SPlusNewPage />} />
        <Route path="/car/:id" element={<CarDetailPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/how-it-works" element={<HowItWorksPage />} />
        <Route path="/faq" element={<FAQPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/wishlist" element={<WishlistPage />} />
        <Route path="/my-bookings" element={<MyBookingsPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/change-password" element={<ChangePasswordPage />} />
        <Route path="/admin" element={<AdminGuard><AdminPage /></AdminGuard>} />
        <Route path="/admin/car/new" element={<AdminGuard><AdminCarFormPage /></AdminGuard>} />
        <Route path="/admin/car/:id/edit" element={<AdminGuard><AdminCarFormPage /></AdminGuard>} />
        <Route path="/admin/settings" element={<AdminGuard><AdminSettingsPage /></AdminGuard>} />
        <Route path="/sell" element={<SellCarPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <SiteFooter />
      <MobileNav />
      </WishlistProvider>
      </AuthProvider>
    </SiteConfigProvider>
  )
}

export default App
