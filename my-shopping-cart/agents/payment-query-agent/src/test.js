import { PaymentQueryAgent } from './index.js';

/**
 * Test suite for Payment Query Agent
 */

const testQueries = [
  {
    name: "Test 1: Query by Order ID",
    query: "What is the payment status of order ORD-2024-001?"
  },
  {
    name: "Test 2: Query by Customer Name",
    query: "Has Jane Smith paid for her order?"
  },
  {
    name: "Test 3: Query for Pending Payments",
    query: "Show me all pending payments"
  },
  {
    name: "Test 4: Query for Refunded Order",
    query: "Was the payment refunded for order ORD-2024-005?"
  },
  {
    name: "Test 5: Query by Email",
    query: "What's the payment status for alice.w@email.com?"
  }
];

async function runTests() {
  console.log('='.repeat(80));
  console.log('PAYMENT QUERY AGENT - TEST SUITE');
  console.log('='.repeat(80));

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.error('\n❌ Error: ANTHROPIC_API_KEY environment variable not set');
    console.log('Please set your API key:');
    console.log('  export ANTHROPIC_API_KEY=your_key_here');
    process.exit(1);
  }

  const agent = new PaymentQueryAgent(apiKey);

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
