const productsGrid = document.getElementById('productsGrid');
const searchInput = document.getElementById('searchInput');
const categoryFilter = document.getElementById('categoryFilter');
const heroMetrics = document.getElementById('heroMetrics');
const productForm = document.getElementById('productForm');
const vendorResult = document.getElementById('vendorResult');
const adminResult = document.getElementById('adminResult');
const commissionForm = document.getElementById('commissionForm');
const chart = document.getElementById('chart');

let products = [];

async function fetchJSON(url, options) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  return response.json();
}

function renderProducts(list) {
  productsGrid.innerHTML = list.map((product) => `
    <article class="card">
      <h4>${product.name}</h4>
      <p class="muted">${product.category}</p>
      <p>${product.description}</p>
      <p><strong>Retail:</strong> $${product.retailPrice}</p>
      <p><strong>Bulk from MOQ ${product.moq}:</strong> $${product.bulkTiers?.[0]?.unitPrice ?? product.retailPrice}</p>
      <p><strong>Rating:</strong> ${product.rating} ⭐ (${product.reviews} reviews)</p>
      <button onclick="checkout('${product.id}', 1)">Buy Retail</button>
      <button onclick="checkout('${product.id}', ${product.moq})">Buy Bulk MOQ</button>
    </article>
  `).join('');
}

async function loadProducts() {
  const params = new URLSearchParams({
    q: searchInput.value || '',
    category: categoryFilter.value || ''
  });
  products = await fetchJSON(`/api/marketplace/products?${params}`);
  renderProducts(products);
}

async function loadCategories() {
  const categories = await fetchJSON('/api/marketplace/categories');
  categoryFilter.innerHTML = '<option value="">All Categories</option>' + categories.map((c) => `<option>${c}</option>`).join('');
}

async function loadAdmin() {
  const data = await fetchJSON('/api/admin/dashboard');
  heroMetrics.innerHTML = `
    <div class="card"><h4>$${data.analytics.totals.revenue.toFixed(2)}</h4><p class="muted">GMV</p></div>
    <div class="card"><h4>$${data.analytics.totals.commission.toFixed(2)}</h4><p class="muted">Platform Commission</p></div>
    <div class="card"><h4>${data.analytics.totals.orders}</h4><p class="muted">Orders</p></div>
  `;

  adminResult.textContent = JSON.stringify(data, null, 2);

  const timeline = data.analytics.commissionTimeline;
  const max = Math.max(...timeline.map((t) => t.commission), 10);
  chart.innerHTML = timeline.length
    ? timeline.map((item) => `<div class="bar" style="height:${(item.commission / max) * 100}%" title="${item.orderId}: $${item.commission}"></div>`).join('')
    : '<p class="muted">No commissions recorded yet.</p>';
}

async function checkout(productId, quantity) {
  const customerName = prompt('Enter customer name for checkout');
  if (!customerName) return;

  const order = await fetchJSON('/api/orders/checkout', {
    method: 'POST',
    body: JSON.stringify({
      productId,
      quantity,
      customerName,
      paymentProvider: 'Stripe Connect'
    })
  });

  alert(order.error || `Order ${order.id} created. Vendor: $${order.vendorAmount}, Commission: $${order.commissionAmount}`);
  await loadProducts();
  await loadAdmin();
}

productForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.target));
  data.bulkTiers = [
    { minQty: Number(data.moq), unitPrice: Number(data.retailPrice) - 2 },
    { minQty: Number(data.moq) * 5, unitPrice: Number(data.retailPrice) - 4 }
  ];

  const product = await fetchJSON(`/api/vendors/${data.vendorId}/products`, {
    method: 'POST',
    body: JSON.stringify(data)
  });

  vendorResult.textContent = JSON.stringify(product, null, 2);
});

commissionForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.target));
  const config = await fetchJSON('/api/admin/commission', {
    method: 'PATCH',
    body: JSON.stringify({
      commissionRate: Number(data.commissionRate),
      splitProvider: data.splitProvider
    })
  });
  adminResult.textContent = JSON.stringify(config, null, 2);
  await loadAdmin();
});

searchInput.addEventListener('input', loadProducts);
categoryFilter.addEventListener('change', loadProducts);

loadCategories().then(loadProducts);
loadAdmin();
window.checkout = checkout;
