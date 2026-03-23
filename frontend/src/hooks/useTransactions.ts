import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/axios';

export function useTransactions(buildingId: string | null) {
  return useQuery({
    queryKey: ['transactions', buildingId],
    queryFn: async () => {
      const res = await apiClient.get(`/buildings/${buildingId}/transactions`);
      return res.data;
    },
    enabled: !!buildingId,
    staleTime: 1000 * 60 * 10,
  });
}
