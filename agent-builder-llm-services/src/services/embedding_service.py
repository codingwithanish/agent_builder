"""Embedding service for semantic search over catalog."""

import json
from typing import Dict, List, Optional, Tuple
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

from .nvidia_client import NVIDIAClient


class EmbeddingService:
    """Service for generating and searching embeddings."""

    def __init__(self, nvidia_client: Optional[NVIDIAClient] = None):
        """Initialize embedding service.

        Args:
            nvidia_client: NVIDIA client instance
        """
        self.nvidia_client = nvidia_client or NVIDIAClient()
        self.embedding_model = "nvidia/nv-embedqa-e5-v5"

        # In-memory catalog storage (in production, use vector DB like Pinecone/Weaviate)
        self.catalog_embeddings: Dict[str, np.ndarray] = {}
        self.catalog_metadata: Dict[str, Dict] = {}

    async def index_catalog_item(
        self,
        item_id: str,
        text: str,
        metadata: Dict
    ) -> None:
        """Index a catalog item with its embedding.

        Args:
            item_id: Unique identifier for the item
            text: Text to embed (name + description)
            metadata: Item metadata (kind, name, description, etc.)
        """
        # Generate embedding for the item
        embeddings = await self.nvidia_client.generate_embeddings(
            model=self.embedding_model,
            texts=[text],
            input_type="passage"
        )

        # Store embedding and metadata
        self.catalog_embeddings[item_id] = np.array(embeddings[0])
        self.catalog_metadata[item_id] = metadata

    async def index_catalog(self, catalog_items: List[Dict]) -> None:
        """Index multiple catalog items.

        Args:
            catalog_items: List of catalog items with id, kind, name, description
        """
        for item in catalog_items:
            # Create searchable text from name and description
            text = f"{item['name']}. {item.get('description', '')}"

            await self.index_catalog_item(
                item_id=item['id'],
                text=text,
                metadata=item
            )

    async def search(
        self,
        query: str,
        top_k: int = 5,
        kind_filter: Optional[str] = None
    ) -> List[Dict]:
        """Search catalog using semantic similarity.

        Args:
            query: Search query
            top_k: Number of results to return
            kind_filter: Filter by item kind ('agent' or 'tool')

        Returns:
            List of matching items with similarity scores
        """
        if not self.catalog_embeddings:
            return []

        # Generate query embedding
        query_embeddings = await self.nvidia_client.generate_embeddings(
            model=self.embedding_model,
            texts=[query],
            input_type="query"
        )
        query_embedding = np.array(query_embeddings[0]).reshape(1, -1)

        # Filter by kind if specified
        candidate_ids = list(self.catalog_embeddings.keys())
        if kind_filter:
            candidate_ids = [
                item_id for item_id in candidate_ids
                if self.catalog_metadata[item_id].get('kind') == kind_filter
            ]

        if not candidate_ids:
            return []

        # Compute similarities
        candidate_embeddings = np.array([
            self.catalog_embeddings[item_id] for item_id in candidate_ids
        ])

        similarities = cosine_similarity(query_embedding, candidate_embeddings)[0]

        # Get top-k results
        top_indices = np.argsort(similarities)[::-1][:top_k]

        results = []
        for idx in top_indices:
            item_id = candidate_ids[idx]
            results.append({
                **self.catalog_metadata[item_id],
                'similarity_score': float(similarities[idx])
            })

        return results

    async def get_relevant_components(
        self,
        user_intent: str,
        max_agents: int = 5,
        max_tools: int = 5
    ) -> Dict[str, List[Dict]]:
        """Get relevant agents and tools for a user intent.

        Args:
            user_intent: User's workflow description
            max_agents: Maximum number of agents to retrieve
            max_tools: Maximum number of tools to retrieve

        Returns:
            Dict with 'agents' and 'tools' lists
        """
        # Search for relevant agents
        agents = await self.search(user_intent, top_k=max_agents, kind_filter='agent')

        # Search for relevant tools
        tools = await self.search(user_intent, top_k=max_tools, kind_filter='tool')

        return {
            'agents': agents,
            'tools': tools
        }

    def get_catalog_summary(self) -> str:
        """Get a formatted summary of catalog items for LLM context.

        Returns:
            Formatted string with catalog items
        """
        agents = []
        tools = []

        for item_id, metadata in self.catalog_metadata.items():
            item_str = f"- {metadata['name']} (ID: {metadata['id']}): {metadata.get('description', 'No description')}"

            if metadata['kind'] == 'agent':
                agents.append(item_str)
            elif metadata['kind'] == 'tool':
                tools.append(item_str)

        summary = "**Available Agents:**\n" + "\n".join(agents) if agents else ""
        summary += "\n\n**Available Tools:**\n" + "\n".join(tools) if tools else ""

        return summary
