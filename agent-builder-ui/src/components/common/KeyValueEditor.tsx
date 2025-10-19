import React, { useState } from 'react';

interface KeyValueEditorProps {
  data: Record<string, string>;
  onChange: (data: Record<string, string>) => void;
}

export function KeyValueEditor({ data, onChange }: KeyValueEditorProps) {
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  const entries = Object.entries(data);

  const handleAdd = () => {
    if (newKey.trim() && !data[newKey]) {
      onChange({ ...data, [newKey]: newValue });
      setNewKey('');
      setNewValue('');
    }
  };

  const handleUpdate = (key: string, value: string) => {
    onChange({ ...data, [key]: value });
  };

  const handleRemove = (key: string) => {
    const newData = { ...data };
    delete newData[key];
    onChange(newData);
  };

  return (
    <div className="space-y-2">
      {/* Existing entries */}
      {entries.map(([key, value]) => (
        <div key={key} className="flex space-x-2">
          <input
            type="text"
            value={key}
            disabled
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm"
          />
          <input
            type="text"
            value={value}
            onChange={(e) => handleUpdate(key, e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
          <button
            onClick={() => handleRemove(key)}
            className="px-2 py-2 text-red-600 hover:text-red-800"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      ))}

      {/* Add new entry */}
      <div className="flex space-x-2">
        <input
          type="text"
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
          placeholder="Key"
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
        <input
          type="text"
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          placeholder="Value"
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
        <button
          onClick={handleAdd}
          disabled={!newKey.trim() || data[newKey]}
          className="px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Add
        </button>
      </div>

      {entries.length === 0 && (
        <p className="text-xs text-gray-500 italic">No environment variables set</p>
      )}
    </div>
  );
}