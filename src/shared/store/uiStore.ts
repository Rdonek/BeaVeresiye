import { create } from 'zustand';
import React from 'react';

interface UIStore {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  closeSidebar: () => void;
  headerTitle: string;
  headerSubtitle: string;
  headerRightElement: React.ReactNode | null;
  headerBackTo: string | null;
  setHeader: (title: string, subtitle?: string, rightElement?: React.ReactNode, backTo?: string) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  isSidebarOpen: false,
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  closeSidebar: () => set({ isSidebarOpen: false }),
  headerTitle: 'Yükleniyor...',
  headerSubtitle: '',
  headerRightElement: undefined,
  headerBackTo: null,
  setHeader: (title, subtitle = '', rightElement = undefined, backTo = undefined) => set({ 
    headerTitle: title, 
    headerSubtitle: subtitle, 
    headerRightElement: rightElement, 
    headerBackTo: backTo 
  }),
}));
