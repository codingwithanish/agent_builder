import React, { useState } from 'react';
import { Modal } from '@/components/common/Modal';
import { useResourceStore } from '@/state/resourceStore';

interface AddResourcesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddResourcesModal({ isOpen, onClose }: AddResourcesModalProps) {
  const { uploadResource, isUploading, validateFile } = useResourceStore();
  const [formData, setFormData] = useState({
    name: '',
    file: null as File | null
  });
  const [error, setError] = useState<string>('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validation = validateFile(file);
      if (!validation.valid) {
        setError(validation.error || 'Invalid file');
        setFormData({ ...formData, file: null });
      } else {
        setError('');
        setFormData({ ...formData, file });
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.file) return;

    try {
      await uploadResource({ name: formData.name, file: formData.file });
      setFormData({ name: '', file: null });
      setError('');
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Upload failed');
    }
  };

  const handleClose = () => {
    setFormData({ name: '', file: null });
    setError('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add Resources">
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
            placeholder="Enter resource name"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            File *
          </label>
          <input
            type="file"
            onChange={handleFileChange}
            accept=".zip,.json,.yaml,.yml,.js,.ts"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            Allowed: .zip, .json, .yaml, .yml, .js, .ts (max 50MB)
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            disabled={isUploading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
            disabled={isUploading || !formData.name || !formData.file}
          >
            {isUploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </form>
    </Modal>
  );
}