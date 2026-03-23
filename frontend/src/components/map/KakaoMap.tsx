'use client';
import Script from 'next/script';
import { Map, MarkerClusterer } from 'react-kakao-maps-sdk';
import { useMapStore } from '@/stores/mapStore';
import { useListings } from '@/hooks/useListings';
import { useDetailStore } from '@/stores/detailStore';
import { useState, useRef, useCallback } from 'react';
import type { Listing } from '@/types/api';
import ListingMarker from './ListingMarker';

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

  const { data: listings = [] } = useListings();

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
          <MarkerClusterer averageCenter minLevel={10}>
            {(listings as Listing[]).map((listing) => (
              <ListingMarker
                key={listing.id}
                listing={listing}
                onClick={() => openPanel(listing.id)}
                isSelected={listing.id === selectedListingId}
              />
            ))}
          </MarkerClusterer>
        </Map>
      )}
    </>
  );
}
