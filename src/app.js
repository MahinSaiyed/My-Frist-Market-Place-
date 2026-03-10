const fs = require('node:fs');
const path = require('node:path');
const { URL } = require('node:url');
const {
  config,
  vendors,
  products,
  orders,
  listMarketplaceProducts,
  createVendor,
  createProduct,
  createOrder,
  metrics
} = require('./store');

const publicDir = path.join(__dirname, '..', 'public');

function json(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

function sendFile(res, filePath) {
  if (!fs.existsSync(filePath)) return false;
  const ext = path.extname(filePath);
  const contentType = ext === '.css'
    ? 'text/css'
    : ext === '.js'
      ? 'application/javascript'
      : 'text/html';

  res.writeHead(200, { 'Content-Type': contentType });
  res.end(fs.readFileSync(filePath));
  return true;
}

function readBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
  });
}

async function app(req, res) {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);
  const { pathname, searchParams } = requestUrl;

  if (req.method === 'GET' && pathname === '/api/marketplace/products') {
    return json(res, 200, listMarketplaceProducts({
      q: searchParams.get('q') || '',
      category: searchParams.get('category') || ''
    }));
  }

  if (req.method === 'GET' && pathname === '/api/marketplace/categories') {
    return json(res, 200, [...new Set(products.map((p) => p.category))]);
  }

  if (req.method === 'POST' && pathname === '/api/vendors/register') {
    const body = await readBody(req);
    if (!body.name || !body.email) return json(res, 400, { error: 'Name and email are required' });
    return json(res, 201, createVendor(body));
  }

  if (req.method === 'GET' && pathname === '/api/vendors') return json(res, 200, vendors);

  const vendorDashboardMatch = pathname.match(/^\/api\/vendors\/([^/]+)\/dashboard$/);
  if (req.method === 'GET' && vendorDashboardMatch) {
    const vendor = vendors.find((v) => v.id === vendorDashboardMatch[1]);
    if (!vendor) return json(res, 404, { error: 'Vendor not found' });
    const vendorProducts = products.filter((p) => p.vendorId === vendor.id);
    const vendorOrders = orders.filter((o) => o.vendorId === vendor.id);
    return json(res, 200, {
      vendor,
      products: vendorProducts,
      orders: vendorOrders,
      analytics: {
        totalSales: vendorOrders.reduce((sum, o) => sum + o.vendorAmount, 0),
        totalOrders: vendorOrders.length,
        pendingShipments: vendorOrders.filter((o) => o.shippingStatus !== 'Delivered').length
      }
    });
  }

  const vendorProductsMatch = pathname.match(/^\/api\/vendors\/([^/]+)\/products$/);
  if (req.method === 'POST' && vendorProductsMatch) {
    const vendor = vendors.find((v) => v.id === vendorProductsMatch[1]);
    if (!vendor) return json(res, 404, { error: 'Vendor not found' });
    const body = await readBody(req);
    const required = ['name', 'category', 'description', 'retailPrice', 'moq', 'inventory'];
    const missing = required.find((f) => body[f] === undefined);
    if (missing) return json(res, 400, { error: `Missing required field: ${missing}` });
    return json(res, 201, createProduct(vendor.id, body));
  }

  const approveMatch = pathname.match(/^\/api\/admin\/products\/([^/]+)\/approve$/);
  if (req.method === 'PATCH' && approveMatch) {
    const product = products.find((p) => p.id === approveMatch[1]);
    if (!product) return json(res, 404, { error: 'Product not found' });
    product.approved = true;
    return json(res, 200, product);
  }

  const verifyMatch = pathname.match(/^\/api\/admin\/vendors\/([^/]+)\/verify$/);
  if (req.method === 'PATCH' && verifyMatch) {
    const vendor = vendors.find((v) => v.id === verifyMatch[1]);
    if (!vendor) return json(res, 404, { error: 'Vendor not found' });
    vendor.verified = true;
    return json(res, 200, vendor);
  }

  if (req.method === 'PATCH' && pathname === '/api/admin/commission') {
    const body = await readBody(req);
    if (body.commissionRate === undefined || body.commissionRate < 0 || body.commissionRate > 1) {
      return json(res, 400, { error: 'commissionRate must be between 0 and 1' });
    }
    config.commissionRate = Number(body.commissionRate);
    config.splitProvider = body.splitProvider || config.splitProvider;
    return json(res, 200, config);
  }

  if (req.method === 'GET' && pathname === '/api/admin/dashboard') {
    return json(res, 200, { config, vendors, products, orders, analytics: metrics() });
  }

  if (req.method === 'POST' && pathname === '/api/orders/checkout') {
    const body = await readBody(req);
    if (!body.productId || !body.quantity || !body.customerName) {
      return json(res, 400, { error: 'productId, quantity, customerName are required' });
    }
    try {
      const order = createOrder({
        productId: body.productId,
        quantity: Number(body.quantity),
        customerName: body.customerName,
        paymentProvider: body.paymentProvider || 'Stripe Connect'
      });
      return json(res, 201, order);
    } catch (error) {
      return json(res, 400, { error: error.message });
    }
  }

  const shippingMatch = pathname.match(/^\/api\/orders\/([^/]+)\/shipping$/);
  if (req.method === 'PATCH' && shippingMatch) {
    const body = await readBody(req);
    const order = orders.find((o) => o.id === shippingMatch[1]);
    if (!order) return json(res, 404, { error: 'Order not found' });
    order.shippingStatus = body.shippingStatus || order.shippingStatus;
    return json(res, 200, order);
  }

  const target = pathname === '/' ? 'index.html' : pathname.slice(1);
  const filePath = path.join(publicDir, target);
  if (sendFile(res, filePath)) return;

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
}

module.exports = app;
