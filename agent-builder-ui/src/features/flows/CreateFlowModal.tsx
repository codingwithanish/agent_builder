import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '@/components/common/Modal';
import { useFlowStore } from '@/state/flowStore';
import { useSettingsStore } from '@/state/settingsStore';
import { useToastStore } from '@/state/toastStore';

interface CreateFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateFlowModal({ isOpen, onClose }: CreateFlowModalProps) {
  const navigate = useNavigate();
  const createFlow = useFlowStore(state => state.createFlow);
  const llms = useSettingsStore(state => state.llms);
  const { showSuccess, showError } = useToastStore();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    llmName: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Flow name is required';
    } else if (formData.name.length > 25) {
      newErrors.name = 'Flow name must be 25 characters or less';
    }
    
    if (!formData.llmName) {
      newErrors.llmName = 'Please select an LLM';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    setErrors({});
    
    try {
      const flow = await createFlow(formData);
      showSuccess('Flow Created', `Successfully created flow "${flow.name}"`);
      navigate(`/${flow.id}`);
      onClose();
      setFormData({ name: '', description: '', llmName: '' });
    } catch (error) {
      console.error('Failed to create flow:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create flow. Please try again.';
      showError('Failed to Create Flow', errorMessage);
      setErrors({ general: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Flow">
      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.general && (
          <div className="p-3 text-sm text-red-700 bg-red-100 border border-red-300 rounded-md">
            {errors.general}
          </div>
        )}
        
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
            maxLength={25}
            required
          />
          {errors.name && (
            <p className="text-xs text-red-600 mt-1">{errors.name}</p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            {formData.name.length}/25 characters
          </p>
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
            required
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
          {llms.length === 0 && (
            <p className="text-xs text-amber-600 mt-1">
              No LLMs configured. Add one in Settings first.
            </p>
          )}
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
            disabled={isSubmitting || !formData.name || !formData.llmName}
          >
            {isSubmitting ? 'Creating...' : 'Create Flow'}
          </button>
        </div>
      </form>
    </Modal>
  );
}