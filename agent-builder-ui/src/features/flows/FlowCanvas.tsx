import React, { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  BackgroundVariant,
  MiniMap,
  useReactFlow,
  EdgeChange,
  NodeChange,
  reconnectEdge,
} from 'reactflow';
import { useFlowStore } from '@/state/flowStore';
import { InputNode } from '@/features/flows/node-types/InputNode';
import { OutputNode } from '@/features/flows/node-types/OutputNode';
import { AgentNode } from '@/features/flows/node-types/AgentNode';
import { ToolNode } from '@/features/flows/node-types/ToolNode';
import { ConditionNode } from '@/features/flows/node-types/ConditionNode';
import { HumanNode } from '@/features/flows/node-types/HumanNode';
import type { RFNode } from '@/lib/types';

const nodeTypes = {
  input: InputNode,
  output: OutputNode,
  agent: AgentNode,
  tool: ToolNode,
  condition: ConditionNode,
  human: HumanNode,
};

export function FlowCanvas() {
  const { activeFlow, updateActiveFlow } = useFlowStore();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();
  const edgeReconnectSuccessful = useRef(true);
  
  // Convert flow nodes to ReactFlow format
  const initialNodes: Node[] = activeFlow?.nodes?.map(node => ({
    id: node.id,
    type: node.kind,
    position: node.position,
    data: { ...node.data, status: node.status },
  })) || [];

  const initialEdges: Edge[] = activeFlow?.edges?.map(edge => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: edge.label,
  })) || [];

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes when nodes are added/removed or status changes
  // But preserve current positions to avoid resetting user's manual positioning
  useEffect(() => {
    if (activeFlow) {
      setNodes(currentNodes => {
        const currentNodeMap = new Map(currentNodes.map(n => [n.id, n]));

        // Check if we need to update (new nodes, removed nodes, or status changes)
        const currentNodeIds = new Set(currentNodes.map(n => n.id));
        const flowNodeIds = new Set(activeFlow.nodes.map(n => n.id));

        const nodesChanged = currentNodeIds.size !== flowNodeIds.size ||
                           !Array.from(currentNodeIds).every(id => flowNodeIds.has(id));

        const statusChanged = activeFlow.nodes.some(node => {
          const currentNode = currentNodeMap.get(node.id);
          return currentNode && currentNode.data.status !== node.status;
        });

        if (nodesChanged || statusChanged) {
          return activeFlow.nodes.map(node => {
            const currentNode = currentNodeMap.get(node.id);
            return {
              id: node.id,
              type: node.kind,
              // Preserve current position if node exists, otherwise use flow position
              position: currentNode?.position || node.position,
              data: { ...node.data, status: node.status },
            };
          });
        }

        return currentNodes;
      });
    }
  }, [activeFlow?.nodes, setNodes]);

  // Update edges when edges are added/removed
  useEffect(() => {
    if (activeFlow) {
      setEdges(currentEdges => {
        // Check if edges have changed
        const currentEdgeIds = new Set(currentEdges.map(e => e.id));
        const flowEdgeIds = new Set(activeFlow.edges.map(e => e.id));

        const edgesChanged = currentEdgeIds.size !== flowEdgeIds.size ||
                            !Array.from(currentEdgeIds).every(id => flowEdgeIds.has(id));

        if (edgesChanged) {
          return activeFlow.edges.map(edge => ({
            id: edge.id,
            source: edge.source,
            target: edge.target,
            label: edge.label,
          }));
        }

        return currentEdges;
      });
    }
  }, [activeFlow?.edges, setEdges]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  // Debounced save function to avoid too frequent updates
  const debouncedSave = useMemo(() => {
    let timeoutId: NodeJS.Timeout;
    return (updatedNodes: any[]) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        updateActiveFlow({ nodes: updatedNodes });
      }, 300); // 300ms debounce
    };
  }, [updateActiveFlow]);

  // Handle node changes (including position updates)
  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    onNodesChange(changes);
    
    // Save position changes back to the flow store (only when dragging stops)
    const positionChanges = changes.filter(change => change.type === 'position' && change.dragging === false);
    if (positionChanges.length > 0 && activeFlow) {
      const updatedNodes = activeFlow.nodes.map(node => {
        const positionChange = positionChanges.find(change => change.id === node.id);
        if (positionChange && positionChange.type === 'position' && positionChange.position) {
          return { ...node, position: positionChange.position };
        }
        return node;
      });
      
      // Use debounced save to avoid too frequent updates
      debouncedSave(updatedNodes);
    }
  }, [onNodesChange, activeFlow, debouncedSave]);

  // Handle edge reconnection
  const onReconnectStart = useCallback(() => {
    edgeReconnectSuccessful.current = false;
  }, []);

  const onReconnect = useCallback((oldEdge: Edge, newConnection: Connection) => {
    edgeReconnectSuccessful.current = true;
    setEdges((els) => reconnectEdge(oldEdge, newConnection, els));
  }, [setEdges]);

  const onReconnectEnd = useCallback((_: any, edge: Edge) => {
    if (!edgeReconnectSuccessful.current) {
      setEdges((eds) => eds.filter((e) => e.id !== edge.id));
    }
    edgeReconnectSuccessful.current = true;
  }, [setEdges]);

  // Handle edge click to insert node
  const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    event.stopPropagation();
    
    // Calculate position for new node (middle of the edge)
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);
    
    if (sourceNode && targetNode) {
      const midX = (sourceNode.position.x + targetNode.position.x) / 2;
      const midY = (sourceNode.position.y + targetNode.position.y) / 2;
      
      // For now, we'll show a context menu or placeholder
      // In a full implementation, you'd show a node selection menu here
      console.log('Edge clicked - would show node insertion menu at:', { x: midX, y: midY });
    }
  }, [nodes]);

  // Function to insert node between two connected nodes
  const insertNodeBetween = useCallback((
    sourceNodeId: string,
    targetNodeId: string,
    newNodeData: any,
    insertPosition: { x: number; y: number }
  ) => {
    const newNodeId = `${newNodeData.nodeType}-${Date.now()}`;
    
    // Create new node
    const newNode: Node = {
      id: newNodeId,
      type: newNodeData.nodeType,
      position: insertPosition,
      data: {
        name: newNodeData.itemName,
        description: newNodeData.itemDescription,
        sourceItemId: newNodeData.itemId,
        // Initialize with default data based on node type
        ...(newNodeData.nodeType === 'agent' && {
          llmName: activeFlow?.llmName || '',
          env: {}
        }),
        ...(newNodeData.nodeType === 'tool' && {
          env: {}
        }),
        ...(newNodeData.nodeType === 'condition' && {
          scriptType: 'python' as const,
          script: '# Write your condition logic here\n# Return True or False\nreturn True'
        }),
        ...(newNodeData.nodeType === 'human' && {
          ask: 'What would you like to do?',
          promptConfig: 'User input: $input',
          inputValidator: '# Validate the input\nreturn len(input.strip()) > 0'
        })
      },
    };

    // Find and remove the original edge
    const originalEdge = edges.find(e => e.source === sourceNodeId && e.target === targetNodeId);
    if (!originalEdge) return;

    // Create new edges: source -> newNode -> target
    const edgeToNew: Edge = {
      id: `edge-${sourceNodeId}-${newNodeId}`,
      source: sourceNodeId,
      target: newNodeId,
      label: originalEdge.label,
      style: originalEdge.style
    };

    const edgeFromNew: Edge = {
      id: `edge-${newNodeId}-${targetNodeId}`,
      source: newNodeId,
      target: targetNodeId,
      label: '',
      style: originalEdge.style
    };

    // Update nodes and edges
    setNodes(nds => [...nds, newNode]);
    setEdges(eds => {
      const filteredEdges = eds.filter(e => e.id !== originalEdge.id);
      return [...filteredEdges, edgeToNew, edgeFromNew];
    });

    // Update the flow store
    if (activeFlow) {
      const newRFNode: RFNode = {
        id: newNode.id,
        kind: newNodeData.nodeType,
        position: newNode.position,
        data: newNode.data,
        status: 'draft'
      };

      const newRFEdges = [
        {
          id: edgeToNew.id,
          source: edgeToNew.source,
          target: edgeToNew.target,
          label: edgeToNew.label,
          color: 'default' as const
        },
        {
          id: edgeFromNew.id,
          source: edgeFromNew.source,
          target: edgeFromNew.target,
          label: edgeFromNew.label,
          color: 'default' as const
        }
      ];

      updateActiveFlow({
        nodes: [...activeFlow.nodes, newRFNode],
        edges: [
          ...activeFlow.edges.filter(e => e.source !== sourceNodeId || e.target !== targetNodeId),
          ...newRFEdges
        ]
      });
    }
  }, [edges, setNodes, setEdges, activeFlow, updateActiveFlow]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      if (!reactFlowBounds) return;

      try {
        const data = event.dataTransfer.getData('application/reactflow');
        if (!data) return;

        const { nodeType, itemId, itemName, itemDescription } = JSON.parse(data);

        const dropPosition = screenToFlowPosition({
          x: event.clientX - reactFlowBounds.left,
          y: event.clientY - reactFlowBounds.top,
        });

        // Check if dropping on an edge (for node insertion)
        const edgeIntersection = findEdgeIntersection(dropPosition, edges, nodes);
        
        if (edgeIntersection) {
          // Insert node between the connected nodes
          insertNodeBetween(
            edgeIntersection.source,
            edgeIntersection.target,
            { nodeType, itemId, itemName, itemDescription },
            dropPosition
          );
        } else {
          // Regular node creation
          const newNode: Node = {
            id: `${nodeType}-${Date.now()}`,
            type: nodeType === 'agent' || nodeType === 'tool' ? nodeType : nodeType,
            position: dropPosition,
            data: {
              name: itemName,
              description: itemDescription,
              sourceItemId: itemId,
              // Initialize with default data based on node type
              ...(nodeType === 'agent' && {
                llmName: activeFlow?.llmName || '',
                env: {}
              }),
              ...(nodeType === 'tool' && {
                env: {}
              }),
              ...(nodeType === 'condition' && {
                scriptType: 'python' as const,
                script: '# Write your condition logic here\n# Return True or False\nreturn True'
              }),
              ...(nodeType === 'human' && {
                ask: 'What would you like to do?',
                promptConfig: 'User input: $input',
                inputValidator: '# Validate the input\nreturn len(input.strip()) > 0'
              })
            },
          };

          setNodes((nds) => nds.concat(newNode));

          // Update the flow store
          if (activeFlow) {
            const newRFNode: RFNode = {
              id: newNode.id,
              kind: nodeType,
              position: newNode.position,
              data: newNode.data,
              status: 'draft'
            };

            updateActiveFlow({
              nodes: [...activeFlow.nodes, newRFNode]
            });
          }
        }
      } catch (error) {
        console.error('Error dropping node:', error);
      }
    },
    [screenToFlowPosition, setNodes, activeFlow, updateActiveFlow, edges, nodes, insertNodeBetween]
  );

  // Helper function to find if drop position intersects with an edge
  const findEdgeIntersection = useCallback((
    dropPos: { x: number; y: number },
    edges: Edge[],
    nodes: Node[]
  ) => {
    const tolerance = 30; // Pixel tolerance for edge intersection
    
    for (const edge of edges) {
      const sourceNode = nodes.find(n => n.id === edge.source);
      const targetNode = nodes.find(n => n.id === edge.target);
      
      if (sourceNode && targetNode) {
        // Simple distance check to see if drop is near the edge line
        const distance = distanceToLineSegment(
          dropPos,
          { x: sourceNode.position.x + 100, y: sourceNode.position.y + 50 }, // Approximate node center
          { x: targetNode.position.x + 100, y: targetNode.position.y + 50 }   // Approximate node center
        );
        
        if (distance < tolerance) {
          return { source: edge.source, target: edge.target };
        }
      }
    }
    
    return null;
  }, []);

  // Helper function to calculate distance from point to line segment
  const distanceToLineSegment = (
    point: { x: number; y: number },
    start: { x: number; y: number },
    end: { x: number; y: number }
  ) => {
    const A = point.x - start.x;
    const B = point.y - start.y;
    const C = end.x - start.x;
    const D = end.y - start.y;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    if (lenSq !== 0) {
      param = dot / lenSq;
    }

    let xx, yy;
    if (param < 0) {
      xx = start.x;
      yy = start.y;
    } else if (param > 1) {
      xx = end.x;
      yy = end.y;
    } else {
      xx = start.x + param * C;
      yy = start.y + param * D;
    }

    const dx = point.x - xx;
    const dy = point.y - yy;
    return Math.sqrt(dx * dx + dy * dy);
  };

  return (
    <div className="flex-1 relative" ref={reactFlowWrapper}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onReconnect={onReconnect}
        onReconnectStart={onReconnectStart}
        onReconnectEnd={onReconnectEnd}
        onEdgeClick={onEdgeClick}
        nodeTypes={nodeTypes}
        connectionLineType="smoothstep"
        snapToGrid={true}
        snapGrid={[20, 20]}
        fitView
        deleteKeyCode={["Backspace", "Delete"]}
        minZoom={0.2}
        maxZoom={2}
        defaultEdgeOptions={{
          style: { strokeWidth: 2, stroke: '#64748b' },
          type: 'smoothstep',
        }}
      >
        <Controls position="top-left" />
        <Background 
          variant={BackgroundVariant.Dots} 
          gap={20} 
          size={1.5} 
          color="#e2e8f0"
          style={{ backgroundColor: '#fafbfc' }}
        />
        <MiniMap 
          position="bottom-right"
          nodeColor={(node) => {
            switch (node.type) {
              case 'input': return '#3b82f6';
              case 'output': return '#10b981';
              case 'agent': return '#6366f1';
              case 'tool': return '#f59e0b';
              case 'condition': return '#8b5cf6';
              case 'human': return '#ef4444';
              default: return '#64748b';
            }
          }}
          maskColor="rgba(250, 251, 252, 0.8)"
        />
      </ReactFlow>
    </div>
  );
}