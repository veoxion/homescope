import { create } from 'zustand';

interface MapBounds {
  swLat: number;
  swLng: number;
  neLat: number;
  neLng: number;
}

interface MapStore {
  center: { lat: number; lng: number };
  zoom: number;
  bounds: MapBounds | null;
  selectedBuildingId: string | null;
  setCenter: (center: { lat: number; lng: number }) => void;
  setZoom: (zoom: number) => void;
  setBounds: (bounds: MapBounds) => void;
  setSelectedBuildingId: (id: string | null) => void;
}

export const useMapStore = create<MapStore>((set) => ({
  center: { lat: 37.5665, lng: 126.978 }, // 서울 시청
  zoom: 16,
  bounds: null,
  selectedBuildingId: null,
  setCenter: (center) => set({ center }),
  setZoom: (zoom) => set({ zoom }),
  setBounds: (bounds) => set({ bounds }),
  setSelectedBuildingId: (id) => set({ selectedBuildingId: id }),
}));
