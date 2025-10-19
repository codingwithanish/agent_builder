import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useFlowStore } from '@/state/flowStore';
import { StatusPill } from '@/components/common/StatusPill';

export function FlowList() {
  const navigate = useNavigate();
  const { flows, isLoading } = useFlowStore();

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-12 bg-gray-200 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (flows.length === 0) {
    return (
      <div className="p-4">
        <p className="text-sm text-gray-500 text-center">
          No flows yet.
          <br />
          Create your first flow to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 pb-4">
      <div className="space-y-1">
        {flows.map(flow => (
          <button
            key={flow.id}
            onClick={() => navigate(`/${flow.id}`)}
            className="w-full flex items-center justify-between p-2 text-left rounded-md hover:bg-gray-100 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {flow.name}
              </p>
              {flow.description && (
                <p className="text-xs text-gray-500 truncate">
                  {flow.description}
                </p>
              )}
            </div>
            <StatusPill status={flow.status} />
          </button>
        ))}
      </div>
    </div>
  );
}