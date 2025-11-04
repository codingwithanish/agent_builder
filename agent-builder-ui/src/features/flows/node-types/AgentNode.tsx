import React from 'react';
import { Handle, Position } from 'reactflow';
import { StatusPill } from '@/components/common/StatusPill';
import { usePanelStore } from '@/state/panelStore';

export function AgentNode({ data, id }: { data: any; id: string }) {
  const openDrawer = usePanelStore(state => state.openDrawer);

  const handleClick = () => {
    openDrawer('agent', id);
  };

  return (
    <div className="relative group">
      {/* Glow effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-indigo-400 to-purple-400 rounded-xl blur-sm opacity-25 group-hover:opacity-40 transition-opacity duration-300"></div>
      
      {/* Main node */}
      <div 
        className="relative px-5 py-4 bg-white border border-indigo-200 rounded-xl shadow-lg min-w-[220px] min-h-[160px] cursor-pointer hover:border-indigo-300 hover:shadow-xl transform hover:scale-102 transition-all duration-200 backdrop-blur-sm"
        onClick={handleClick}
      >
        {/* Status indicator */}
        <div className="absolute top-3 right-3">
          <div className="w-3 h-3 bg-indigo-400 rounded-full animate-pulse"></div>
        </div>

        {/* Header with gradient */}
        <div className="mb-4 pb-3 border-b border-indigo-100">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full text-white">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <div className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                AGENT
              </div>
              <div className="text-xs text-indigo-500 opacity-80 font-medium">AI Processing Unit</div>
            </div>
          </div>
        </div>
        
        {/* Body */}
        <div className="mb-4 space-y-2">
          <div className="text-sm font-semibold text-gray-900">{data.name}</div>
          {data.description && (
            <div className="text-xs text-gray-600 leading-relaxed">{data.description}</div>
          )}
          {data.llmName && (
            <div className="flex items-center space-x-2 mt-2">
              <div className="w-2 h-2 bg-indigo-400 rounded-full"></div>
              <span className="text-xs text-indigo-600 font-medium">LLM: {data.llmName}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-2 border-t border-gray-100">
          <span className="text-xs text-gray-500 font-medium">Status</span>
          <StatusPill status={data.status || 'draft'} />
        </div>

        {/* Handles */}
        <Handle
          type="target"
          position={Position.Left}
          className="w-4 h-4 bg-gradient-to-r from-indigo-400 to-purple-400 border-2 border-white shadow-lg"
        />
        <Handle
          type="source"
          position={Position.Right}
          className="w-4 h-4 bg-gradient-to-r from-indigo-400 to-purple-400 border-2 border-white shadow-lg"
        />
        
        {/* Tool connection handles */}
        <Handle
          type="source"
          position={Position.Top}
          id="tool-top"
          className="w-3 h-3 bg-gradient-to-r from-amber-400 to-orange-400 border-2 border-white shadow-md"
          style={{ top: -6 }}
        />
        <Handle
          type="source"
          position={Position.Bottom}
          id="tool-bottom"
          className="w-3 h-3 bg-gradient-to-r from-amber-400 to-orange-400 border-2 border-white shadow-md"
          style={{ bottom: -6 }}
        />
      </div>
    </div>
  );
}