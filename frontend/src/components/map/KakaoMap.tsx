'use client';
import Script from 'next/script';
import { Map } from 'react-kakao-maps-sdk';
import { useMapStore } from '@/stores/mapStore';
import { useListings, CLUSTER_ZOOM_THRESHOLD } from '@/hooks/useListings';
import { useClusters } from '@/hooks/useClusters';
import { useDetailStore } from '@/stores/detailStore';
import { useState, useRef, useCallback } from 'react';
import type { Listing } from '@/types/api';
import ListingMarker from './ListingMarker';
import ClusterMarker from './ClusterMarker';

if (!process.env.NEXT_PUBLIC_KAKAO_MAP_KEY) {
  console.warn('NEXT_PUBLIC_KAKAO_MAP_KEY가 설정되지 않았습니다. 지도가 로드되지 않습니다.');
}

const SDK_URL = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_MAP_KEY}&libraries=clusterer&autoload=false`;

export default function KakaoMap() {
  const [sdkReady, setSdkReady] = useState(false);
  const [sdkError, setSdkError] = useState(false);

  const center = useMapStore((s) => s.center);
  const zoom = useMapStore((s) => s.zoom);
  const setCenter = useMapStore((s) => s.setCenter);
  const setZoom = useMapStore((s) => s.setZoom);
  const setBounds = useMapStore((s) => s.setBounds);
  const openPanel = useDetailStore((s) => s.openPanel);
  const selectedListingId = useDetailStore((s) => s.selectedListingId);

  const showListings = zoom <= CLUSTER_ZOOM_THRESHOLD;
  const showClusters = !showListings;

  const { data: listings = [] } = useListings();
  const { data: clusters = [] } = useClusters(showClusters);

  const mapRef = useRef<any>(null);
  const boundsTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const updateBounds = useCallback(
    (map: any) => {
      clearTimeout(boundsTimerRef.current);
      boundsTimerRef.current = setTimeout(() => {
        const bounds = map.getBounds();
        const sw = bounds.getSouthWest();
        const ne = bounds.getNorthEast();
        setBounds({
          swLat: sw.getLat(),
          swLng: sw.getLng(),
          neLat: ne.getLat(),
          neLng: ne.getLng(),
        });
      }, 300);
    },
    [setBounds],
  );

  const handleClusterClick = useCallback(
    (lat: number, lng: number) => {
      setCenter({ lat, lng });
      setZoom(Math.max(1, zoom - 2));
    },
    [setCenter, setZoom, zoom],
  );

  return (
    <>
      <Script
        src={SDK_URL}
        strategy="afterInteractive"
        onLoad={() => {
          window.kakao.maps.load(() => setSdkReady(true));
        }}
        onError={() => setSdkError(true)}
      />

      {sdkError && (
        <div className="w-full h-full flex flex-col items-center justify-center text-red-500 gap-1">
          <p>지도를 불러올 수 없습니다.</p>
          <p className="text-xs text-gray-400">카카오 SDK 로드 실패. 콘솔을 확인하세요.</p>
        </div>
      )}

      {!sdkReady && !sdkError && (
        <div className="w-full h-full flex items-center justify-center text-gray-500">
          지도 로딩 중...
        </div>
      )}

      {sdkReady && (
        <Map
          ref={mapRef}
          center={center}
          level={zoom}
          className="w-full h-full"
          onCenterChanged={(map) => {
            const c = map.getCenter();
            setCenter({ lat: c.getLat(), lng: c.getLng() });
          }}
          onZoomChanged={(map) => setZoom(map.getLevel())}
          onBoundsChanged={updateBounds}
        >
          {showClusters &&
            clusters.map((cluster) => (
              <ClusterMarker
                key={cluster.geohash}
                cluster={cluster}
                onClick={() => handleClusterClick(cluster.center_lat, cluster.center_lng)}
              />
            ))}

          {showListings &&
            (listings as Listing[]).map((listing) => (
              <ListingMarker
                key={listing.id}
                listing={listing}
                onClick={() => openPanel(listing.id)}
                isSelected={listing.id === selectedListingId}
              />
            ))}
        </Map>
      )}
    </>
  );
}
