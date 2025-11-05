"""Service manager for singleton instances."""

from typing import Optional
from .nvidia_client import NVIDIAClient
from .embedding_service import EmbeddingService
from .workflow_generator import WorkflowGenerator
from .catalog_data import get_all_catalog_items


class ServiceManager:
    """Singleton manager for AI services."""

    _instance: Optional['ServiceManager'] = None
    _nvidia_client: Optional[NVIDIAClient] = None
    _embedding_service: Optional[EmbeddingService] = None
    _workflow_generator: Optional[WorkflowGenerator] = None
    _catalog_indexed: bool = False

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    async def get_nvidia_client(self) -> NVIDIAClient:
        """Get or create NVIDIA client."""
        if self._nvidia_client is None:
            self._nvidia_client = NVIDIAClient()
        return self._nvidia_client

    async def get_embedding_service(self) -> EmbeddingService:
        """Get or create embedding service with indexed catalog."""
        if self._embedding_service is None:
            nvidia_client = await self.get_nvidia_client()
            self._embedding_service = EmbeddingService(nvidia_client)

            # Index catalog on first initialization
            if not self._catalog_indexed:
                catalog_items = get_all_catalog_items()
                await self._embedding_service.index_catalog(catalog_items)
                self._catalog_indexed = True

        return self._embedding_service

    async def get_workflow_generator(self) -> WorkflowGenerator:
        """Get or create workflow generator."""
        if self._workflow_generator is None:
            nvidia_client = await self.get_nvidia_client()
            embedding_service = await self.get_embedding_service()
            self._workflow_generator = WorkflowGenerator(nvidia_client, embedding_service)

        return self._workflow_generator

    def reset(self):
        """Reset all services (useful for testing)."""
        self._nvidia_client = None
        self._embedding_service = None
        self._workflow_generator = None
        self._catalog_indexed = False


# Global service manager instance
service_manager = ServiceManager()
