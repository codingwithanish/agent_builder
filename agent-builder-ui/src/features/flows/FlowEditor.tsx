import React, { useState } from 'react';
import { ReactFlowProvider } from 'reactflow';
import 'reactflow/dist/style.css';
import { useFlowStore } from '@/state/flowStore';
import { FlowCanvas } from './FlowCanvas';
import { TestFlowModal } from './TestFlowModal';
import { DeploymentDetailsModal } from './DeploymentDetailsModal';

export function FlowEditor() {
  const { activeFlow, publishFlow, isLoading } = useFlowStore();
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // Override ReactFlow default styles
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .react-flow__node-default,
      .react-flow__node-input,
      .react-flow__node-output,
      .react-flow__node-group {
        padding: 0 !important;
        border: none !important;
        border-width: 0 !important;
        border-style: none !important;
        border-color: transparent !important;
        background: transparent !important;
        background-color: transparent !important;
        width: auto !important;
        border-radius: 0 !important;
        font-size: inherit !important;
        color: inherit !important;
        text-align: inherit !important;
        box-shadow: none !important;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const handlePublish = async () => {
    if (activeFlow) {
      await publishFlow(activeFlow.id);
    }
  };

  // Check if all non-I/O nodes are deployed (input and output nodes don't have deployment status)
  const deployableNodes = activeFlow?.nodes?.filter(node => node.kind !== 'input' && node.kind !== 'output') ?? [];
  const allNodesDeployed = deployableNodes.length > 0 && deployableNodes.every(node => node.status === 'deployed');

  return (
    <div className="flex-1 flex flex-col bg-white">
      <ReactFlowProvider>
        <FlowCanvas />
      </ReactFlowProvider>
      
      {/* Footer */}
      <div className="border-t border-gray-200 p-4 flex justify-between">
        <div className="flex space-x-4">
          <button
            onClick={handlePublish}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Publishing...' : 'Publish'}
          </button>
          <button
            onClick={() => setIsTestModalOpen(true)}
            className={`px-4 py-2 rounded-md ${
              allNodesDeployed
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
            disabled={!allNodesDeployed}
          >
            Test {!allNodesDeployed && '(disabled)'}
          </button>
          {allNodesDeployed && (
            <button
              onClick={() => setIsDetailsModalOpen(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Show Details
            </button>
          )}
        </div>
      </div>
      
      <TestFlowModal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
        flowId={activeFlow?.id || ''}
      />

      <DeploymentDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        flowId={activeFlow?.id || ''}
        flowName={activeFlow?.name || ''}
      />
    </div>
  );
}