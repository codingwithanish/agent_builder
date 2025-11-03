#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { products, orders } from './data.js';

// Create MCP server instance
const server = new Server(
  {
    name: 'my-shopping-cart-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool: Search Products
function searchProducts(query) {
  if (!query || query.trim() === '') {
    return products;
  }

  const searchTerm = query.toLowerCase();
  const results = products.filter(product => {
    return (
      product.name.toLowerCase().includes(searchTerm) ||
      product.description.toLowerCase().includes(searchTerm) ||
      product.category.toLowerCase().includes(searchTerm)
    );
  });

  return results;
}

// Tool: Get Product Details
function getProductDetails(productId) {
  const product = products.find(p => p.id === productId);

  if (!product) {
    throw new Error(`Product not found with ID: ${productId}`);
  }

  return product;
}

// Tool: Search Orders
function searchOrders(params = {}) {
  let results = [...orders];

  // Filter by order ID
  if (params.orderId) {
    results = results.filter(order =>
      order.orderId.toLowerCase().includes(params.orderId.toLowerCase())
    );
  }

  // Filter by customer name
  if (params.customerName) {
    results = results.filter(order =>
      order.customerName.toLowerCase().includes(params.customerName.toLowerCase())
    );
  }

  // Filter by customer ID
  if (params.customerId) {
    results = results.filter(order =>
      order.customerId === params.customerId
    );
  }

  // Filter by status
  if (params.status) {
    results = results.filter(order =>
      order.status.toLowerCase() === params.status.toLowerCase()
    );
  }

  // Filter by email
  if (params.email) {
    results = results.filter(order =>
      order.email.toLowerCase().includes(params.email.toLowerCase())
    );
  }

  return results;
}

// Tool: Get Order Details
function getOrderDetails(orderId) {
  const order = orders.find(o => o.orderId === orderId);

  if (!order) {
    throw new Error(`Order not found with ID: ${orderId}`);
  }

  return order;
}

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'search_products',
        description: 'Search for products by name, description, or category. Returns a list of matching products with their details including price, stock, and ratings.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query to find products (searches in name, description, and category). Leave empty to get all products.',
            },
          },
        },
      },
      {
        name: 'get_product_details',
        description: 'Get detailed information about a specific product by its ID. Returns complete product information including specs, pricing, stock, and reviews.',
        inputSchema: {
          type: 'object',
          properties: {
            productId: {
              type: 'string',
              description: 'The unique product ID (e.g., PROD001, PROD002)',
            },
          },
          required: ['productId'],
        },
      },
      {
        name: 'search_orders',
        description: 'Search and filter orders by various criteria. Returns order details including items, pricing breakdown, shipping information, and status.',
        inputSchema: {
          type: 'object',
          properties: {
            orderId: {
              type: 'string',
              description: 'Filter by order ID (partial match supported)',
            },
            customerId: {
              type: 'string',
              description: 'Filter by customer ID (exact match)',
            },
            customerName: {
              type: 'string',
              description: 'Filter by customer name (partial match supported)',
            },
            email: {
              type: 'string',
              description: 'Filter by customer email (partial match supported)',
            },
            status: {
              type: 'string',
              description: 'Filter by order status (Delivered, Shipped, Processing, Cancelled)',
              enum: ['Delivered', 'Shipped', 'Processing', 'Cancelled'],
            },
          },
        },
      },
      {
        name: 'get_order_details',
        description: 'Get complete details of a specific order by order ID. Returns full order information including all items, pricing breakdown (subtotal, tax, shipping, discount, total), customer information, and shipping details.',
        inputSchema: {
          type: 'object',
          properties: {
            orderId: {
              type: 'string',
              description: 'The unique order ID (e.g., ORD-2024-001)',
            },
          },
          required: ['orderId'],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'search_products': {
        const results = searchProducts(args.query || '');
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                count: results.length,
                products: results,
              }, null, 2),
            },
          ],
        };
      }

      case 'get_product_details': {
        if (!args.productId) {
          throw new Error('productId is required');
        }
        const product = getProductDetails(args.productId);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                product: product,
              }, null, 2),
            },
          ],
        };
      }

      case 'search_orders': {
        const results = searchOrders(args);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                count: results.length,
                orders: results,
              }, null, 2),
            },
          ],
        };
      }

      case 'get_order_details': {
        if (!args.orderId) {
          throw new Error('orderId is required');
        }
        const order = getOrderDetails(args.orderId);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                order: order,
              }, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: error.message,
          }, null, 2),
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('My Shopping Cart MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
