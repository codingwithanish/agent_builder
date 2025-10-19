import React from 'react';
import { usePanelStore } from '@/state/panelStore';
import { CataloguePanel } from '@/features/catalogue/CataloguePanel';
import { MarketplacePanel } from '@/features/marketplace/MarketplacePanel';

export function RightPanel() {
  const { 
    activeRightTab, 
    setActiveRightTab
  } = usePanelStore();

  return (
    <aside className="w-80 bg-white border-l border-gray-200 flex flex-col">
      <div className="p-4">
        <div className="flex border-b border-gray-200">
          <button 
            onClick={() => setActiveRightTab('catalogue')}
            className={`px-4 py-2 text-sm font-medium ${
              activeRightTab === 'catalogue' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Catalogue
          </button>
          <button 
            onClick={() => setActiveRightTab('marketplace')}
            className={`px-4 py-2 text-sm font-medium ${
              activeRightTab === 'marketplace' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Marketplace
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {activeRightTab === 'catalogue' ? (
          <CataloguePanel />
        ) : (
          <MarketplacePanel />
        )}
      </div>
    </aside>
  );
}