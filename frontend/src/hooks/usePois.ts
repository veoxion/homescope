import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/axios';
import type { PoisResponse } from '@/types/api';

export function usePois(lat: number | null, lng: number | null, radius = 500) {
  return useQuery<PoisResponse>({
    queryKey: ['pois', lat, lng, radius],
    queryFn: async () => {
      const res = await apiClient.get('/pois', { params: { lat, lng, radius } });
      return res.data;
    },
    enabled: lat != null && lng != null,
    staleTime: 1000 * 60 * 60, // 1시간 캐시
  });
}
