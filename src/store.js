const config = {
  commissionRate: 0.1,
  splitProvider: 'Stripe Connect'
};

const vendors = [
  {
    id: 'ven-1',
    name: 'Nova Industrial Supplies',
    email: 'owner@nova-industrial.com',
    verified: true,
    shippingPartners: ['DHL', 'FedEx'],
    walletBalance: 0
  },
  {
    id: 'ven-2',
    name: 'UrbanNest Lifestyle',
    email: 'hello@urbannest.shop',
    verified: false,
    shippingPartners: ['UPS', 'BlueDart'],
    walletBalance: 0
  }
];

const products = [
  {
    id: 'prd-1',
    vendorId: 'ven-1',
    name: 'Smart CNC Toolkit',
    category: 'Industrial Tools',
    description: 'Precision toolkit for workshops and factories.',
    retailPrice: 249,
    moq: 20,
    bulkTiers: [
      { minQty: 20, unitPrice: 219 },
      { minQty: 100, unitPrice: 199 }
    ],
    inventory: 640,
    rating: 4.8,
    reviews: 116,
    approved: true
  },
  {
    id: 'prd-2',
    vendorId: 'ven-2',
    name: 'Ergo Chair X Pro',
    category: 'Office Furniture',
    description: 'Premium ergonomic chair for modern offices.',
    retailPrice: 159,
    moq: 10,
    bulkTiers: [
      { minQty: 10, unitPrice: 139 },
      { minQty: 60, unitPrice: 121 }
    ],
    inventory: 300,
    rating: 4.6,
    reviews: 84,
    approved: true
  }
];

const orders = [];

const id = (prefix) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`;

function listMarketplaceProducts({ q = '', category = '' }) {
  return products.filter((product) => {
    if (!product.approved) return false;
    const searchOk = !q || product.name.toLowerCase().includes(q.toLowerCase()) || product.description.toLowerCase().includes(q.toLowerCase());
    const categoryOk = !category || product.category === category;
    return searchOk && categoryOk;
  });
}

function createVendor(payload) {
  const vendor = {
    id: id('ven'),
    name: payload.name,
    email: payload.email,
    verified: false,
    shippingPartners: payload.shippingPartners || [],
    walletBalance: 0
  };
  vendors.push(vendor);
  return vendor;
}

function createProduct(vendorId, payload) {
  const product = {
    id: id('prd'),
    vendorId,
    name: payload.name,
    category: payload.category,
    description: payload.description,
    retailPrice: Number(payload.retailPrice),
    moq: Number(payload.moq),
    bulkTiers: payload.bulkTiers || [],
    inventory: Number(payload.inventory),
    rating: 0,
    reviews: 0,
    approved: false
  };
  products.push(product);
  return product;
}

function resolveUnitPrice(product, quantity) {
  if (quantity >= product.moq) {
    const matchedTier = [...product.bulkTiers]
      .sort((a, b) => b.minQty - a.minQty)
      .find((tier) => quantity >= tier.minQty);
    return matchedTier ? matchedTier.unitPrice : product.retailPrice;
  }
  return product.retailPrice;
}

function createOrder({ productId, quantity, customerName, paymentProvider }) {
  const product = products.find((item) => item.id === productId);
  if (!product) throw new Error('Product not found');
  if (!product.approved) throw new Error('Product is not approved by admin yet');
  if (quantity > product.inventory) throw new Error('Insufficient inventory for this order');

  const unitPrice = resolveUnitPrice(product, quantity);
  const grossAmount = unitPrice * quantity;
  const commissionAmount = Number((grossAmount * config.commissionRate).toFixed(2));
  const vendorAmount = Number((grossAmount - commissionAmount).toFixed(2));

  const order = {
    id: id('ord'),
    productId,
    vendorId: product.vendorId,
    customerName,
    quantity,
    unitPrice,
    grossAmount,
    commissionAmount,
    vendorAmount,
    paymentProvider,
    status: 'Processing',
    shippingStatus: 'Label Pending',
    createdAt: new Date().toISOString()
  };

  product.inventory -= quantity;
  const vendor = vendors.find((entry) => entry.id === product.vendorId);
  vendor.walletBalance += vendorAmount;

  orders.push(order);
  return order;
}

function metrics() {
  const revenue = orders.reduce((sum, order) => sum + order.grossAmount, 0);
  const commission = orders.reduce((sum, order) => sum + order.commissionAmount, 0);
  const vendorPayout = orders.reduce((sum, order) => sum + order.vendorAmount, 0);

  return {
    totals: {
      revenue,
      commission,
      vendorPayout,
      vendors: vendors.length,
      products: products.length,
      orders: orders.length
    },
    commissionTimeline: orders.slice(-7).map((order) => ({
      orderId: order.id,
      commission: order.commissionAmount,
      date: order.createdAt
    }))
  };
}

module.exports = {
  config,
  vendors,
  products,
  orders,
  listMarketplaceProducts,
  createVendor,
  createProduct,
  createOrder,
  metrics
};
