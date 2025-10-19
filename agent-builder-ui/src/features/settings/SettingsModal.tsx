import React from 'react';
import { Modal } from '@/components/common/Modal';
import { ConfigureLlms } from './ConfigureLlms';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Settings" size="lg">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Configure LLMs</h3>
          <ConfigureLlms />
        </div>
      </div>
    </Modal>
  );
}