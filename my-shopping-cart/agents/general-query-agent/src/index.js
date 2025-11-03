import Anthropic from '@anthropic-ai/sdk';
import {
  searchProducts,
  searchByCategory,
  searchByPriceRange,
  getProductById,
  getInStockProducts,
  getBestRatedProducts,
  getCheapestProducts,
  getMostExpensiveProducts
} from './data.js';

/**
 * General Query Agent
 *
 * Handles all product-related user queries:
 * - Searches product data based on user input
 * - Identifies and returns the most relevant product information
 * - Constructs responses tailored to the user's query
 */

export class GeneralQueryAgent {
  constructor(apiKey) {
    this.client = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
    });
    this.model = 'claude-3-5-sonnet-20241022';
  }

  /**
   * Analyze user query to understand intent and extract search criteria
   */
  async analyzeQuery(userQuery) {
    const analysisPrompt = `You are a product search assistant. Analyze the user's query and extract search criteria.

User Query: "${userQuery}"

Extract and identify:
1. Search intent (search, compare, recommend, check_stock, price_range, etc.)
2. Product name or keywords
3. Category (if mentioned: Laptops, Smartphones, Audio, Accessories, Wearables, Cameras, Storage, Monitors, Gaming)
4. Price range (min and max if mentioned)
5. Specific product ID (format: PROD001-PROD012)
6. Special filters (in_stock, best_rated, cheapest, most_expensive)

Return a JSON object with the extracted criteria:
{
  "intent": "search|compare|recommend|check_stock|price_range|product_details",
  "keywords": ["laptop", "professional"],
  "category": "Laptops",
  "priceMin": 1000,
  "priceMax": 3000,
  "productId": "PROD001",
  "filters": ["in_stock", "best_rated"]
}

Use null for any field that is not mentioned in the query.
Only return the JSON object, nothing else.`;

    const message = await this.client.messages.create({
      model: this.model,
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: analysisPrompt,
        },
      ],
    });

    try {
      const jsonText = message.content[0].text.trim();
      return JSON.parse(jsonText);
    } catch (error) {
      console.error('Failed to parse query analysis:', error);
      return {
        intent: 'search',
        keywords: null,
        category: null,
        priceMin: null,
        priceMax: null,
        productId: null,
        filters: []
      };
    }
  }

  /**
   * Search for relevant products based on analyzed criteria
   */
  searchRelevantProducts(analyzedQuery) {
    let results = [];

    // If specific product ID is requested
    if (analyzedQuery.productId) {
      const product = getProductById(analyzedQuery.productId);
      return product ? [product] : [];
    }

    // Apply category filter
    if (analyzedQuery.category) {
      results = searchByCategory(analyzedQuery.category);
    }

    // Apply keyword search
    if (analyzedQuery.keywords && analyzedQuery.keywords.length > 0) {
      const keywordQuery = analyzedQuery.keywords.join(' ');
      const keywordResults = searchProducts(keywordQuery);

      if (results.length === 0) {
        results = keywordResults;
      } else {
        // Intersect results
        results = results.filter(product =>
          keywordResults.some(kr => kr.id === product.id)
        );
      }
    }

    // Apply price range filter
    if (analyzedQuery.priceMin !== null || analyzedQuery.priceMax !== null) {
      const min = analyzedQuery.priceMin || 0;
      const max = analyzedQuery.priceMax || Infinity;
      results = searchByPriceRange(min, max);
    }

    // Apply special filters
    if (analyzedQuery.filters && analyzedQuery.filters.length > 0) {
      if (analyzedQuery.filters.includes('in_stock')) {
        results = results.length > 0
          ? results.filter(p => p.stock > 0)
          : getInStockProducts();
      }

      if (analyzedQuery.filters.includes('best_rated')) {
        results = results.length > 0
          ? results.filter(p => p.rating >= 4.5)
          : getBestRatedProducts();
      }

      if (analyzedQuery.filters.includes('cheapest')) {
        results = results.length > 0
          ? [...results].sort((a, b) => a.price - b.price)
          : getCheapestProducts();
      }

      if (analyzedQuery.filters.includes('most_expensive')) {
        results = results.length > 0
          ? [...results].sort((a, b) => b.price - a.price)
          : getMostExpensiveProducts();
      }
    }

    // If no specific criteria, return all products
    if (results.length === 0 && !analyzedQuery.category && !analyzedQuery.keywords) {
      results = searchProducts('');
    }

    return results;
  }

  /**
   * Generate tailored response based on products and user query
   */
  async generateResponse(userQuery, analyzedQuery, products) {
    if (products.length === 0) {
      return "I couldn't find any products matching your query. Could you please rephrase or try different search terms?";
    }

    // Prepare product information for Claude
    const productsSummary = products.map(product => ({
      id: product.id,
      name: product.name,
      category: product.category,
      description: product.description,
      price: product.price,
      currency: product.currency,
      stock: product.stock,
      rating: product.rating,
      reviews: product.reviews,
      specs: product.specs,
      features: product.features,
    }));

    const responsePrompt = `You are a helpful product specialist for TechStore.

User Query: "${userQuery}"

Query Analysis:
${JSON.stringify(analyzedQuery, null, 2)}

Available Products:
${JSON.stringify(productsSummary, null, 2)}

Generate a friendly, informative response that:
1. Directly addresses the user's question
2. Presents the most relevant product(s) based on their query
3. Highlights key features and specifications
4. Mentions price and stock availability
5. Provides helpful comparisons if multiple products are relevant
6. Suggests related products if appropriate
7. Is conversational and engaging

Guidelines:
- For single product queries: Provide detailed information
- For comparison queries: Compare key features, prices, and use cases
- For recommendation queries: Suggest the best option based on their needs
- For stock queries: Clearly state availability
- For price range queries: Show options within budget
- Always mention if items are out of stock
- Use bullet points for features when listing multiple items

Response:`;

    const message = await this.client.messages.create({
      model: this.model,
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: responsePrompt,
        },
      ],
    });

    return message.content[0].text.trim();
  }

  /**
   * Main method to process general product queries
   */
  async processQuery(userQuery) {
    console.log(`\n🔍 Processing product query: "${userQuery}"\n`);

    // Step 1: Analyze the query to understand intent and criteria
    console.log('🧠 Analyzing query...');
    const analyzedQuery = await this.analyzeQuery(userQuery);
    console.log('Analysis:', analyzedQuery);

    // Step 2: Search for relevant products
    console.log('\n📦 Searching products...');
    const products = this.searchRelevantProducts(analyzedQuery);
    console.log(`Found ${products.length} product(s)`);

    // Step 3: Generate tailored response
    console.log('\n💬 Generating response...');
    const response = await this.generateResponse(userQuery, analyzedQuery, products);

    console.log('\n✅ Response:\n');
    console.log(response);
    console.log('\n' + '='.repeat(80) + '\n');

    return {
      query: userQuery,
      analyzedQuery,
      productsFound: products.length,
      products: products,
      response,
    };
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
General Query Agent
===================

Usage:
  node src/index.js "your product query here"

Examples:
  node src/index.js "What laptops do you have?"
  node src/index.js "Show me wireless headphones under $300"
  node src/index.js "What's the best smartphone in stock?"
  node src/index.js "Compare MacBook Pro and Dell monitor"
  node src/index.js "Tell me about product PROD003"
  node src/index.js "What are the cheapest products?"

Environment:
  Set ANTHROPIC_API_KEY environment variable with your API key
`);
    process.exit(0);
  }

  const query = args.join(' ');
  const agent = new GeneralQueryAgent();

  try {
    await agent.processQuery(query);
  } catch (error) {
    console.error('Error processing query:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
