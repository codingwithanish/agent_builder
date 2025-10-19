import React, { useState, useEffect } from 'react';
import { useFlowStore } from '@/state/flowStore';
import type { TestRun } from '@/lib/types';

interface TestFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
  flowId: string;
}

export function TestFlowModal({ isOpen, onClose, flowId }: TestFlowModalProps) {
  const { testFlow, activeFlow } = useFlowStore();
  const [testInput, setTestInput] = useState('');
  const [currentTest, setCurrentTest] = useState<TestRun | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const handleStartTest = async () => {
    if (!testInput.trim()) return;

    setIsRunning(true);
    try {
      const testRun = await testFlow(flowId, testInput);
      setCurrentTest(testRun);
    } catch (error) {
      console.error('Failed to start test:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const handleClose = () => {
    setTestInput('');
    setCurrentTest(null);
    setIsRunning(false);
    onClose();
  };

  useEffect(() => {
    if (!isOpen) {
      setTestInput('');
      setCurrentTest(null);
      setIsRunning(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            Test Flow: {activeFlow?.name}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          {!currentTest ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Test Input
                </label>
                <textarea
                  value={testInput}
                  onChange={(e) => setTestInput(e.target.value)}
                  placeholder="Enter your test input here..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-sm text-gray-500 mt-1">
                  This input will be passed to the first node in your flow
                </p>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleStartTest}
                  disabled={!testInput.trim() || isRunning}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {isRunning ? 'Starting Test...' : 'Start Test'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Test Status */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-medium text-gray-900">Test Run Status</h3>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    currentTest.status === 'completed' ? 'bg-green-100 text-green-800' :
                    currentTest.status === 'failed' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {currentTest.status}
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  Started: {new Date(currentTest.startTime).toLocaleString()}
                </p>
                {currentTest.endTime && (
                  <p className="text-sm text-gray-600">
                    Completed: {new Date(currentTest.endTime).toLocaleString()}
                  </p>
                )}
              </div>

              {/* Execution Steps */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">Execution Steps</h4>
                <div className="space-y-3">
                  {currentTest.steps.map((step, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-medium text-gray-900">{step.nodeName}</h5>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          step.status === 'completed' ? 'bg-green-100 text-green-800' :
                          step.status === 'failed' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {step.status}
                        </span>
                      </div>
                      
                      {step.input && (
                        <div className="mb-2">
                          <p className="text-sm font-medium text-gray-700">Input:</p>
                          <pre className="text-sm text-gray-600 bg-gray-50 p-2 rounded mt-1 whitespace-pre-wrap">
                            {step.input}
                          </pre>
                        </div>
                      )}
                      
                      {step.output && (
                        <div className="mb-2">
                          <p className="text-sm font-medium text-gray-700">Output:</p>
                          <pre className="text-sm text-gray-600 bg-gray-50 p-2 rounded mt-1 whitespace-pre-wrap">
                            {step.output}
                          </pre>
                        </div>
                      )}
                      
                      {step.error && (
                        <div className="mb-2">
                          <p className="text-sm font-medium text-red-700">Error:</p>
                          <pre className="text-sm text-red-600 bg-red-50 p-2 rounded mt-1 whitespace-pre-wrap">
                            {step.error}
                          </pre>
                        </div>
                      )}
                      
                      <p className="text-xs text-gray-500">
                        Duration: {step.duration}ms
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Final Output */}
              {currentTest.output && (
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="text-md font-medium text-green-900 mb-2">Final Output</h4>
                  <pre className="text-sm text-green-800 whitespace-pre-wrap">
                    {currentTest.output}
                  </pre>
                </div>
              )}

              {/* Run Another Test */}
              <div className="flex justify-between">
                <button
                  onClick={() => setCurrentTest(null)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Run Another Test
                </button>
                <button
                  onClick={handleClose}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}