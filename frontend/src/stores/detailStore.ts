import { create } from 'zustand';

interface DetailStore {
  selectedListingId: string | null;
  isPanelOpen: boolean;
  activeTab: 'listing' | 'market' | 'transaction' | 'finance';
  setSelectedListingId: (id: string | null) => void;
  openPanel: (listingId: string) => void;
  closePanel: () => void;
  setActiveTab: (tab: 'listing' | 'market' | 'transaction' | 'finance') => void;
}

export const useDetailStore = create<DetailStore>((set) => ({
  selectedListingId: null,
  isPanelOpen: false,
  activeTab: 'listing',
  setSelectedListingId: (id) => set({ selectedListingId: id }),
  openPanel: (listingId) => set({ selectedListingId: listingId, isPanelOpen: true }),
  closePanel: () => set({ isPanelOpen: false, selectedListingId: null }),
  setActiveTab: (tab) => set({ activeTab: tab }),
}));
