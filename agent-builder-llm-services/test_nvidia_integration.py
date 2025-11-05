"""Test script for NVIDIA NIM integration."""

import asyncio
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


async def test_nvidia_client():
    """Test NVIDIA client connection."""
    print("🧪 Testing NVIDIA Client...")

    from src.services.nvidia_client import NVIDIAClient

    try:
        client = NVIDIAClient()

        # Test embedding generation
        print("  - Testing embedding generation...")
        embeddings = await client.generate_embeddings(
            model="nvidia/nv-embedqa-e5-v5",
            texts=["test message"],
            input_type="query"
        )
        print(f"  ✅ Generated embedding of length: {len(embeddings[0])}")

        # Test completion generation
        print("  - Testing completion generation...")
        response = await client.generate_completion(
            model="meta/llama-3.1-nemotron-nano-8b-v1",
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": "Say 'Hello' in JSON format: {\"message\": \"...\"}"}
            ],
            temperature=0.7,
            max_tokens=100
        )
        print(f"  ✅ Generated completion: {response['choices'][0]['message']['content'][:100]}...")

        return True

    except Exception as e:
        print(f"  ❌ Error: {str(e)}")
        return False


async def test_embedding_service():
    """Test embedding service and semantic search."""
    print("\n🧪 Testing Embedding Service...")

    from src.services.nvidia_client import NVIDIAClient
    from src.services.embedding_service import EmbeddingService
    from src.services.catalog_data import get_all_catalog_items

    try:
        client = NVIDIAClient()
        service = EmbeddingService(client)

        # Index catalog
        print("  - Indexing catalog...")
        catalog = get_all_catalog_items()
        await service.index_catalog(catalog)
        print(f"  ✅ Indexed {len(catalog)} items")

        # Test semantic search
        print("  - Testing semantic search...")
        results = await service.search("code review and git", top_k=3)
        print(f"  ✅ Found {len(results)} results:")
        for result in results:
            print(f"    - {result['name']} (score: {result['similarity_score']:.3f})")

        return True

    except Exception as e:
        print(f"  ❌ Error: {str(e)}")
        return False


async def test_workflow_generator():
    """Test workflow generation."""
    print("\n🧪 Testing Workflow Generator...")

    from src.services.service_manager import service_manager

    try:
        # Get workflow generator from service manager
        print("  - Initializing workflow generator...")
        generator = await service_manager.get_workflow_generator()
        print("  ✅ Workflow generator initialized")

        # Generate workflow
        print("  - Generating workflow for 'code review'...")
        result = await generator.generate_workflow("Create a code review workflow with git")

        print(f"  ✅ Generated workflow:")
        print(f"    Response: {result['response_text'][:100]}...")
        if result['generated_flow']:
            print(f"    Nodes: {len(result['generated_flow']['nodes'])}")
            print(f"    Edges: {len(result['generated_flow']['edges'])}")
            for node in result['generated_flow']['nodes']:
                print(f"      - {node['data']['name']} ({node['kind']})")

        return True

    except Exception as e:
        print(f"  ❌ Error: {str(e)}")
        return False


async def test_api_endpoint():
    """Test the API endpoint."""
    print("\n🧪 Testing API Endpoint...")

    import httpx

    try:
        print("  - Calling /api/chat/generate-flow...")
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "http://localhost:5001/api/chat/generate-flow",
                json={
                    "message": "Create a code review workflow",
                    "history": []
                }
            )

            if response.status_code == 200:
                data = response.json()
                print(f"  ✅ API Response:")
                print(f"    Message: {data['response']['content'][:100]}...")
                if data.get('generatedFlow'):
                    print(f"    Nodes: {len(data['generatedFlow']['nodes'])}")
                    print(f"    Edges: {len(data['generatedFlow']['edges'])}")
                return True
            else:
                print(f"  ❌ API Error: {response.status_code} - {response.text}")
                return False

    except httpx.ConnectError:
        print("  ⚠️  Could not connect to API (is the server running?)")
        return False
    except Exception as e:
        print(f"  ❌ Error: {str(e)}")
        return False


async def main():
    """Run all tests."""
    print("=" * 60)
    print("NVIDIA NIM Integration Test Suite")
    print("=" * 60)

    # Check environment
    api_key = os.getenv("NVIDIA_API_KEY")
    if not api_key:
        print("\n❌ NVIDIA_API_KEY not found in environment")
        print("Please set it in .env file or export it:")
        print("  export NVIDIA_API_KEY=nvapi-xxxxx")
        return

    print(f"\n✅ Found NVIDIA API key: {api_key[:10]}...")

    # Run tests
    results = []

    results.append(("NVIDIA Client", await test_nvidia_client()))
    results.append(("Embedding Service", await test_embedding_service()))
    results.append(("Workflow Generator", await test_workflow_generator()))
    results.append(("API Endpoint", await test_api_endpoint()))

    # Summary
    print("\n" + "=" * 60)
    print("Test Summary")
    print("=" * 60)

    passed = sum(1 for _, result in results if result)
    total = len(results)

    for name, result in results:
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{name:.<40} {status}")

    print(f"\nTotal: {passed}/{total} tests passed")

    if passed == total:
        print("\n🎉 All tests passed! NVIDIA NIM integration is working correctly.")
    else:
        print("\n⚠️  Some tests failed. Check the output above for details.")


if __name__ == "__main__":
    asyncio.run(main())
