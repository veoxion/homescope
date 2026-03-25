import { create } from 'zustand';

export type TradeType = '매매' | '전세' | '월세' | null;
export type ResidenceType = '아파트' | '오피스텔' | '빌라' | '원룸';

interface PriceRange {
  min: number | null;
  max: number | null;
}

interface FilterStore {
  tradeType: TradeType;
  residenceTypes: ResidenceType[];
  priceRange: PriceRange;
  depositRange: PriceRange;
  monthlyRentRange: PriceRange;
  areaRange: { min: number | null; max: number | null };
  setTradeType: (type: TradeType) => void;
  toggleResidenceType: (type: ResidenceType) => void;
  setPriceRange: (range: PriceRange) => void;
  setDepositRange: (range: PriceRange) => void;
  setMonthlyRentRange: (range: PriceRange) => void;
  setAreaRange: (range: { min: number | null; max: number | null }) => void;
  resetFilters: () => void;
}

const initialState = {
  tradeType: null as TradeType,
  residenceTypes: [] as ResidenceType[],
  priceRange: { min: null, max: null },
  depositRange: { min: null, max: null },
  monthlyRentRange: { min: null, max: null },
  areaRange: { min: null, max: null },
};

export const useFilterStore = create<FilterStore>((set) => ({
  ...initialState,
  setTradeType: (tradeType) => set({
    tradeType,
    priceRange: { min: null, max: null },
    depositRange: { min: null, max: null },
    monthlyRentRange: { min: null, max: null },
  }),
  toggleResidenceType: (type) =>
    set((state) => ({
      residenceTypes: state.residenceTypes.includes(type)
        ? state.residenceTypes.filter((t) => t !== type)
        : [...state.residenceTypes, type],
    })),
  setPriceRange: (priceRange) => set({ priceRange }),
  setDepositRange: (depositRange) => set({ depositRange }),
  setMonthlyRentRange: (monthlyRentRange) => set({ monthlyRentRange }),
  setAreaRange: (areaRange) => set({ areaRange }),
  resetFilters: () => set(initialState),
}));
