// ──────────────────────────────────────────────
// Homescope 프론트엔드 공유 타입 정의
// 백엔드 API 응답 형식에 대응하는 타입들
// ──────────────────────────────────────────────

// ---- Building ----

export interface Building {
  id: string;
  address: string;
  building_name?: string;
  residence_type: string;
  build_year: number;
  lat: number;
  lng: number;
}

// ---- Listing ----

export interface Listing {
  id: string;
  building_id: string;
  trade_type: string;
  sale_price?: number;
  jeonse_price?: number;
  deposit?: number;
  monthly_rent?: number;
  area_m2: number;
  floor: number;
  room_count: number;
  status: string;
  listed_at: string;
  address: string;
  building_name?: string;
  residence_type: string;
  build_year: number;
  lat: number;
  lng: number;
}

// ---- Transaction ----

export interface Transaction {
  id: string;
  tradeType: string;
  price: number;
  deposit?: number;
  monthlyRent?: number;
  areaM2: number;
  floor: number;
  tradedAt: string;
}

// ---- Market Price ----

export interface MarketPrice {
  id: string;
  tradeType: string;
  areaM2: number;
  medianPrice: number;
  medianMonthlyRent?: number;
  transactionCount: number;
  periodStart: string;
  periodEnd: string;
}

// ---- POI (주변 정보) ----

export interface Poi {
  id: string;
  name: string;
  category: string;
  lat: number;
  lng: number;
  distance: number;
}

export interface PoisResponse {
  pois: Poi[];
}

// ---- Search ----

export interface SearchResult {
  id: string;
  address: string;
  buildingName?: string;
  lat: number;
  lng: number;
}

// ---- Finance ----

export type RepaymentType = 'equalPayment' | 'equalPrincipal';

export interface FinanceResult {
  monthlyPayment: number;
  totalInterest: number;
  totalPayment: number;
}

// ---- Map ----

export interface MapBounds {
  swLat: number;
  swLng: number;
  neLat: number;
  neLng: number;
}

export interface LatLng {
  lat: number;
  lng: number;
}
