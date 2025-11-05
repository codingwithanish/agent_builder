"""Workflow generation service using NVIDIA NIMs."""

import json
from datetime import datetime
from typing import Dict, List, Optional

from .nvidia_client import NVIDIAClient
from .embedding_service import EmbeddingService


# Workflow JSON schema for constrained decoding
WORKFLOW_SCHEMA = {
    "type": "object",
    "properties": {
        "nodes": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "id": {"type": "string"},
                    "kind": {"type": "string", "enum": ["agent", "tool", "condition", "human"]},
                    "position": {
                        "type": "object",
                        "properties": {
                            "x": {"type": "number"},
                            "y": {"type": "number"}
                        },
                        "required": ["x", "y"]
                    },
                    "data": {"type": "object"},
                    "status": {"type": "string", "enum": ["draft", "deploying", "deployed", "failed"]}
                },
                "required": ["id", "kind", "position", "data"]
            }
        },
        "edges": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "id": {"type": "string"},
                    "source": {"type": "string"},
                    "target": {"type": "string"},
                    "label": {"type": "string"},
                    "sourceHandle": {"type": ["string", "null"]},
                    "targetHandle": {"type": ["string", "null"]}
                },
                "required": ["id", "source", "target"]
            }
        },
        "description": {"type": "string"}
    },
    "required": ["nodes", "edges"]
}


class WorkflowGenerator:
    """Service for generating workflows using LLM reasoning."""

    def __init__(
        self,
        nvidia_client: Optional[NVIDIAClient] = None,
        embedding_service: Optional[EmbeddingService] = None
    ):
        """Initialize workflow generator.

        Args:
            nvidia_client: NVIDIA client instance
            embedding_service: Embedding service for retrieval
        """
        self.nvidia_client = nvidia_client or NVIDIAClient()
        self.embedding_service = embedding_service or EmbeddingService(self.nvidia_client)
        self.reasoning_model = "meta/llama-3.1-nemotron-nano-8b-v1"

    def _build_system_prompt(self, retrieved_components: Dict[str, List[Dict]]) -> str:
        """Build system prompt with retrieved context.

        Args:
            retrieved_components: Dict with 'agents' and 'tools' lists

        Returns:
            System prompt string
        """
        agents_context = "\n".join([
            f"- {agent['name']} (ID: {agent['id']}): {agent.get('description', 'No description')}"
            for agent in retrieved_components.get('agents', [])
        ])

        tools_context = "\n".join([
            f"- {tool['name']} (ID: {tool['id']}): {tool.get('description', 'No description')}"
            for tool in retrieved_components.get('tools', [])
        ])

        system_prompt = f"""You are an expert AI workflow architect. Your task is to generate valid workflow JSON based on user requirements.

**Available Agents:**
{agents_context}

**Available Tools:**
{tools_context}

**Instructions:**
1. Create a workflow with appropriate agents and tools based on the user's request
2. Use the special markers "__INPUT__" and "__OUTPUT__" for source/target in edges to connect to existing input/output nodes
3. Position nodes logically on the canvas (x: 200-600, y: 100-500)
4. When tools should be attached to agents, create separate tool nodes and connect them using "sourceHandle": "tool-bottom"
5. All node IDs must be unique and follow the pattern: "agent-<timestamp>-<index>" or "tool-<timestamp>-<index>"
6. All edge IDs must be unique and follow the pattern: "edge-<timestamp>-<index>"
7. Set status to "draft" for all nodes
8. Include a brief description of the workflow

**Node Data Requirements:**
- Agent nodes: {{"agentId": "ID from available agents", "name": "Agent Name", "description": "...", "env": {{}}}}
- Tool nodes: {{"toolId": "ID from available tools", "name": "Tool Name", "description": "...", "env": {{}}}}

**Edge Connection Rules:**
- Main flow: source -> target (connects agents in sequence)
- Tool attachment: agent -> tool with "sourceHandle": "tool-bottom"
- Use "__INPUT__" as source to connect first agent to input node
- Use "__OUTPUT__" as target to connect last agent to output node

**Example Workflow Structure:**
{{
  "nodes": [
    {{
      "id": "agent-1234567890-1",
      "kind": "agent",
      "position": {{"x": 300, "y": 200}},
      "data": {{"agentId": "ca5", "name": "Code Reviewer", "env": {{}}}},
      "status": "draft"
    }},
    {{
      "id": "tool-1234567890-1",
      "kind": "tool",
      "position": {{"x": 300, "y": 380}},
      "data": {{"toolId": "ct9", "name": "Git Tool", "env": {{}}}},
      "status": "draft"
    }}
  ],
  "edges": [
    {{"id": "edge-1234567890-1", "source": "__INPUT__", "target": "agent-1234567890-1"}},
    {{"id": "edge-1234567890-2", "source": "agent-1234567890-1", "sourceHandle": "tool-bottom", "target": "tool-1234567890-1"}},
    {{"id": "edge-1234567890-3", "source": "agent-1234567890-1", "target": "__OUTPUT__"}}
  ],
  "description": "Code review workflow"
}}

Generate ONLY valid JSON. Do not include any explanatory text before or after the JSON."""

        return system_prompt

    async def generate_workflow(
        self,
        user_message: str,
        conversation_history: Optional[List[Dict[str, str]]] = None
    ) -> Dict:
        """Generate workflow from user message using LLM reasoning and retrieval.

        Args:
            user_message: User's workflow description
            conversation_history: Previous messages in conversation

        Returns:
            Dict with 'response_text' and 'generated_flow'
        """
        # Step 1: Retrieve relevant components using embeddings
        retrieved_components = await self.embedding_service.get_relevant_components(
            user_intent=user_message,
            max_agents=5,
            max_tools=5
        )

        # Step 2: Build system prompt with retrieved context
        system_prompt = self._build_system_prompt(retrieved_components)

        # Step 3: Build messages for LLM
        messages = [{"role": "system", "content": system_prompt}]

        # Add conversation history if provided (last 3 messages for context window)
        if conversation_history:
            messages.extend(conversation_history[-3:])

        # Add user message
        messages.append({"role": "user", "content": user_message})

        # Step 4: Call LLM with constrained JSON generation
        try:
            response = await self.nvidia_client.generate_completion(
                model=self.reasoning_model,
                messages=messages,
                temperature=0.7,
                max_tokens=2048,
                response_format={"type": "json_object", "schema": WORKFLOW_SCHEMA}
            )

            # Extract generated content
            generated_content = response['choices'][0]['message']['content']

            # Parse JSON
            workflow_json = json.loads(generated_content)

            # Validate that nodes and edges exist
            if 'nodes' not in workflow_json or 'edges' not in workflow_json:
                raise ValueError("Generated workflow missing required fields")

            # Generate response text
            agent_names = [node['data'].get('name', 'Agent') for node in workflow_json['nodes'] if node['kind'] == 'agent']
            response_text = f"I've created a workflow for you with the following components: {', '.join(agent_names)}. You can see it on the canvas and make any adjustments needed."

            return {
                'response_text': response_text,
                'generated_flow': workflow_json
            }

        except Exception as e:
            # Fallback: Use pattern matching if LLM fails
            return await self._fallback_pattern_matching(user_message)

    async def _fallback_pattern_matching(self, user_message: str) -> Dict:
        """Fallback pattern matching when LLM is unavailable.

        Args:
            user_message: User's message

        Returns:
            Dict with response_text and generated_flow
        """
        message_lower = user_message.lower()
        timestamp = int(datetime.utcnow().timestamp() * 1000)

        # Simple pattern matching (similar to current implementation)
        if "code review" in message_lower or "code reviewer" in message_lower:
            workflow = {
                "nodes": [
                    {
                        "id": f"agent-{timestamp}-1",
                        "kind": "agent",
                        "position": {"x": 300, "y": 200},
                        "data": {
                            "agentId": "ca5",
                            "name": "Code Reviewer",
                            "description": "Reviews code for best practices",
                            "env": {}
                        },
                        "status": "draft"
                    },
                    {
                        "id": f"tool-{timestamp}-1",
                        "kind": "tool",
                        "position": {"x": 300, "y": 380},
                        "data": {
                            "toolId": "ct9",
                            "name": "Git Tool",
                            "description": "Git operations",
                            "env": {}
                        },
                        "status": "draft"
                    },
                    {
                        "id": f"agent-{timestamp}-2",
                        "kind": "agent",
                        "position": {"x": 550, "y": 200},
                        "data": {
                            "agentId": "ca1",
                            "name": "Text Summarizer",
                            "description": "Summarizes review",
                            "env": {}
                        },
                        "status": "draft"
                    }
                ],
                "edges": [
                    {"id": f"edge-{timestamp}-1", "source": "__INPUT__", "target": f"agent-{timestamp}-1"},
                    {"id": f"edge-{timestamp}-2", "source": f"agent-{timestamp}-1", "target": f"agent-{timestamp}-2"},
                    {"id": f"edge-{timestamp}-3", "source": f"agent-{timestamp}-2", "target": "__OUTPUT__"},
                    {
                        "id": f"edge-{timestamp}-tool-1",
                        "source": f"agent-{timestamp}-1",
                        "sourceHandle": "tool-bottom",
                        "target": f"tool-{timestamp}-1"
                    }
                ],
                "description": "Code Review Workflow"
            }
            response_text = "I've created a code review workflow with a Code Reviewer agent, Git Tool, and Text Summarizer."

        elif "data" in message_lower and "analy" in message_lower:
            workflow = {
                "nodes": [
                    {
                        "id": f"agent-{timestamp}",
                        "kind": "agent",
                        "position": {"x": 350, "y": 200},
                        "data": {
                            "agentId": "ca2",
                            "name": "Data Analyzer",
                            "description": "Analyzes data patterns",
                            "env": {}
                        },
                        "status": "draft"
                    }
                ],
                "edges": [
                    {"id": f"edge-{timestamp}-1", "source": "__INPUT__", "target": f"agent-{timestamp}"},
                    {"id": f"edge-{timestamp}-2", "source": f"agent-{timestamp}", "target": "__OUTPUT__"}
                ],
                "description": "Data Analysis Workflow"
            }
            response_text = "I've created a data analysis workflow with a Data Analyzer agent."

        else:
            return {
                'response_text': 'I understand you want to create a workflow. Could you provide more details? For example: "Create a code review workflow" or "Set up a data analysis pipeline".',
                'generated_flow': None
            }

        return {
            'response_text': response_text,
            'generated_flow': workflow
        }
