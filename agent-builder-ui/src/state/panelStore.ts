import { create } from 'zustand';

interface PanelState {
  // Right panel visibility and active tab
  rightPanelVisible: boolean;
  activeRightTab: 'catalogue' | 'marketplace';
  activeCatalogueTab: 'agents' | 'tools' | 'flows' | 'logical';
  activeMarketplaceTab: 'tools' | 'agents';

  // Drawer state
  activeDrawer: 'agent' | 'agentFlow' | 'tool' | 'condition' | 'human' | null;
  selectedNodeId: string | null;

  // Actions
  setRightPanelVisible: (visible: boolean) => void;
  setActiveRightTab: (tab: 'catalogue' | 'marketplace') => void;
  setActiveCatalogueTab: (tab: 'agents' | 'tools' | 'flows' | 'logical') => void;
  setActiveMarketplaceTab: (tab: 'tools' | 'agents') => void;
  openDrawer: (drawer: 'agent' | 'agentFlow' | 'tool' | 'condition' | 'human', nodeId: string) => void;
  closeDrawer: () => void;
}

export const usePanelStore = create<PanelState>((set) => ({
  rightPanelVisible: true,
  activeRightTab: 'catalogue',
  activeCatalogueTab: 'agents',
  activeMarketplaceTab: 'tools',
  activeDrawer: null,
  selectedNodeId: null,

  setRightPanelVisible: (visible) => set({ rightPanelVisible: visible }),
  
  setActiveRightTab: (tab) => set({ activeRightTab: tab }),
  
  setActiveCatalogueTab: (tab) => set({ activeCatalogueTab: tab }),
  
  setActiveMarketplaceTab: (tab) => set({ activeMarketplaceTab: tab }),
  
  openDrawer: (drawer, nodeId) => set({ 
    activeDrawer: drawer, 
    selectedNodeId: nodeId,
    rightPanelVisible: false // Hide right panel when drawer opens
  }),
  
  closeDrawer: () => set({ 
    activeDrawer: null, 
    selectedNodeId: null,
    rightPanelVisible: true // Show right panel when drawer closes
  })
}));