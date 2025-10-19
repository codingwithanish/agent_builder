import React, { useState } from 'react';
import { CreateFlowModal } from '@/features/flows/CreateFlowModal';

export function CreateFlowButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="w-full flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
      >
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Create New Flow
      </button>
      
      <CreateFlowModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}