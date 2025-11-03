# General Query Agent

AI-powered agent for handling product-related customer queries.

## Features

- **Natural Language Understanding**: Understands product queries in plain English
- **Intelligent Search**: Finds products by name, category, features, price, and more
- **Smart Recommendations**: Suggests the best products based on user needs
- **Product Comparison**: Compares multiple products side-by-side
- **Stock Awareness**: Provides real-time stock availability

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
node src/index.js "What laptops do you have?"
```

### 4. Run Tests

```bash
npm test
```

## Usage Examples

### Command Line

```bash
# General product search
node src/index.js "What laptops do you have?"

# Price range query
node src/index.js "Show me audio products under $300"

# Stock availability
node src/index.js "What smartphones are in stock?"

# Product comparison
node src/index.js "Compare the MacBook Pro and iPhone 15 Pro"

# Specific product details
node src/index.js "Tell me about product PROD003"

# Best rated products
node src/index.js "What are your best rated products?"

# Feature search
node src/index.js "Do you have any products with noise cancellation?"
```

### Programmatic Usage

```javascript
import { GeneralQueryAgent } from './src/index.js';

const agent = new GeneralQueryAgent(process.env.ANTHROPIC_API_KEY);

const result = await agent.processQuery("Show me wireless headphones under $300");

console.log('Response:', result.response);
console.log('Products Found:', result.productsFound);
console.log('Product Details:', result.products);
```

## How It Works

### 3-Step Processing Pipeline

1. **Analyze Query**
   - Uses Claude AI to understand search intent
   - Extracts: Keywords, category, price range, filters

2. **Search Products**
   - Applies extracted criteria to product database
   - Returns matching products with full details

3. **Generate Response**
   - Creates a tailored response based on search results
   - Provides comparisons, recommendations, or detailed information

### Example Flow

```
User Query: "Show me wireless headphones under $300"
     ↓
Analyze: {
  intent: "search",
  keywords: ["wireless", "headphones"],
  category: "Audio",
  priceMax: 300
}
     ↓
Search: Find matching products
     ↓
Generate: "I found 2 great wireless headphone options under $300:

1. AirPods Pro (2nd Gen) - $249
   - Active noise cancellation
   - Personalized spatial audio
   - 6 hours battery life
   - In stock (100 units)

2. HomePod (2nd Gen) - $299
   - Room-filling sound
   - Spatial audio with Dolby Atmos
   - Smart home integration
   - In stock (30 units)

Both are highly rated and available for immediate shipping!"
```

## Query Types

### 1. General Search
Find products by keywords or category.

**Examples:**
- "What laptops do you have?"
- "Show me cameras"
- "Find gaming products"

### 2. Price Range
Find products within a budget.

**Examples:**
- "Products under $500"
- "Show me items between $100 and $300"
- "What are the cheapest accessories?"

### 3. Stock Check
Verify product availability.

**Examples:**
- "What's in stock?"
- "Is the MacBook Pro available?"
- "Show me available smartphones"

### 4. Comparison
Compare multiple products.

**Examples:**
- "Compare iPhone and MacBook"
- "Difference between AirPods and HomePod"
- "Which is better: PROD001 or PROD007?"

### 5. Recommendations
Get product suggestions.

**Examples:**
- "Best laptop for professionals"
- "Recommend a good smartphone"
- "What should I buy for photography?"

### 6. Feature Search
Find products by features.

**Examples:**
- "Products with noise cancellation"
- "Anything with USB-C?"
- "Show me items with long battery life"

## Available Products

The agent has access to 12 products across 9 categories:

| ID | Product | Category | Price | Stock |
|----|---------|----------|-------|-------|
| PROD001 | MacBook Pro 16" | Laptops | $2,499 | 25 |
| PROD002 | iPhone 15 Pro | Smartphones | $999 | 50 |
| PROD003 | AirPods Pro (2nd Gen) | Audio | $249 | 100 |
| PROD004 | Magic Keyboard | Accessories | $129 | 8 |
| PROD005 | Magic Mouse | Accessories | $79 | 45 |
| PROD006 | Apple Watch Series 9 | Wearables | $399 | 60 |
| PROD007 | Sony A7 IV Camera | Cameras | $2,499 | 5 |
| PROD008 | HomePod (2nd Gen) | Audio | $299 | 30 |
| PROD009 | Samsung T7 SSD 1TB | Storage | $129 | 75 |
| PROD010 | Dell UltraSharp 27" | Monitors | $549 | 20 |
| PROD011 | PlayStation 5 | Gaming | $499 | 0 (Out of Stock) |
| PROD012 | Anker 737 Power Bank | Accessories | $149 | 40 |

## API Reference

### GeneralQueryAgent

#### Constructor
```javascript
new GeneralQueryAgent(apiKey)
```
- `apiKey` (string): Anthropic API key (optional if set in env)

#### Methods

##### processQuery(userQuery)
Main method to process product queries.

**Parameters:**
- `userQuery` (string): Natural language query from user

**Returns:**
```javascript
{
  query: string,              // Original query
  analyzedQuery: {            // Query analysis
    intent: string,
    keywords: string[],
    category: string | null,
    priceMin: number | null,
    priceMax: number | null,
    productId: string | null,
    filters: string[]
  },
  productsFound: number,      // Number of matching products
  products: Array,            // Full product details
  response: string            // Generated response text
}
```

##### analyzeQuery(userQuery)
Analyzes user query to understand intent and extract criteria.

**Parameters:**
- `userQuery` (string): User's natural language query

**Returns:**
```javascript
{
  intent: string,             // search | compare | recommend | etc.
  keywords: string[],         // Extracted keywords
  category: string | null,    // Product category
  priceMin: number | null,    // Min price filter
  priceMax: number | null,    // Max price filter
  productId: string | null,   // Specific product ID
  filters: string[]           // Additional filters
}
```

##### searchRelevantProducts(analyzedQuery)
Searches for products matching the analyzed criteria.

**Parameters:**
- `analyzedQuery` (object): Analyzed query object

**Returns:**
- `Array`: List of matching products

##### generateResponse(userQuery, analyzedQuery, products)
Generates tailored response based on products found.

**Parameters:**
- `userQuery` (string): Original user query
- `analyzedQuery` (object): Query analysis
- `products` (Array): Matching products

**Returns:**
- `string`: Generated response text

## Data Structure

### Product Object
```javascript
{
  id: "PROD001",
  name: "MacBook Pro 16\"",
  category: "Laptops",
  description: "M2 Pro chip, 16GB RAM, 512GB SSD...",
  price: 2499.00,
  currency: "USD",
  stock: 25,
  rating: 5.0,
  reviews: 234,
  emoji: "💻",
  specs: {
    processor: "Apple M2 Pro",
    ram: "16GB",
    storage: "512GB SSD",
    display: "16-inch Retina"
  },
  features: [
    "Liquid Retina XDR display",
    "Up to 22 hours battery life",
    "1080p FaceTime HD camera",
    "Six-speaker sound system"
  ]
}
```

## Search Functions

The agent provides several search helper functions:

```javascript
import {
  searchProducts,
  searchByCategory,
  searchByPriceRange,
  getProductById,
  getInStockProducts,
  getBestRatedProducts,
  getCheapestProducts,
  getMostExpensiveProducts
} from './src/data.js';

// Search by text
const laptops = searchProducts('laptop');

// Search by category
const audio = searchByCategory('Audio');

// Search by price range
const affordable = searchByPriceRange(0, 500);

// Get specific product
const product = getProductById('PROD001');

// Get in-stock items
const available = getInStockProducts();

// Get best rated (4.5+ stars)
const topRated = getBestRatedProducts();

// Get cheapest 5 products
const cheapest = getCheapestProducts(5);

// Get most expensive 5 products
const pricey = getMostExpensiveProducts(5);
```

## Customization

### Add More Products

Edit `src/data.js`:

```javascript
export const products = [
  // ... existing products
  {
    id: "PROD013",
    name: "New Product Name",
    category: "Category",
    description: "Product description...",
    price: 299.00,
    currency: "USD",
    stock: 50,
    rating: 4.5,
    reviews: 100,
    emoji: "📱",
    specs: {
      key: "value"
    },
    features: [
      "Feature 1",
      "Feature 2"
    ]
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

## Testing

Run the test suite:

```bash
npm test
```

Tests include:
1. General product search
2. Price range queries
3. Stock availability checks
4. Product comparison
5. Specific product details
6. Best-rated products
7. Cheapest options
8. Feature-based search

## Performance

- **Average Response Time**: 2-4 seconds
- **API Calls per Query**: 2 (analysis + generation)
- **Supported Concurrent Queries**: Depends on Anthropic API limits

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
- Invalid product ID
- No matching products
- API rate limits

## Troubleshooting

### "API key not found"
Set the ANTHROPIC_API_KEY environment variable:
```bash
export ANTHROPIC_API_KEY=your_key_here
```

### "No products found"
- Try broader search terms
- Check category spelling
- Verify price range is reasonable
- Confirm product ID format (PROD001-PROD012)

### "Failed to parse query analysis"
- The Claude API response format may have changed
- Check network connectivity
- Verify API key is valid

## Integration Examples

### Express API

```javascript
import express from 'express';
import { GeneralQueryAgent } from './src/index.js';

const app = express();
app.use(express.json());

const agent = new GeneralQueryAgent(process.env.ANTHROPIC_API_KEY);

app.post('/api/products/query', async (req, res) => {
  const { query } = req.body;
  const result = await agent.processQuery(query);
  res.json(result);
});

app.listen(3000);
```

### Chatbot Integration

```javascript
import { GeneralQueryAgent } from './src/index.js';

const agent = new GeneralQueryAgent(apiKey);

async function handleChatMessage(message) {
  const result = await agent.processQuery(message);
  return result.response;
}
```

## License

MIT
