import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/axios';
import { useMapStore } from '@/stores/mapStore';
import { useFilterStore } from '@/stores/filterStore';

export function useListings() {
  const bounds = useMapStore((s) => s.bounds);
  const { tradeType, residenceTypes, priceRange, depositRange, monthlyRentRange, areaRange } =
    useFilterStore();

  return useQuery({
    queryKey: ['listings', bounds, tradeType, residenceTypes, priceRange, depositRange, monthlyRentRange, areaRange],
    queryFn: async () => {
      if (!bounds) return [];
      const params: Record<string, string | number> = {
        swLat: bounds.swLat,
        swLng: bounds.swLng,
        neLat: bounds.neLat,
        neLng: bounds.neLng,
      };
      if (tradeType) params.tradeType = tradeType;
      if (residenceTypes.length > 0) params.residenceTypes = residenceTypes.join(',');
      if (priceRange.min != null) params.priceMin = priceRange.min;
      if (priceRange.max != null) params.priceMax = priceRange.max;
      if (depositRange.min != null) params.depositMin = depositRange.min;
      if (depositRange.max != null) params.depositMax = depositRange.max;
      if (monthlyRentRange.min != null) params.monthlyRentMin = monthlyRentRange.min;
      if (monthlyRentRange.max != null) params.monthlyRentMax = monthlyRentRange.max;
      if (areaRange.min != null) params.areaMin = areaRange.min;
      if (areaRange.max != null) params.areaMax = areaRange.max;
      const res = await apiClient.get('/listings', { params });
      return res.data;
    },
    enabled: !!bounds,
  });
}
