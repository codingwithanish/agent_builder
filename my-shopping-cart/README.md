# My Shopping Cart

A complete e-commerce demo with shopping webpage and MCP (Model Context Protocol) server for AI agent integration.

## Project Structure

```
my-shopping-cart/
├── index.html                          # Shopping webpage demo
├── mcp-tools/
│   └── my-shopping-cart-mcp-server/   # MCP server for AI agents
│       ├── package.json
│       └── src/
│           ├── index.js               # MCP server implementation
│           └── data.js                # Product and order data
└── README.md
```

## Features

### 1. Shopping Webpage (index.html)

A fully functional shopping website demo with:

- **Product Catalog**: 12 dummy products across multiple categories
- **Search Functionality**: Real-time product search
- **Categories**: Laptops, Smartphones, Audio, Accessories, Wearables, Cameras, Storage, Monitors, Gaming
- **Product Details**: Name, description, price, ratings, reviews, stock status
- **Responsive Design**: Beautiful gradient UI with hover effects
- **Add to Cart**: Simulated cart functionality

**To view the webpage:**
```bash
# Open index.html in your browser
# Or use a simple HTTP server:
cd my-shopping-cart
python -m http.server 8000
# Then open http://localhost:8000
```

### 2. MCP Server (my-shopping-cart-mcp-server)

An MCP server that provides AI agents with tools to interact with shopping cart data.

#### Available Tools:

1. **search_products**
   - Search products by name, description, or category
   - Returns matching products with full details

2. **get_product_details**
   - Get complete information about a specific product
   - Requires product ID (e.g., PROD001)

3. **search_orders**
   - Search and filter orders by multiple criteria
   - Filter by: orderId, customerId, customerName, email, status

4. **get_order_details**
   - Get complete order information including pricing breakdown
   - Requires order ID (e.g., ORD-2024-001)

## Installation

### MCP Server Setup

1. Navigate to the MCP server directory:
```bash
cd my-shopping-cart/mcp-tools/my-shopping-cart-mcp-server
```

2. Install dependencies:
```bash
npm install
```

3. Run the server:
```bash
npm start
```

Or for development with auto-reload:
```bash
npm run dev
```

## Usage Examples

### Product Search

**Search for "laptop":**
```json
{
  "tool": "search_products",
  "arguments": {
    "query": "laptop"
  }
}
```

**Response:**
```json
{
  "success": true,
  "count": 1,
  "products": [
    {
      "id": "PROD001",
      "name": "MacBook Pro 16\"",
      "category": "Laptops",
      "price": 2499.00,
      "stock": 25,
      "rating": 5.0,
      ...
    }
  ]
}
```

### Get Product Details

**Get details for PROD002:**
```json
{
  "tool": "get_product_details",
  "arguments": {
    "productId": "PROD002"
  }
}
```

**Response:**
```json
{
  "success": true,
  "product": {
    "id": "PROD002",
    "name": "iPhone 15 Pro",
    "description": "A17 Pro chip, 256GB storage...",
    "price": 999.00,
    "currency": "USD",
    "stock": 50,
    "rating": 5.0,
    "reviews": 567,
    "specs": {
      "processor": "A17 Pro",
      "storage": "256GB",
      ...
    }
  }
}
```

### Search Orders

**Find all delivered orders:**
```json
{
  "tool": "search_orders",
  "arguments": {
    "status": "Delivered"
  }
}
```

**Find orders by customer name:**
```json
{
  "tool": "search_orders",
  "arguments": {
    "customerName": "John"
  }
}
```

### Get Order Details

**Get full order information:**
```json
{
  "tool": "get_order_details",
  "arguments": {
    "orderId": "ORD-2024-001"
  }
}
```

**Response:**
```json
{
  "success": true,
  "order": {
    "orderId": "ORD-2024-001",
    "customerName": "John Doe",
    "email": "john.doe@email.com",
    "status": "Delivered",
    "items": [
      {
        "productId": "PROD002",
        "productName": "iPhone 15 Pro",
        "quantity": 1,
        "price": 999.00,
        "subtotal": 999.00
      }
    ],
    "pricing": {
      "subtotal": 1248.00,
      "tax": 99.84,
      "shipping": 0.00,
      "discount": 50.00,
      "total": 1297.84
    },
    "shippingAddress": {
      "street": "123 Main St",
      "city": "New York",
      "state": "NY",
      "zipCode": "10001",
      "country": "USA"
    },
    "trackingNumber": "TRK123456789"
  }
}
```

## Dummy Data

### Products (12 items)
- PROD001: MacBook Pro 16" - $2,499
- PROD002: iPhone 15 Pro - $999
- PROD003: AirPods Pro (2nd Gen) - $249
- PROD004: Magic Keyboard - $129
- PROD005: Magic Mouse - $79
- PROD006: Apple Watch Series 9 - $399
- PROD007: Sony A7 IV Camera - $2,499
- PROD008: HomePod (2nd Gen) - $299
- PROD009: Samsung T7 SSD 1TB - $129
- PROD010: Dell UltraSharp 27" Monitor - $549
- PROD011: PlayStation 5 - $499 (Out of Stock)
- PROD012: Anker 737 Power Bank - $149

### Orders (5 orders)
- ORD-2024-001: John Doe - Delivered ($1,297.84)
- ORD-2024-002: Jane Smith - Shipped ($2,823.56)
- ORD-2024-003: Bob Johnson - Processing ($2,992.56)
- ORD-2024-004: Alice Williams - Delivered ($566.84)
- ORD-2024-005: Charlie Brown - Cancelled ($538.92)

## Integration with AI Agents

This MCP server can be integrated with AI agents to:

1. **Customer Support**: Answer product questions, check stock, track orders
2. **Sales Assistant**: Recommend products, compare features, calculate totals
3. **Order Management**: Look up order status, verify shipping details, process returns
4. **Inventory Queries**: Check product availability, pricing, specifications

### Example Agent Conversations:

**User**: "Do you have any laptops in stock?"

**Agent** (uses `search_products` with query "laptop"):
"Yes! We have the MacBook Pro 16\" in stock. It features an M2 Pro chip, 16GB RAM, and 512GB SSD, priced at $2,499. We currently have 25 units available."

**User**: "What's the status of order ORD-2024-001?"

**Agent** (uses `get_order_details`):
"Your order ORD-2024-001 has been delivered! It contained an iPhone 15 Pro and AirPods Pro (2nd Gen) for a total of $1,297.84. The tracking number is TRK123456789."

## MCP Server Configuration

To use this MCP server with Claude or other MCP clients, add to your MCP configuration:

```json
{
  "mcpServers": {
    "shopping-cart": {
      "command": "node",
      "args": [
        "D:/Workspace/agent_builder/my-shopping-cart/mcp-tools/my-shopping-cart-mcp-server/src/index.js"
      ]
    }
  }
}
```

## API Reference

### search_products
- **Input**: `{ query?: string }`
- **Output**: Array of matching products
- **Features**: Searches name, description, and category

### get_product_details
- **Input**: `{ productId: string }` (required)
- **Output**: Complete product object
- **Error**: Throws if product not found

### search_orders
- **Input**: `{ orderId?, customerId?, customerName?, email?, status? }`
- **Output**: Array of matching orders
- **Filters**: All filters support partial matching except customerId (exact match)

### get_order_details
- **Input**: `{ orderId: string }` (required)
- **Output**: Complete order object with pricing breakdown
- **Error**: Throws if order not found

## License

MIT

## Notes

- All data is dummy/mock data for demonstration purposes
- Prices are in USD
- Stock levels are simulated
- Orders include complete pricing breakdown (subtotal, tax, shipping, discount, total)
- MCP server runs on stdio transport for AI agent integration
