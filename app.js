/* ============================================================
   Chinar Communications — Shared Data Layer
   Set these two values before deploying:
   ============================================================ */
const CF_WORKER_URL = 'https://YOUR-WORKER.YOUR-SUBDOMAIN.workers.dev';
const CLOUDINARY_CLOUD = 'YOUR_CLOUDINARY_CLOUD_NAME';

function getProducts() {
  try { return JSON.parse(sessionStorage.getItem('cv_products') || '[]'); } catch(e) { return []; }
}
function getBrands() {
  try { return JSON.parse(sessionStorage.getItem('cv_brands') || '[]'); } catch(e) { return []; }
}
async function fetchProducts() {
  try {
    const r = await fetch(`${CF_WORKER_URL}/products`);
    const d = await r.json();
    const products = (d.products || []).map(p => ({
      ...p,
      images: typeof p.images === 'string' ? JSON.parse(p.images || '[]') : (p.images || []),
      specifications: typeof p.specifications === 'string' ? JSON.parse(p.specifications || '{}') : (p.specifications || {})
    }));
    sessionStorage.setItem('cv_products', JSON.stringify(products));
    return products;
  } catch(e) { return []; }
}
async function fetchBrands() {
  try {
    const r = await fetch(`${CF_WORKER_URL}/brands`);
    const d = await r.json();
    const brands = d.brands || [];
    sessionStorage.setItem('cv_brands', JSON.stringify(brands));
    return brands;
  } catch(e) { return []; }
}
async function fetchProductById(id) {
  try {
    const r = await fetch(`${CF_WORKER_URL}/products/${id}`);
    const p = await r.json();
    return {
      ...p,
      images: typeof p.images === 'string' ? JSON.parse(p.images || '[]') : (p.images || []),
      specifications: typeof p.specifications === 'string' ? JSON.parse(p.specifications || '{}') : (p.specifications || {})
    };
  } catch(e) { return getProducts().find(p => p.id === id) || null; }
}
function fmtP(price) {
  if (!price && price !== 0) return '—';
  const n = parseFloat(price);
  return isNaN(n) ? '—' : '₹ ' + n.toLocaleString('en-IN');
}
async function uploadToCloudinary(file, preset = 'chinar_unsigned') {
  const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`;
  const fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', preset);
  fd.append('folder', 'chinar');
  const r = await fetch(url, { method: 'POST', body: fd });
  if (!r.ok) throw new Error('Cloudinary upload failed');
  return (await r.json()).secure_url;
}
async function adminFetch(path, opts = {}) {
  const token = sessionStorage.getItem('cv_admin_token');
  return fetch(`${CF_WORKER_URL}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, ...(opts.headers || {}) }
  });
}
async function adminLogin(password) {
  const r = await fetch(`${CF_WORKER_URL}/admin/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password })
  });
  const d = await r.json();
  if (d.token) { sessionStorage.setItem('cv_admin_token', d.token); return true; }
  return false;
}
async function adminAddProduct(p) { return (await adminFetch('/admin/products', { method: 'POST', body: JSON.stringify(p) })).json(); }
async function adminUpdateProduct(id, p) { return (await adminFetch(`/admin/products/${id}`, { method: 'PUT', body: JSON.stringify(p) })).json(); }
async function adminDeleteProduct(id) { return (await adminFetch(`/admin/products/${id}`, { method: 'DELETE' })).json(); }
async function adminAddBrand(b) { return (await adminFetch('/admin/brands', { method: 'POST', body: JSON.stringify(b) })).json(); }
async function adminDeleteBrand(id) { return (await adminFetch(`/admin/brands/${id}`, { method: 'DELETE' })).json(); }
