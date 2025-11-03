# Payment Query Agent

AI-powered agent for handling payment-related customer queries.

## Features

- **Natural Language Understanding**: Understands queries in plain English
- **Intelligent Search**: Finds orders by ID, customer name, email, or payment status
- **Contextual Responses**: Generates appropriate responses based on payment state
- **Complete Payment Details**: Provides transaction IDs, amounts, methods, and dates

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up API Key

```bash
# Copy the example env file
cp .env.example .env

# Edit .env and add your Anthropic API key
# ANTHROPIC_API_KEY=your_key_here
```

### 3. Run a Query

```bash
node src/index.js "What is the payment status of order ORD-2024-001?"
```

### 4. Run Tests

```bash
npm test
```

## Usage Examples

### Command Line

```bash
# Check payment status by order ID
node src/index.js "What is the payment status of order ORD-2024-001?"

# Check by customer name
node src/index.js "Has Jane Smith paid for her order?"

# Find pending payments
node src/index.js "Show me all pending payments"

# Check refund status
node src/index.js "Was the payment refunded for order ORD-2024-005?"

# Check by email
node src/index.js "What's the payment status for alice.w@email.com?"
```

### Programmatic Usage

```javascript
import { PaymentQueryAgent } from './src/index.js';

const agent = new PaymentQueryAgent(process.env.ANTHROPIC_API_KEY);

const result = await agent.processQuery("Has John Doe paid for his order?");

console.log('Response:', result.response);
console.log('Orders Found:', result.ordersFound);
console.log('Order Details:', result.orders);
```

## How It Works

### 3-Step Processing Pipeline

1. **Extract Order Information**
   - Uses Claude AI to extract order identifiers from natural language
   - Identifies: Order ID, customer name, email, payment status

2. **Retrieve Order Details**
   - Searches the order database using extracted information
   - Returns matching orders with complete payment data

3. **Generate Response**
   - Creates a contextual response based on payment status
   - Includes all relevant payment details

### Example Flow

```
User Query: "What is the payment status of order ORD-2024-001?"
     ↓
Extract: { orderId: "ORD-2024-001" }
     ↓
Retrieve: Order with payment details
     ↓
Generate: "Order ORD-2024-001 has been paid. The payment of $1,297.84 was
          processed on January 15, 2024, via Credit Card (ending in 4242).
          Transaction ID: TXN-20240115-001"
```

## Response Types

### Paid Orders
- Confirms payment received
- Shows payment method and masked card/account info
- Includes transaction ID and payment date
- Displays total amount paid

### Pending Payments
- Explains pending status
- Shows expected payment method
- Provides instructions if needed
- Displays amount due

### Refunded Orders
- Confirms refund has been processed
- Shows original payment and refund amounts
- Includes refund date and transaction ID
- Explains refund reason if available

## Available Data

The agent has access to 5 sample orders:

| Order ID | Customer | Status | Amount | Payment Status |
|----------|----------|--------|---------|----------------|
| ORD-2024-001 | John Doe | Delivered | $1,297.84 | Paid (Credit Card) |
| ORD-2024-002 | Jane Smith | Shipped | $2,823.56 | Paid (PayPal) |
| ORD-2024-003 | Bob Johnson | Processing | $2,992.56 | Pending (Bank Transfer) |
| ORD-2024-004 | Alice Williams | Delivered | $566.84 | Paid (Credit Card) |
| ORD-2024-005 | Charlie Brown | Cancelled | $538.92 | Refunded |

## API Reference

### PaymentQueryAgent

#### Constructor
```javascript
new PaymentQueryAgent(apiKey)
```
- `apiKey` (string): Anthropic API key (optional if set in env)

#### Methods

##### processQuery(userQuery)
Main method to process payment queries.

**Parameters:**
- `userQuery` (string): Natural language query from user

**Returns:**
```javascript
{
  query: string,              // Original query
  extractedInfo: {            // Extracted information
    orderId: string | null,
    customerName: string | null,
    email: string | null,
    paymentStatus: string | null
  },
  ordersFound: number,        // Number of matching orders
  orders: Array,              // Full order details
  response: string            // Generated response text
}
```

##### extractOrderInfo(userQuery)
Extracts order information from user query using Claude.

**Parameters:**
- `userQuery` (string): User's natural language query

**Returns:**
```javascript
{
  orderId: string | null,
  customerName: string | null,
  email: string | null,
  paymentStatus: string | null
}
```

##### retrieveOrders(extractedInfo)
Retrieves orders matching the extracted information.

**Parameters:**
- `extractedInfo` (object): Extracted order information

**Returns:**
- `Array`: List of matching orders

##### generateResponse(userQuery, orders)
Generates contextual response based on payment data.

**Parameters:**
- `userQuery` (string): Original user query
- `orders` (Array): Matching orders

**Returns:**
- `string`: Generated response text

## Data Structure

### Order Object
```javascript
{
  orderId: "ORD-2024-001",
  customerId: "CUST-1001",
  customerName: "John Doe",
  email: "john.doe@email.com",
  orderDate: "2024-01-15T10:30:00Z",
  status: "Delivered",
  items: [...],
  pricing: {
    subtotal: 1248.00,
    tax: 99.84,
    shipping: 0.00,
    discount: 50.00,
    total: 1297.84
  },
  payment: {
    status: "Paid",               // Paid | Pending | Refunded
    method: "Credit Card",         // Credit Card | PayPal | Bank Transfer
    cardLast4: "4242",            // For credit cards
    transactionId: "TXN-20240115-001",
    paidAmount: 1297.84,
    paidDate: "2024-01-15T10:35:00Z",
    refundStatus: null,           // null | Completed | Processing
    refundAmount: 0.00,
    refundDate: null,
    refundTransactionId: null
  },
  shippingAddress: {...},
  trackingNumber: "TRK123456789"
}
```

## Customization

### Add More Orders

Edit `src/data.js`:

```javascript
export const orders = [
  // ... existing orders
  {
    orderId: "ORD-2024-006",
    customerName: "New Customer",
    // ... add all required fields
    payment: {
      status: "Paid",
      method: "Credit Card",
      // ... payment details
    }
  }
];
```

### Change AI Model

Edit `src/index.js`:

```javascript
constructor(apiKey) {
  this.client = new Anthropic({ apiKey });
  this.model = 'claude-3-5-sonnet-20241022'; // Change here
}
```

## Error Handling

The agent includes comprehensive error handling:

```javascript
try {
  const result = await agent.processQuery(query);
  console.log(result.response);
} catch (error) {
  console.error('Error:', error.message);
}
```

Common errors:
- Missing API key
- Invalid order ID
- No matching orders
- API rate limits

## Testing

Run the test suite:

```bash
npm test
```

Tests include:
1. Query by order ID
2. Query by customer name
3. Find pending payments
4. Check refund status
5. Query by email

## Performance

- **Average Response Time**: 2-4 seconds
- **API Calls per Query**: 2 (extraction + generation)
- **Supported Concurrent Queries**: Depends on Anthropic API limits

## Troubleshooting

### "API key not found"
Set the ANTHROPIC_API_KEY environment variable:
```bash
export ANTHROPIC_API_KEY=your_key_here
```

### "No orders found"
- Check the order ID format (ORD-YYYY-NNN)
- Verify customer name spelling
- Confirm email address is correct

### "Failed to parse extraction"
- The Claude API response format may have changed
- Check network connectivity
- Verify API key is valid

## License

MIT
