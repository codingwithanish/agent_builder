import React, { useState, useEffect } from 'react';
import { usePanelStore } from '@/state/panelStore';
import { useFlowStore } from '@/state/flowStore';
import { KeyValueEditor } from '@/components/common/KeyValueEditor';

export function ToolDrawer() {
  const { selectedNodeId, closeDrawer } = usePanelStore();
  const { activeFlow, updateActiveFlow } = useFlowStore();
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    env: {} as Record<string, string>
  });

  const selectedNode = activeFlow?.nodes.find(n => n.id === selectedNodeId);

  useEffect(() => {
    if (selectedNode && selectedNode.kind === 'tool') {
      setFormData({
        name: selectedNode.data.name || '',
        description: selectedNode.data.description || '',
        env: selectedNode.data.env || {}
      });
    }
  }, [selectedNode]);

  const handleSave = () => {
    if (!activeFlow || !selectedNodeId) return;

    const updatedNodes = activeFlow.nodes.map(node => {
      if (node.id === selectedNodeId) {
        return {
          ...node,
          data: {
            ...node.data,
            ...formData
          }
        };
      }
      return node;
    });

    updateActiveFlow({ nodes: updatedNodes });
    closeDrawer();
  };

  const handleCancel = () => {
    closeDrawer();
  };

  if (!selectedNode || selectedNode.kind !== 'tool') return null;

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Tool Configuration</h3>
        <button
          onClick={closeDrawer}
          className="text-gray-400 hover:text-gray-600"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Environment Variables</h4>
          <KeyValueEditor
            data={formData.env}
            onChange={(env) => setFormData({ ...formData, env })}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 flex justify-end space-x-3">
        <button
          onClick={handleCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          Save
        </button>
      </div>
    </div>
  );
}