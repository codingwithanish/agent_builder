import { GeneralQueryAgent } from './index.js';

/**
 * Test suite for General Query Agent
 */

const testQueries = [
  {
    name: "Test 1: General Product Search",
    query: "What laptops do you have?"
  },
  {
    name: "Test 2: Price Range Query",
    query: "Show me audio products under $300"
  },
  {
    name: "Test 3: Stock Availability",
    query: "What smartphones are in stock?"
  },
  {
    name: "Test 4: Product Comparison",
    query: "Compare the MacBook Pro and iPhone 15 Pro"
  },
  {
    name: "Test 5: Specific Product Details",
    query: "Tell me about product PROD003"
  },
  {
    name: "Test 6: Best Rated Products",
    query: "What are your best rated products?"
  },
  {
    name: "Test 7: Cheapest Options",
    query: "Show me the cheapest accessories"
  },
  {
    name: "Test 8: Feature-based Search",
    query: "Do you have any products with noise cancellation?"
  }
];

async function runTests() {
  console.log('='.repeat(80));
  console.log('GENERAL QUERY AGENT - TEST SUITE');
  console.log('='.repeat(80));

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.error('\n❌ Error: ANTHROPIC_API_KEY environment variable not set');
    console.log('Please set your API key:');
    console.log('  export ANTHROPIC_API_KEY=your_key_here');
    process.exit(1);
  }

  const agent = new GeneralQueryAgent(apiKey);

  for (let i = 0; i < testQueries.length; i++) {
    const test = testQueries[i];
    console.log(`\n${'='.repeat(80)}`);
    console.log(`${test.name}`);
    console.log('='.repeat(80));

    try {
      await agent.processQuery(test.query);
    } catch (error) {
      console.error(`\n❌ Test failed: ${error.message}`);
    }

    // Small delay between tests
    if (i < testQueries.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('ALL TESTS COMPLETED');
  console.log('='.repeat(80) + '\n');
}

runTests().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});
