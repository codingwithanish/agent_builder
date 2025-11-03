import Anthropic from '@anthropic-ai/sdk';
import { findOrderById, findOrdersByCustomer, findOrdersByEmail, findOrdersByPaymentStatus } from './data.js';

/**
 * Payment Query Agent
 *
 * Handles all payment-related user queries:
 * - Retrieves order details based on user query
 * - Determines payment status for the order
 * - Generates contextually appropriate responses
 */

export class PaymentQueryAgent {
  constructor(apiKey) {
    this.client = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
    });
    this.model = 'claude-3-5-sonnet-20241022';
  }

  /**
   * Extract order identifier from user query using Claude
   */
  async extractOrderInfo(userQuery) {
    const extractionPrompt = `You are a helpful assistant that extracts order information from user queries.

User Query: "${userQuery}"

Extract the following information if present:
- Order ID (format: ORD-YYYY-NNN)
- Customer name
- Email address
- Payment status keywords (paid, pending, refunded, etc.)

Return a JSON object with the extracted information. If information is not found, use null.

Example output:
{
  "orderId": "ORD-2024-001",
  "customerName": "John Doe",
  "email": "john@email.com",
  "paymentStatus": "paid"
}

Only return the JSON object, nothing else.`;

    const message = await this.client.messages.create({
      model: this.model,
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: extractionPrompt,
        },
      ],
    });

    try {
      const jsonText = message.content[0].text.trim();
      return JSON.parse(jsonText);
    } catch (error) {
      console.error('Failed to parse extraction result:', error);
      return {
        orderId: null,
        customerName: null,
        email: null,
        paymentStatus: null,
      };
    }
  }

  /**
   * Retrieve relevant orders based on extracted information
   */
  retrieveOrders(extractedInfo) {
    let orders = [];

    // Try to find by order ID first (most specific)
    if (extractedInfo.orderId) {
      const order = findOrderById(extractedInfo.orderId);
      if (order) {
        return [order];
      }
    }

    // Try to find by email
    if (extractedInfo.email) {
      orders = findOrdersByEmail(extractedInfo.email);
      if (orders.length > 0) {
        return orders;
      }
    }

    // Try to find by customer name
    if (extractedInfo.customerName) {
      orders = findOrdersByCustomer(extractedInfo.customerName);
      if (orders.length > 0) {
        return orders;
      }
    }

    // Try to find by payment status
    if (extractedInfo.paymentStatus) {
      orders = findOrdersByPaymentStatus(extractedInfo.paymentStatus);
      if (orders.length > 0) {
        return orders;
      }
    }

    return orders;
  }

  /**
   * Generate contextually appropriate response based on payment information
   */
  async generateResponse(userQuery, orders) {
    if (orders.length === 0) {
      return "I couldn't find any orders matching your query. Please check the order ID, customer name, or email address and try again.";
    }

    // Prepare order information for Claude
    const ordersSummary = orders.map(order => ({
      orderId: order.orderId,
      customerName: order.customerName,
      orderDate: order.orderDate,
      status: order.status,
      total: order.pricing.total,
      payment: {
        status: order.payment.status,
        method: order.payment.method,
        paidAmount: order.payment.paidAmount,
        paidDate: order.payment.paidDate,
        refundStatus: order.payment.refundStatus,
        refundAmount: order.payment.refundAmount,
      },
      items: order.items.map(item => ({
        productName: item.productName,
        quantity: item.quantity,
        price: item.price,
      })),
    }));

    const responsePrompt = `You are a helpful customer service agent for TechStore, specializing in payment-related queries.

User Query: "${userQuery}"

Order Information:
${JSON.stringify(ordersSummary, null, 2)}

Generate a friendly, professional response that:
1. Directly answers the user's payment-related query
2. Provides relevant payment details (status, amount, method, dates)
3. Includes order information if helpful
4. Offers assistance for any payment issues
5. Is concise but complete

For refunded orders, mention the refund status and amount.
For pending payments, explain what the customer needs to do.
For paid orders, confirm the payment was successful and provide transaction details.

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
   * Main method to process payment queries
   */
  async processQuery(userQuery) {
    console.log(`\n📋 Processing payment query: "${userQuery}"\n`);

    // Step 1: Extract order information from the query
    console.log('🔍 Extracting order information...');
    const extractedInfo = await this.extractOrderInfo(userQuery);
    console.log('Extracted:', extractedInfo);

    // Step 2: Retrieve relevant orders
    console.log('\n📦 Retrieving order details...');
    const orders = this.retrieveOrders(extractedInfo);
    console.log(`Found ${orders.length} order(s)`);

    // Step 3: Generate appropriate response
    console.log('\n💬 Generating response...');
    const response = await this.generateResponse(userQuery, orders);

    console.log('\n✅ Response:\n');
    console.log(response);
    console.log('\n' + '='.repeat(80) + '\n');

    return {
      query: userQuery,
      extractedInfo,
      ordersFound: orders.length,
      orders: orders,
      response,
    };
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
Payment Query Agent
===================

Usage:
  node src/index.js "your payment query here"

Examples:
  node src/index.js "What is the payment status of order ORD-2024-001?"
  node src/index.js "Has John Doe paid for his order?"
  node src/index.js "Show me all pending payments"
  node src/index.js "Was my payment refunded for the cancelled order?"

Environment:
  Set ANTHROPIC_API_KEY environment variable with your API key
`);
    process.exit(0);
  }

  const query = args.join(' ');
  const agent = new PaymentQueryAgent();

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
