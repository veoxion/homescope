'use client';
import { CustomOverlayMap } from 'react-kakao-maps-sdk';
import type { Cluster } from '@/types/api';

function formatCount(count: number): string {
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return String(count);
}

function getSizeClass(count: number): string {
  if (count >= 100) return 'w-14 h-14 text-sm';
  if (count >= 20) return 'w-12 h-12 text-sm';
  return 'w-10 h-10 text-xs';
}

interface ClusterMarkerProps {
  cluster: Cluster;
  onClick: () => void;
}

export default function ClusterMarker({ cluster, onClick }: ClusterMarkerProps) {
  const count = Number(cluster.count);
  return (
    <CustomOverlayMap
      position={{ lat: cluster.center_lat, lng: cluster.center_lng }}
      yAnchor={0.5}
      xAnchor={0.5}
    >
      <button
        onClick={onClick}
        className={`
          ${getSizeClass(count)}
          rounded-full bg-indigo-500 text-white font-bold
          border-2 border-white shadow-lg
          flex items-center justify-center
          hover:bg-indigo-600 hover:scale-110 active:scale-95
          transition-all cursor-pointer
        `}
      >
        {formatCount(count)}
      </button>
    </CustomOverlayMap>
  );
}
