# Shopping Cart Agents

This directory contains two specialized AI agents for handling different types of customer queries in the TechStore shopping cart system.

## Overview

The agents are designed to work independently, each handling their specific domain:

1. **Payment Query Agent** - Handles payment-related queries
2. **General Query Agent** - Handles product-related queries

Both agents use Claude AI (via Anthropic SDK) to understand user queries and generate natural, contextually appropriate responses.

## Architecture

```
agents/
├── payment-query-agent/          # Payment-focused agent
│   ├── package.json
│   ├── .env.example
│   ├── .gitignore
│   └── src/
│       ├── index.js              # Main agent implementation
│       ├── data.js               # Order & payment data
│       └── test.js               # Test suite
│
└── general-query-agent/          # Product-focused agent
    ├── package.json
    ├── .env.example
    ├── .gitignore
    └── src/
        ├── index.js              # Main agent implementation
        ├── data.js               # Product data
        └── test.js               # Test suite
```

---

## Payment Query Agent

### Purpose
Handles all payment-related user queries including payment status, transaction details, and refund information.

### Functionality

**Three-step processing pipeline:**

1. **Extract Order Information**
   - Uses Claude to extract order identifiers from natural language
   - Extracts: Order ID, customer name, email, payment status keywords

2. **Retrieve Order Details**
   - Searches order database using extracted information
   - Prioritizes: Order ID → Email → Customer Name → Payment Status

3. **Generate Response**
   - Creates contextually appropriate response based on payment data
   - Includes: Payment status, amount, method, dates, refund details

### Installation

```bash
cd agents/payment-query-agent
npm install
```

### Configuration

Create a `.env` file:
```bash
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY
```

### Usage

**Command Line:**
```bash
# Single query
node src/index.js "What is the payment status of order ORD-2024-001?"

# Run test suite
npm test
```

**Programmatic:**
```javascript
import { PaymentQueryAgent } from './src/index.js';

const agent = new PaymentQueryAgent(process.env.ANTHROPIC_API_KEY);
const result = await agent.processQuery("Has John Doe paid for his order?");
console.log(result.response);
```

### Example Queries

- "What is the payment status of order ORD-2024-001?"
- "Has Jane Smith paid for her order?"
- "Show me all pending payments"
- "Was my payment refunded for order ORD-2024-005?"
- "What's the payment status for alice.w@email.com?"

### Response Types

**Paid Orders:**
- Confirms payment received
- Shows payment method and amount
- Includes transaction ID and date

**Pending Payments:**
- Explains pending status
- Provides instructions for completion
- Shows amount due

**Refunded Orders:**
- Confirms refund processed
- Shows refund amount and date
- Includes refund transaction ID

### Data Structure

Each order includes:
```javascript
{
  orderId: "ORD-2024-001",
  customerName: "John Doe",
  pricing: {
    subtotal: 1248.00,
    tax: 99.84,
    shipping: 0.00,
    discount: 50.00,
    total: 1297.84
  },
  payment: {
    status: "Paid",           // Paid, Pending, Refunded
    method: "Credit Card",     // Credit Card, PayPal, Bank Transfer
    transactionId: "TXN-20240115-001",
    paidAmount: 1297.84,
    paidDate: "2024-01-15T10:35:00Z",
    refundStatus: null,
    refundAmount: 0.00
  }
}
```

---

## General Query Agent

### Purpose
Handles all product-related queries including search, comparison, recommendations, and availability checks.

### Functionality

**Three-step processing pipeline:**

1. **Analyze Query**
   - Uses Claude to understand search intent
   - Extracts: Keywords, category, price range, filters

2. **Search Products**
   - Applies extracted criteria to product database
   - Supports: Category search, keyword search, price filtering, stock filtering

3. **Generate Response**
   - Creates tailored response based on search results
   - Provides: Product details, comparisons, recommendations

### Installation

```bash
cd agents/general-query-agent
npm install
```

### Configuration

Create a `.env` file:
```bash
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY
```

### Usage

**Command Line:**
```bash
# Single query
node src/index.js "What laptops do you have?"

# Run test suite
npm test
```

**Programmatic:**
```javascript
import { GeneralQueryAgent } from './src/index.js';

const agent = new GeneralQueryAgent(process.env.ANTHROPIC_API_KEY);
const result = await agent.processQuery("Show me wireless headphones under $300");
console.log(result.response);
```

### Example Queries

- "What laptops do you have?"
- "Show me wireless headphones under $300"
- "What's the best smartphone in stock?"
- "Compare MacBook Pro and iPhone 15 Pro"
- "Tell me about product PROD003"
- "What are the cheapest accessories?"
- "Do you have any products with noise cancellation?"

### Query Intents Supported

1. **Search** - Find products by keywords or category
2. **Compare** - Compare multiple products
3. **Recommend** - Get product recommendations
4. **Check Stock** - Verify availability
5. **Price Range** - Find products within budget
6. **Product Details** - Get specific product information

### Search Capabilities

**By Category:**
- Laptops, Smartphones, Audio, Accessories
- Wearables, Cameras, Storage, Monitors, Gaming

**By Price:**
- Price range filtering
- Cheapest/most expensive sorting

**By Features:**
- Keyword search in features
- Specification matching

**By Availability:**
- In-stock filtering
- Stock quantity information

**By Rating:**
- Best-rated products (4.5+ stars)
- Review count

### Data Structure

Each product includes:
```javascript
{
  id: "PROD001",
  name: "MacBook Pro 16\"",
  category: "Laptops",
  description: "M2 Pro chip, 16GB RAM...",
  price: 2499.00,
  stock: 25,
  rating: 5.0,
  reviews: 234,
  specs: {
    processor: "Apple M2 Pro",
    ram: "16GB",
    storage: "512GB SSD"
  },
  features: [
    "Liquid Retina XDR display",
    "Up to 22 hours battery life",
    ...
  ]
}
```

---

## Integration Examples

### Use Both Agents Together

```javascript
import { PaymentQueryAgent } from './payment-query-agent/src/index.js';
import { GeneralQueryAgent } from './general-query-agent/src/index.js';

const paymentAgent = new PaymentQueryAgent(apiKey);
const generalAgent = new GeneralQueryAgent(apiKey);

// Route queries to appropriate agent
async function handleQuery(userQuery) {
  // Simple intent detection
  const isPaymentQuery = /payment|paid|refund|transaction|order.*status/i.test(userQuery);

  if (isPaymentQuery) {
    return await paymentAgent.processQuery(userQuery);
  } else {
    return await generalAgent.processQuery(userQuery);
  }
}

// Example usage
const result1 = await handleQuery("What's the payment status of order ORD-2024-001?");
const result2 = await handleQuery("Show me laptops under $2000");
```

### Web API Integration

```javascript
import express from 'express';
import { PaymentQueryAgent } from './payment-query-agent/src/index.js';
import { GeneralQueryAgent } from './general-query-agent/src/index.js';

const app = express();
app.use(express.json());

const paymentAgent = new PaymentQueryAgent(process.env.ANTHROPIC_API_KEY);
const generalAgent = new GeneralQueryAgent(process.env.ANTHROPIC_API_KEY);

app.post('/api/query/payment', async (req, res) => {
  const { query } = req.body;
  const result = await paymentAgent.processQuery(query);
  res.json(result);
});

app.post('/api/query/product', async (req, res) => {
  const { query } = req.body;
  const result = await generalAgent.processQuery(query);
  res.json(result);
});

app.listen(3000, () => {
  console.log('Agent API running on port 3000');
});
```

---

## Testing

Both agents include comprehensive test suites.

### Payment Query Agent Tests

```bash
cd agents/payment-query-agent
export ANTHROPIC_API_KEY=your_key_here
npm test
```

Tests cover:
- Order ID queries
- Customer name queries
- Email queries
- Payment status queries
- Refund queries

### General Query Agent Tests

```bash
cd agents/general-query-agent
export ANTHROPIC_API_KEY=your_key_here
npm test
```

Tests cover:
- General product search
- Price range queries
- Stock availability
- Product comparison
- Specific product details
- Best-rated products
- Feature-based search

---

## Performance Considerations

### API Calls
Each query makes **2 API calls** to Claude:
1. Query analysis/extraction
2. Response generation

### Response Time
- Typical response: 2-4 seconds
- Depends on Claude API latency
- Can be optimized with caching

### Rate Limiting
- Anthropic API has rate limits
- Consider implementing request queuing for production
- Use error handling for rate limit errors

---

## Error Handling

Both agents include robust error handling:

```javascript
try {
  const result = await agent.processQuery(userQuery);
  console.log(result.response);
} catch (error) {
  if (error.message.includes('rate_limit')) {
    // Handle rate limiting
  } else if (error.message.includes('authentication')) {
    // Handle auth errors
  } else {
    // Handle other errors
  }
}
```

---

## Customization

### Adding More Products

Edit `general-query-agent/src/data.js`:

```javascript
export const products = [
  {
    id: "PROD013",
    name: "Your New Product",
    category: "YourCategory",
    // ... other fields
  }
];
```

### Adding More Orders

Edit `payment-query-agent/src/data.js`:

```javascript
export const orders = [
  {
    orderId: "ORD-2024-006",
    // ... order details
    payment: {
      status: "Paid",
      // ... payment details
    }
  }
];
```

### Changing AI Model

Edit the constructor in either agent:

```javascript
constructor(apiKey) {
  this.client = new Anthropic({ apiKey });
  this.model = 'claude-3-5-sonnet-20241022'; // Change model here
}
```

---

## Deployment

### Environment Variables

Required for both agents:
```bash
ANTHROPIC_API_KEY=your_api_key_here
```

### Production Checklist

- [ ] Set up environment variables
- [ ] Install dependencies (`npm install`)
- [ ] Test agents with sample queries
- [ ] Implement error logging
- [ ] Add monitoring/analytics
- [ ] Set up rate limiting
- [ ] Configure caching if needed
- [ ] Secure API keys
- [ ] Set up backup/fallback responses

---

## Troubleshooting

### "API key not found"
```bash
export ANTHROPIC_API_KEY=your_key_here
```

### "Module not found"
```bash
npm install
```

### "Failed to parse JSON"
- Check Claude API response format
- Verify prompt templates
- Add error handling for malformed responses

### "No products/orders found"
- Check data.js files are properly imported
- Verify search criteria
- Check query analysis output

---

## Future Enhancements

### Payment Query Agent
- [ ] Integration with real payment gateway APIs
- [ ] Real-time payment status updates
- [ ] Payment retry logic
- [ ] Invoice generation
- [ ] Payment dispute handling

### General Query Agent
- [ ] Recommendation engine based on user history
- [ ] Inventory management integration
- [ ] Price comparison with competitors
- [ ] Product image analysis
- [ ] Multi-language support

### Both Agents
- [ ] Conversation history/context
- [ ] User preference learning
- [ ] Multi-turn dialogue support
- [ ] Sentiment analysis
- [ ] Analytics dashboard

---

## License

MIT

## Support

For issues or questions:
1. Check the test files for examples
2. Review the code comments
3. Test with sample queries
4. Check Anthropic API documentation

---

## Quick Reference

### Payment Agent Query Patterns
- Order ID: `ORD-YYYY-NNN`
- Customer name matching
- Email matching
- Status keywords: paid, pending, refunded

### General Agent Query Patterns
- Product ID: `PROD001-PROD012`
- Category names: Laptops, Smartphones, etc.
- Price: "under $X", "between $X and $Y"
- Features: keyword search in features list
- Stock: "in stock", "available"
- Ratings: "best rated", "top rated"

---

**Ready to use!** Start by running the test suites to see the agents in action.
