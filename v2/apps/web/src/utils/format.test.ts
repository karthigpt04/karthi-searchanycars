import { describe, it, expect } from 'vitest';
import {
  formatINR,
  formatKM,
  calculateMonthlyPayment,
  formatINRFull,
  carUrl,
  PLACEHOLDER_CAR_IMAGE,
  WISHLIST_STORAGE_KEY,
  DEFAULT_LOAN_PERCENT,
  DEFAULT_INTEREST_RATE,
  DEFAULT_TENURE_MONTHS,
  LOW_KM_THRESHOLD,
} from './format';

// ---------------------------------------------------------------------------
// formatINR
// ---------------------------------------------------------------------------
describe('formatINR', () => {
  it('returns ₹0 for zero', () => {
    expect(formatINR(0)).toBe('₹0');
  });

  it('formats small numbers with Indian locale', () => {
    expect(formatINR(999)).toBe('₹999');
  });

  it('formats thousands with Indian locale grouping', () => {
    expect(formatINR(12345)).toBe('₹12,345');
  });

  it('formats ten-thousands with Indian locale grouping', () => {
    expect(formatINR(99999)).toBe('₹99,999');
  });

  it('formats exactly 1 Lakh', () => {
    expect(formatINR(100000)).toBe('₹1.00 Lakh');
  });

  it('formats Lakh range with decimals', () => {
    expect(formatINR(550000)).toBe('₹5.50 Lakh');
  });

  it('formats 9999999 as ₹100.00 Lakh (rounds up from 99.99999)', () => {
    // 9999999 / 100000 = 99.99999, toFixed(2) rounds to 100.00
    expect(formatINR(9999999)).toBe('₹100.00 Lakh');
  });

  it('formats exactly 1 Crore', () => {
    expect(formatINR(10000000)).toBe('₹1.00 Cr');
  });

  it('formats large Crore values', () => {
    expect(formatINR(250000000)).toBe('₹25.00 Cr');
  });

  it('formats Crore with decimals', () => {
    expect(formatINR(12345678)).toBe('₹1.23 Cr');
  });

  it('handles negative small number', () => {
    expect(formatINR(-5000)).toBe('-₹5,000');
  });

  it('handles negative Lakh value', () => {
    expect(formatINR(-350000)).toBe('-₹3.50 Lakh');
  });

  it('handles negative Crore value', () => {
    expect(formatINR(-20000000)).toBe('-₹2.00 Cr');
  });

  it('returns ₹0 for NaN', () => {
    expect(formatINR(NaN)).toBe('₹0');
  });

  it('returns ₹0 for Infinity', () => {
    expect(formatINR(Infinity)).toBe('₹0');
  });

  it('returns ₹0 for -Infinity', () => {
    expect(formatINR(-Infinity)).toBe('₹0');
  });

  it('boundary: 99999 is not Lakh format', () => {
    const result = formatINR(99999);
    expect(result).not.toContain('Lakh');
    expect(result).toBe('₹99,999');
  });

  it('boundary: 9999999 is Lakh not Crore', () => {
    const result = formatINR(9999999);
    expect(result).toContain('Lakh');
    expect(result).not.toContain('Cr');
  });

  it('boundary: 10000000 is Crore not Lakh', () => {
    const result = formatINR(10000000);
    expect(result).toContain('Cr');
    expect(result).not.toContain('Lakh');
  });

  it('rounds small numbers to nearest integer', () => {
    expect(formatINR(1234.56)).toBe('₹1,235');
  });

  it('decimal precision in Lakh format', () => {
    expect(formatINR(123456)).toBe('₹1.23 Lakh');
  });

  it('decimal precision in Crore format', () => {
    expect(formatINR(10500000)).toBe('₹1.05 Cr');
  });
});

// ---------------------------------------------------------------------------
// formatKM
// ---------------------------------------------------------------------------
describe('formatKM', () => {
  it('returns 0 km for zero', () => {
    expect(formatKM(0)).toBe('0 km');
  });

  it('formats small values with Indian locale', () => {
    expect(formatKM(5000)).toBe('5,000 km');
  });

  it('formats values just below 1 Lakh', () => {
    expect(formatKM(99999)).toBe('99,999 km');
  });

  it('formats exactly 1 Lakh in L notation', () => {
    expect(formatKM(100000)).toBe('1.0L km');
  });

  it('formats large values in L notation', () => {
    expect(formatKM(250000)).toBe('2.5L km');
  });

  it('returns 0 km for negative', () => {
    expect(formatKM(-100)).toBe('0 km');
  });

  it('returns 0 km for NaN', () => {
    expect(formatKM(NaN)).toBe('0 km');
  });

  it('returns 0 km for Infinity', () => {
    expect(formatKM(Infinity)).toBe('0 km');
  });

  it('returns 0 km for -Infinity', () => {
    expect(formatKM(-Infinity)).toBe('0 km');
  });

  it('formats 50000 km', () => {
    expect(formatKM(50000)).toBe('50,000 km');
  });

  it('formats 150000 in L notation with decimal', () => {
    expect(formatKM(150000)).toBe('1.5L km');
  });
});

// ---------------------------------------------------------------------------
// calculateMonthlyPayment
// ---------------------------------------------------------------------------
describe('calculateMonthlyPayment', () => {
  it('returns 0 for NaN principal', () => {
    expect(calculateMonthlyPayment(NaN, 10, 12)).toBe(0);
  });

  it('returns 0 for NaN rate', () => {
    expect(calculateMonthlyPayment(100000, NaN, 12)).toBe(0);
  });

  it('returns 0 for NaN months', () => {
    expect(calculateMonthlyPayment(100000, 10, NaN)).toBe(0);
  });

  it('returns 0 for zero principal', () => {
    expect(calculateMonthlyPayment(0, 10, 12)).toBe(0);
  });

  it('returns 0 for negative principal', () => {
    expect(calculateMonthlyPayment(-50000, 10, 12)).toBe(0);
  });

  it('returns 0 for zero months', () => {
    expect(calculateMonthlyPayment(100000, 10, 0)).toBe(0);
  });

  it('returns 0 for negative months', () => {
    expect(calculateMonthlyPayment(100000, 10, -6)).toBe(0);
  });

  it('returns simple division for zero rate', () => {
    expect(calculateMonthlyPayment(120000, 0, 12)).toBe(10000);
  });

  it('returns simple division for negative rate', () => {
    expect(calculateMonthlyPayment(120000, -5, 12)).toBe(10000);
  });

  it('calculates correct EMI for known inputs', () => {
    // 10 Lakh at 10% for 48 months
    // Monthly rate = 10/12/100 = 0.008333...
    // EMI ~ 25,363
    const emi = calculateMonthlyPayment(1000000, 10, 48);
    expect(emi).toBeGreaterThan(25300);
    expect(emi).toBeLessThan(25400);
  });

  it('calculates EMI for small loan', () => {
    // 1 Lakh at 8% for 12 months
    const emi = calculateMonthlyPayment(100000, 8, 12);
    expect(emi).toBeGreaterThan(8600);
    expect(emi).toBeLessThan(8750);
  });

  it('returns 0 for Infinity principal', () => {
    expect(calculateMonthlyPayment(Infinity, 10, 12)).toBe(0);
  });

  it('returns 0 for Infinity rate', () => {
    expect(calculateMonthlyPayment(100000, Infinity, 12)).toBe(0);
  });

  it('returns 0 for Infinity months', () => {
    expect(calculateMonthlyPayment(100000, 10, Infinity)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// formatINRFull
// ---------------------------------------------------------------------------
describe('formatINRFull', () => {
  it('formats normal number with Indian locale', () => {
    expect(formatINRFull(1234567)).toBe('₹12,34,567');
  });

  it('returns ₹0 for NaN', () => {
    expect(formatINRFull(NaN)).toBe('₹0');
  });

  it('returns ₹0 for Infinity', () => {
    expect(formatINRFull(Infinity)).toBe('₹0');
  });

  it('formats zero', () => {
    expect(formatINRFull(0)).toBe('₹0');
  });

  it('formats small number', () => {
    expect(formatINRFull(500)).toBe('₹500');
  });

  it('rounds decimal values', () => {
    expect(formatINRFull(1234.7)).toBe('₹1,235');
  });

  it('does not abbreviate Lakh values', () => {
    const result = formatINRFull(500000);
    expect(result).not.toContain('Lakh');
    expect(result).toBe('₹5,00,000');
  });

  it('does not abbreviate Crore values', () => {
    const result = formatINRFull(10000000);
    expect(result).not.toContain('Cr');
    expect(result).toBe('₹1,00,00,000');
  });
});

// ---------------------------------------------------------------------------
// carUrl
// ---------------------------------------------------------------------------
describe('carUrl', () => {
  it('returns slug-based URL when slug is present', () => {
    expect(carUrl({ id: 1, slug: 'honda-city-2020' })).toBe('/car/honda-city-2020');
  });

  it('returns id-based URL when slug is null', () => {
    expect(carUrl({ id: 42, slug: null })).toBe('/car/42');
  });

  it('returns id-based URL when slug is undefined', () => {
    expect(carUrl({ id: 7 })).toBe('/car/7');
  });

  it('returns id-based URL when slug is empty string', () => {
    expect(carUrl({ id: 10, slug: '' })).toBe('/car/10');
  });
});

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
describe('constants', () => {
  it('PLACEHOLDER_CAR_IMAGE is a valid URL string', () => {
    expect(typeof PLACEHOLDER_CAR_IMAGE).toBe('string');
    expect(PLACEHOLDER_CAR_IMAGE).toContain('unsplash.com');
  });

  it('WISHLIST_STORAGE_KEY is sac_wishlist', () => {
    expect(WISHLIST_STORAGE_KEY).toBe('sac_wishlist');
  });

  it('DEFAULT_LOAN_PERCENT is 0.8', () => {
    expect(DEFAULT_LOAN_PERCENT).toBe(0.8);
  });

  it('DEFAULT_INTEREST_RATE is 10.5', () => {
    expect(DEFAULT_INTEREST_RATE).toBe(10.5);
  });

  it('DEFAULT_TENURE_MONTHS is 48', () => {
    expect(DEFAULT_TENURE_MONTHS).toBe(48);
  });

  it('LOW_KM_THRESHOLD is 30000', () => {
    expect(LOW_KM_THRESHOLD).toBe(30000);
  });
});
