import React, { useState, useEffect } from 'react';
import { usePanelStore } from '@/state/panelStore';
import { useFlowStore } from '@/state/flowStore';
import { useSettingsStore } from '@/state/settingsStore';
import { KeyValueEditor } from '@/components/common/KeyValueEditor';

export function AgentDrawer() {
  const { selectedNodeId, closeDrawer } = usePanelStore();
  const { activeFlow, updateActiveFlow } = useFlowStore();
  const { llms } = useSettingsStore();
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    llmName: '',
    env: {} as Record<string, string>
  });
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  const selectedNode = activeFlow?.nodes.find(n => n.id === selectedNodeId);

  useEffect(() => {
    if (selectedNode && selectedNode.kind === 'agent') {
      setFormData({
        name: selectedNode.data.name || '',
        description: selectedNode.data.description || '',
        llmName: selectedNode.data.llmName || '',
        env: selectedNode.data.env || {}
      });
    }
  }, [selectedNode]);

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Agent name is required';
    }
    
    if (!formData.llmName) {
      newErrors.llmName = 'Please select an LLM';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!activeFlow || !selectedNodeId) return;
    
    if (!validateForm()) return;

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

  if (!selectedNode || selectedNode.kind !== 'agent') return null;

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full drawer-slide-in">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Agent Configuration</h3>
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
          <button className="px-4 py-2 text-sm font-medium text-blue-600 border-b-2 border-blue-600">
            Basic Details
          </button>
          <button className="px-4 py-2 text-sm font-medium text-gray-500">
            Environment Variables
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        {/* Basic Details Tab */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                errors.name 
                  ? 'border-red-300 focus:ring-red-500' 
                  : 'border-gray-300 focus:ring-blue-500'
              }`}
            />
            {errors.name && (
              <p className="text-xs text-red-600 mt-1">{errors.name}</p>
            )}
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              LLM *
            </label>
            <select
              value={formData.llmName}
              onChange={(e) => setFormData({ ...formData, llmName: e.target.value })}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                errors.llmName 
                  ? 'border-red-300 focus:ring-red-500' 
                  : 'border-gray-300 focus:ring-blue-500'
              }`}
            >
              <option value="">Select an LLM</option>
              {llms.map(llm => (
                <option key={llm.id} value={llm.name}>
                  {llm.name}
                </option>
              ))}
            </select>
            {errors.llmName && (
              <p className="text-xs text-red-600 mt-1">{errors.llmName}</p>
            )}
          </div>
        </div>

        {/* Environment Variables */}
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
          disabled={!formData.name.trim() || !formData.llmName}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          Save
        </button>
      </div>
    </div>
  );
}