import React from 'react';
import { usePanelStore } from '@/state/panelStore';
import { useMarketStore } from '@/state/marketStore';
import { useFlowStore } from '@/state/flowStore';
import { ItemCard } from '@/components/common/ItemCard';

export function CataloguePanel() {
  const { 
    activeCatalogueTab, 
    setActiveCatalogueTab 
  } = usePanelStore();
  const { catalogAgents, catalogTools } = useMarketStore();
  const { flows } = useFlowStore();

  const tabs = [
    { id: 'agents', label: 'Agents', count: catalogAgents.length },
    { id: 'tools', label: 'Tools', count: catalogTools.length },
    { id: 'flows', label: 'Flows', count: flows.filter(f => f.status === 'deployed').length },
    { id: 'logical', label: 'Logical', count: 2 } // Condition and Human nodes
  ] as const;

  const renderContent = () => {
    switch (activeCatalogueTab) {
      case 'agents':
        return catalogAgents.length > 0 ? (
          <div className="space-y-2">
            {catalogAgents.map(agent => (
              <ItemCard key={agent.id} item={agent} source="catalogue" />
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-sm text-gray-500">No agents in your catalogue</p>
            <p className="text-xs text-gray-400 mt-1">Add agents from the Marketplace</p>
          </div>
        );

      case 'tools':
        return catalogTools.length > 0 ? (
          <div className="space-y-2">
            {catalogTools.map(tool => (
              <ItemCard key={tool.id} item={tool} source="catalogue" />
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-sm text-gray-500">No tools in your catalogue</p>
            <p className="text-xs text-gray-400 mt-1">Add tools from the Marketplace</p>
          </div>
        );

      case 'flows':
        const deployedFlows = flows.filter(f => f.status === 'deployed');
        return deployedFlows.length > 0 ? (
          <div className="space-y-2">
            {deployedFlows.map(flow => (
              <ItemCard 
                key={flow.id} 
                item={{
                  id: flow.id,
                  kind: 'agent' as const,
                  name: flow.name,
                  description: flow.description,
                  status: flow.status
                }}
                source="catalogue" 
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-sm text-gray-500">No deployed flows</p>
            <p className="text-xs text-gray-400 mt-1">Deploy a flow to use it as a subflow</p>
          </div>
        );

      case 'logical':
        const logicalNodes = [
          { id: 'condition', name: 'Condition', description: 'Execute conditional logic', icon: '⚖️' },
          { id: 'human', name: 'Human', description: 'Request human input', icon: '👤' }
        ];
        
        const handleLogicalDragStart = (e: React.DragEvent, node: any) => {
          e.dataTransfer.setData('application/reactflow', JSON.stringify({
            nodeType: node.id,
            itemId: node.id,
            itemName: node.name,
            itemDescription: node.description
          }));
          e.dataTransfer.effectAllowed = 'move';
        };
        
        return (
          <div className="space-y-2">
            {logicalNodes.map(node => (
              <div
                key={node.id}
                className="p-3 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-400 cursor-grab active:cursor-grabbing transition-colors"
                draggable
                onDragStart={(e) => handleLogicalDragStart(e, node)}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-lg">{node.icon}</span>
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-gray-900">{node.name}</h4>
                    <p className="text-xs text-gray-500">{node.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="p-4">
      {/* Sub-tabs */}
      <div className="mb-4">
        <div className="flex flex-wrap gap-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveCatalogueTab(tab.id)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                activeCatalogueTab === tab.id
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {renderContent()}
    </div>
  );
}