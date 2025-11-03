// Order and payment data for Payment Query Agent
// This mirrors the order data from the MCP server but adds payment-specific information

export const orders = [
  {
    orderId: "ORD-2024-001",
    customerId: "CUST-1001",
    customerName: "John Doe",
    email: "john.doe@email.com",
    orderDate: "2024-01-15T10:30:00Z",
    status: "Delivered",
    items: [
      {
        productId: "PROD002",
        productName: "iPhone 15 Pro",
        quantity: 1,
        price: 999.00,
        subtotal: 999.00
      },
      {
        productId: "PROD003",
        productName: "AirPods Pro (2nd Gen)",
        quantity: 1,
        price: 249.00,
        subtotal: 249.00
      }
    ],
    pricing: {
      subtotal: 1248.00,
      tax: 99.84,
      shipping: 0.00,
      discount: 50.00,
      total: 1297.84
    },
    payment: {
      status: "Paid",
      method: "Credit Card",
      cardLast4: "4242",
      transactionId: "TXN-20240115-001",
      paidAmount: 1297.84,
      paidDate: "2024-01-15T10:35:00Z",
      refundStatus: null,
      refundAmount: 0.00
    },
    shippingAddress: {
      street: "123 Main St",
      city: "New York",
      state: "NY",
      zipCode: "10001",
      country: "USA"
    },
    trackingNumber: "TRK123456789"
  },
  {
    orderId: "ORD-2024-002",
    customerId: "CUST-1002",
    customerName: "Jane Smith",
    email: "jane.smith@email.com",
    orderDate: "2024-01-18T14:20:00Z",
    status: "Shipped",
    items: [
      {
        productId: "PROD001",
        productName: "MacBook Pro 16\"",
        quantity: 1,
        price: 2499.00,
        subtotal: 2499.00
      },
      {
        productId: "PROD004",
        productName: "Magic Keyboard",
        quantity: 1,
        price: 129.00,
        subtotal: 129.00
      },
      {
        productId: "PROD005",
        productName: "Magic Mouse",
        quantity: 1,
        price: 79.00,
        subtotal: 79.00
      }
    ],
    pricing: {
      subtotal: 2707.00,
      tax: 216.56,
      shipping: 0.00,
      discount: 100.00,
      total: 2823.56
    },
    payment: {
      status: "Paid",
      method: "PayPal",
      paypalEmail: "jane.s***@email.com",
      transactionId: "TXN-20240118-002",
      paidAmount: 2823.56,
      paidDate: "2024-01-18T14:25:00Z",
      refundStatus: null,
      refundAmount: 0.00
    },
    shippingAddress: {
      street: "456 Oak Ave",
      city: "San Francisco",
      state: "CA",
      zipCode: "94102",
      country: "USA"
    },
    trackingNumber: "TRK987654321"
  },
  {
    orderId: "ORD-2024-003",
    customerId: "CUST-1003",
    customerName: "Bob Johnson",
    email: "bob.j@email.com",
    orderDate: "2024-01-20T09:15:00Z",
    status: "Processing",
    items: [
      {
        productId: "PROD007",
        productName: "Sony A7 IV Camera",
        quantity: 1,
        price: 2499.00,
        subtotal: 2499.00
      },
      {
        productId: "PROD009",
        productName: "Samsung T7 SSD 1TB",
        quantity: 2,
        price: 129.00,
        subtotal: 258.00
      }
    ],
    pricing: {
      subtotal: 2757.00,
      tax: 220.56,
      shipping: 15.00,
      discount: 0.00,
      total: 2992.56
    },
    payment: {
      status: "Pending",
      method: "Bank Transfer",
      bankName: "Chase Bank",
      transactionId: null,
      paidAmount: 0.00,
      paidDate: null,
      refundStatus: null,
      refundAmount: 0.00,
      note: "Awaiting bank transfer confirmation"
    },
    shippingAddress: {
      street: "789 Pine Rd",
      city: "Seattle",
      state: "WA",
      zipCode: "98101",
      country: "USA"
    },
    trackingNumber: null
  },
  {
    orderId: "ORD-2024-004",
    customerId: "CUST-1004",
    customerName: "Alice Williams",
    email: "alice.w@email.com",
    orderDate: "2024-01-22T16:45:00Z",
    status: "Delivered",
    items: [
      {
        productId: "PROD006",
        productName: "Apple Watch Series 9",
        quantity: 1,
        price: 399.00,
        subtotal: 399.00
      },
      {
        productId: "PROD012",
        productName: "Anker 737 Power Bank",
        quantity: 1,
        price: 149.00,
        subtotal: 149.00
      }
    ],
    pricing: {
      subtotal: 548.00,
      tax: 43.84,
      shipping: 0.00,
      discount: 25.00,
      total: 566.84
    },
    payment: {
      status: "Paid",
      method: "Credit Card",
      cardLast4: "8888",
      transactionId: "TXN-20240122-004",
      paidAmount: 566.84,
      paidDate: "2024-01-22T16:50:00Z",
      refundStatus: null,
      refundAmount: 0.00
    },
    shippingAddress: {
      street: "321 Elm St",
      city: "Austin",
      state: "TX",
      zipCode: "73301",
      country: "USA"
    },
    trackingNumber: "TRK456789123"
  },
  {
    orderId: "ORD-2024-005",
    customerId: "CUST-1005",
    customerName: "Charlie Brown",
    email: "charlie.b@email.com",
    orderDate: "2024-01-25T11:30:00Z",
    status: "Cancelled",
    items: [
      {
        productId: "PROD011",
        productName: "PlayStation 5",
        quantity: 1,
        price: 499.00,
        subtotal: 499.00
      }
    ],
    pricing: {
      subtotal: 499.00,
      tax: 39.92,
      shipping: 0.00,
      discount: 0.00,
      total: 538.92
    },
    payment: {
      status: "Refunded",
      method: "Credit Card",
      cardLast4: "1234",
      transactionId: "TXN-20240125-005",
      paidAmount: 538.92,
      paidDate: "2024-01-25T11:35:00Z",
      refundStatus: "Completed",
      refundAmount: 538.92,
      refundDate: "2024-01-26T10:00:00Z",
      refundTransactionId: "REFUND-20240126-005"
    },
    shippingAddress: {
      street: "555 Maple Dr",
      city: "Boston",
      state: "MA",
      zipCode: "02101",
      country: "USA"
    },
    trackingNumber: null
  }
];

// Helper function to find orders
export function findOrderById(orderId) {
  return orders.find(order => order.orderId === orderId);
}

export function findOrdersByCustomer(customerName) {
  return orders.filter(order =>
    order.customerName.toLowerCase().includes(customerName.toLowerCase())
  );
}

export function findOrdersByEmail(email) {
  return orders.filter(order =>
    order.email.toLowerCase().includes(email.toLowerCase())
  );
}

export function findOrdersByPaymentStatus(status) {
  return orders.filter(order =>
    order.payment.status.toLowerCase() === status.toLowerCase()
  );
}
