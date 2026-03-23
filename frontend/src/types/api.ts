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
