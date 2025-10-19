import React from 'react';
import { Handle, Position } from 'reactflow';
import { StatusPill } from '@/components/common/StatusPill';
import { usePanelStore } from '@/state/panelStore';

export function HumanNode({ data, id }: { data: any; id: string }) {
  const openDrawer = usePanelStore(state => state.openDrawer);

  const handleClick = () => {
    openDrawer('human', id);
  };

  return (
    <div className="relative group">
      {/* Warm, friendly glow effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-rose-300 to-pink-300 rounded-2xl blur-sm opacity-20 group-hover:opacity-35 transition-opacity duration-300"></div>
      
      {/* Main node with extra rounded corners for friendliness */}
      <div 
        className="relative px-5 py-4 bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-200 rounded-2xl shadow-lg min-w-[180px] cursor-pointer hover:border-rose-300 hover:shadow-xl transform hover:scale-102 transition-all duration-200 backdrop-blur-sm"
        onClick={handleClick}
      >
        {/* Friendly status indicator */}
        <div className="absolute top-3 right-3">
          <div className="w-3 h-3 bg-rose-400 rounded-full animate-pulse"></div>
        </div>

        {/* Header with friendly human icon */}
        <div className="mb-4 pb-3 border-b border-rose-100">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-rose-400 to-pink-400 rounded-full text-white">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <div className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-rose-600 to-pink-600">
                HUMAN
              </div>
              <div className="text-xs text-rose-500 opacity-80 font-medium">User Interaction</div>
            </div>
          </div>
        </div>
        
        {/* Body with question preview */}
        <div className="mb-4 space-y-2">
          <div className="text-sm font-semibold text-gray-900">{data.name}</div>
          {data.ask && (
            <div className="bg-rose-100 border border-rose-200 rounded-xl px-3 py-2 mt-2">
              <div className="text-xs text-rose-700 font-medium mb-1">Question:</div>
              <div className="text-xs text-gray-700 italic leading-relaxed">"{data.ask}"</div>
            </div>
          )}
          {data.promptConfig && (
            <div className="flex items-center space-x-2 mt-2">
              <div className="w-2 h-2 bg-rose-400 rounded-full"></div>
              <span className="text-xs text-rose-600 font-medium">Configured prompt</span>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="flex justify-between items-center pt-2 border-t border-gray-100">
          <span className="text-xs text-gray-500 font-medium">Status</span>
          <StatusPill status={data.status || 'draft'} />
        </div>

        {/* Handles with friendly rounded style */}
        <Handle
          type="target"
          position={Position.Left}
          className="w-4 h-4 bg-gradient-to-r from-rose-400 to-pink-400 border-2 border-white shadow-lg rounded-full"
        />
        <Handle
          type="source"
          position={Position.Right}
          className="w-4 h-4 bg-gradient-to-r from-rose-400 to-pink-400 border-2 border-white shadow-lg rounded-full"
        />
      </div>
    </div>
  );
}