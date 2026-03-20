export interface Category {
  id: number
  name: string
  slug: string
  vehicle_type: string
  description: string
  created_at: string
  updated_at: string
}

export interface CategoryFilterDefinition {
  id: number
  key: string
  label: string
  type: 'text' | 'number' | 'select'
  options_json: string
  options: string[]
}

export interface Listing {
  id: number
  category_id: number | null
  category_name?: string
  category_slug?: string
  listing_code: string
  title: string
  brand: string
  model: string
  variant: string | null
  model_year: number | null
  registration_year: number | null
  vehicle_type: string | null
  body_style: string | null
  exterior_color: string | null
  interior_color: string | null
  listing_price_inr: number
  negotiable: number
  estimated_market_value_inr: number | null
  ownership_type: string | null
  seller_type: string | null
  registration_state: string | null
  registration_city: string | null
  total_km_driven: number | null
  mileage_kmpl: number | null
  engine_type: string | null
  engine_capacity_cc: number | null
  power_bhp: number | null
  transmission_type: string | null
  fuel_type: string | null
  battery_capacity_kwh: number | null
  overall_condition_rating: number | null
  service_history_available: number
  airbags_count: number | null
  infotainment_screen_size: string | null
  location_city: string | null
  location_state: string | null
  dealer_rating: number | null
  inspection_status: string | null
  inspection_score: number | null
  listing_status: string
  featured_listing: number
  is_splus: number
  is_new_car: number
  new_car_type: string | null
  views_count: number
  favorites_count: number
  lead_count: number
  promotion_tier: string | null
  additional_notes: string | null
  images: string[]
  specs: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface ListingPayload {
  categoryId: number | null
  listingCode: string
  title: string
  brand: string
  model: string
  variant: string
  modelYear: number | null
  registrationYear: number | null
  vehicleType: string
  bodyStyle: string
  exteriorColor: string
  interiorColor: string
  listingPriceInr: number
  negotiable: boolean
  estimatedMarketValueInr: number | null
  ownershipType: string
  sellerType: string
  registrationState: string
  registrationCity: string
  totalKmDriven: number
  mileageKmpl: number | null
  engineType: string
  engineCapacityCc: number | null
  powerBhp: number | null
  transmissionType: string
  fuelType: string
  batteryCapacityKwh: number | null
  overallConditionRating: number | null
  serviceHistoryAvailable: boolean
  airbagsCount: number | null
  infotainmentScreenSize: string
  locationCity: string
  locationState: string
  dealerRating: number | null
  inspectionStatus: string
  inspectionScore: number | null
  listingStatus: string
  featuredListing: boolean
  isSplus: boolean
  isNewCar: boolean
  newCarType: string
  promotionTier: string
  images: string[]
  additionalNotes: string
  specs: Record<string, unknown>
}
