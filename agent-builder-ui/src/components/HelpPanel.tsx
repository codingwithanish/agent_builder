import React from 'react';

export function HelpPanel() {
  return (
    <div className="flex-1 flex items-center justify-center bg-gray-50">
      <div className="max-w-2xl mx-auto text-center p-8">
        <div className="mb-8">
          <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome to Agent Builder
          </h1>
          <p className="text-gray-600">
            Create and deploy intelligent agent workflows.
          </p>
        </div>

        <div className="text-left bg-white rounded-lg p-6 shadow-sm border">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Get started</h2>
          <ol className="space-y-3 text-sm text-gray-700">
            <li className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-xs font-semibold mr-3 mt-0.5">
                1
              </span>
              <div>
                Click <strong>Create New Flow</strong> in the left sidebar.
              </div>
            </li>
            <li className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-xs font-semibold mr-3 mt-0.5">
                2
              </span>
              <div>
                Name it, add a short description, and pick an LLM (Configure LLMs in Settings first).
              </div>
            </li>
            <li className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-xs font-semibold mr-3 mt-0.5">
                3
              </span>
              <div>
                Drag <strong>Agents</strong>, <strong>Tools</strong>, and <strong>Logical Nodes</strong> from the right panel onto the canvas.
              </div>
            </li>
            <li className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-xs font-semibold mr-3 mt-0.5">
                4
              </span>
              <div>
                Click <strong>Publish</strong> to deploy, then <strong>Test</strong> to run an input JSON.
              </div>
            </li>
          </ol>

          <div className="mt-6 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Need help? Open <strong>Settings → Configure LLMs</strong> to add providers, 
              or <strong>Add Resources</strong> to upload artifacts.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}