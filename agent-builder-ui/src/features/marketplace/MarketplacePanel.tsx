import React from 'react';
import { usePanelStore } from '@/state/panelStore';
import { useMarketStore } from '@/state/marketStore';
import { ItemCard } from '@/components/common/ItemCard';

export function MarketplacePanel() {
  const { 
    activeMarketplaceTab, 
    setActiveMarketplaceTab 
  } = usePanelStore();
  const { marketAgents, marketTools } = useMarketStore();

  const tabs = [
    { id: 'tools', label: 'Tools', count: marketTools.length },
    { id: 'agents', label: 'Agents', count: marketAgents.length }
  ] as const;

  const renderContent = () => {
    switch (activeMarketplaceTab) {
      case 'agents':
        return marketAgents.length > 0 ? (
          <div className="space-y-2">
            {marketAgents.map(agent => (
              <ItemCard key={agent.id} item={agent} source="marketplace" />
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-sm text-gray-500">No agents available</p>
          </div>
        );

      case 'tools':
        return marketTools.length > 0 ? (
          <div className="space-y-2">
            {marketTools.map(tool => (
              <ItemCard key={tool.id} item={tool} source="marketplace" />
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-sm text-gray-500">No tools available</p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="p-4">
      {/* Sub-tabs */}
      <div className="mb-4">
        <div className="flex gap-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveMarketplaceTab(tab.id)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                activeMarketplaceTab === tab.id
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {renderContent()}
    </div>
  );
}