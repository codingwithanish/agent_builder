import React, { useState } from 'react';
import { Modal } from '@/components/common/Modal';
import { useSettingsStore } from '@/state/settingsStore';

interface CreateLlmModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateLlmModal({ isOpen, onClose }: CreateLlmModalProps) {
  const { createLlm, testLlm, isTestingLlm, testResult, clearTestResult } = useSettingsStore();
  const [formData, setFormData] = useState({
    name: '',
    model: '',
    apiKey: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleTest = async () => {
    if (!formData.model || !formData.apiKey) return;
    await testLlm({ model: formData.model, apiKey: formData.apiKey });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testResult?.ok) return;
    
    setIsSubmitting(true);
    try {
      await createLlm(formData);
      setFormData({ name: '', model: '', apiKey: '' });
      clearTestResult();
      onClose();
    } catch (error) {
      console.error('Failed to create LLM:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({ name: '', model: '', apiKey: '' });
    clearTestResult();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create New LLM">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., Claude-Primary"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            LLM Provider/Model *
          </label>
          <select
            value={formData.model}
            onChange={(e) => setFormData({ ...formData, model: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Select a model</option>
            <option value="bedrock:claude-v3">AWS Bedrock - Claude v3</option>
            <option value="bedrock:claude-v3.5">AWS Bedrock - Claude v3.5</option>
            <option value="openai:gpt-4">OpenAI - GPT-4</option>
            <option value="openai:gpt-3.5-turbo">OpenAI - GPT-3.5 Turbo</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            API Key *
          </label>
          <input
            type="password"
            value={formData.apiKey}
            onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter your API key"
            required
          />
        </div>

        {/* Test Result */}
        {testResult && (
          <div className={`p-3 rounded-md ${testResult.ok ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <p className={`text-sm ${testResult.ok ? 'text-green-800' : 'text-red-800'}`}>
              {testResult.ok ? 'LLM connection verified' : testResult.message}
            </p>
          </div>
        )}

        <div className="flex justify-between pt-4">
          <button
            type="button"
            onClick={handleTest}
            disabled={!formData.model || !formData.apiKey || isTestingLlm}
            className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 disabled:opacity-50"
          >
            {isTestingLlm ? 'Testing...' : 'Test'}
          </button>
          
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              disabled={isSubmitting || !testResult?.ok}
            >
              {isSubmitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}