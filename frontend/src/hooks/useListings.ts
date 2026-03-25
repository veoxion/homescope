import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/axios';
import { useMapStore } from '@/stores/mapStore';
import { useFilterStore } from '@/stores/filterStore';

/** 카카오 맵 레벨 기준: 이 값 이하일 때 개별 매물 표시, 초과 시 클러스터 표시 */
export const CLUSTER_ZOOM_THRESHOLD = 6;

export function useListings() {
  const bounds = useMapStore((s) => s.bounds);
  const zoom = useMapStore((s) => s.zoom);
  const { tradeType, residenceTypes, priceRange, depositRange, monthlyRentRange, areaRange } =
    useFilterStore();

  const showListings = zoom <= CLUSTER_ZOOM_THRESHOLD;

  return useQuery({
    queryKey: ['listings', bounds, tradeType, residenceTypes, priceRange, depositRange, monthlyRentRange, areaRange],
    queryFn: async () => {
      if (!bounds) return [];
      const params: Record<string, string | number> = {
        swLat: bounds.swLat,
        swLng: bounds.swLng,
        neLat: bounds.neLat,
        neLng: bounds.neLng,
        limit: 200,
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
    enabled: !!bounds && showListings,
  });
}
