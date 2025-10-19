import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Header } from './header/Header';
import { Sidebar } from './sidebar/Sidebar';
import { FlowEditor } from '@/features/flows/FlowEditor';
import { RightPanel } from './right-panel/RightPanel';
import { HelpPanel } from './HelpPanel';
import { AddResourcesModal } from '@/features/resources/AddResourcesModal';
import { AgentDrawer } from './drawers/AgentDrawer';
import { ToolDrawer } from './drawers/ToolDrawer';
import { ConditionDrawer } from './drawers/ConditionDrawer';
import { HumanDrawer } from './drawers/HumanDrawer';
import { useFlowStore } from '@/state/flowStore';
import { usePanelStore } from '@/state/panelStore';
import { useResourceStore } from '@/state/resourceStore';

export function AppShell() {
  const { flowId } = useParams();
  const { activeFlow, openFlow, clearActiveFlow } = useFlowStore();
  const { rightPanelVisible, activeDrawer } = usePanelStore();
  const { isAddResourceModalOpen, closeAddResourceModal } = useResourceStore();

  useEffect(() => {
    if (flowId) {
      openFlow(flowId);
    } else {
      clearActiveFlow();
    }
  }, [flowId, openFlow, clearActiveFlow]);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <Header />
      
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        
        <main className="flex-1 flex">
          {activeFlow ? (
            <>
              <FlowEditor />
              {rightPanelVisible && <RightPanel />}
              {activeDrawer === 'agent' && <AgentDrawer />}
              {activeDrawer === 'tool' && <ToolDrawer />}
              {activeDrawer === 'condition' && <ConditionDrawer />}
              {activeDrawer === 'human' && <HumanDrawer />}
            </>
          ) : (
            <HelpPanel />
          )}
        </main>
      </div>
      
      <AddResourcesModal 
        isOpen={isAddResourceModalOpen}
        onClose={closeAddResourceModal}
      />
    </div>
  );
}