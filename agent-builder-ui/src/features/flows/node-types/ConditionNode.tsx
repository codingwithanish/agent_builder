import React from 'react';
import { Handle, Position } from 'reactflow';
import { StatusPill } from '@/components/common/StatusPill';
import { usePanelStore } from '@/state/panelStore';

export function ConditionNode({ data, id }: { data: any; id: string }) {
  const openDrawer = usePanelStore(state => state.openDrawer);

  const handleClick = () => {
    openDrawer('condition', id);
  };

  return (
    <div className="relative group">
      {/* Purple glow effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-violet-400 rounded-xl blur-sm opacity-25 group-hover:opacity-40 transition-opacity duration-300"></div>
      
      {/* Main node with diamond-like shape effect */}
      <div 
        className="relative px-5 py-4 bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-200 rounded-xl shadow-lg min-w-[190px] cursor-pointer hover:border-purple-300 hover:shadow-xl transform hover:scale-102 transition-all duration-200 backdrop-blur-sm"
        onClick={handleClick}
      >
        {/* Status indicator */}
        <div className="absolute top-3 right-3">
          <div className="w-3 h-3 bg-purple-400 rounded-full animate-pulse"></div>
        </div>

        {/* Header with decision icon */}
        <div className="mb-4 pb-3 border-b border-purple-100">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-purple-500 to-violet-500 rounded-full text-white">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <div className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-violet-600">
                CONDITION
              </div>
              <div className="text-xs text-purple-500 opacity-80 font-medium">Decision Logic</div>
            </div>
          </div>
        </div>
        
        {/* Body */}
        <div className="mb-4 space-y-2">
          <div className="text-sm font-semibold text-gray-900">{data.name}</div>
          {data.description && (
            <div className="text-xs text-gray-600 leading-relaxed">{data.description}</div>
          )}
          {data.scriptType && (
            <div className="flex items-center space-x-2 mt-2">
              <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
              <span className="text-xs text-purple-600 font-medium">Script: {data.scriptType}</span>
            </div>
          )}
        </div>
        
        {/* Footer with status */}
        <div className="flex justify-between items-center pt-2 border-t border-gray-100">
          <span className="text-xs text-gray-500 font-medium">Status</span>
          <StatusPill status={data.status || 'draft'} />
        </div>

        {/* Input handle */}
        <Handle
          type="target"
          position={Position.Left}
          className="w-4 h-4 bg-gradient-to-r from-purple-400 to-violet-400 border-2 border-white shadow-lg"
        />
        
        {/* True/False output handles with better positioning */}
        <Handle
          type="source"
          position={Position.Right}
          id="true"
          className="w-4 h-4 bg-gradient-to-r from-green-400 to-emerald-400 border-2 border-white shadow-lg"
          style={{ top: '35%' }}
        />
        <Handle
          type="source"
          position={Position.Right}
          id="false"
          className="w-4 h-4 bg-gradient-to-r from-red-400 to-rose-400 border-2 border-white shadow-lg"
          style={{ top: '65%' }}
        />
        
        {/* Enhanced True/False labels with better styling */}
        <div className="absolute -right-16 text-xs font-semibold" style={{ top: '30%' }}>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span className="text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-200">TRUE</span>
          </div>
        </div>
        <div className="absolute -right-16 text-xs font-semibold" style={{ top: '60%' }}>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-red-400 rounded-full"></div>
            <span className="text-red-600 bg-red-50 px-2 py-1 rounded-full border border-red-200">FALSE</span>
          </div>
        </div>
      </div>
    </div>
  );
}