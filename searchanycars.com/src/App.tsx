import { lazy, Suspense, useEffect } from 'react'
import { Link, Route, Routes, useLocation } from 'react-router-dom'
import { SiteConfigProvider } from './context/SiteConfigContext'
import { AuthProvider } from './context/AuthContext'
import { WishlistProvider } from './context/WishlistContext'
import { AdminGuard } from './components/AdminGuard'
import { SiteFooter } from './components/SiteFooter'
import { SiteHeader } from './components/SiteHeader'
import { MobileNav } from './components/MobileNav'

const HomePage = lazy(() => import('./pages/HomePage').then(m => ({ default: m.HomePage })))
const SearchPage = lazy(() => import('./pages/SearchPage').then(m => ({ default: m.SearchPage })))
const CarDetailPage = lazy(() => import('./pages/CarDetailPage').then(m => ({ default: m.CarDetailPage })))
const SPlusPage = lazy(() => import('./pages/SPlusPage').then(m => ({ default: m.SPlusPage })))
const SPlusNewPage = lazy(() => import('./pages/SPlusNewPage').then(m => ({ default: m.SPlusNewPage })))
const SellCarPage = lazy(() => import('./pages/SellCarPage').then(m => ({ default: m.SellCarPage })))
const AboutPage = lazy(() => import('./pages/AboutPage').then(m => ({ default: m.AboutPage })))
const HowItWorksPage = lazy(() => import('./pages/HowItWorksPage').then(m => ({ default: m.HowItWorksPage })))
const FAQPage = lazy(() => import('./pages/FAQPage').then(m => ({ default: m.FAQPage })))
const ContactPage = lazy(() => import('./pages/ContactPage').then(m => ({ default: m.ContactPage })))
const WishlistPage = lazy(() => import('./pages/WishlistPage').then(m => ({ default: m.WishlistPage })))
const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })))
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage').then(m => ({ default: m.ForgotPasswordPage })))
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })))
const ChangePasswordPage = lazy(() => import('./pages/ChangePasswordPage').then(m => ({ default: m.ChangePasswordPage })))
const AdminPage = lazy(() => import('./pages/AdminPage').then(m => ({ default: m.AdminPage })))
const AdminCarFormPage = lazy(() => import('./pages/AdminCarFormPage').then(m => ({ default: m.AdminCarFormPage })))
const AdminSettingsPage = lazy(() => import('./pages/AdminSettingsPage').then(m => ({ default: m.AdminSettingsPage })))
const MyBookingsPage = lazy(() => import('./pages/MyBookingsPage').then(m => ({ default: m.MyBookingsPage })))

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
      <Suspense fallback={<div className="section" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="loading-spinner" /></div>}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/splus" element={<SPlusPage />} />
        <Route path="/splus-new" element={<SPlusNewPage />} />
        <Route path="/car/:slug" element={<CarDetailPage />} />
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
      </Suspense>
      <SiteFooter />
      <MobileNav />
      </WishlistProvider>
      </AuthProvider>
    </SiteConfigProvider>
  )
}

export default App
