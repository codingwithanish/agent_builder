import React, { useState, useEffect } from 'react';
import { usePanelStore } from '@/state/panelStore';
import { useFlowStore } from '@/state/flowStore';

export function HumanDrawer() {
  const { selectedNodeId, closeDrawer } = usePanelStore();
  const { activeFlow, updateActiveFlow } = useFlowStore();
  
  const [activeTab, setActiveTab] = useState<'details' | 'config'>('details');
  const [formData, setFormData] = useState({
    name: '',
    ask: '',
    promptConfig: '',
    inputValidator: ''
  });

  const selectedNode = activeFlow?.nodes.find(n => n.id === selectedNodeId);

  useEffect(() => {
    if (selectedNode && selectedNode.kind === 'human') {
      setFormData({
        name: selectedNode.data.name || '',
        ask: selectedNode.data.ask || '',
        promptConfig: selectedNode.data.promptConfig || '',
        inputValidator: selectedNode.data.inputValidator || ''
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

  if (!selectedNode || selectedNode.kind !== 'human') return null;

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Human Node Configuration</h3>
        <button
          onClick={closeDrawer}
          className="text-gray-400 hover:text-gray-600"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex">
          <button 
            onClick={() => setActiveTab('details')}
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === 'details' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Details
          </button>
          <button 
            onClick={() => setActiveTab('config')}
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === 'config' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Configuration
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        {activeTab === 'details' ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Node Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., User Approval"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                What is your ask? *
              </label>
              <input
                type="text"
                value={formData.ask}
                onChange={(e) => setFormData({ ...formData, ask: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Do you approve this action?"
              />
              <p className="text-xs text-gray-500 mt-1">
                This question will be shown to the user
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prompt Configuration
              </label>
              <textarea
                value={formData.promptConfig}
                onChange={(e) => setFormData({ ...formData, promptConfig: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                placeholder="User input: $input"
              />
              <p className="text-xs text-gray-500 mt-1">
                Use $input to reference the user's message
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Input Validator
              </label>
              <textarea
                value={formData.inputValidator}
                onChange={(e) => setFormData({ ...formData, inputValidator: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                placeholder="# Validate the input&#10;return len(input.strip()) > 0"
              />
              <p className="text-xs text-gray-500 mt-1">
                Validation code referencing $input (optional)
              </p>
            </div>
          </div>
        )}
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
          disabled={!formData.name || !formData.ask}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          Save
        </button>
      </div>
    </div>
  );
}