import { describe, it, expect } from 'vitest';
import { useMapStore } from '@/stores/mapStore';

describe('mapStore', () => {
  it('기본 센터가 서울 시청이다', () => {
    const { center } = useMapStore.getState();
    expect(center.lat).toBeCloseTo(37.5665, 2);
    expect(center.lng).toBeCloseTo(126.978, 2);
  });

  it('센터를 업데이트한다', () => {
    useMapStore.getState().setCenter({ lat: 37.5, lng: 127.0 });
    const { center } = useMapStore.getState();
    expect(center.lat).toBe(37.5);
    expect(center.lng).toBe(127.0);
  });

  it('줌 레벨을 업데이트한다', () => {
    useMapStore.getState().setZoom(10);
    expect(useMapStore.getState().zoom).toBe(10);
  });

  it('바운드를 설정한다', () => {
    const bounds = { swLat: 37.4, swLng: 126.8, neLat: 37.6, neLng: 127.1 };
    useMapStore.getState().setBounds(bounds);
    expect(useMapStore.getState().bounds).toEqual(bounds);
  });

  it('선택 건물 ID를 설정/해제한다', () => {
    useMapStore.getState().setSelectedBuildingId('abc-123');
    expect(useMapStore.getState().selectedBuildingId).toBe('abc-123');

    useMapStore.getState().setSelectedBuildingId(null);
    expect(useMapStore.getState().selectedBuildingId).toBeNull();
  });
});
