import React, { useState, useRef, useEffect } from 'react';
import { useApiClient } from '@/app/providers/ApiClientProvider';
import { useFlowStore } from '@/state/flowStore';
import type { ChatMessage, GeneratedFlow } from '@/lib/types';

export function AIChatPanel() {
  const apiClient = useApiClient();
  const { activeFlow, updateActiveFlow } = useFlowStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const { response, generatedFlow } = await apiClient.sendChatMessage(
        userMessage.content,
        messages
      );

      setMessages(prev => [...prev, response]);

      // If a flow was generated and we have an active flow, apply it
      if (generatedFlow && activeFlow) {
        applyGeneratedFlow(generatedFlow);
      }
    } catch (error) {
      console.error('Error sending chat message:', error);

      const errorMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const applyGeneratedFlow = (generatedFlow: GeneratedFlow) => {
    if (!activeFlow) return;

    // Find existing input and output nodes
    const inputNode = activeFlow.nodes.find(n => n.kind === 'input');
    const outputNode = activeFlow.nodes.find(n => n.kind === 'output');

    if (!inputNode || !outputNode) {
      console.error('Active flow must have input and output nodes');
      return;
    }

    // Create unique IDs for nodes and edges
    const timestamp = Date.now();
    const nodeIdMap = new Map<string, string>();

    // Map markers to actual node IDs
    nodeIdMap.set('__INPUT__', inputNode.id);
    nodeIdMap.set('__OUTPUT__', outputNode.id);

    // Generate new IDs for generated nodes and add to map
    const newNodes = generatedFlow.nodes.map((node, index) => {
      const newId = `${node.kind}-${timestamp}-${index}`;
      nodeIdMap.set(node.id, newId);
      return {
        ...node,
        id: newId
      };
    });

    // Update edge references with mapped IDs
    const newEdges = generatedFlow.edges.map((edge, index) => ({
      ...edge,
      id: `edge-${timestamp}-${index}`,
      source: nodeIdMap.get(edge.source) || edge.source,
      target: nodeIdMap.get(edge.target) || edge.target
    }));

    // Filter out edges that would duplicate existing input->output connections
    const existingEdges = activeFlow.edges;
    const filteredNewEdges = newEdges.filter(newEdge => {
      // Don't add if this exact edge already exists
      return !existingEdges.some(existing =>
        existing.source === newEdge.source && existing.target === newEdge.target
      );
    });

    // Remove any direct input->output edge if we're adding nodes in between
    const edgesToKeep = existingEdges.filter(edge => {
      // Keep all edges except direct input->output if we have new nodes
      if (newNodes.length > 0 && edge.source === inputNode.id && edge.target === outputNode.id) {
        return false;
      }
      return true;
    });

    // Merge with existing flow
    updateActiveFlow({
      nodes: [...activeFlow.nodes, ...newNodes],
      edges: [...edgesToKeep, ...filteredNewEdges]
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearChat = () => {
    setMessages([]);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">AI Chat</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Describe your workflow and I'll help create it
            </p>
          </div>
          {messages.length > 0 && (
            <button
              onClick={handleClearChat}
              className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 mb-3">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <p className="text-sm text-gray-600 font-medium">Start a conversation</p>
            <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
              Tell me what kind of agentic workflow you want to create, and I'll help you build it.
            </p>
            <div className="mt-4 space-y-2 text-left max-w-xs mx-auto">
              <p className="text-xs font-semibold text-gray-700">Try asking:</p>
              <div className="space-y-1">
                {[
                  'Create a code review workflow',
                  'Build a data analysis pipeline',
                  'Set up a translation workflow'
                ].map((example, idx) => (
                  <button
                    key={idx}
                    onClick={() => setInput(example)}
                    className="block w-full text-left text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2 py-1 rounded"
                  >
                    "{example}"
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-4 py-2 ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <div className="text-sm whitespace-pre-wrap break-words">
                    {message.content}
                  </div>
                  <div
                    className={`text-xs mt-1 ${
                      message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                    }`}
                  >
                    {new Date(message.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg px-4 py-2">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-gray-200">
        {!activeFlow ? (
          <div className="text-center py-2 px-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-xs text-yellow-800">
              Please create or open a flow first to use AI Chat
            </p>
          </div>
        ) : (
          <div className="flex space-x-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Describe your workflow..."
              disabled={isLoading}
              className="flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              rows={2}
            />
            <button
              onClick={handleSendMessage}
              disabled={!input.trim() || isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors self-end"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
