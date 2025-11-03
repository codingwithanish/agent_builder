# Quick Start Guide

## 1. View the Shopping Webpage

Simply open `index.html` in your web browser:

```bash
# Option 1: Double-click index.html in your file explorer

# Option 2: Use a simple HTTP server
cd my-shopping-cart
python -m http.server 8000
# Then open http://localhost:8000 in your browser
```

The webpage includes:
- 12 products with realistic details
- Search functionality
- Category filtering
- Add to cart buttons
- Responsive design

## 2. Run the MCP Server

### Install Dependencies

```bash
cd my-shopping-cart/mcp-tools/my-shopping-cart-mcp-server
npm install
```

### Start the Server

```bash
npm start
```

The server will start and listen on stdio for MCP protocol messages.

## 3. Test the MCP Server

You can test the MCP server by integrating it with an MCP client (like Claude Desktop) or by creating a simple test script.

### Available Tools:

1. **search_products** - Search for products
2. **get_product_details** - Get detailed product info
3. **search_orders** - Find orders by various criteria
4. **get_order_details** - Get complete order information

### Example Queries:

**Find all laptops:**
```
"Search for laptop products"
```

**Get product info:**
```
"What are the details of product PROD002?"
```

**Find customer orders:**
```
"Show me all orders for customer John Doe"
```

**Check order status:**
```
"What's the status of order ORD-2024-001?"
```

## 4. Integrate with Claude Desktop

Add to your Claude Desktop MCP settings file:

**Windows**: `%APPDATA%/Claude/claude_desktop_config.json`

**Mac**: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "shopping-cart": {
      "command": "node",
      "args": [
        "FULL_PATH_TO/my-shopping-cart/mcp-tools/my-shopping-cart-mcp-server/src/index.js"
      ]
    }
  }
}
```

Replace `FULL_PATH_TO` with the actual path to your project.

Then restart Claude Desktop and you'll be able to ask questions like:
- "What products do you have in stock?"
- "Show me the cheapest audio products"
- "What's in order ORD-2024-002?"
- "Find all delivered orders"

## 5. Product Data Overview

### Categories:
- Laptops (1 product)
- Smartphones (1 product)
- Audio (2 products)
- Accessories (3 products)
- Wearables (1 product)
- Cameras (1 product)
- Storage (1 product)
- Monitors (1 product)
- Gaming (1 product - out of stock)

### Price Range:
- Lowest: $79 (Magic Mouse)
- Highest: $2,499 (MacBook Pro, Sony Camera)

### Orders:
- 5 sample orders with different statuses
- Includes full pricing breakdown
- Realistic customer and shipping data

## Troubleshooting

### MCP Server won't start
- Make sure you ran `npm install` first
- Check that Node.js is installed: `node --version`
- Verify you're in the correct directory

### Tools not showing in Claude
- Check the path in your config file is correct
- Use absolute paths, not relative
- Restart Claude Desktop after config changes

### Products not loading in webpage
- Check browser console for errors (F12)
- Make sure you're viewing via a web server, not file://
- Try a different browser

## Next Steps

- Customize the product data in `src/data.js`
- Modify the webpage styling in `index.html`
- Add more MCP tools for cart management
- Integrate with a real database
- Add authentication and user management

Enjoy exploring the shopping cart system!
