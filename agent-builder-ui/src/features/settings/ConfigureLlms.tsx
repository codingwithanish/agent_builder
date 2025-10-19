import React from 'react';
import { useSettingsStore } from '@/state/settingsStore';
import { CreateLlmModal } from './CreateLlmModal';

export function ConfigureLlms() {
  const { llms, isLoading, openCreateLlmModal, isCreateLlmModalOpen, closeCreateLlmModal } = useSettingsStore();

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        {[1, 2].map(i => (
          <div key={i} className="h-12 bg-gray-200 rounded" />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h4 className="text-sm font-medium text-gray-900">Configured LLMs</h4>
          <button
            onClick={openCreateLlmModal}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Create New LLM
          </button>
        </div>

        {llms.length === 0 ? (
          <div className="text-center py-6 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">No LLMs configured yet.</p>
            <p className="text-xs text-gray-400 mt-1">Create your first LLM to get started.</p>
          </div>
        ) : (
          <div className="overflow-hidden bg-white border border-gray-200 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Model
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    API Key
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created At
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {llms.map(llm => (
                  <tr key={llm.id}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {llm.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {llm.model}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {llm.apiKeyMasked || '***hidden***'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(llm.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CreateLlmModal 
        isOpen={isCreateLlmModalOpen} 
        onClose={closeCreateLlmModal} 
      />
    </>
  );
}