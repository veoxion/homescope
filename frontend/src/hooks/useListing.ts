import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/axios';

export function useListing(listingId: string | null) {
  return useQuery({
    queryKey: ['listing', listingId],
    queryFn: async () => {
      const res = await apiClient.get(`/listings/${listingId}`);
      return res.data;
    },
    enabled: !!listingId,
  });
}
