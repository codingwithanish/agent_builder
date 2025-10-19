import React from 'react';
import { Handle, Position } from 'reactflow';
import { StatusPill } from '@/components/common/StatusPill';
import { usePanelStore } from '@/state/panelStore';

export function ToolNode({ data, id }: { data: any; id: string }) {
  const openDrawer = usePanelStore(state => state.openDrawer);

  const handleClick = () => {
    openDrawer('tool', id);
  };

  return (
    <div className="relative group">
      {/* Warm glow effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-red-400 rounded-lg blur-sm opacity-20 group-hover:opacity-35 transition-opacity duration-300"></div>
      
      {/* Main compact node */}
      <div 
        className="relative px-4 py-3 bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 rounded-lg shadow-md min-w-[140px] max-w-[160px] cursor-pointer hover:border-orange-300 hover:shadow-lg transform hover:scale-105 transition-all duration-200 backdrop-blur-sm"
        onClick={handleClick}
      >
        {/* Status indicator */}
        <div className="absolute top-2 right-2">
          <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
        </div>

        {/* Compact header */}
        <div className="flex items-center space-x-2 mb-3">
          <div className="flex items-center justify-center w-7 h-7 bg-gradient-to-r from-orange-400 to-red-400 rounded-full text-white">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
          <div className="text-xs font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-red-600">
            TOOL
          </div>
        </div>
        
        {/* Compact content */}
        <div className="mb-3">
          <div className="text-sm font-semibold text-gray-900 truncate">{data.name}</div>
          {data.description && (
            <div className="text-xs text-orange-700 opacity-80 line-clamp-2 leading-snug mt-1">{data.description}</div>
          )}
        </div>
        
        {/* Compact footer */}
        <div className="flex justify-center">
          <StatusPill status={data.status || 'draft'} />
        </div>

        {/* Handle - Tools connect to Agent top/bottom handles */}
        <Handle
          type="target"
          position={Position.Top}
          className="w-3 h-3 bg-gradient-to-r from-orange-400 to-red-400 border-2 border-white shadow-md"
          style={{ top: -6 }}
        />
      </div>
    </div>
  );
}