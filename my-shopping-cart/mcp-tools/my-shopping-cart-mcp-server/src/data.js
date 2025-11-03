// Dummy product data
export const products = [
  {
    id: "PROD001",
    name: "MacBook Pro 16\"",
    category: "Laptops",
    description: "M2 Pro chip, 16GB RAM, 512GB SSD. Perfect for professionals and creators.",
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
    }
  },
  {
    id: "PROD002",
    name: "iPhone 15 Pro",
    category: "Smartphones",
    description: "A17 Pro chip, 256GB storage, Titanium design with ProMotion display.",
    price: 999.00,
    currency: "USD",
    stock: 50,
    rating: 5.0,
    reviews: 567,
    emoji: "📱",
    specs: {
      processor: "A17 Pro",
      storage: "256GB",
      display: "6.1-inch ProMotion",
      material: "Titanium"
    }
  },
  {
    id: "PROD003",
    name: "AirPods Pro (2nd Gen)",
    category: "Audio",
    description: "Active noise cancellation, adaptive transparency, personalized spatial audio.",
    price: 249.00,
    currency: "USD",
    stock: 100,
    rating: 5.0,
    reviews: 892,
    emoji: "🎧",
    specs: {
      features: "Active Noise Cancellation",
      battery: "6 hours (ANC on)",
      case: "MagSafe charging"
    }
  },
  {
    id: "PROD004",
    name: "Magic Keyboard",
    category: "Accessories",
    description: "Wireless, rechargeable with numeric keypad. Works seamlessly with Mac.",
    price: 129.00,
    currency: "USD",
    stock: 8,
    rating: 4.0,
    reviews: 445,
    emoji: "⌨️",
    specs: {
      connectivity: "Bluetooth",
      battery: "Rechargeable Li-ion",
      layout: "US English with numeric keypad"
    }
  },
  {
    id: "PROD005",
    name: "Magic Mouse",
    category: "Accessories",
    description: "Multi-Touch surface, rechargeable battery, optimized foot design.",
    price: 79.00,
    currency: "USD",
    stock: 45,
    rating: 4.0,
    reviews: 312,
    emoji: "🖱️",
    specs: {
      connectivity: "Bluetooth",
      battery: "Rechargeable Li-ion",
      features: "Multi-Touch surface"
    }
  },
  {
    id: "PROD006",
    name: "Apple Watch Series 9",
    category: "Wearables",
    description: "Advanced health features, always-on display, carbon neutral options.",
    price: 399.00,
    currency: "USD",
    stock: 60,
    rating: 5.0,
    reviews: 678,
    emoji: "⌚",
    specs: {
      display: "Always-on Retina",
      health: "ECG, Blood Oxygen, Heart Rate",
      water_resistance: "50m"
    }
  },
  {
    id: "PROD007",
    name: "Sony A7 IV Camera",
    category: "Cameras",
    description: "33MP full-frame sensor, 4K 60fps video, real-time eye AF.",
    price: 2499.00,
    currency: "USD",
    stock: 5,
    rating: 5.0,
    reviews: 423,
    emoji: "📷",
    specs: {
      sensor: "33MP Full-Frame",
      video: "4K 60fps",
      autofocus: "Real-time Eye AF"
    }
  },
  {
    id: "PROD008",
    name: "HomePod (2nd Gen)",
    category: "Audio",
    description: "Room-filling sound, smart home hub, spatial audio with Dolby Atmos.",
    price: 299.00,
    currency: "USD",
    stock: 30,
    rating: 4.0,
    reviews: 267,
    emoji: "🔊",
    specs: {
      audio: "Spatial Audio with Dolby Atmos",
      connectivity: "Wi-Fi, Thread, Bluetooth",
      integration: "HomeKit, Siri"
    }
  },
  {
    id: "PROD009",
    name: "Samsung T7 SSD 1TB",
    category: "Storage",
    description: "Portable external SSD, up to 1,050MB/s, password protection.",
    price: 129.00,
    currency: "USD",
    stock: 75,
    rating: 5.0,
    reviews: 1234,
    emoji: "💽",
    specs: {
      capacity: "1TB",
      speed: "Up to 1,050MB/s",
      security: "AES 256-bit encryption"
    }
  },
  {
    id: "PROD010",
    name: "Dell UltraSharp 27\" Monitor",
    category: "Monitors",
    description: "4K UHD, 99% sRGB color coverage, USB-C connectivity with 90W power.",
    price: 549.00,
    currency: "USD",
    stock: 20,
    rating: 4.0,
    reviews: 512,
    emoji: "🖥️",
    specs: {
      resolution: "3840 x 2160 (4K UHD)",
      color: "99% sRGB",
      connectivity: "USB-C with 90W Power Delivery"
    }
  },
  {
    id: "PROD011",
    name: "PlayStation 5",
    category: "Gaming",
    description: "825GB SSD, ray tracing, 4K gaming at 120fps, DualSense controller.",
    price: 499.00,
    currency: "USD",
    stock: 0,
    rating: 5.0,
    reviews: 2345,
    emoji: "🎮",
    specs: {
      storage: "825GB SSD",
      performance: "4K @ 120fps",
      features: "Ray Tracing, DualSense Controller"
    }
  },
  {
    id: "PROD012",
    name: "Anker 737 Power Bank",
    category: "Accessories",
    description: "24,000mAh capacity, 140W output, charges 3 devices simultaneously.",
    price: 149.00,
    currency: "USD",
    stock: 40,
    rating: 5.0,
    reviews: 789,
    emoji: "🔌",
    specs: {
      capacity: "24,000mAh",
      output: "140W",
      ports: "2x USB-C, 1x USB-A"
    }
  }
];

// Dummy order data
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
