"""
AWS Bedrock Agent Core - Payment Query Agent
Lambda function handler for Bedrock Agent integration

This agent handles payment-related queries by:
1. Receiving user queries from Bedrock
2. Calling MCP server to get order/payment data
3. Processing and returning responses to Bedrock
"""

import json
import os
import subprocess
import tempfile
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


def search_orders_by_id(mcp_client: MCPClient, order_id: str) -> List[Dict]:
    """Search orders using MCP server"""
    result = mcp_client.call_tool('search_orders', {'orderId': order_id})

    if result.get('success'):
        return result.get('orders', [])
    return []


def search_orders_by_customer(mcp_client: MCPClient, customer_name: str = None, email: str = None) -> List[Dict]:
    """Search orders by customer name or email using MCP server"""
    args = {}
    if customer_name:
        args['customerName'] = customer_name
    if email:
        args['email'] = email

    result = mcp_client.call_tool('search_orders', args)

    if result.get('success'):
        return result.get('orders', [])
    return []


def get_order_details(mcp_client: MCPClient, order_id: str) -> Dict:
    """Get detailed order information using MCP server"""
    result = mcp_client.call_tool('get_order_details', {'orderId': order_id})

    if result.get('success'):
        return result.get('order', {})
    return {}


def extract_order_info_from_query(query: str) -> Dict[str, Any]:
    """
    Extract order information from natural language query
    This is a simple keyword-based extraction
    For production, you might want to use Bedrock's own NLU capabilities
    """
    query_lower = query.lower()

    info = {
        'orderId': None,
        'customerName': None,
        'email': None,
        'paymentStatus': None
    }

    # Extract order ID (ORD-YYYY-NNN pattern)
    import re
    order_id_match = re.search(r'ORD-\d{4}-\d{3}', query, re.IGNORECASE)
    if order_id_match:
        info['orderId'] = order_id_match.group(0).upper()

    # Extract email
    email_match = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', query)
    if email_match:
        info['email'] = email_match.group(0)

    # Extract payment status keywords
    if any(word in query_lower for word in ['pending', 'unpaid', 'awaiting']):
        info['paymentStatus'] = 'Pending'
    elif any(word in query_lower for word in ['paid', 'completed', 'processed']):
        info['paymentStatus'] = 'Paid'
    elif any(word in query_lower for word in ['refund', 'refunded', 'cancelled']):
        info['paymentStatus'] = 'Refunded'

    return info


def format_payment_response(orders: List[Dict], query: str) -> str:
    """Format payment information into a natural language response"""

    if not orders:
        return "I couldn't find any orders matching your query. Please check the order ID, customer name, or email address and try again."

    if len(orders) == 1:
        order = orders[0]
        payment = order.get('payment', {})
        pricing = order.get('pricing', {})

        response_parts = []

        # Basic order info
        response_parts.append(f"Order {order['orderId']} for {order['customerName']}:")

        # Payment status
        status = payment.get('status', 'Unknown')
        if status == 'Paid':
            response_parts.append(
                f"✓ Payment Status: PAID\n"
                f"  - Amount: ${payment.get('paidAmount', 0):.2f}\n"
                f"  - Method: {payment.get('method', 'N/A')}\n"
                f"  - Date: {payment.get('paidDate', 'N/A')}\n"
                f"  - Transaction ID: {payment.get('transactionId', 'N/A')}"
            )
        elif status == 'Pending':
            response_parts.append(
                f"⏳ Payment Status: PENDING\n"
                f"  - Amount Due: ${pricing.get('total', 0):.2f}\n"
                f"  - Method: {payment.get('method', 'N/A')}\n"
                f"  - Note: {payment.get('note', 'Payment confirmation pending')}"
            )
        elif status == 'Refunded':
            response_parts.append(
                f"↩ Payment Status: REFUNDED\n"
                f"  - Original Amount: ${payment.get('paidAmount', 0):.2f}\n"
                f"  - Refund Amount: ${payment.get('refundAmount', 0):.2f}\n"
                f"  - Refund Date: {payment.get('refundDate', 'N/A')}\n"
                f"  - Refund ID: {payment.get('refundTransactionId', 'N/A')}"
            )

        return "\n".join(response_parts)

    else:
        # Multiple orders found
        response_parts = [f"Found {len(orders)} orders:"]
        for order in orders:
            payment = order.get('payment', {})
            response_parts.append(
                f"\n{order['orderId']} - {order['customerName']}: "
                f"{payment.get('status', 'Unknown')} (${order.get('pricing', {}).get('total', 0):.2f})"
            )

        return "\n".join(response_parts)


def check_payment_status(mcp_client: MCPClient, parameters: Dict[str, Any]) -> Dict[str, Any]:
    """
    Action: Check Payment Status
    Checks the payment status of an order
    """
    order_id = parameters.get('orderId')
    customer_name = parameters.get('customerName')
    email = parameters.get('email')

    orders = []

    if order_id:
        orders = search_orders_by_id(mcp_client, order_id)
    elif customer_name or email:
        orders = search_orders_by_customer(mcp_client, customer_name, email)

    response_text = format_payment_response(orders, "")

    return {
        'ordersFound': len(orders),
        'response': response_text
    }


def get_payment_details(mcp_client: MCPClient, parameters: Dict[str, Any]) -> Dict[str, Any]:
    """
    Action: Get Payment Details
    Retrieves detailed payment information for an order
    """
    order_id = parameters.get('orderId')

    if not order_id:
        return {
            'success': False,
            'message': 'Order ID is required'
        }

    order = get_order_details(mcp_client, order_id)

    if not order:
        return {
            'success': False,
            'message': f'Order {order_id} not found'
        }

    payment = order.get('payment', {})
    pricing = order.get('pricing', {})

    return {
        'success': True,
        'orderId': order['orderId'],
        'customerName': order['customerName'],
        'total': pricing.get('total'),
        'paymentStatus': payment.get('status'),
        'paymentMethod': payment.get('method'),
        'paidAmount': payment.get('paidAmount'),
        'paidDate': payment.get('paidDate'),
        'transactionId': payment.get('transactionId'),
        'refundStatus': payment.get('refundStatus'),
        'refundAmount': payment.get('refundAmount')
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

    if api_path == '/check-payment-status':
        result = check_payment_status(mcp_client, params_dict)
    elif api_path == '/get-payment-details':
        result = get_payment_details(mcp_client, params_dict)
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
