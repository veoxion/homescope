import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/axios';

export function useMarketPrices(buildingId: string | null) {
  return useQuery({
    queryKey: ['marketPrices', buildingId],
    queryFn: async () => {
      const res = await apiClient.get(`/buildings/${buildingId}/market-prices`);
      return res.data;
    },
    enabled: !!buildingId,
    staleTime: 1000 * 60 * 30,
  });
}
