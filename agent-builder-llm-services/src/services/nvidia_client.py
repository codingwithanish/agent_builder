"""NVIDIA NIM client for API integration."""

import json
from typing import Dict, List, Optional, Any
import httpx
from ..core.config import settings


class NVIDIAClient:
    """Client for NVIDIA NIM API."""

    def __init__(self, api_key: Optional[str] = None, base_url: Optional[str] = None):
        """Initialize NVIDIA client.

        Args:
            api_key: NVIDIA API key (defaults to settings)
            base_url: NVIDIA API base URL (defaults to settings)
        """
        self.api_key = api_key or settings.nvidia_api_key
        self.base_url = base_url or settings.nvidia_base_url

        if not self.api_key:
            raise ValueError("NVIDIA API key is required")

        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

    async def generate_completion(
        self,
        model: str,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 2048,
        response_format: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Generate completion using NVIDIA NIM.

        Args:
            model: Model identifier (e.g., 'meta/llama-3.1-nemotron-nano-8b-v1')
            messages: List of message dicts with 'role' and 'content'
            temperature: Sampling temperature
            max_tokens: Maximum tokens to generate
            response_format: Optional JSON schema for structured output

        Returns:
            Response dict with generated content
        """
        url = f"{self.base_url}/chat/completions"

        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

        # Add JSON schema if provided for constrained decoding
        if response_format:
            payload["response_format"] = response_format

        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(url, json=payload, headers=self.headers)
            response.raise_for_status()

            result = response.json()
            return result

    async def generate_embeddings(
        self,
        model: str,
        texts: List[str],
        input_type: str = "query"
    ) -> List[List[float]]:
        """Generate embeddings using NVIDIA embedding model.

        Args:
            model: Embedding model (e.g., 'nvidia/nv-embedqa-e5-v5')
            texts: List of texts to embed
            input_type: Type of input ('query' or 'passage')

        Returns:
            List of embedding vectors
        """
        url = f"{self.base_url}/embeddings"

        payload = {
            "model": model,
            "input": texts,
            "input_type": input_type,
            "encoding_format": "float",
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(url, json=payload, headers=self.headers)
            response.raise_for_status()

            result = response.json()
            # Extract embeddings from response
            embeddings = [item["embedding"] for item in result["data"]]
            return embeddings

    async def test_connection(self) -> bool:
        """Test connection to NVIDIA API.

        Returns:
            True if connection is successful
        """
        try:
            # Try a simple embedding request
            await self.generate_embeddings(
                model="nvidia/nv-embedqa-e5-v5",
                texts=["test"],
                input_type="query"
            )
            return True
        except Exception:
            return False
