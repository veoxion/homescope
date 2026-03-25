import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/axios';
import { useMapStore } from '@/stores/mapStore';
import type { Cluster } from '@/types/api';

/** 카카오 level → 백엔드 zoom 변환 (카카오: 높을수록 줌아웃, 웹맵: 높을수록 줌인) */
function kakaoLevelToZoom(level: number): number {
  return Math.max(1, 19 - level);
}

export function useClusters(enabled: boolean) {
  const bounds = useMapStore((s) => s.bounds);
  const zoom = useMapStore((s) => s.zoom);

  return useQuery<Cluster[]>({
    queryKey: ['clusters', bounds, zoom],
    queryFn: async () => {
      if (!bounds) return [];
      const res = await apiClient.get('/buildings/clusters', {
        params: {
          swLat: bounds.swLat,
          swLng: bounds.swLng,
          neLat: bounds.neLat,
          neLng: bounds.neLng,
          zoom: kakaoLevelToZoom(zoom),
        },
      });
      return res.data;
    },
    enabled: enabled && !!bounds,
  });
}
