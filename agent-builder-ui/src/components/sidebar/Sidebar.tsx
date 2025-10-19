import React from 'react';
import { CreateFlowButton } from './CreateFlowButton';
import { AddResourcesButton } from './AddResourcesButton';
import { FlowList } from './FlowList';

export function Sidebar() {
  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-4 space-y-3">
        <CreateFlowButton />
        <AddResourcesButton />
      </div>
      
      <div className="flex-1 overflow-y-auto">
        <FlowList />
      </div>
    </aside>
  );
}