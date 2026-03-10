const test = require('node:test');
const assert = require('node:assert/strict');

const {
  config,
  products,
  createOrder,
  createProduct,
  metrics
} = require('../src/store');

test('bulk pricing applies when quantity reaches MOQ tier', () => {
  const product = products.find((p) => p.id === 'prd-1');
  const beforeInventory = product.inventory;
  const order = createOrder({
    productId: 'prd-1',
    quantity: 20,
    customerName: 'QA Buyer',
    paymentProvider: 'Stripe Connect'
  });

  assert.equal(order.unitPrice, 219);
  assert.equal(order.grossAmount, 4380);
  assert.equal(order.commissionAmount, Number((4380 * config.commissionRate).toFixed(2)));
  assert.equal(product.inventory, beforeInventory - 20);
});

test('new product is created as pending admin approval', () => {
  const product = createProduct('ven-1', {
    name: 'Test Product',
    category: 'Testing',
    description: 'Temporary',
    retailPrice: 10,
    moq: 5,
    bulkTiers: [{ minQty: 5, unitPrice: 8 }],
    inventory: 12
  });

  assert.equal(product.approved, false);
  assert.equal(product.vendorId, 'ven-1');
});

test('metrics expose aggregate totals', () => {
  const snapshot = metrics();
  assert.ok(snapshot.totals.orders >= 1);
  assert.ok(snapshot.totals.revenue >= snapshot.totals.commission);
});
