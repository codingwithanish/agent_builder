import React from 'react';
import { useResourceStore } from '@/state/resourceStore';

export function AddResourcesButton() {
  const openAddResourceModal = useResourceStore(state => state.openAddResourceModal);

  return (
    <button
      onClick={openAddResourceModal}
      className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
    >
      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
      Add Resources
    </button>
  );
}