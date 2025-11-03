"""
AWS Bedrock Agent Core - General Query Agent
Lambda function handler for Bedrock Agent integration

This agent handles product-related queries by:
1. Receiving user queries from Bedrock
2. Calling MCP server to get product data
3. Processing and returning responses to Bedrock
"""

import json
import os
import subprocess
from typing import Dict, List, Any

# MCP Server configuration
MCP_SERVER_PATH = os.environ.get('MCP_SERVER_PATH', '/opt/mcp-server/index.js')
NODE_PATH = os.environ.get('NODE_PATH', '/opt/nodejs/bin/node')


class MCPClient:
    """Client to interact with MCP server via stdio"""

    def __init__(self, server_path: str):
        self.server_path = server_path

    def call_tool(self, tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Call an MCP tool and return the result"""

        # Prepare the MCP request
        request = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "tools/call",
            "params": {
                "name": tool_name,
                "arguments": arguments
            }
        }

        try:
            # Start the MCP server process
            process = subprocess.Popen(
                [NODE_PATH, self.server_path],
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )

            # Send request and get response
            stdout, stderr = process.communicate(
                input=json.dumps(request) + '\n',
                timeout=10
            )

            if stderr:
                print(f"MCP Server stderr: {stderr}")

            # Parse response
            response = json.loads(stdout.strip())

            if 'result' in response:
                # Parse the content from MCP response
                content = response['result']['content'][0]['text']
                return json.loads(content)
            else:
                return {"success": False, "error": "No result in MCP response"}

        except Exception as e:
            print(f"Error calling MCP tool: {str(e)}")
            return {"success": False, "error": str(e)}


def search_products_mcp(mcp_client: MCPClient, query: str) -> List[Dict]:
    """Search products using MCP server"""
    result = mcp_client.call_tool('search_products', {'query': query})

    if result.get('success'):
        return result.get('products', [])
    return []


def get_product_details_mcp(mcp_client: MCPClient, product_id: str) -> Dict:
    """Get product details using MCP server"""
    result = mcp_client.call_tool('get_product_details', {'productId': product_id})

    if result.get('success'):
        return result.get('product', {})
    return {}


def format_product_response(products: List[Dict], query_type: str = 'search') -> str:
    """Format product information into a natural language response"""

    if not products:
        return "I couldn't find any products matching your query. Please try different search terms."

    if len(products) == 1:
        product = products[0]
        response_parts = [
            f"📦 {product['name']} ({product['id']})",
            f"Category: {product['category']}",
            f"Price: ${product['price']:.2f}",
            f"Stock: {product['stock']} units {'✓ Available' if product['stock'] > 0 else '❌ Out of Stock'}",
            f"Rating: {'⭐' * int(product['rating'])} ({product['reviews']} reviews)",
            f"\nDescription: {product['description']}"
        ]

        if 'specs' in product and product['specs']:
            response_parts.append("\nSpecifications:")
            for key, value in product['specs'].items():
                response_parts.append(f"  - {key.replace('_', ' ').title()}: {value}")

        if 'features' in product and product['features']:
            response_parts.append("\nKey Features:")
            for feature in product['features'][:5]:  # Show first 5 features
                response_parts.append(f"  ✓ {feature}")

        return "\n".join(response_parts)

    else:
        # Multiple products found
        response_parts = [f"Found {len(products)} products:\n"]

        for product in products[:10]:  # Limit to first 10
            stock_status = "✓ In Stock" if product['stock'] > 0 else "❌ Out of Stock"
            response_parts.append(
                f"• {product['name']} - ${product['price']:.2f} - {stock_status}\n"
                f"  {product['description'][:80]}..."
            )

        if len(products) > 10:
            response_parts.append(f"\n... and {len(products) - 10} more products")

        return "\n".join(response_parts)


def search_products(mcp_client: MCPClient, parameters: Dict[str, Any]) -> Dict[str, Any]:
    """
    Action: Search Products
    Search for products by keywords, category, or features
    """
    query = parameters.get('query', '')
    category = parameters.get('category')

    # Build search query
    search_query = query
    if category:
        search_query = f"{category} {query}".strip()

    products = search_products_mcp(mcp_client, search_query)

    # Apply additional filters if provided
    if parameters.get('maxPrice'):
        max_price = float(parameters['maxPrice'])
        products = [p for p in products if p['price'] <= max_price]

    if parameters.get('minPrice'):
        min_price = float(parameters['minPrice'])
        products = [p for p in products if p['price'] >= min_price]

    if parameters.get('inStockOnly') == 'true':
        products = [p for p in products if p['stock'] > 0]

    response_text = format_product_response(products, 'search')

    return {
        'productsFound': len(products),
        'products': [
            {
                'id': p['id'],
                'name': p['name'],
                'price': p['price'],
                'stock': p['stock']
            } for p in products[:5]  # Return top 5 product summaries
        ],
        'response': response_text
    }


def get_product_info(mcp_client: MCPClient, parameters: Dict[str, Any]) -> Dict[str, Any]:
    """
    Action: Get Product Information
    Get detailed information about a specific product
    """
    product_id = parameters.get('productId')

    if not product_id:
        return {
            'success': False,
            'message': 'Product ID is required'
        }

    product = get_product_details_mcp(mcp_client, product_id)

    if not product:
        return {
            'success': False,
            'message': f'Product {product_id} not found'
        }

    response_text = format_product_response([product], 'details')

    return {
        'success': True,
        'product': {
            'id': product['id'],
            'name': product['name'],
            'category': product['category'],
            'price': product['price'],
            'stock': product['stock'],
            'rating': product['rating'],
            'description': product['description']
        },
        'response': response_text
    }


def check_stock(mcp_client: MCPClient, parameters: Dict[str, Any]) -> Dict[str, Any]:
    """
    Action: Check Stock Availability
    Check if a product is in stock
    """
    product_id = parameters.get('productId')

    if not product_id:
        return {
            'success': False,
            'message': 'Product ID is required'
        }

    product = get_product_details_mcp(mcp_client, product_id)

    if not product:
        return {
            'success': False,
            'message': f'Product {product_id} not found'
        }

    in_stock = product['stock'] > 0
    stock_status = "available" if in_stock else "out of stock"

    return {
        'success': True,
        'productId': product['id'],
        'productName': product['name'],
        'inStock': in_stock,
        'stockQuantity': product['stock'],
        'message': f"{product['name']} is {stock_status}. {'Available quantity: ' + str(product['stock']) if in_stock else 'Currently unavailable.'}"
    }


def compare_products(mcp_client: MCPClient, parameters: Dict[str, Any]) -> Dict[str, Any]:
    """
    Action: Compare Products
    Compare two or more products
    """
    product_ids = parameters.get('productIds', '').split(',')

    if len(product_ids) < 2:
        return {
            'success': False,
            'message': 'At least 2 product IDs required for comparison'
        }

    products = []
    for pid in product_ids:
        product = get_product_details_mcp(mcp_client, pid.strip())
        if product:
            products.append(product)

    if len(products) < 2:
        return {
            'success': False,
            'message': 'Could not find enough products to compare'
        }

    # Build comparison response
    comparison = []
    comparison.append("Product Comparison:\n")

    for i, product in enumerate(products, 1):
        comparison.append(f"{i}. {product['name']} ({product['id']})")
        comparison.append(f"   Price: ${product['price']:.2f}")
        comparison.append(f"   Stock: {product['stock']} units")
        comparison.append(f"   Rating: {'⭐' * int(product['rating'])} ({product['reviews']} reviews)")
        comparison.append(f"   Category: {product['category']}")
        comparison.append("")

    return {
        'success': True,
        'productsCompared': len(products),
        'comparison': "\n".join(comparison)
    }


def lambda_handler(event, context):
    """
    AWS Lambda handler for Bedrock Agent
    """
    print(f"Received event: {json.dumps(event)}")

    # Initialize MCP client
    mcp_client = MCPClient(MCP_SERVER_PATH)

    # Extract action group, API path, and parameters from the event
    agent = event.get('agent')
    action_group = event.get('actionGroup')
    api_path = event.get('apiPath')
    parameters = event.get('parameters', [])

    # Convert parameters list to dict
    params_dict = {}
    for param in parameters:
        params_dict[param['name']] = param['value']

    print(f"Action: {action_group}, API Path: {api_path}, Parameters: {params_dict}")

    # Route to appropriate action
    result = None

    if api_path == '/search-products':
        result = search_products(mcp_client, params_dict)
    elif api_path == '/get-product-info':
        result = get_product_info(mcp_client, params_dict)
    elif api_path == '/check-stock':
        result = check_stock(mcp_client, params_dict)
    elif api_path == '/compare-products':
        result = compare_products(mcp_client, params_dict)
    else:
        result = {
            'error': f'Unknown API path: {api_path}'
        }

    # Format response for Bedrock
    response = {
        'messageVersion': '1.0',
        'response': {
            'actionGroup': action_group,
            'apiPath': api_path,
            'httpMethod': event.get('httpMethod'),
            'httpStatusCode': 200,
            'responseBody': {
                'application/json': {
                    'body': json.dumps(result)
                }
            }
        }
    }

    print(f"Returning response: {json.dumps(response)}")

    return response
