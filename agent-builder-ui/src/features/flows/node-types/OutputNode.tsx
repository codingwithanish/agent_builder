import React from 'react';
import { Handle, Position } from 'reactflow';

export function OutputNode({ data }: { data: any }) {
  return (
    <div className="relative group">
      {/* Glow effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-400 rounded-xl blur-sm opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
      
      {/* Main node */}
      <div className="relative px-6 py-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl shadow-lg min-w-[140px] backdrop-blur-sm">
        {/* Subtle animation indicator */}
        <div className="absolute top-2 right-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
        </div>
        
        {/* Header with icon */}
        <div className="flex items-center justify-center space-x-2 mb-3">
          <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full text-white">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </div>
        </div>
        
        {/* Title */}
        <div className="text-center">
          <div className="text-lg font-bold text-green-800 mb-1">OUTPUT</div>
          <div className="text-sm text-green-600 opacity-80">{data.name}</div>
        </div>

        {/* Handle */}
        <Handle
          type="target"
          position={Position.Left}
          className="w-4 h-4 bg-gradient-to-r from-green-400 to-emerald-400 border-2 border-white shadow-lg"
        />
      </div>
    </div>
  );
}