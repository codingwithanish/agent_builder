import { useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { EmbeddedScriptsTab } from './EmbeddedScriptsTab';

interface DeploymentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  flowId: string;
  flowName: string;
}

type TabType = 'embedded' | 'rest-api' | 'graphql';

export function DeploymentDetailsModal({
  isOpen,
  onClose,
  flowId,
  flowName,
}: DeploymentDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('embedded');

  const tabs: { id: TabType; label: string; enabled: boolean }[] = [
    { id: 'embedded', label: 'Embedded Scripts', enabled: true },
    { id: 'rest-api', label: 'REST API', enabled: false },
    { id: 'graphql', label: 'GraphQL', enabled: false },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Deployment Details"
      size="xl"
      className="deployment-details-modal"
    >
      <div className="flex flex-col h-full">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-1 px-4" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => tab.enabled && setActiveTab(tab.id)}
                disabled={!tab.enabled}
                className={`
                  px-4 py-3 text-sm font-medium border-b-2 transition-colors
                  ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : tab.enabled
                      ? 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      : 'border-transparent text-gray-300 cursor-not-allowed'
                  }
                `}
              >
                {tab.label}
                {!tab.enabled && (
                  <span className="ml-2 text-xs text-gray-400">(Coming Soon)</span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-auto p-6">
          {activeTab === 'embedded' && (
            <EmbeddedScriptsTab flowId={flowId} flowName={flowName} />
          )}
          {activeTab === 'rest-api' && (
            <div className="text-center text-gray-500 py-12">
              <p className="text-lg font-medium mb-2">REST API Integration</p>
              <p className="text-sm">Coming soon...</p>
            </div>
          )}
          {activeTab === 'graphql' && (
            <div className="text-center text-gray-500 py-12">
              <p className="text-lg font-medium mb-2">GraphQL Integration</p>
              <p className="text-sm">Coming soon...</p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
