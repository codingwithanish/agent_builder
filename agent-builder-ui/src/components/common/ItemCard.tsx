import React, { useState } from 'react';
import { StatusPill } from './StatusPill';
import { useMarketStore } from '@/state/marketStore';
import type { ToolOrAgentCard } from '@/lib/types';

interface ItemCardProps {
  item: ToolOrAgentCard;
  source: 'catalogue' | 'marketplace';
}

export function ItemCard({ item, source }: ItemCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const { addMarketItemToCatalog } = useMarketStore();

  const handleAddToCatalog = () => {
    addMarketItemToCatalog(item.id, item.kind);
    setShowMenu(false);
  };

  const handleViewDetails = () => {
    console.log('View details for:', item.name);
    setShowMenu(false);
  };

  const getIcon = () => {
    return item.kind === 'agent' ? '🤖' : '🧰';
  };

  const handleDragStart = (e: React.DragEvent) => {
    if (source === 'catalogue') {
      e.dataTransfer.setData('application/reactflow', JSON.stringify({
        nodeType: item.kind,
        itemId: item.id,
        itemName: item.name,
        itemDescription: item.description
      }));
      e.dataTransfer.effectAllowed = 'move';
    }
  };

  return (
    <div className="relative">
      <div 
        className={`p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 transition-colors ${
          source === 'catalogue' ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
        }`}
        draggable={source === 'catalogue'}
        onDragStart={handleDragStart}
        onContextMenu={(e) => {
          if (source === 'marketplace') {
            e.preventDefault();
            setShowMenu(true);
          }
        }}
      >
        <div className="flex items-start space-x-3">
          <span className="text-lg flex-shrink-0">{getIcon()}</span>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-gray-900 truncate">
              {item.name}
            </h4>
            {item.description && (
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                {item.description}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Context Menu for Marketplace items */}
      {showMenu && source === 'marketplace' && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute right-0 top-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border">
            <button
              onClick={handleAddToCatalog}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Add to My Catalog
            </button>
            <button
              onClick={handleViewDetails}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              View Details
            </button>
          </div>
        </>
      )}
    </div>
  );
}