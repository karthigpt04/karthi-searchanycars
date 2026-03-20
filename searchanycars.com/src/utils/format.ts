export const formatINR = (value: number): string => {
  if (!Number.isFinite(value)) return '₹0'
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  if (abs >= 10000000) {
    return `${sign}₹${(abs / 10000000).toFixed(2)} Cr`
  }
  if (abs >= 100000) {
    return `${sign}₹${(abs / 100000).toFixed(2)} Lakh`
  }
  return `${sign}₹${new Intl.NumberFormat('en-IN').format(Math.round(abs))}`
}

export const formatINRCompact = (value: number): string => {
  if (!Number.isFinite(value)) return '₹0'
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  if (abs >= 10000000) {
    return `${sign}₹${(abs / 10000000).toFixed(1)} Cr`
  }
  if (abs >= 100000) {
    const lakhs = abs / 100000
    return `${sign}₹${lakhs % 1 === 0 ? lakhs.toFixed(0) : lakhs.toFixed(2)} Lakh`
  }
  return `${sign}₹${new Intl.NumberFormat('en-IN').format(Math.round(abs))}`
}

export const formatINRFull = (value: number): string => {
  if (!Number.isFinite(value)) return '₹0'
  return `₹${new Intl.NumberFormat('en-IN').format(Math.round(value))}`
}

export const formatNumber = (value: number): string => {
  if (!Number.isFinite(value)) return '0'
  return new Intl.NumberFormat('en-IN').format(value)
}

export const formatKM = (value: number): string => {
  if (!Number.isFinite(value) || value < 0) return '0 km'
  if (value >= 100000) {
    return `${(value / 100000).toFixed(1)}L km`
  }
  return `${new Intl.NumberFormat('en-IN').format(value)} km`
}

export const calculateMonthlyPayment = (
  principal: number,
  yearlyRate: number,
  months: number,
): number => {
  if (!Number.isFinite(principal) || !Number.isFinite(yearlyRate) || !Number.isFinite(months)) return 0
  if (principal <= 0 || months <= 0) return 0

  const monthlyRate = yearlyRate / 12 / 100
  if (monthlyRate <= 0) {
    return principal / months
  }

  const factor = (1 + monthlyRate) ** months
  return (principal * monthlyRate * factor) / (factor - 1)
}

// Shared constants
export const PLACEHOLDER_CAR_IMAGE = 'https://images.unsplash.com/photo-1549924231-f129b911e442?auto=format&fit=crop&w=800&q=80'
export const WISHLIST_STORAGE_KEY = 'sac_wishlist'
export const DEFAULT_LOAN_PERCENT = 0.8
export const DEFAULT_INTEREST_RATE = 10.5
export const DEFAULT_TENURE_MONTHS = 48
export const LOW_KM_THRESHOLD = 30000

export const formatCurrency = formatINR
